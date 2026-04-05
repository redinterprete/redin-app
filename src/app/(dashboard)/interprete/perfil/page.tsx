'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import type { ApiResponse, InterpreterProfile } from '@/types';

export default function PerfilInterpretePage() {
  const [profile, setProfile] = useState<InterpreterProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({ phone: '', community: '', state: '', bio: '' });
  const [bankForm, setBankForm] = useState({ bankName: '', bankClabe: '', bankHolder: '' });
  const [savingBank, setSavingBank] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    api.get<ApiResponse<InterpreterProfile>>('/interpreter-profile')
      .then((res) => {
        const p = res.data;
        setProfile(p);
        setProfileForm({
          phone: p.user?.phone ?? '',
          community: p.community ?? '',
          state: p.state ?? '',
          bio: p.bio ?? '',
        });
        setBankForm({
          bankName: p.bankName ?? '',
          bankClabe: p.bankClabe ?? '',
          bankHolder: p.bankHolder ?? '',
        });
        setIsAvailable(p.isAvailable);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function saveProfile() {
    setSaving(true);
    try {
      const res = await api.patch<ApiResponse<InterpreterProfile>>('/interpreter-profile', profileForm);
      setProfile(res.data);
      setEditingProfile(false);
    } catch (err) { alert(err instanceof Error ? err.message : 'Error'); }
    setSaving(false);
  }

  async function saveBank() {
    if (bankForm.bankClabe && !/^\d{18}$/.test(bankForm.bankClabe)) {
      alert('La CLABE debe tener exactamente 18 digitos numericos');
      return;
    }
    setSavingBank(true);
    try {
      await api.patch('/interpreter-profile/bank', bankForm);
      // Update local profile
      if (profile) setProfile({ ...profile, ...bankForm });
    } catch (err) { alert(err instanceof Error ? err.message : 'Error'); }
    setSavingBank(false);
  }

  async function toggleAvailability() {
    setToggling(true);
    try {
      const res = await api.patch<ApiResponse<{ isAvailable: boolean }>>('/interpreter-profile/availability', { isAvailable: !isAvailable });
      setIsAvailable(res.data.isAvailable);
    } catch { /* */ }
    setToggling(false);
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (!profile) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-redin-earth-900">Mi perfil</h1>

      {/* Personal info */}
      <Card>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-redin-earth-900">Informacion personal</h2>
            {!editingProfile && <Button variant="outline" size="sm" onClick={() => setEditingProfile(true)}>Editar</Button>}
          </div>

          {editingProfile ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-redin-earth-500">Nombre:</span><p className="font-medium text-redin-earth-600">{profile.user?.name}</p></div>
                <div><span className="text-redin-earth-500">Email:</span><p className="font-medium text-redin-earth-600">{profile.user?.email}</p></div>
              </div>
              <Input label="Telefono" value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} />
              <Input label="Comunidad" value={profileForm.community} onChange={(e) => setProfileForm({ ...profileForm, community: e.target.value })} />
              <Input label="Estado" value={profileForm.state} onChange={(e) => setProfileForm({ ...profileForm, state: e.target.value })} />
              <div>
                <label className="block text-sm font-medium text-redin-earth-700 mb-1">Biografia</label>
                <textarea
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-redin-earth-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-redin-gold-400 resize-none"
                />
              </div>
              <div className="flex gap-3">
                <Button onClick={saveProfile} loading={saving}>Guardar</Button>
                <Button variant="outline" onClick={() => setEditingProfile(false)}>Cancelar</Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div><span className="text-redin-earth-500">Nombre:</span><p className="font-medium text-redin-earth-900">{profile.user?.name}</p></div>
              <div><span className="text-redin-earth-500">Email:</span><p className="font-medium text-redin-earth-600">{profile.user?.email}</p></div>
              <div><span className="text-redin-earth-500">Telefono:</span><p className="font-medium text-redin-earth-900">{profile.user?.phone ?? '—'}</p></div>
              <div><span className="text-redin-earth-500">Comunidad:</span><p className="font-medium text-redin-earth-900">{profile.community ?? '—'}</p></div>
              <div><span className="text-redin-earth-500">Estado:</span><p className="font-medium text-redin-earth-900">{profile.state ?? '—'}</p></div>
              {profile.bio && <div className="col-span-2"><span className="text-redin-earth-500">Bio:</span><p className="font-medium text-redin-earth-900">{profile.bio}</p></div>}
              {profile.user?.createdAt && <div><span className="text-redin-earth-500">Registrado:</span><p className="font-medium text-redin-earth-900">{formatDate(profile.user.createdAt)}</p></div>}
            </div>
          )}
        </div>
      </Card>

      {/* Languages */}
      <Card>
        <div className="p-6 space-y-3">
          <h2 className="text-lg font-semibold text-redin-earth-900">Mis lenguas</h2>
          <div className="flex flex-wrap gap-2">
            {profile.languages.map((l) => (
              <Badge key={l.id} variant="blue">
                {l.variant?.language?.name} — {l.variant?.name}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-redin-earth-400">Para agregar o modificar tus lenguas, contacta al coordinador de REDIN</p>
        </div>
      </Card>

      {/* Bank */}
      <Card>
        <div className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-redin-earth-900">Datos bancarios</h2>
          <p className="text-xs text-redin-earth-500">Estos datos se usan para depositar tu remuneracion despues de cada servicio</p>
          <div className="space-y-3">
            <Input label="Nombre del banco" value={bankForm.bankName} onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })} />
            <Input label="CLABE interbancaria (18 digitos)" value={bankForm.bankClabe} onChange={(e) => setBankForm({ ...bankForm, bankClabe: e.target.value.replace(/\D/g, '').slice(0, 18) })} />
            <Input label="Titular de la cuenta" value={bankForm.bankHolder} onChange={(e) => setBankForm({ ...bankForm, bankHolder: e.target.value })} />
            <Button onClick={saveBank} loading={savingBank}>Actualizar datos bancarios</Button>
          </div>
        </div>
      </Card>

      {/* Availability */}
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-redin-earth-900 mb-2">Disponibilidad</h2>
          <p className="text-sm text-redin-earth-500 mb-4">Cuando estes disponible, recibiras notificaciones de solicitudes que coincidan con tus lenguas</p>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleAvailability}
              disabled={toggling}
              className={cn(
                'relative inline-flex h-8 w-16 items-center rounded-full transition-colors',
                isAvailable ? 'bg-redin-forest-500' : 'bg-redin-earth-300'
              )}
            >
              <span className={cn('inline-block h-6 w-6 rounded-full bg-white transition-transform', isAvailable ? 'translate-x-9' : 'translate-x-1')} />
            </button>
            <span className={cn('text-sm font-medium', isAvailable ? 'text-redin-forest-700' : 'text-redin-earth-500')}>
              {isAvailable ? 'Disponible para recibir solicitudes' : 'No disponible'}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
