import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

const VISITOR_ID_PATTERN = /^[a-zA-Z0-9-]{16,80}$/;

export async function POST(request: Request) {
  let visitorId: unknown;

  try {
    ({ visitorId } = await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (typeof visitorId !== 'string' || !VISITOR_ID_PATTERN.test(visitorId)) {
    return NextResponse.json({ error: 'Invalid visitor ID' }, { status: 400 });
  }

  try {
    const supabase = createClient();
    const { error } = await supabase.rpc('record_daily_visit', {
      visitor_identifier: visitorId,
    });

    if (error) {
      console.error('Unable to record analytics visit:', error.message);
      return NextResponse.json({ error: 'Unable to record visit' }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Unable to initialize analytics:', error);
    return NextResponse.json({ error: 'Analytics is not configured' }, { status: 503 });
  }
}
