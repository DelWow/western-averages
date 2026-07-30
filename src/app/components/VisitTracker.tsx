'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const VISITOR_ID_KEY = 'western_averages_visitor_id';
const LAST_RECORDED_DATE_KEY = 'western_averages_last_recorded_date';

function createVisitorId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

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

  useEffect(() => {
    // Viewing the private dashboard should not affect its own numbers.
    if (pathname.startsWith('/analytics')) {
      return;
    }

    const today = getTorontoDate();

    try {
      if (localStorage.getItem(LAST_RECORDED_DATE_KEY) === today) {
        return;
      }

      let visitorId = localStorage.getItem(VISITOR_ID_KEY);
      if (!visitorId) {
        visitorId = createVisitorId();
        localStorage.setItem(VISITOR_ID_KEY, visitorId);
      }

      fetch('/api/analytics/visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId }),
        keepalive: true,
      })
        .then((response) => {
          if (response.ok) {
            localStorage.setItem(LAST_RECORDED_DATE_KEY, today);
          }
        })
        .catch(() => {
          // Analytics must never interrupt the visitor's experience.
        });
    } catch {
      // Browsers that block storage simply aren't included in unique counts.
    }
  }, [pathname]);

  return null;
}
