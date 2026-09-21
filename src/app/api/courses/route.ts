import { NextResponse } from 'next/server';
import { getCourseCatalog } from '@/lib/course-catalog';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const { courses, cacheStatus } = await getCourseCatalog();

    return NextResponse.json(courses, {
      headers: {
        // Redis is the shared cache. This only avoids immediate repeat requests
        // from the same browser and prevents a shared CDN from hiding cache hits.
        'Cache-Control': 'private, max-age=60',
        'X-Catalog-Cache': cacheStatus,
      },
    });
  } catch (error) {
    console.error(
      'Unable to serve the course catalog:',
      error instanceof Error ? error.message : 'unknown error',
    );

    return NextResponse.json(
      { error: 'Unable to load courses' },
      {
        status: 503,
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  }
}
