'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

const LAST_RECORDED_DATE_KEY = 'western_averages_last_recorded_date';
const RETRY_COOLDOWN_MS = 15 * 60 * 1_000;

function getTorontoDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export default function VisitTracker() {
  const pathname = usePathname();
  const lastAttemptRef = useRef<{ date: string; attemptedAt: number } | null>(
    null,
  );
  const recordedInSessionRef = useRef<string | null>(null);

  useEffect(() => {
    // Viewing the private dashboard should not affect its own numbers.
    if (pathname.startsWith('/analytics')) {
      return;
    }

    const today = getTorontoDate();

    if (recordedInSessionRef.current === today) return;

    const lastAttempt = lastAttemptRef.current;
    if (
      lastAttempt?.date === today &&
      Date.now() - lastAttempt.attemptedAt < RETRY_COOLDOWN_MS
    ) {
      return;
    }

    try {
      if (localStorage.getItem(LAST_RECORDED_DATE_KEY) === today) return;
    } catch {
      // The server-side signed cookie still deduplicates browsers without storage.
    }

    lastAttemptRef.current = { date: today, attemptedAt: Date.now() };

    fetch('/api/analytics/visit', {
      method: 'POST',
      keepalive: true,
    })
      .then((response) => {
        if (!response.ok) return;
        recordedInSessionRef.current = today;
        try {
          localStorage.setItem(LAST_RECORDED_DATE_KEY, today);
        } catch {
          // The in-memory guard prevents navigation retries for this session.
        }
      })
      .catch(() => {
        // Analytics must never interrupt the visitor's experience.
      });
  }, [pathname]);

  return null;
}
