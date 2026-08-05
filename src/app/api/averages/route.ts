import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const TURNSTILE_SITEVERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TURNSTILE_ACTION = 'turnstile-spin-v2';
const VALID_TERMS = new Set(['fall', 'winter', 'summer']);

interface TurnstileResult {
  success?: boolean;
  action?: string;
  'error-codes'?: string[];
}

function getClientIp(request: NextRequest): string | null {
  const netlifyIp = request.headers.get('x-nf-client-connection-ip');
  if (netlifyIp) return netlifyIp;

  const forwardedFor = request.headers.get('x-forwarded-for');
  return forwardedFor?.split(',')[0]?.trim() || null;
}

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }

  const { courseId, average, term, year, turnstileToken } = body as Record<
    string,
    unknown
  >;
  const maxYear = new Date().getFullYear() + 1;

  if (
    !Number.isInteger(courseId) ||
    (courseId as number) <= 0 ||
    typeof average !== 'number' ||
    !Number.isFinite(average) ||
    average < 0 ||
    average > 100 ||
    typeof term !== 'string' ||
    !VALID_TERMS.has(term) ||
    !Number.isInteger(year) ||
    (year as number) < 2000 ||
    (year as number) > maxYear ||
    typeof turnstileToken !== 'string' ||
    turnstileToken.length === 0 ||
    turnstileToken.length > 4096
  ) {
    return NextResponse.json(
      { success: false, error: 'Invalid submission' },
      { status: 400 }
    );
  }

  const turnstileSecret = process.env.TURNSTILE_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!turnstileSecret || !supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Missing server-side Turnstile or Supabase configuration');
    return NextResponse.json(
      { success: false, error: 'Server configuration error' },
      { status: 500 }
    );
  }

  const clientIp = getClientIp(request);
  const siteverifyBody = new URLSearchParams({
    secret: turnstileSecret,
    response: turnstileToken,
  });
  if (clientIp) siteverifyBody.set('remoteip', clientIp);

  let turnstileResult: TurnstileResult;
  try {
    const verifyResponse = await fetch(TURNSTILE_SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: siteverifyBody,
      cache: 'no-store',
    });

    if (!verifyResponse.ok) {
      throw new Error(`siteverify returned ${verifyResponse.status}`);
    }

    turnstileResult = (await verifyResponse.json()) as TurnstileResult;
  } catch (error) {
    console.error('Turnstile siteverify request failed:', error);
    return NextResponse.json(
      { success: false, error: 'Verification failed. Please try again.' },
      { status: 403 }
    );
  }

  if (
    turnstileResult.success !== true ||
    turnstileResult.action !== TURNSTILE_ACTION
  ) {
    console.warn('Turnstile rejected a submission', {
      action: turnstileResult.action,
      errorCodes: turnstileResult['error-codes'],
    });
    return NextResponse.json(
      { success: false, error: 'Verification failed. Please try again.' },
      { status: 403 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: insertError } = await supabase.from('student_averages').insert({
    course_id: courseId,
    grade: average,
    term,
    year,
    user_ip: clientIp,
    user_agent: request.headers.get('user-agent'),
  });

  if (insertError) {
    console.error('Error submitting average:', insertError);
    return NextResponse.json(
      { success: false, error: 'Failed to submit average. Please try again.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
