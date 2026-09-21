import { randomUUID } from 'node:crypto';

export interface CatalogCourse {
  id: number;
  code: string;
  name: string;
  department: string;
  level: number;
  avg_grade: number | null;
  sqct_grade: string | number | null;
}

export type CatalogCacheStatus = 'HIT' | 'MISS' | 'BYPASS';

export interface CatalogCacheResult {
  courses: CatalogCourse[];
  cacheStatus: CatalogCacheStatus;
}

export interface CatalogCacheStore {
  get(key: string): Promise<string | null>;
  set(
    key: string,
    value: string,
    options: { EX?: number; PX?: number; NX?: boolean },
  ): Promise<string | null>;
  del(key: string): Promise<number>;
  eval(
    script: string,
    options: { keys: string[]; arguments: string[] },
  ): Promise<unknown>;
}

interface CourseCatalogPayload {
  version: 1;
  cachedAt: string;
  courses: CatalogCourse[];
}

interface CourseCatalogCacheOptions {
  getStore: () => Promise<CatalogCacheStore | null>;
  loadCatalog: () => Promise<CatalogCourse[]>;
  ttlSeconds: number;
  onCacheError?: (operation: string, error: unknown) => void;
}

export const COURSE_CATALOG_CACHE_KEY =
  'western-averages:course-catalog:v1';

const COURSE_CATALOG_LOCK_KEY = `${COURSE_CATALOG_CACHE_KEY}:lock`;
const COURSE_CATALOG_LOCK_TTL_MS = 10_000;
const CACHE_WAIT_ATTEMPTS = 20;
const CACHE_WAIT_DELAY_MS = 100;
const DEFAULT_CACHE_TTL_SECONDS = 3_600;
const MIN_CACHE_TTL_SECONDS = 60;
const MAX_CACHE_TTL_SECONDS = 86_400;
const RELEASE_LOCK_SCRIPT = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end
return 0
`;

function isCatalogCourse(value: unknown): value is CatalogCourse {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const course = value as Record<string, unknown>;
  return (
    Number.isSafeInteger(course.id) &&
    typeof course.code === 'string' &&
    typeof course.name === 'string' &&
    typeof course.department === 'string' &&
    typeof course.level === 'number' &&
    Number.isFinite(course.level) &&
    (course.avg_grade === null ||
      (typeof course.avg_grade === 'number' &&
        Number.isFinite(course.avg_grade))) &&
    (course.sqct_grade === null ||
      typeof course.sqct_grade === 'string' ||
      (typeof course.sqct_grade === 'number' &&
        Number.isFinite(course.sqct_grade)))
  );
}

export function parseCourseCatalogPayload(
  serialized: string,
): CatalogCourse[] | null {
  try {
    const parsed: unknown = JSON.parse(serialized);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }

    const payload = parsed as Record<string, unknown>;
    if (
      payload.version !== 1 ||
      typeof payload.cachedAt !== 'string' ||
      !Array.isArray(payload.courses) ||
      !payload.courses.every(isCatalogCourse)
    ) {
      return null;
    }

    return payload.courses;
  } catch {
    return null;
  }
}

export function resolveCourseCatalogTtlSeconds(
  configuredValue: string | undefined,
): number {
  if (!configuredValue) {
    return DEFAULT_CACHE_TTL_SECONDS;
  }

  const parsed = Number(configuredValue);
  if (
    !Number.isSafeInteger(parsed) ||
    parsed < MIN_CACHE_TTL_SECONDS ||
    parsed > MAX_CACHE_TTL_SECONDS
  ) {
    return DEFAULT_CACHE_TTL_SECONDS;
  }

  return parsed;
}

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

export function createCourseCatalogCache({
  getStore,
  loadCatalog,
  ttlSeconds,
  onCacheError = () => {},
}: CourseCatalogCacheOptions) {
  let inFlightLoad: Promise<CatalogCacheResult> | null = null;

  async function readCachedCatalog(
    store: CatalogCacheStore,
  ): Promise<CatalogCourse[] | null> {
    const serialized = await store.get(COURSE_CATALOG_CACHE_KEY);
    if (serialized === null) {
      return null;
    }

    const courses = parseCourseCatalogPayload(serialized);
    if (courses !== null) {
      return courses;
    }

    try {
      await store.del(COURSE_CATALOG_CACHE_KEY);
    } catch (error) {
      onCacheError('delete-invalid-entry', error);
    }
    return null;
  }

  async function writeCachedCatalog(
    store: CatalogCacheStore,
    courses: CatalogCourse[],
  ) {
    const payload: CourseCatalogPayload = {
      version: 1,
      cachedAt: new Date().toISOString(),
      courses,
    };

    await store.set(COURSE_CATALOG_CACHE_KEY, JSON.stringify(payload), {
      EX: ttlSeconds,
    });
  }

  async function loadAndCache(
    store: CatalogCacheStore | null,
    cacheStatus: CatalogCacheStatus,
  ): Promise<CatalogCacheResult> {
    const courses = await loadCatalog();

    if (store) {
      try {
        await writeCachedCatalog(store, courses);
      } catch (error) {
        onCacheError('write', error);
      }
    }

    return { courses, cacheStatus };
  }

  async function loadAfterMiss(
    store: CatalogCacheStore,
  ): Promise<CatalogCacheResult> {
    const lockToken = randomUUID();
    let ownsLock = false;

    try {
      ownsLock =
        (await store.set(COURSE_CATALOG_LOCK_KEY, lockToken, {
          NX: true,
          PX: COURSE_CATALOG_LOCK_TTL_MS,
        })) === 'OK';
    } catch (error) {
      onCacheError('acquire-lock', error);
      return loadAndCache(null, 'BYPASS');
    }

    if (!ownsLock) {
      for (let attempt = 0; attempt < CACHE_WAIT_ATTEMPTS; attempt += 1) {
        await wait(CACHE_WAIT_DELAY_MS);
        try {
          const courses = await readCachedCatalog(store);
          if (courses !== null) {
            return { courses, cacheStatus: 'HIT' };
          }
        } catch (error) {
          onCacheError('wait-read', error);
          return loadAndCache(null, 'BYPASS');
        }
      }

      return loadAndCache(store, 'MISS');
    }

    try {
      // Another instance may have filled the cache between our first read and
      // acquiring the lock.
      try {
        const courses = await readCachedCatalog(store);
        if (courses !== null) {
          return { courses, cacheStatus: 'HIT' };
        }
      } catch (error) {
        onCacheError('locked-read', error);
      }

      return await loadAndCache(store, 'MISS');
    } finally {
      try {
        await store.eval(RELEASE_LOCK_SCRIPT, {
          keys: [COURSE_CATALOG_LOCK_KEY],
          arguments: [lockToken],
        });
      } catch (error) {
        onCacheError('release-lock', error);
      }
    }
  }

  function runSingleFlight(
    load: () => Promise<CatalogCacheResult>,
  ): Promise<CatalogCacheResult> {
    if (!inFlightLoad) {
      inFlightLoad = load().finally(() => {
        inFlightLoad = null;
      });
    }

    return inFlightLoad;
  }

  async function getCourseCatalog(): Promise<CatalogCacheResult> {
    let store: CatalogCacheStore | null;
    try {
      store = await getStore();
    } catch (error) {
      onCacheError('connect', error);
      store = null;
    }

    if (!store) {
      return runSingleFlight(() => loadAndCache(null, 'BYPASS'));
    }

    try {
      const courses = await readCachedCatalog(store);
      if (courses !== null) {
        return { courses, cacheStatus: 'HIT' };
      }
    } catch (error) {
      onCacheError('read', error);
      return runSingleFlight(() => loadAndCache(null, 'BYPASS'));
    }

    return runSingleFlight(() => loadAfterMiss(store));
  }

  async function invalidateCourseCatalog(): Promise<boolean> {
    let store: CatalogCacheStore | null;
    try {
      store = await getStore();
    } catch (error) {
      onCacheError('connect-for-invalidation', error);
      return false;
    }

    if (!store) {
      return false;
    }

    try {
      await store.del(COURSE_CATALOG_CACHE_KEY);
      return true;
    } catch (error) {
      onCacheError('invalidate', error);
      return false;
    }
  }

  return { getCourseCatalog, invalidateCourseCatalog };
}
