import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import {
  createVisitorCookie,
  getIndependentServerSecret,
  getTrustedClientIp,
  isAllowedOrigin,
  keyedIdentifier,
  verifyVisitorCookie,
} from '@/lib/request-security';

export const runtime = 'nodejs';

const VISITOR_COOKIE_NAME =
  process.env.NODE_ENV === 'production' ? '__Host-wa_visitor' : 'wa_visitor';
const VISITOR_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function emptyResponse(status: number) {
  return new NextResponse(null, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request)) {
    return emptyResponse(403);
  }

  const analyticsSecret = getIndependentServerSecret(
    process.env.ANALYTICS_SECRET,
    [
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      process.env.TURNSTILE_SECRET,
      process.env.ABUSE_PREVENTION_SECRET,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    ],
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  const clientIp = getTrustedClientIp(request);

  if (
    !analyticsSecret ||
    !clientIp
  ) {
    console.error('Missing or invalid analytics security configuration');
    return emptyResponse(503);
  }

  const storedCookie = request.cookies.get(VISITOR_COOKIE_NAME)?.value;
  let visitorId = verifyVisitorCookie(storedCookie, analyticsSecret);
  let newCookieValue: string | null = null;

  if (!visitorId) {
    const createdCookie = createVisitorCookie(analyticsSecret);
    visitorId = createdCookie.visitorId;
    newCookieValue = createdCookie.value;
  }

  const visitorIdentifier = keyedIdentifier(
    analyticsSecret,
    'analytics-visitor',
    visitorId,
  ).slice(0, 32);
  const issuanceFingerprint = keyedIdentifier(
    analyticsSecret,
    'analytics-issuance-network',
    clientIp,
  );

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.rpc('record_daily_visit', {
      visitor_identifier: visitorIdentifier,
      issuance_fingerprint: issuanceFingerprint,
      is_new_visitor: newCookieValue !== null,
    });

    if (error) {
      if (error.message.toLowerCase().includes('analytics_issuance_rate_limited')) {
        return emptyResponse(429);
      }
      console.error('Unable to record analytics visit:', error.code ?? 'database error');
      return emptyResponse(500);
    }

    const response = emptyResponse(204);
    if (newCookieValue) {
      response.cookies.set(VISITOR_COOKIE_NAME, newCookieValue, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: VISITOR_COOKIE_MAX_AGE_SECONDS,
      });
    }
    return response;
  } catch (error) {
    console.error(
      'Unable to initialize analytics:',
      error instanceof Error ? error.message : 'unknown error',
    );
    return emptyResponse(503);
  }
}
