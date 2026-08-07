'use client';

import { sendGAEvent } from '@next/third-parties/google';

interface AnalyticsEvents {
  course_search: { search_type: 'subject' };
  course_view: { course_level: number };
  sort_courses: { sort_method: string };
  filter_courses: {
    filter_type: 'subject';
    filter_action: 'apply' | 'clear';
  };
  pagination: { page_number: number };
  view_mode_change: { view_mode: 'cards' | 'list' };
}

const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const isGoogleAnalyticsEnabled =
  process.env.NODE_ENV === 'production' &&
  typeof measurementId === 'string' &&
  /^G-[A-Z0-9]+$/.test(measurementId);

export function trackEvent<EventName extends keyof AnalyticsEvents>(
  eventName: EventName,
  parameters: AnalyticsEvents[EventName],
) {
  if (!isGoogleAnalyticsEnabled) {
    return;
  }

  sendGAEvent('event', eventName, parameters);
}
