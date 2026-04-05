'use client';

import { useEffect, useState, useCallback } from 'react';
import { Calendar, Play, Square } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { formatDateTime, formatTimer, formatCurrency } from '@/lib/utils';
import { useSocketContext } from '@/contexts/SocketContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { ZoomButton } from '@/components/shared/ZoomButton';
import { MeetingStatus } from '@/components/shared/MeetingStatus';
import { useBillingTimer } from '@/hooks/useBillingTimer';
import { contextLabel } from '@/components/shared/ContextSelector';
import type { ApiResponse, PaginatedResponse, ServiceRequest, MeetingInfo } from '@/types';

export default function AgendaInterpretePage() {
  const [items, setItems] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [completeModal, setCompleteModal] = useState<ServiceRequest | null>(null);
  const [completedInfo, setCompletedInfo] = useState<{ duration: number; amount: number } | null>(null);
  const [timer, setTimer] = useState(0);
  const [meetingParticipants, setMeetingParticipants] = useState({
    interpreterConnected: false,
    institutionConnected: false,
  });

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get<PaginatedResponse<ServiceRequest>>('/requests/my-agenda?page=1&limit=50');
      setItems(res.data);
    } catch { /* */ }
    setLoading(false);
  }, []);

  const { socket } = useSocketContext();

  useEffect(() => { fetchData(); }, [fetchData]);

  // Fetch meeting participant info for the active request
  useEffect(() => {
    const active = items.find((r) => ['IN_PROGRESS', 'ACCEPTED'].includes(r.status));
    if (!active?.id) return;
    api.get<ApiResponse<MeetingInfo>>(`/requests/${active.id}/meeting`)
      .then((res) => {
        setMeetingParticipants(res.data.participants);
      })
      .catch(() => {});
  }, [items]);

  // Real-time socket events
  useEffect(() => {
    if (!socket) return;
    const handleCancelled = (data: { request: ServiceRequest }) => {
      setItems((prev) => prev.filter((r) => r.id !== data.request.id));
    };
    const handleAccepted = () => { fetchData(); };
    const handleStarted = (data: { request: ServiceRequest }) => {
      setItems((prev) => prev.map((r) => r.id === data.request.id ? data.request : r));
      setMeetingParticipants({ interpreterConnected: true, institutionConnected: true });
    };
    const handleParticipantJoined = (data: { requestId: string; participantType: string }) => {
      setMeetingParticipants((prev) => ({
        ...prev,
        ...(data.participantType === 'interpreter' ? { interpreterConnected: true } : {}),
        ...(data.participantType === 'institution' ? { institutionConnected: true } : {}),
      }));
    };
    const handleParticipantLeft = (data: { requestId: string; participantType: string }) => {
      setMeetingParticipants((prev) => ({
        ...prev,
        ...(data.participantType === 'interpreter' ? { interpreterConnected: false } : {}),
        ...(data.participantType === 'institution' ? { institutionConnected: false } : {}),
      }));
      if (data.participantType === 'institution') {
        toast('La institucion se desconecto. Esperando reconexion...', { icon: '\u23F3' });
      }
    };
    const handleBothConnected = () => {
      setMeetingParticipants({ interpreterConnected: true, institutionConnected: true });
      toast.success('Ambos conectados. El servicio ha iniciado.');
    };
    const handleRenewed = (data: { requestId: string; newJoinUrl: string }) => {
      setItems((prev) => prev.map((r) =>
        r.id === data.requestId ? { ...r, zoomJoinUrl: data.newJoinUrl } : r
      ));
      toast('La reunion se renovo. Usa el nuevo enlace.', { icon: '\uD83D\uDD04', duration: 10000 });
    };
    const handleNoShow = (data: { request: ServiceRequest }) => {
      setItems((prev) => prev.filter((r) => r.id !== data.request.id));
    };

    socket.on('request:cancelled', handleCancelled);
    socket.on('request:accepted', handleAccepted);
    socket.on('request:started', handleStarted);
    socket.on('meeting:participant_joined', handleParticipantJoined);
    socket.on('meeting:participant_left', handleParticipantLeft);
    socket.on('meeting:both_connected', handleBothConnected);
    socket.on('meeting:renewed', handleRenewed);
    socket.on('request:no_show', handleNoShow);

    return () => {
      socket.off('request:cancelled', handleCancelled);
      socket.off('request:accepted', handleAccepted);
      socket.off('request:started', handleStarted);
      socket.off('meeting:participant_joined', handleParticipantJoined);
      socket.off('meeting:participant_left', handleParticipantLeft);
      socket.off('meeting:both_connected', handleBothConnected);
      socket.off('meeting:renewed', handleRenewed);
      socket.off('request:no_show', handleNoShow);
    };
  }, [socket, fetchData]);

  // Live timer for IN_PROGRESS (total elapsed)
  const inProgress = items.find((r) => r.status === 'IN_PROGRESS');
  useEffect(() => {
    if (!inProgress?.startedAt) return;
    const start = new Date(inProgress.startedAt).getTime();
    const update = () => setTimer(Math.floor((Date.now() - start) / 1000));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [inProgress?.startedAt, inProgress?.id]);

  // Billing timer (only counts when both connected)
  const { billingSeconds } = useBillingTimer({
    billingStartedAt: inProgress?.billingStartedAt ?? inProgress?.startedAt ?? null,
    bothConnected: meetingParticipants.interpreterConnected && meetingParticipants.institutionConnected,
    initialBillingMinutes: inProgress?.billingMinutes,
  });

  async function handleStart(id: string) {
    setActionId(id);
    try {
      await api.patch(`/requests/${id}/start`, {});
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
    setActionId(null);
  }

  async function handleComplete() {
    if (!completeModal) return;
    setActionId(completeModal.id);
    try {
      const res = await api.patch<ApiResponse<ServiceRequest>>(`/requests/${completeModal.id}/complete`, {});
      const req = res.data;
      setCompletedInfo({
        duration: req.durationMinutes ?? 0,
        amount: req.payment ? Number(req.payment.amount) : 0,
      });
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
      setCompleteModal(null);
    }
    setActionId(null);
  }

  const accepted = items.filter((r) => r.status === 'ACCEPTED');

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-redin-earth-900">Mi agenda</h1>
      <p className="text-sm text-redin-earth-500">Servicios aceptados y en curso</p>

      {/* In Progress */}
      {inProgress && (
        <Card variant="highlighted">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <StatusBadge status="IN_PROGRESS" />
              <span className="text-sm text-redin-earth-500">Servicio en curso</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <p className="text-lg font-semibold text-redin-earth-900">
                  {inProgress.variant?.language?.name} — {inProgress.variant?.name}
                </p>
                <p className="text-sm text-redin-earth-600">{inProgress.institution?.user?.name}</p>
                {inProgress.context && <p className="text-sm text-redin-earth-500 capitalize">{contextLabel(inProgress.context)}</p>}
              </div>
              <div className="space-y-4">
                <MeetingStatus
                  interpreterConnected={meetingParticipants.interpreterConnected}
                  institutionConnected={meetingParticipants.institutionConnected}
                  billingSeconds={billingSeconds}
                />
                <p className="text-xs text-redin-earth-400 text-center">
                  Tiempo total: {formatTimer(timer)}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <ZoomButton joinUrl={inProgress.zoomJoinUrl} password={inProgress.zoomPassword} size="md" />
              <Button variant="danger" size="lg" className="w-full sm:w-auto min-h-[48px]" leftIcon={<Square className="h-4 w-4" />}
                onClick={() => setCompleteModal(inProgress)}>
                Finalizar servicio
              </Button>
            </div>
            <p className="text-xs text-redin-earth-400 mt-2">
              El servicio se completara automaticamente al cerrar la videollamada.
            </p>
          </div>
        </Card>
      )}

      {/* Accepted */}
      {accepted.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-redin-earth-900">Proximos servicios</h2>
          {accepted.map((req) => (
            <Card key={req.id}>
              <div className="p-4 sm:p-6 space-y-4">
                <div className="space-y-1">
                  <p className="text-base font-semibold text-redin-earth-900">
                    {req.variant?.language?.name} — {req.variant?.name}
                  </p>
                  <p className="text-sm text-redin-earth-600">{req.institution?.user?.name}</p>
                  {req.context && <p className="text-sm text-redin-earth-500 capitalize">{contextLabel(req.context)}</p>}
                  {req.type === 'SCHEDULED' && req.scheduledAt && (
                    <p className="text-sm font-medium text-blue-700">Programada: {formatDateTime(req.scheduledAt)}</p>
                  )}
                </div>
                {req.zoomJoinUrl ? (
                  <div className="space-y-2">
                    <ZoomButton joinUrl={req.zoomJoinUrl} password={req.zoomPassword} fullWidth />
                    <p className="text-xs text-redin-earth-400 text-center">
                      El servicio iniciara automaticamente cuando ambos esten en la videollamada
                    </p>
                  </div>
                ) : (
                  <Button
                    size="lg"
                    className="w-full sm:w-auto shrink-0 min-h-[48px]"
                    loading={actionId === req.id}
                    leftIcon={<Play className="h-4 w-4" />}
                    onClick={() => handleStart(req.id)}
                  >
                    Iniciar servicio
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : !inProgress ? (
        <Card>
          <div className="p-6">
            <EmptyState icon={Calendar} title="No tienes servicios agendados" description="Revisa las solicitudes disponibles" actionLabel="Ver solicitudes" onAction={() => (window.location.href = '/interprete')} />
          </div>
        </Card>
      ) : null}

      {/* Complete modal */}
      <Modal open={!!completeModal} onClose={() => { setCompleteModal(null); setCompletedInfo(null); }} title={completedInfo ? 'Servicio finalizado' : 'Finalizar servicio'} size="sm">
        {completedInfo ? (
          <div className="text-center space-y-4 py-4">
            <div className="h-16 w-16 mx-auto rounded-full bg-redin-forest-100 flex items-center justify-center">
              <svg className="h-8 w-8 text-redin-forest-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <p className="text-sm text-redin-earth-600">Duracion: {completedInfo.duration} min</p>
            <p className="text-2xl font-bold text-redin-forest-700">{formatCurrency(completedInfo.amount)}</p>
            <Button onClick={() => { setCompleteModal(null); setCompletedInfo(null); }}>Cerrar</Button>
          </div>
        ) : (
          <>
            <p className="text-sm text-redin-earth-600 mb-4">Finalizar el servicio de interpretacion? Se registrara la duracion y se calculara tu remuneracion.</p>
            <p className="text-center text-2xl font-mono font-bold text-redin-gold-600 mb-4">{formatTimer(timer)}</p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setCompleteModal(null)}>Cancelar</Button>
              <Button variant="danger" loading={!!actionId} onClick={handleComplete}>Finalizar</Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
