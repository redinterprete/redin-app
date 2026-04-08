'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useSocketContext } from '@/contexts/SocketContext';
import type { ApiResponse, MeetingInfo } from '@/types';

interface UseBillingTimerOptions {
  requestId: string | null | undefined;
  status: string;
  startedAt: string | null | undefined;
}

interface BillingTimerResult {
  billableSeconds: number;
  totalSeconds: number;
  isRunning: boolean;
  isInGracePeriod: boolean;
  isPausedByGrace: boolean;
  graceRemainingSeconds: number;
  disconnectedParticipant: string | null;
  isLoading: boolean;
  isEnding: boolean;
}

function formatTime(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export { formatTime };

/**
 * Timer facturable con 3 estados:
 * 1. Running — ambos conectados, billable y total corren
 * 2. Grace — uno salio, billable y total corren + countdown de 5min
 * 3. Paused — gracia expiro, billable congelado, total sigue
 */
export function useBillingTimer({
  requestId,
  status,
  startedAt,
}: UseBillingTimerOptions): BillingTimerResult {
  const [billableSeconds, setBillableSeconds] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isInGracePeriod, setIsInGracePeriod] = useState(false);
  const [isPausedByGrace, setIsPausedByGrace] = useState(false);
  const [graceRemainingSeconds, setGraceRemainingSeconds] = useState(0);
  const [disconnectedParticipant, setDisconnectedParticipant] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnding, setIsEnding] = useState(false);
  const { socket } = useSocketContext();

  // Fetch from backend
  const fetchFromServer = useCallback(async () => {
    if (status !== 'IN_PROGRESS' || !requestId) {
      setIsLoading(false);
      return;
    }
    try {
      const res = await api.get<ApiResponse<MeetingInfo>>(`/requests/${requestId}/meeting`);
      const d = res.data;

      setBillableSeconds(d.currentBillableSeconds ?? 0);
      setTotalSeconds(d.totalSeconds ?? 0);

      if (d.grace?.expired) {
        setIsRunning(false);
        setIsPausedByGrace(true);
        setIsInGracePeriod(false);
        setGraceRemainingSeconds(0);
        setDisconnectedParticipant(d.grace.disconnectedParticipant);
      } else if (d.grace?.active) {
        setIsRunning(true);
        setIsPausedByGrace(false);
        setIsInGracePeriod(true);
        setGraceRemainingSeconds(d.grace.remainingSeconds ?? 0);
        setDisconnectedParticipant(d.grace.disconnectedParticipant);
      } else {
        setIsRunning(d.bothConnected);
        setIsPausedByGrace(false);
        setIsInGracePeriod(false);
        setGraceRemainingSeconds(0);
        setDisconnectedParticipant(null);
      }
    } catch {
      // Fallback
      if (startedAt) {
        const t = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
        setBillableSeconds(Math.max(0, t));
        setTotalSeconds(Math.max(0, t));
        setIsRunning(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, [requestId, status, startedAt]);

  useEffect(() => { fetchFromServer(); }, [fetchFromServer]);

  // Tick every second
  useEffect(() => {
    if (status !== 'IN_PROGRESS') return;

    const interval = setInterval(() => {
      // Total ALWAYS ticks
      setTotalSeconds((prev) => prev + 1);

      // Billable ticks when running (includes grace period)
      if (isRunning) {
        setBillableSeconds((prev) => prev + 1);
      }

      // Grace countdown
      if (isInGracePeriod) {
        setGraceRemainingSeconds((prev) => {
          if (prev <= 1) {
            // Grace expired — freeze billable
            setIsRunning(false);
            setIsPausedByGrace(true);
            setIsInGracePeriod(false);
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [status, isRunning, isInGracePeriod]);

  // Socket events
  useEffect(() => {
    if (!socket || !requestId) return;

    const handleBothConnected = (data: { requestId: string }) => {
      if (data.requestId !== requestId) return;
      setIsRunning(true);
      setIsPausedByGrace(false);
      setIsInGracePeriod(false);
      setGraceRemainingSeconds(0);
      setDisconnectedParticipant(null);
    };

    const handleParticipantLeft = (data: { requestId: string; participantType: string }) => {
      if (data.requestId !== requestId) return;
      // Timer stays running during grace
      setIsRunning(true);
      setIsInGracePeriod(true);
      setGraceRemainingSeconds(5 * 60);
      setIsPausedByGrace(false);
      setDisconnectedParticipant(
        data.participantType === 'interpreter' ? 'interprete' : 'institucion'
      );
    };

    const handleDisconnectionWarning = (data: { requestId: string }) => {
      if (data.requestId !== requestId) return;
      setIsRunning(false);
      setIsPausedByGrace(true);
      setIsInGracePeriod(false);
      setGraceRemainingSeconds(0);
    };

    const handleMeetingEnding = (data: { requestId: string }) => {
      if (data.requestId !== requestId) return;
      // Meeting ended — freeze everything, show "Finalizando..."
      setIsRunning(false);
      setIsPausedByGrace(false);
      setIsInGracePeriod(false);
      setGraceRemainingSeconds(0);
      setDisconnectedParticipant(null);
      setIsEnding(true);
    };

    socket.on('meeting:both_connected', handleBothConnected);
    socket.on('meeting:participant_left', handleParticipantLeft);
    socket.on('meeting:disconnection_warning', handleDisconnectionWarning);
    socket.on('meeting:ending', handleMeetingEnding);

    return () => {
      socket.off('meeting:both_connected', handleBothConnected);
      socket.off('meeting:participant_left', handleParticipantLeft);
      socket.off('meeting:disconnection_warning', handleDisconnectionWarning);
      socket.off('meeting:ending', handleMeetingEnding);
    };
  }, [socket, requestId]);

  // Ensure billable never exceeds total
  const safeBillable = Math.min(billableSeconds, totalSeconds);

  return {
    billableSeconds: safeBillable,
    totalSeconds,
    isRunning,
    isInGracePeriod,
    isPausedByGrace,
    graceRemainingSeconds,
    disconnectedParticipant,
    isLoading,
    isEnding,
  };
}
