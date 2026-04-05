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
  KeyRound,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
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

  useEffect(() => {
    fetchData(1, search);
  }, [fetchData, search]);

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

  async function handleResetPassword(interp: Interpreter) {
    try {
      const res = await api.post<ApiResponse<{ tempPassword: string }>>(`/interpreters/${interp.id}/reset-password`, {});
      setTempPasswordModal({ name: interp.user.name, password: res.data.tempPassword });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al regenerar');
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
                      <Badge
                        variant={interp.isAvailable ? 'green' : 'gray'}
                        size="sm"
                        dot={interp.isAvailable}
                      >
                        {interp.isAvailable ? 'Sí' : 'No'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {interp.mustChangePassword && interp.tempPassword ? (
                        <div className="flex items-center gap-1.5">
                          <Badge variant="amber" size="sm">Temporal</Badge>
                          <code className="text-xs font-mono bg-redin-earth-100 px-1.5 py-0.5 rounded">{interp.tempPassword}</code>
                          <button
                            onClick={() => copyPassword(interp.tempPassword!)}
                            className="p-0.5 rounded hover:bg-redin-earth-100 text-redin-earth-400 hover:text-redin-earth-600"
                            title="Copiar"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      ) : interp.mustChangePassword ? (
                        <button
                          onClick={() => handleResetPassword(interp)}
                          className="text-xs text-redin-gold-500 hover:text-redin-gold-600 underline"
                        >
                          Regenerar
                        </button>
                      ) : (
                        <Badge variant="green" size="sm">Activo</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleResetPassword(interp)}
                          className="p-1 rounded hover:bg-redin-earth-100 text-redin-earth-400 hover:text-redin-earth-600 transition-colors"
                          aria-label="Regenerar contraseña"
                          title="Regenerar contraseña"
                        >
                          <KeyRound className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openDetail(interp.id)}
                          className="p-1 rounded hover:bg-redin-earth-100 text-redin-earth-400 hover:text-redin-earth-600 transition-colors"
                          aria-label="Ver detalle"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEdit(interp)}
                          className="p-1 rounded hover:bg-redin-earth-100 text-redin-earth-400 hover:text-redin-earth-600 transition-colors"
                          aria-label="Editar"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(interp)}
                          className="p-1 rounded hover:bg-red-100 text-redin-earth-400 hover:text-red-600 transition-colors"
                          aria-label="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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

      {/* Delete confirmation modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar intérprete"
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
              Eliminar
            </Button>
          </>
        }
      >
        {deleteTarget && (
          <p className="text-sm text-redin-earth-600">
            ¿Estás seguro de que deseas eliminar al intérprete{' '}
            <strong>{deleteTarget.user.name}</strong>? Esta acción no se puede deshacer.
          </p>
        )}
      </Modal>
    </div>
  );
}
