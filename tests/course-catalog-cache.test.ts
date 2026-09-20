import assert from 'node:assert/strict';
import test from 'node:test';
import {
  COURSE_CATALOG_CACHE_KEY,
  createCourseCatalogCache,
  parseCourseCatalogPayload,
  resolveCourseCatalogTtlSeconds,
  type CatalogCacheStore,
  type CatalogCourse,
} from '../src/lib/course-catalog-cache';

const catalog: CatalogCourse[] = [
  {
    id: 1,
    code: 'COMPSCI 1026A',
    name: 'Computer Science Fundamentals I',
    department: 'Computer Science',
    level: 1000,
    avg_grade: 78.4,
    sqct_grade: 'A',
  },
];

class MemoryCatalogStore implements CatalogCacheStore {
  values = new Map<string, string>();

  async get(key: string) {
    return this.values.get(key) ?? null;
  }

  async set(
    key: string,
    value: string,
    options: { EX?: number; PX?: number; NX?: boolean },
  ) {
    if (options.NX && this.values.has(key)) {
      return null;
    }
    this.values.set(key, value);
    return 'OK';
  }

  async del(key: string) {
    return this.values.delete(key) ? 1 : 0;
  }

  async eval(_script: string, options: { keys: string[]; arguments: string[] }) {
    const [key] = options.keys;
    const [expectedValue] = options.arguments;
    if (this.values.get(key) !== expectedValue) {
      return 0;
    }
    this.values.delete(key);
    return 1;
  }
}

test('course catalog cache populates Redis and reuses a valid entry', async () => {
  const store = new MemoryCatalogStore();
  let databaseReads = 0;
  const cache = createCourseCatalogCache({
    getStore: async () => store,
    loadCatalog: async () => {
      databaseReads += 1;
      return catalog;
    },
    ttlSeconds: 3600,
  });

  const miss = await cache.getCourseCatalog();
  const hit = await cache.getCourseCatalog();

  assert.equal(miss.cacheStatus, 'MISS');
  assert.equal(hit.cacheStatus, 'HIT');
  assert.deepEqual(hit.courses, catalog);
  assert.equal(databaseReads, 1);
  assert.ok(store.values.has(COURSE_CATALOG_CACHE_KEY));
});

test('course catalog cache bypasses Redis when it is unavailable', async () => {
  let databaseReads = 0;
  const cache = createCourseCatalogCache({
    getStore: async () => null,
    loadCatalog: async () => {
      databaseReads += 1;
      return catalog;
    },
    ttlSeconds: 3600,
  });

  const first = await cache.getCourseCatalog();
  const second = await cache.getCourseCatalog();

  assert.equal(first.cacheStatus, 'BYPASS');
  assert.equal(second.cacheStatus, 'BYPASS');
  assert.equal(databaseReads, 2);
});

test('concurrent bypass requests share one database read', async () => {
  let databaseReads = 0;
  let finishLoad: (() => void) | undefined;
  const loadGate = new Promise<void>((resolve) => {
    finishLoad = resolve;
  });
  const cache = createCourseCatalogCache({
    getStore: async () => null,
    loadCatalog: async () => {
      databaseReads += 1;
      await loadGate;
      return catalog;
    },
    ttlSeconds: 3600,
  });

  const first = cache.getCourseCatalog();
  const second = cache.getCourseCatalog();
  finishLoad?.();
  const results = await Promise.all([first, second]);

  assert.deepEqual(
    results.map((result) => result.cacheStatus),
    ['BYPASS', 'BYPASS'],
  );
  assert.equal(databaseReads, 1);
});

test('malformed cached catalog is removed and refreshed', async () => {
  const store = new MemoryCatalogStore();
  store.values.set(COURSE_CATALOG_CACHE_KEY, '{"version":1,"courses":"bad"}');
  const cache = createCourseCatalogCache({
    getStore: async () => store,
    loadCatalog: async () => catalog,
    ttlSeconds: 3600,
  });

  const result = await cache.getCourseCatalog();

  assert.equal(result.cacheStatus, 'MISS');
  assert.deepEqual(result.courses, catalog);
  assert.deepEqual(
    parseCourseCatalogPayload(
      store.values.get(COURSE_CATALOG_CACHE_KEY) ?? '',
    ),
    catalog,
  );
});

test('catalog TTL configuration is bounded', () => {
  assert.equal(resolveCourseCatalogTtlSeconds(undefined), 3600);
  assert.equal(resolveCourseCatalogTtlSeconds('900'), 900);
  assert.equal(resolveCourseCatalogTtlSeconds('59'), 3600);
  assert.equal(resolveCourseCatalogTtlSeconds('86401'), 3600);
  assert.equal(resolveCourseCatalogTtlSeconds('not-a-number'), 3600);
});
