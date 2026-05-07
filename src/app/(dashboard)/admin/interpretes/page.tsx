'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Search,
  Plus,
  Users,
  Eye,
  Edit3,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Copy,
  RefreshCw,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useSocketContext } from '@/contexts/SocketContext';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import { LanguageSelector } from '@/components/shared/LanguageSelector';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import type {
  PaginatedResponse,
  ApiResponse,
  Interpreter,
  InterpreterDetail,
  LanguageWithVariants,
} from '@/types';

const proficiencyOptions = [
  { value: 'NATIVE', label: 'Nativo' },
  { value: 'ADVANCED', label: 'Avanzado' },
  { value: 'INTERMEDIATE', label: 'Intermedio' },
];

const stateOptions = [
  { value: 'Oaxaca', label: 'Oaxaca' },
  { value: 'Puebla', label: 'Puebla' },
  { value: 'Guerrero', label: 'Guerrero' },
  { value: 'Veracruz', label: 'Veracruz' },
  { value: 'Chiapas', label: 'Chiapas' },
  { value: 'CDMX', label: 'CDMX' },
];

interface InterpreterForm {
  name: string;
  email: string;
  phone: string;
  community: string;
  state: string;
  bio: string;
  isAvailable: boolean;
  hourlyRate: string;
  bankName: string;
  bankClabe: string;
  bankHolder: string;
  languages: { variantId: string; proficiency: string }[];
}

const emptyForm: InterpreterForm = {
  name: '',
  email: '',
  phone: '',
  community: '',
  state: '',
  bio: '',
  isAvailable: true,
  hourlyRate: '300',
  bankName: '',
  bankClabe: '',
  bankHolder: '',
  languages: [],
};

export default function InterpretesPage() {
  const [data, setData] = useState<Interpreter[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<InterpreterForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formSection, setFormSection] = useState(0);

  // Detail modal
  const [detail, setDetail] = useState<InterpreterDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Interpreter | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Reset password confirmation
  const [resetTarget, setResetTarget] = useState<Interpreter | null>(null);
  const [resetting, setResetting] = useState(false);

  // Temp password modal (shown after create or reset)
  const [tempPasswordModal, setTempPasswordModal] = useState<{ name: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(async (page: number, q: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (q) params.set('search', q);
      const res = await api.get<PaginatedResponse<Interpreter>>(`/interpreters?${params}`);
      setData(res.data);
      setPagination({
        page: res.pagination.page,
        totalPages: res.pagination.totalPages,
        total: res.pagination.total,
      });
    } catch { /* empty */ }
    setLoading(false);
  }, []);

  const { socket } = useSocketContext();

  useEffect(() => {
    fetchData(1, search);
  }, [fetchData, search]);

  // Auto-refresh on any relevant WebSocket event
  useEffect(() => {
    if (!socket) return;
    const refresh = () => fetchData(pagination.page, search);
    const events = ['request:accepted', 'request:completed', 'request:cancelled', 'request:started'];
    events.forEach((e) => socket.on(e, refresh));
    return () => { events.forEach((e) => socket.off(e, refresh)); };
  }, [socket, fetchData, pagination.page, search]);

  async function openDetail(id: string) {
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await api.get<ApiResponse<InterpreterDetail>>(`/interpreters/${id}`);
      setDetail(res.data);
    } catch { /* empty */ }
    setDetailLoading(false);
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setFormSection(0);
    setShowForm(true);
  }

  async function openEdit(interp: Interpreter) {
    setEditingId(interp.id);
    setForm({
      name: interp.user.name,
      email: interp.user.email,
      phone: interp.user.phone ?? '',
      community: interp.community ?? '',
      state: interp.state ?? '',
      bio: interp.bio ?? '',
      isAvailable: interp.isAvailable,
      hourlyRate: String(interp.hourlyRate ?? 300),
      bankName: '',
      bankClabe: '',
      bankHolder: '',
      languages: interp.languages.map((l) => ({
        variantId: l.variant.id,
        proficiency: l.proficiency,
      })),
    });
    // Try to load bank info from detail
    try {
      const res = await api.get<ApiResponse<InterpreterDetail>>(`/interpreters/${interp.id}`);
      setForm((prev) => ({
        ...prev,
        bankName: res.data.bankName ?? '',
        bankClabe: res.data.bankClabe ?? '',
        bankHolder: res.data.bankHolder ?? '',
      }));
    } catch { /* empty */ }
    setFormSection(0);
    setShowForm(true);
  }

  async function saveInterpreter() {
    setSaving(true);
    try {
      const shared: Record<string, unknown> = {
        name: form.name,
        ...(form.phone && { phone: form.phone }),
        ...(form.community && { community: form.community }),
        ...(form.state && { state: form.state }),
        ...(form.bio && { bio: form.bio }),
        isAvailable: form.isAvailable,
        ...(form.hourlyRate && { hourlyRate: parseFloat(form.hourlyRate) }),
        ...(form.bankName && { bankName: form.bankName }),
        ...(form.bankClabe && { bankClabe: form.bankClabe }),
        ...(form.bankHolder && { bankHolder: form.bankHolder }),
        languageVariantIds: form.languages.filter((l) => l.variantId).map((l) => l.variantId),
      };

      if (editingId) {
        await api.patch(`/interpreters/${editingId}`, shared);
        setShowForm(false);
      } else {
        const res = await api.post<ApiResponse<{ interpreter: { tempPassword?: string } }>>('/interpreters', { ...shared, email: form.email });
        setShowForm(false);
        // Show temp password modal
        const tempPwd = res.data?.interpreter?.tempPassword;
        if (tempPwd) {
          setTempPasswordModal({ name: form.name, password: tempPwd });
        }
      }

      await fetchData(pagination.page, search);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar');
    }
    setSaving(false);
  }

  async function deleteInterpreter() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/interpreters/${deleteTarget.id}`);
      setDeleteTarget(null);
      await fetchData(1, search);
    } catch { /* empty */ }
    setDeleting(false);
  }

  async function handleViewTempPassword(interp: Interpreter) {
    try {
      const res = await api.get<ApiResponse<{ tempPassword: string | null; mustChangePassword: boolean }>>(`/interpreters/${interp.id}/temp-password`);
      if (res.data.tempPassword) {
        setTempPasswordModal({ name: interp.user.name, password: res.data.tempPassword });
      } else {
        toast('El interprete ya cambio su contrasena', { icon: 'ℹ️' });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  }

  function handleResetPassword(interp: Interpreter) {
    // Abre el modal de confirmacion. La logica/copy del modal cambia segun
    // si el interprete ya activo su cuenta (mustChangePassword=false) o no.
    setResetTarget(interp);
  }

  async function confirmResetPassword() {
    if (!resetTarget) return;
    setResetting(true);
    try {
      const res = await api.post<ApiResponse<{ tempPassword: string }>>(`/interpreters/${resetTarget.id}/reset-password`, {});
      const name = resetTarget.user.name;
      setResetTarget(null);
      setTempPasswordModal({ name, password: res.data.tempPassword });
      await fetchData(pagination.page, search);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al regenerar');
    }
    setResetting(false);
  }

  async function handleToggleAvailability(id: string, isAvailable: boolean) {
    try {
      await api.patch(`/interpreters/${id}/availability`, { isAvailable });
      setData((prev) => prev.map((i) => (i.id === id ? { ...i, isAvailable } : i)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  }

  function copyPassword(pwd: string) {
    navigator.clipboard.writeText(pwd).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function addLanguageSlot() {
    setForm((prev) => ({
      ...prev,
      languages: [...prev.languages, { variantId: '', proficiency: 'NATIVE' }],
    }));
  }

  function removeLanguageSlot(idx: number) {
    setForm((prev) => ({
      ...prev,
      languages: prev.languages.filter((_, i) => i !== idx),
    }));
  }

  function updateLanguageSlot(idx: number, field: 'variantId' | 'proficiency', value: string) {
    setForm((prev) => ({
      ...prev,
      languages: prev.languages.map((l, i) =>
        i === idx ? { ...l, [field]: value } : l
      ),
    }));
  }

  const formSections = ['Datos personales', 'Lenguas', 'Datos bancarios'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-redin-earth-900">Intérpretes</h1>
        <Button
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={openCreate}
        >
          Nuevo intérprete
        </Button>
      </div>

      <div className="max-w-sm">
        <Input
          placeholder="Buscar intérprete..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
        />
      </div>

      <Card>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 bg-redin-earth-100 rounded animate-pulse" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Sin intérpretes"
            description="No se encontraron intérpretes."
            actionLabel="Agregar intérprete"
            onAction={openCreate}
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Comunidad</TableHead>
                  <TableHead>Lenguas</TableHead>
                  <TableHead>Disponible</TableHead>
                  <TableHead>Tarifa/hr</TableHead>
                  <TableHead>Acceso</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((interp) => (
                  <TableRow key={interp.id}>
                    <TableCell className="font-medium">{interp.user.name}</TableCell>
                    <TableCell className="text-xs">{interp.user.email}</TableCell>
                    <TableCell className="text-xs">{interp.user.phone ?? '—'}</TableCell>
                    <TableCell className="text-xs">
                      {interp.community ?? '—'}
                      {interp.state && `, ${interp.state}`}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {interp.languages.slice(0, 2).map((l) => (
                          <Badge key={l.id} variant="forest" size="sm">
                            {l.variant.language.name}
                          </Badge>
                        ))}
                        {interp.languages.length > 2 && (
                          <Badge variant="gray" size="sm">
                            +{interp.languages.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {!interp.user.isActive ? (
                        <Badge variant="red" size="sm">Desactivado</Badge>
                      ) : (
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={interp.isAvailable}
                            onChange={() => handleToggleAvailability(interp.id, !interp.isAvailable)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-redin-earth-200 peer-checked:bg-redin-forest-500 rounded-full transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
                        </label>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-mono text-redin-earth-600">${Number(interp.hourlyRate ?? 300)}/hr</span>
                    </TableCell>
                    <TableCell>
                      {interp.mustChangePassword ? (
                        <div className="flex items-center gap-1.5">
                          <Badge variant="amber" size="sm">Pendiente</Badge>
                          <button
                            onClick={() => handleViewTempPassword(interp)}
                            className="p-1 rounded hover:bg-redin-earth-100 text-redin-earth-400 hover:text-redin-earth-600 transition-colors"
                            title="Ver contrasena"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleResetPassword(interp)}
                            className="p-1 rounded hover:bg-amber-50 text-amber-600 hover:text-amber-700 transition-colors"
                            title="Regenerar contrasena"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Badge variant="green" size="sm">Activo</Badge>
                          <button
                            onClick={() => handleResetPassword(interp)}
                            className="p-1 rounded hover:bg-amber-50 text-amber-600 hover:text-amber-700 transition-colors"
                            title="Regenerar contrasena"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openDetail(interp.id)}
                          className="p-1 rounded hover:bg-redin-earth-100 text-redin-earth-400 hover:text-redin-earth-600 transition-colors"
                          title="Ver detalle"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEdit(interp)}
                          className="p-1 rounded hover:bg-redin-earth-100 text-redin-earth-400 hover:text-redin-earth-600 transition-colors"
                          title="Editar"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        {interp.user.isActive !== false && (
                          <button
                            onClick={() => setDeleteTarget(interp)}
                            className="p-1 rounded hover:bg-red-100 text-redin-earth-400 hover:text-red-600 transition-colors"
                            title="Desactivar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-4 flex items-center justify-between text-sm text-redin-earth-500">
              <span>{pagination.total} intérpretes</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchData(pagination.page - 1, search)}
                >
                  Anterior
                </Button>
                <span className="px-3 py-1">
                  Página {pagination.page} de {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchData(pagination.page + 1, search)}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Create/Edit modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editingId ? 'Editar intérprete' : 'Nuevo intérprete'}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            {formSection > 0 && (
              <Button variant="outline" onClick={() => setFormSection(formSection - 1)}>
                Anterior
              </Button>
            )}
            {formSection < formSections.length - 1 ? (
              <Button onClick={() => setFormSection(formSection + 1)}>
                Siguiente
              </Button>
            ) : (
              <Button onClick={saveInterpreter} loading={saving} disabled={!form.name || !form.email}>
                {editingId ? 'Guardar cambios' : 'Crear intérprete'}
              </Button>
            )}
          </>
        }
      >
        {/* Section tabs */}
        <div className="flex gap-1 mb-6 border-b border-redin-earth-200">
          {formSections.map((section, i) => (
            <button
              key={section}
              type="button"
              onClick={() => setFormSection(i)}
              className={cn(
                'px-3 py-2 text-sm font-medium border-b-2 transition-colors',
                formSection === i
                  ? 'border-redin-gold-400 text-redin-gold-600'
                  : 'border-transparent text-redin-earth-500 hover:text-redin-earth-700'
              )}
            >
              {section}
            </button>
          ))}
        </div>

        {/* Section 0: Personal data */}
        {formSection === 0 && (
          <div className="space-y-4">
            <Input
              label="Nombre completo"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <Input
              label="Correo electrónico"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              leftIcon={<Mail className="h-4 w-4" />}
              required
              disabled={!!editingId}
            />
            <Input
              label="Teléfono"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              leftIcon={<Phone className="h-4 w-4" />}
            />
            <Input
              label="Comunidad"
              value={form.community}
              onChange={(e) => setForm({ ...form, community: e.target.value })}
              leftIcon={<MapPin className="h-4 w-4" />}
            />
            <Select
              label="Estado"
              options={stateOptions}
              value={form.state}
              onChange={(v) => setForm({ ...form, state: v })}
              placeholder="Seleccionar estado"
            />
            <div>
              <label className="block text-sm font-medium text-redin-earth-700 mb-1">
                Biografía
              </label>
              <textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                rows={3}
                className="w-full rounded-lg border border-redin-earth-200 px-3 py-2 text-sm focus:border-redin-gold-400 focus:ring-2 focus:ring-redin-gold-100 focus:outline-none resize-none"
                placeholder="Experiencia, certificaciones..."
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isAvailable"
                checked={form.isAvailable}
                onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })}
                className="h-4 w-4 rounded border-redin-earth-300 text-redin-gold-500 focus:ring-redin-gold-400"
              />
              <label htmlFor="isAvailable" className="text-sm text-redin-earth-700">
                Disponible para servicios
              </label>
            </div>
          </div>
        )}

        {/* Section 1: Languages */}
        {formSection === 1 && (
          <div className="space-y-4">
            {form.languages.length === 0 && (
              <p className="text-sm text-redin-earth-400">
                No se han agregado lenguas. Agrega al menos una.
              </p>
            )}
            {form.languages.map((lang, idx) => (
              <div
                key={idx}
                className="border border-redin-earth-200 rounded-lg p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-redin-earth-700">
                    Lengua {idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeLanguageSlot(idx)}
                    className="p-1 rounded hover:bg-red-100 text-redin-earth-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <LanguageSelector
                  value={lang.variantId}
                  onChange={(v) => updateLanguageSlot(idx, 'variantId', v)}
                />
                <Select
                  label="Nivel de dominio"
                  options={proficiencyOptions}
                  value={lang.proficiency}
                  onChange={(v) => updateLanguageSlot(idx, 'proficiency', v)}
                />
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={addLanguageSlot}
            >
              Agregar lengua
            </Button>
          </div>
        )}

        {/* Section 2: Bank data */}
        {formSection === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-redin-earth-500">
              Datos bancarios para el pago de servicios. Son opcionales y se pueden agregar después.
            <Input
              label="Tarifa por hora (MXN)"
              type="number"
              min={1}
              step={50}
              value={form.hourlyRate}
              onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })}
              placeholder="300"
            />
            </p>
            <Input
              label="Nombre del banco"
              value={form.bankName}
              onChange={(e) => setForm({ ...form, bankName: e.target.value })}
              placeholder="Ej. BBVA, Banamex..."
            />
            <Input
              label="CLABE interbancaria"
              value={form.bankClabe}
              onChange={(e) => setForm({ ...form, bankClabe: e.target.value })}
              placeholder="18 dígitos"
            />
            <Input
              label="Titular de la cuenta"
              value={form.bankHolder}
              onChange={(e) => setForm({ ...form, bankHolder: e.target.value })}
              placeholder="Nombre como aparece en el banco"
            />
          </div>
        )}
      </Modal>

      {/* Detail modal */}
      <Modal
        open={!!detail || detailLoading}
        onClose={() => setDetail(null)}
        title="Detalle del intérprete"
        size="lg"
      >
        {detailLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-6 bg-redin-earth-100 rounded animate-pulse" />
            ))}
          </div>
        ) : detail ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-redin-earth-500">Nombre</p>
                <p className="font-medium text-redin-earth-900">{detail.user.name}</p>
              </div>
              <div>
                <p className="text-redin-earth-500">Email</p>
                <p className="font-medium text-redin-earth-900">{detail.user.email}</p>
              </div>
              <div>
                <p className="text-redin-earth-500">Teléfono</p>
                <p className="font-medium text-redin-earth-900">{detail.user.phone ?? '—'}</p>
              </div>
              <div>
                <p className="text-redin-earth-500">Comunidad</p>
                <p className="font-medium text-redin-earth-900">
                  {detail.community ?? '—'}{detail.state && `, ${detail.state}`}
                </p>
              </div>
              <div>
                <p className="text-redin-earth-500">Disponible</p>
                <Badge variant={detail.isAvailable ? 'green' : 'gray'} size="sm" dot={detail.isAvailable}>
                  {detail.isAvailable ? 'Sí' : 'No'}
                </Badge>
              </div>
            </div>

            {detail.bio && (
              <div>
                <p className="text-sm text-redin-earth-500 mb-1">Biografía</p>
                <p className="text-sm text-redin-earth-700 bg-redin-earth-50 rounded-lg p-3">
                  {detail.bio}
                </p>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-redin-earth-700 mb-2">Lenguas</p>
              <div className="space-y-2">
                {detail.languages.map((l) => (
                  <div
                    key={l.id}
                    className="flex items-center justify-between py-2 px-3 bg-redin-earth-50 rounded-lg text-sm"
                  >
                    <div>
                      <span className="font-medium text-redin-earth-700">
                        {l.variant.language.name}
                      </span>
                      <span className="text-redin-earth-400 ml-2">— {l.variant.name}</span>
                    </div>
                    <Badge variant="forest" size="sm">
                      {l.proficiency === 'NATIVE' ? 'Nativo' : l.proficiency === 'ADVANCED' ? 'Avanzado' : 'Intermedio'}
                    </Badge>
                  </div>
                ))}
                {detail.languages.length === 0 && (
                  <p className="text-sm text-redin-earth-400">Sin lenguas registradas</p>
                )}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-redin-earth-700 mb-2">Datos bancarios</p>
              <div className="grid grid-cols-3 gap-4 text-sm bg-redin-earth-50 rounded-lg p-3">
                <div>
                  <p className="text-redin-earth-500">Banco</p>
                  <p className="font-medium text-redin-earth-900">{detail.bankName ?? '—'}</p>
                </div>
                <div>
                  <p className="text-redin-earth-500">CLABE</p>
                  <p className="font-mono text-redin-earth-900">{detail.bankClabe ?? '—'}</p>
                </div>
                <div>
                  <p className="text-redin-earth-500">Titular</p>
                  <p className="font-medium text-redin-earth-900">{detail.bankHolder ?? '—'}</p>
                </div>
              </div>
            </div>

            {/* Deactivate / Reactivate */}
            <div className="border-t border-redin-earth-200 pt-4">
              {detail.user.isActive ? (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={async () => {
                    if (!confirm(`Desactivar la cuenta de ${detail.user.name}?`)) return;
                    try {
                      await api.patch(`/interpreters/${detail.id}/toggle-active`, { isActive: false });
                      toast.success('Cuenta desactivada');
                      setDetail(null);
                      fetchData(pagination.page, search);
                    } catch (err) { toast.error(err instanceof Error ? err.message : 'Error'); }
                  }}
                >
                  Desactivar cuenta
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={async () => {
                    try {
                      await api.patch(`/interpreters/${detail.id}/toggle-active`, { isActive: true });
                      toast.success('Cuenta reactivada');
                      setDetail(null);
                      fetchData(pagination.page, search);
                    } catch (err) { toast.error(err instanceof Error ? err.message : 'Error'); }
                  }}
                >
                  Reactivar cuenta
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Temp password modal */}
      <Modal
        open={!!tempPasswordModal}
        onClose={() => { setTempPasswordModal(null); setCopied(false); }}
        title="Contraseña temporal generada"
        size="sm"
        footer={
          <Button onClick={() => { setTempPasswordModal(null); setCopied(false); }}>
            Entendido
          </Button>
        }
      >
        {tempPasswordModal && (
          <div className="space-y-4 text-center">
            <p className="text-sm text-redin-earth-600">
              {tempPasswordModal.name} puede iniciar sesion con esta contrasena temporal:
            </p>
            <div className="flex items-center justify-center gap-3 py-3 bg-redin-earth-50 rounded-lg">
              <code className="text-2xl font-mono font-bold text-redin-earth-900 tracking-wider">
                {tempPasswordModal.password}
              </code>
              <button
                onClick={() => copyPassword(tempPasswordModal.password)}
                className="p-2 rounded-lg hover:bg-redin-earth-200 text-redin-earth-500 transition-colors"
                title="Copiar"
              >
                {copied ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
              </button>
            </div>
            <p className="text-xs text-redin-earth-500">
              Comparte esta contrasena con el interprete. Al iniciar sesion por primera vez, se le pedira que la cambie.
            </p>
          </div>
        )}
      </Modal>

      {/* Delete (deactivate) confirmation modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Desactivar interprete"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button
              onClick={deleteInterpreter}
              loading={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Desactivar
            </Button>
          </>
        }
      >
        {deleteTarget && (
          <div className="space-y-2 text-sm text-redin-earth-600">
            <p>Desactivar a <strong>{deleteTarget.user.name}</strong>?</p>
            <ul className="list-disc ml-4 text-xs space-y-1">
              <li>No podra acceder a la plataforma</li>
              <li>No recibira nuevas solicitudes</li>
              <li>Su historial de servicios y pagos se mantiene</li>
            </ul>
          </div>
        )}
      </Modal>

      {/*
        Reset password confirmation modal.
        Dos copies distintos segun el estado del interprete:
        - mustChangePassword=true (sigue con la contrasena temporal): aviso normal,
          regenerar simplemente reemplaza una temp por otra.
        - mustChangePassword=false (ya activo su cuenta con su propia contrasena):
          aviso reforzado — destruye la contrasena que el usuario configuro y le
          obliga a usar una temporal otra vez. Solo deberia hacerse si el interprete
          reporta haberla perdido.
      */}
      <Modal
        open={!!resetTarget}
        onClose={() => !resetting && setResetTarget(null)}
        title={
          resetTarget?.mustChangePassword === false
            ? 'Restablecer contrasena ya activa'
            : 'Regenerar contrasena temporal'
        }
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setResetTarget(null)} disabled={resetting}>
              Cancelar
            </Button>
            <Button
              onClick={confirmResetPassword}
              loading={resetting}
              className={
                resetTarget?.mustChangePassword === false
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : ''
              }
            >
              {resetTarget?.mustChangePassword === false
                ? 'Si, restablecer contrasena'
                : 'Regenerar contrasena'}
            </Button>
          </>
        }
      >
        {resetTarget && (
          <div className="space-y-3 text-sm text-redin-earth-600">
            {resetTarget.mustChangePassword === false ? (
              <>
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <RefreshCw className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-medium text-amber-900">
                      {resetTarget.user.name} ya activo su cuenta y tiene una contrasena propia.
                    </p>
                    <p className="text-xs text-amber-800">
                      Regenerar va a <strong>destruir su contrasena actual</strong> y reemplazarla por una
                      temporal. El interprete ya no podra entrar con su contrasena actual y se le obligara
                      a definir una nueva en su proximo inicio de sesion.
                    </p>
                  </div>
                </div>
                <p className="text-xs text-redin-earth-500">
                  Usa esta opcion <strong>solo</strong> si el interprete reporto que olvido su
                  contrasena. Si solo necesitas mostrarle su contrasena actual, no podemos
                  ayudarte — el sistema no la guarda en texto plano.
                </p>
              </>
            ) : (
              <>
                <p>
                  Regenerar la contrasena temporal de <strong>{resetTarget.user.name}</strong>?
                </p>
                <p className="text-xs text-redin-earth-500">
                  La temporal anterior dejara de funcionar y se generara una nueva. Comparte la
                  nueva con el interprete para que pueda iniciar sesion.
                </p>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
