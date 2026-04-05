'use client';

import { useEffect, useState, useRef } from 'react';

interface UseBillingTimerOptions {
  billingStartedAt: string | null | undefined;
  bothConnected: boolean;
  initialBillingMinutes?: number | null;
}

/**
 * Hook that tracks billable seconds — only counts when both participants are connected.
 * On mount, calculates elapsed time from billingStartedAt so the timer survives page refresh.
 * Pauses when one disconnects, resumes when both reconnect.
 */
export function useBillingTimer({
  billingStartedAt,
  bothConnected,
  initialBillingMinutes,
}: UseBillingTimerOptions) {
  const [billingSeconds, setBillingSeconds] = useState(0);
  const isRunning = bothConnected && !!billingStartedAt;

  // On mount (or when billingStartedAt changes): calculate elapsed from server timestamp
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!billingStartedAt) return;

    // If server provides pre-calculated billing minutes, use those
    if (initialBillingMinutes && initialBillingMinutes > 0) {
      setBillingSeconds(initialBillingMinutes * 60);
      initializedRef.current = true;
      return;
    }

    // Otherwise calculate elapsed from billingStartedAt
    const startTime = new Date(billingStartedAt).getTime();
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    setBillingSeconds(Math.max(0, elapsed));
    initializedRef.current = true;
  }, [billingStartedAt, initialBillingMinutes]);

  // Tick every second when running
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setBillingSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  return {
    billingSeconds,
    isRunning,
  };
}
