import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import {
  getAllowedTurnstileHostnames,
  getIndependentServerSecret,
  getTrustedClientIp,
  isAllowedOrigin,
  isValidTurnstileResult,
  keyedIdentifier,
  readJsonBody,
  RequestBodyError,
  sanitizeUserAgent,
  type TurnstileVerificationResult,
} from '@/lib/request-security';

export const runtime = 'nodejs';

const TURNSTILE_SITEVERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TURNSTILE_ACTION = 'turnstile-spin-v2';
const VALID_TERMS = new Set(['fall', 'winter', 'summer']);
const MAX_REQUEST_BODY_BYTES = 8_192;
const TURNSTILE_TIMEOUT_MS = 7_000;

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  headers?: HeadersInit,
) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      ...headers,
    },
  });
}

export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request)) {
    return jsonResponse(
      { success: false, error: 'Request origin is not allowed' },
      403,
    );
  }

  let body: unknown;
  try {
    body = await readJsonBody(request, MAX_REQUEST_BODY_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return jsonResponse({ success: false, error: error.message }, error.status);
    }
    return jsonResponse({ success: false, error: 'Invalid request body' }, 400);
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return jsonResponse({ success: false, error: 'Invalid request body' }, 400);
  }

  const { courseId, average, term, year, turnstileToken } = body as Record<
    string,
    unknown
  >;
  const maxYear = new Date().getFullYear() + 1;
  const averageHasValidPrecision =
    typeof average === 'number' &&
    Math.abs(average * 10 - Math.round(average * 10)) < 1e-9;

  if (
    !Number.isSafeInteger(courseId) ||
    (courseId as number) <= 0 ||
    typeof average !== 'number' ||
    !Number.isFinite(average) ||
    average < 0 ||
    average > 100 ||
    !averageHasValidPrecision ||
    typeof term !== 'string' ||
    !VALID_TERMS.has(term) ||
    !Number.isSafeInteger(year) ||
    (year as number) < 2000 ||
    (year as number) > maxYear ||
    typeof turnstileToken !== 'string' ||
    turnstileToken.trim().length === 0 ||
    turnstileToken.length > 2_048
  ) {
    return jsonResponse({ success: false, error: 'Invalid submission' }, 400);
  }

  const turnstileSecret = process.env.TURNSTILE_SECRET;
  const abusePreventionSecret = getIndependentServerSecret(
    process.env.ABUSE_PREVENTION_SECRET,
    [
      turnstileSecret,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      process.env.ANALYTICS_SECRET,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    ],
    turnstileSecret,
  );
  const allowedTurnstileHostnames = getAllowedTurnstileHostnames();
  const clientIp = getTrustedClientIp(request);

  if (
    !turnstileSecret ||
    !abusePreventionSecret ||
    allowedTurnstileHostnames.size === 0 ||
    !clientIp
  ) {
    console.error('Missing or invalid server-side submission security configuration');
    return jsonResponse(
      { success: false, error: 'Server configuration error' },
      503,
    );
  }

  const userAgent = sanitizeUserAgent(request.headers.get('user-agent'));
  const abuseFingerprint = keyedIdentifier(
    abusePreventionSecret,
    'average-client',
    `${clientIp}\n${userAgent}`,
  );
  const networkFingerprint = keyedIdentifier(
    abusePreventionSecret,
    'average-network',
    clientIp,
  );
  const submissionKey = keyedIdentifier(
    abusePreventionSecret,
    'turnstile-token',
    turnstileToken,
  );

  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
    const { error: attemptError } = await supabase.rpc(
      'check_average_submission_attempt',
      { network_fingerprint_param: networkFingerprint },
    );

    if (attemptError) {
      if (attemptError.message.toLowerCase().includes('attempt_rate_limit_exceeded')) {
        return jsonResponse(
          {
            success: false,
            error: 'Too many attempts. Please try again later.',
          },
          429,
          { 'Retry-After': '600' },
        );
      }
      console.error(
        'Unable to enforce submission attempt limit:',
        attemptError.code ?? 'database error',
      );
      return jsonResponse(
        { success: false, error: 'Server configuration error' },
        503,
      );
    }
  } catch (error) {
    console.error(
      'Unable to initialize submission security:',
      error instanceof Error ? error.message : 'unknown error',
    );
    return jsonResponse(
      { success: false, error: 'Server configuration error' },
      503,
    );
  }

  const siteverifyBody = new URLSearchParams({
    secret: turnstileSecret,
    response: turnstileToken,
    remoteip: clientIp,
    idempotency_key: randomUUID(),
  });

  let turnstileResult: TurnstileVerificationResult;
  try {
    const verifyResponse = await fetch(TURNSTILE_SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: siteverifyBody,
      cache: 'no-store',
      signal: AbortSignal.timeout(TURNSTILE_TIMEOUT_MS),
    });

    if (!verifyResponse.ok) {
      throw new Error(`siteverify returned ${verifyResponse.status}`);
    }

    turnstileResult = (await verifyResponse.json()) as TurnstileVerificationResult;
  } catch (error) {
    console.error(
      'Turnstile siteverify request failed:',
      error instanceof Error ? error.name : 'unknown error',
    );
    return jsonResponse(
      { success: false, error: 'Verification failed. Please try again.' },
      503,
    );
  }

  if (
    !isValidTurnstileResult(
      turnstileResult,
      TURNSTILE_ACTION,
      allowedTurnstileHostnames,
    )
  ) {
    return jsonResponse(
      { success: false, error: 'Verification failed. Please try again.' },
      403,
    );
  }

  try {
    const { error: insertError } = await supabase.rpc('submit_student_average', {
      course_id_param: courseId,
      grade_param: average,
      term_param: term,
      year_param: year,
      abuse_fingerprint_param: abuseFingerprint,
      network_fingerprint_param: networkFingerprint,
      submission_key_param: submissionKey,
    });

    if (insertError) {
      const errorMessage = insertError.message.toLowerCase();
      if (errorMessage.includes('duplicate_submission')) {
        return jsonResponse(
          { success: false, error: 'This submission was already processed.' },
          409,
        );
      }
      if (
        errorMessage.includes('invalid_submission') ||
        errorMessage.includes('invalid_course')
      ) {
        return jsonResponse({ success: false, error: 'Invalid submission' }, 400);
      }
      if (
        errorMessage.includes('rate_limit_exceeded') ||
        errorMessage.includes('submission_cooldown')
      ) {
        const retryAfter = errorMessage.includes('submission_cooldown')
          ? '86400'
          : '3600';
        return jsonResponse(
          {
            success: false,
            error: 'Too many submissions. Please try again later.',
          },
          429,
          { 'Retry-After': retryAfter },
        );
      }

      console.error('Unable to submit average:', insertError.code ?? 'database error');
      return jsonResponse(
        { success: false, error: 'Failed to submit average. Please try again.' },
        500,
      );
    }
  } catch (error) {
    console.error(
      'Unable to initialize average submission:',
      error instanceof Error ? error.message : 'unknown error',
    );
    return jsonResponse(
      { success: false, error: 'Server configuration error' },
      503,
    );
  }

  return jsonResponse({ success: true }, 201);
}
