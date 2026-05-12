'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, Building2, User, Phone } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import {
  validateEmail,
  validatePhone,
  validateName,
  validatePassword,
  validatePasswordMatch,
} from '@/lib/validators';

const institutionTypes = [
  { value: 'hospital', label: 'Hospital' },
  { value: 'juzgado', label: 'Juzgado' },
  { value: 'ministerio_publico', label: 'Ministerio Publico' },
  { value: 'policia', label: 'Policia' },
  { value: 'otro', label: 'Otro' },
];

type FormErrors = Partial<Record<
  'institutionName' | 'name' | 'email' | 'phone' | 'password' | 'confirmPassword',
  string | null
>>;

export default function RegistroPage() {
  const [form, setForm] = useState({
    institutionName: '',
    type: '',
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { dbUser, loading: authLoading, signUp } = useAuth();
  const router = useRouter();

  // Guard: redirect if already authenticated
  useEffect(() => {
    if (authLoading) return;
    if (!dbUser) return;
    if (dbUser.role === 'INSTITUTION') {
      if (dbUser.institution?.approvalStatus === 'APPROVED') router.replace('/institucion');
      else router.replace('/pendiente');
    }
    else router.replace('/');
  }, [dbUser, authLoading, router]);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Limpiar el error de ese campo en cuanto el usuario empieza a corregir
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  }

  function setFieldError(field: keyof FormErrors, message: string | null) {
    setErrors((prev) => ({ ...prev, [field]: message }));
  }

  function validateAllFields(): boolean {
    const next: FormErrors = {
      institutionName: validateName(form.institutionName, 'Nombre de la institucion'),
      name: validateName(form.name, 'Nombre del responsable'),
      email: validateEmail(form.email, { required: true }),
      phone: validatePhone(form.phone, { required: true }),
      password: validatePassword(form.password, 6),
      confirmPassword: validatePasswordMatch(form.password, form.confirmPassword),
    };
    setErrors(next);
    return !Object.values(next).some((v) => !!v);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!validateAllFields()) {
      setError('Revisa los campos marcados en rojo');
      return;
    }

    setLoading(true);
    try {
      await signUp(form.email, form.password, {
        name: form.name,
        phone: form.phone,
        role: 'INSTITUTION',
        institutionData: {
          name: form.institutionName,
          type: form.type || undefined,
        },
      });
      router.push('/pendiente');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al registrar'
      );
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || dbUser) return null;

  return (
    <>
      <h2 className="text-xl font-semibold text-redin-earth-900 mb-6">
        Registro de institucion
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Nombre de la institucion"
          placeholder="Hospital General..."
          value={form.institutionName}
          onChange={(e) => updateField('institutionName', e.target.value)}
          onBlur={() => setFieldError('institutionName', validateName(form.institutionName, 'Nombre de la institucion'))}
          error={errors.institutionName ?? undefined}
          leftIcon={<Building2 className="h-4 w-4" />}
          required
        />

        <Select
          label="Tipo de institucion"
          options={institutionTypes}
          value={form.type}
          onChange={(v) => updateField('type', v)}
          placeholder="Seleccionar tipo"
        />

        <Input
          label="Nombre del responsable"
          placeholder="Nombre completo"
          value={form.name}
          onChange={(e) => updateField('name', e.target.value)}
          onBlur={() => setFieldError('name', validateName(form.name, 'Nombre del responsable'))}
          error={errors.name ?? undefined}
          leftIcon={<User className="h-4 w-4" />}
          required
        />

        <Input
          label="Correo electronico"
          type="email"
          placeholder="institucion@ejemplo.gob.mx"
          value={form.email}
          onChange={(e) => updateField('email', e.target.value)}
          onBlur={() => setFieldError('email', validateEmail(form.email, { required: true }))}
          error={errors.email ?? undefined}
          leftIcon={<Mail className="h-4 w-4" />}
          required
        />

        <Input
          label="Telefono"
          type="tel"
          placeholder="55 1234 5678 (10 digitos)"
          value={form.phone}
          onChange={(e) => {
            // Filtra a chars validos para telefono (digitos, espacios, +, -, parentesis)
            const filtered = e.target.value.replace(/[^+0-9\s\-()]/g, '');
            updateField('phone', filtered);
          }}
          onBlur={() => setFieldError('phone', validatePhone(form.phone, { required: true }))}
          error={errors.phone ?? undefined}
          leftIcon={<Phone className="h-4 w-4" />}
          required
          inputMode="tel"
          maxLength={20}
        />

        <Input
          label="Contrasena"
          type="password"
          placeholder="Minimo 6 caracteres"
          value={form.password}
          onChange={(e) => updateField('password', e.target.value)}
          onBlur={() => setFieldError('password', validatePassword(form.password, 6))}
          error={errors.password ?? undefined}
          leftIcon={<Lock className="h-4 w-4" />}
          required
        />

        <Input
          label="Confirmar contrasena"
          type="password"
          placeholder="Repite tu contrasena"
          value={form.confirmPassword}
          onChange={(e) => updateField('confirmPassword', e.target.value)}
          onBlur={() => setFieldError('confirmPassword', validatePasswordMatch(form.password, form.confirmPassword))}
          error={errors.confirmPassword ?? undefined}
          leftIcon={<Lock className="h-4 w-4" />}
          required
        />

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <Button type="submit" fullWidth loading={loading}>
          Registrarse
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-redin-earth-500">
        ¿Ya tienes cuenta?{' '}
        <Link
          href="/login-institucion"
          className="font-medium text-redin-gold-500 hover:text-redin-gold-600"
        >
          Inicia sesion
        </Link>
      </p>
    </>
  );
}
