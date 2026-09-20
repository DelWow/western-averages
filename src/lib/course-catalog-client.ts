function logCatalogCacheStatus(status: string | null) {
  if (status === 'HIT' || status === 'MISS') {
    console.log(
      `[course-catalog] Redis is functioning (catalog cache ${status}).`,
    );
    return;
  }

  if (status === 'BYPASS') {
    console.warn(
      '[course-catalog] Redis is unavailable or not configured; using the Supabase fallback.',
    );
    return;
  }

  console.warn('[course-catalog] Redis cache status was not reported.');
}

export async function fetchCourseCatalog<T>(): Promise<T[]> {
  const response = await fetch('/api/courses', {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Catalog request failed with ${response.status}`);
  }

  logCatalogCacheStatus(response.headers.get('X-Catalog-Cache'));

  return (await response.json()) as T[];
}
