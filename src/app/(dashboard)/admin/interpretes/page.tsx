'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Search,
  Plus,
  Users,
  Eye,
  Edit3,
  Trash2,
  Mail,
  MapPin,
  Copy,
  RefreshCw,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useSocketContext } from '@/contexts/SocketContext';
import { useSocketReconnect } from '@/hooks/useSocketReconnect';
import { cn } from '@/lib/utils';
import {
  validateEmail,
  validatePhone,
  validateCLABE,
  validateHourlyRate,
  validateName,
} from '@/lib/validators';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  PhoneInput,
  formatPhoneE164,
  parsePhoneStored,
  DEFAULT_PHONE_COUNTRY,
  type PhoneCountry,
} from '@/components/ui/PhoneInput';
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
  phone: string;           // Solo digitos nacionales — exactamente 10
  phoneCountry: PhoneCountry;  // Lada seleccionada (default MX)
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
  phoneCountry: DEFAULT_PHONE_COUNTRY,
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

  // Errores por campo del form. Cada validador retorna string|null; aqui lo
  // guardamos para mostrarlo inline en el Input via su prop `error`.
  type FormErrors = Partial<Record<'name' | 'email' | 'phone' | 'bankClabe' | 'hourlyRate', string | null>>;
  const [errors, setErrors] = useState<FormErrors>({});

  function setFieldError(field: keyof FormErrors, message: string | null) {
    setErrors((prev) => ({ ...prev, [field]: message }));
  }

  /**
   * Valida todos los campos requeridos. Llamado al hacer submit.
   * Retorna el objeto de errores actualizado (no solo boolean) para que el
   * caller pueda inspeccionarlo y decidir a que seccion saltar — el state
   * `errors` se actualiza async, asi que leerlo justo despues no sirve.
   */
  function validateAllFields(): FormErrors {
    const next: FormErrors = {
      name: validateName(form.name, 'Nombre'),
      // Email solo se valida (y bloquea) al crear; al editar el email viene disabled.
      email: editingId ? null : validateEmail(form.email, { required: true }),
      phone: validatePhone(form.phone, { required: true }),
      bankClabe: validateCLABE(form.bankClabe),
      hourlyRate: validateHourlyRate(form.hourlyRate),
    };
    setErrors(next);
    return next;
  }

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

  // Refetch al reconectar (recupera eventos perdidos offline)
  useSocketReconnect(() => fetchData(pagination.page, search));

  // Auto-refresh on any relevant WebSocket event.
  // `interpreter:first_login` lo emite el backend cuando un interprete consulta
  // su sesion por primera vez — actualiza la columna "Acceso" de Pendiente a
  // Activo sin que el admin tenga que refrescar.
  useEffect(() => {
    if (!socket) return;
    const refresh = () => fetchData(pagination.page, search);
    const events = [
      'request:accepted',
      'request:completed',
      'request:cancelled',
      'request:started',
      'interpreter:first_login',
    ];
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
    setErrors({});
    setFormSection(0);
    setShowForm(true);
  }

  async function openEdit(interp: Interpreter) {
    setEditingId(interp.id);
    setErrors({});
    // Parsear el telefono almacenado: si trae lada (+52 o +1) lo separamos
    // del numero nacional. Datos legacy de 10 digitos puros se asumen MX.
    const parsed = parsePhoneStored(interp.user.phone ?? '');
    setForm({
      name: interp.user.name,
      email: interp.user.email,
      phone: parsed.digits,
      phoneCountry: parsed.country,
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
    // Validacion local antes de enviar — los errores se pintan inline en cada
    // Input y enfocamos la primera seccion que tenga error.
    const next = validateAllFields();
    const hasErrors = Object.values(next).some((v) => !!v);
    if (hasErrors) {
      // Saltar a la primera seccion con error.
      // Seccion 0: datos personales (name/email/phone).
      // Seccion 2: datos bancarios (hourlyRate/CLABE).
      if (next.name || next.email || next.phone) {
        setFormSection(0);
      } else if (next.bankClabe || next.hourlyRate) {
        setFormSection(2);
      }
      toast.error('Revisa los campos marcados en rojo');
      return;
    }

    setSaving(true);
    try {
      // Concatena lada + digitos antes de enviar al backend. Ej: '525512345678'
      // para MX, '15551234567' para US. El backend lo normaliza/almacena.
      const phoneFull = form.phone ? formatPhoneE164(form.phone, form.phoneCountry) : '';
      const shared: Record<string, unknown> = {
        name: form.name,
        ...(phoneFull && { phone: phoneFull }),
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
        // Cuenta legacy creada antes de la politica centralizada (sin contrasena
        // registrada en DB). Para verla hay que regenerarla primero.
        toast('Sin contrasena registrada — usa el boton de regenerar', { icon: 'ℹ️', duration: 4000 });
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
                      {/* Columna "Disponible": el toggle controla isAvailable.
                          Si la cuenta esta desactivada (!user.isActive), el toggle
                          se bloquea visualmente (cursor-not-allowed, opacity).
                          El estado "Desactivado" aparece en la columna "Acceso",
                          no aqui. */}
                      <label className={cn(
                        'relative inline-flex items-center',
                        interp.user.isActive ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                      )}>
                        <input
                          type="checkbox"
                          checked={interp.user.isActive && interp.isAvailable}
                          disabled={!interp.user.isActive}
                          onChange={() => interp.user.isActive && handleToggleAvailability(interp.id, !interp.isAvailable)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-redin-earth-200 peer-checked:bg-redin-forest-500 rounded-full transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
                      </label>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-mono text-redin-earth-600">${Number(interp.hourlyRate ?? 300)}/hr</span>
                    </TableCell>
                    <TableCell>
                      {/* Columna "Acceso" — 3 estados:
                          1. Cuenta desactivada → badge gris "Desactivado", sin botones.
                          2. Cuenta activa pero el interprete NUNCA inicio sesion
                             (firstLoginAt es null) → badge amber "Pendiente acceso".
                          3. Cuenta activa y ya inicio sesion al menos una vez → "Activo".
                          Los botones ver/regenerar estan siempre disponibles cuando
                          la cuenta esta activa, sin importar firstLoginAt. */}
                      {!interp.user.isActive ? (
                        <Badge variant="gray" size="sm">Desactivado</Badge>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          {interp.firstLoginAt ? (
                            <Badge variant="green" size="sm">Activo</Badge>
                          ) : (
                            <Badge variant="amber" size="sm">Pendiente</Badge>
                          )}
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
              // El boton NO se deshabilita aunque falten campos: queremos que el
              // usuario pueda intentar enviar para ver los errores inline.
              // saveInterpreter() valida y salta a la seccion con error.
              <Button
                onClick={saveInterpreter}
                loading={saving}
              >
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
              onChange={(e) => {
                setForm({ ...form, name: e.target.value });
                if (errors.name) setFieldError('name', null);
              }}
              onBlur={() => setFieldError('name', validateName(form.name, 'Nombre'))}
              error={errors.name ?? undefined}
              placeholder="Ej. Maria Gonzalez Hernandez"
              required
            />
            <Input
              label="Correo electrónico"
              type="email"
              value={form.email}
              onChange={(e) => {
                setForm({ ...form, email: e.target.value });
                if (errors.email) setFieldError('email', null);
              }}
              onBlur={() => setFieldError('email', validateEmail(form.email, { required: !editingId }))}
              error={errors.email ?? undefined}
              leftIcon={<Mail className="h-4 w-4" />}
              required
              disabled={!!editingId}
              placeholder="interprete@ejemplo.com"
            />
            <PhoneInput
              label="Teléfono *"
              value={form.phone}
              country={form.phoneCountry}
              onChange={(v) => {
                setForm({ ...form, phone: v });
                if (errors.phone) setFieldError('phone', null);
              }}
              onCountryChange={(c) => setForm({ ...form, phoneCountry: c })}
              onBlur={() => setFieldError('phone', validatePhone(form.phone, { required: true }))}
              error={errors.phone ?? undefined}
              required
            />
            <Input
              label="Comunidad"
              value={form.community}
              onChange={(e) => setForm({ ...form, community: e.target.value })}
              leftIcon={<MapPin className="h-4 w-4" />}
              placeholder="Ej. San Juan Chamula"
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
              label="Tarifa por hora (MXN)"
              type="number"
              min={1}
              step={50}
              value={form.hourlyRate}
              onChange={(e) => {
                setForm({ ...form, hourlyRate: e.target.value });
                if (errors.hourlyRate) setFieldError('hourlyRate', null);
              }}
              onBlur={() => setFieldError('hourlyRate', validateHourlyRate(form.hourlyRate))}
              error={errors.hourlyRate ?? undefined}
              placeholder="300"
            />
            <Input
              label="Nombre del banco"
              value={form.bankName}
              onChange={(e) => setForm({ ...form, bankName: e.target.value })}
              placeholder="Ej. BBVA, Banamex..."
            />
            <Input
              label="CLABE interbancaria"
              value={form.bankClabe}
              onChange={(e) => {
                // Solo aceptar digitos
                const onlyDigits = e.target.value.replace(/[^0-9]/g, '');
                setForm({ ...form, bankClabe: onlyDigits });
                if (errors.bankClabe) setFieldError('bankClabe', null);
              }}
              onBlur={() => setFieldError('bankClabe', validateCLABE(form.bankClabe))}
              error={errors.bankClabe ?? undefined}
              placeholder="18 dígitos"
              maxLength={18}
              inputMode="numeric"
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
              Comparte esta contrasena con el interprete — esta es la que usara para iniciar sesion.
              Si la pierde, puedes regenerarla en cualquier momento desde esta pantalla.
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
        Modal de regenerar contrasena.
        Politica centralizada (2026-05-11): el admin administra la contrasena.
        Siempre el mismo copy — regenerar invalida la anterior y crea una nueva
        que el admin comparte con el interprete.
      */}
      <Modal
        open={!!resetTarget}
        onClose={() => !resetting && setResetTarget(null)}
        title="Regenerar contrasena"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setResetTarget(null)} disabled={resetting}>
              Cancelar
            </Button>
            <Button onClick={confirmResetPassword} loading={resetting}>
              Regenerar contrasena
            </Button>
          </>
        }
      >
        {resetTarget && (
          <div className="space-y-3 text-sm text-redin-earth-600">
            <p>
              Regenerar la contrasena de <strong>{resetTarget.user.name}</strong>?
            </p>
            <p className="text-xs text-redin-earth-500">
              La contrasena anterior dejara de funcionar inmediatamente. Se generara
              una nueva — copiala y compartela con el interprete para que pueda iniciar
              sesion.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
