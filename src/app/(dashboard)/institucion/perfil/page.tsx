'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import type { ApiResponse, InstitutionProfile } from '@/types';

const institutionTypes = [
  { value: 'hospital', label: 'Hospital' },
  { value: 'juzgado', label: 'Juzgado' },
  { value: 'policia', label: 'Policia' },
  { value: 'gobierno', label: 'Dependencia gubernamental' },
  { value: 'ong', label: 'Organizacion civil' },
  { value: 'otro', label: 'Otro' },
];

export default function PerfilInstitucionPage() {
  const [profile, setProfile] = useState<InstitutionProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', type: '', address: '', city: '', state: '', phone: '' });

  useEffect(() => {
    api.get<ApiResponse<InstitutionProfile>>('/institution-profile')
      .then((res) => {
        setProfile(res.data);
        setForm({
          name: res.data.name ?? '',
          type: res.data.type ?? '',
          address: res.data.address ?? '',
          city: res.data.city ?? '',
          state: res.data.state ?? '',
          phone: res.data.user?.phone ?? '',
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await api.patch<ApiResponse<InstitutionProfile>>('/institution-profile', form);
      setProfile(res.data);
      setEditing(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al guardar');
    }
    setSaving(false);
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (!profile) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-redin-earth-900">Perfil de la institucion</h1>

      <Card>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-redin-earth-900">Datos de la institucion</h2>
            {!editing && <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Editar</Button>}
          </div>

          {editing ? (
            <div className="space-y-3">
              <Input label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <div>
                <label className="block text-sm font-medium text-redin-earth-700 mb-1">Tipo</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full rounded-lg border border-redin-earth-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-redin-gold-400"
                >
                  <option value="">Seleccionar...</option>
                  {institutionTypes.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <Input label="Direccion" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              <Input label="Ciudad" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              <Input label="Estado" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
              <Input label="Telefono" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <div className="flex gap-3">
                <Button onClick={handleSave} loading={saving}>Guardar</Button>
                <Button variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div><span className="text-redin-earth-500">Nombre:</span><p className="font-medium text-redin-earth-900">{profile.name}</p></div>
              <div><span className="text-redin-earth-500">Tipo:</span><p className="font-medium text-redin-earth-900 capitalize">{profile.type ?? '—'}</p></div>
              <div><span className="text-redin-earth-500">Direccion:</span><p className="font-medium text-redin-earth-900">{profile.address ?? '—'}</p></div>
              <div><span className="text-redin-earth-500">Ciudad:</span><p className="font-medium text-redin-earth-900">{profile.city ?? '—'}</p></div>
              <div><span className="text-redin-earth-500">Estado:</span><p className="font-medium text-redin-earth-900">{profile.state ?? '—'}</p></div>
              <div><span className="text-redin-earth-500">Telefono:</span><p className="font-medium text-redin-earth-900">{profile.user?.phone ?? '—'}</p></div>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <div className="p-6 space-y-3">
          <h2 className="text-lg font-semibold text-redin-earth-900">Datos de cuenta</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div><span className="text-redin-earth-500">Email:</span><p className="font-medium text-redin-earth-600">{profile.user?.email}</p></div>
            <div><span className="text-redin-earth-500">Responsable:</span><p className="font-medium text-redin-earth-900">{profile.user?.name}</p></div>
            {profile.user?.createdAt && (
              <div><span className="text-redin-earth-500">Registrado:</span><p className="font-medium text-redin-earth-900">{formatDate(profile.user.createdAt)}</p></div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
