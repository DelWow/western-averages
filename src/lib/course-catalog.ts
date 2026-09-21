import 'server-only';

import {
  createClient as createRedisClient,
  type RedisClientType,
} from 'redis';
import {
  createCourseCatalogCache,
  resolveCourseCatalogTtlSeconds,
  type CatalogCacheStore,
  type CatalogCourse,
} from '@/lib/course-catalog-cache';
import { createClient as createSupabaseClient } from '@/lib/supabase-server';

const REDIS_CONNECT_TIMEOUT_MS = 1_500;
const REDIS_COMMAND_TIMEOUT_MS = 1_500;
const COURSE_QUERY_PAGE_SIZE = 1_000;

let redisClient: RedisClientType | null = null;
let redisConnectPromise: Promise<RedisClientType | null> | null = null;

function cacheError(operation: string, error: unknown) {
  console.error(
    `Course catalog Redis ${operation} failed:`,
    error instanceof Error ? error.name : 'unknown error',
  );
}

function createRedisStore(client: RedisClientType): CatalogCacheStore {
  const commandClient = () =>
    client.withAbortSignal(AbortSignal.timeout(REDIS_COMMAND_TIMEOUT_MS));

  return {
    get: (key) => commandClient().get(key),
    set: (key, value, options) =>
      commandClient().set(key, value, options),
    del: (key) => commandClient().del(key),
    eval: (script, options) => commandClient().eval(script, options),
  };
}

async function getRedisStore(): Promise<CatalogCacheStore | null> {
  const redisUrl = process.env.REDIS_URL?.trim();
  if (!redisUrl) {
    return null;
  }

  if (redisClient?.isReady) {
    return createRedisStore(redisClient);
  }

  if (redisConnectPromise) {
    const client = await redisConnectPromise;
    return client ? createRedisStore(client) : null;
  }

  if (redisClient?.isOpen) {
    return null;
  }

  const client = createRedisClient({
    url: redisUrl,
    disableOfflineQueue: true,
    pingInterval: 30_000,
    socket: {
      connectTimeout: REDIS_CONNECT_TIMEOUT_MS,
      reconnectStrategy: (retries) =>
        retries < 2 ? Math.min(100 * 2 ** retries, 500) : false,
    },
  });
  client.on('error', (error) => cacheError('connection', error));
  redisClient = client;

  redisConnectPromise = client
    .connect()
    .then(async () => {
      await client
        .withAbortSignal(AbortSignal.timeout(REDIS_COMMAND_TIMEOUT_MS))
        .ping();
      console.info(
        '[course-catalog] Redis is functioning (connection and PING succeeded).',
      );
      return client;
    })
    .catch((error: unknown) => {
      cacheError('connect', error);
      client.destroy();
      if (redisClient === client) {
        redisClient = null;
      }
      return null;
    })
    .finally(() => {
      redisConnectPromise = null;
    });

  const connectedClient = await redisConnectPromise;
  return connectedClient ? createRedisStore(connectedClient) : null;
}

async function loadCourseCatalogFromSupabase(): Promise<CatalogCourse[]> {
  const supabase = createSupabaseClient();
  const courses: CatalogCourse[] = [];

  for (let from = 0; ; from += COURSE_QUERY_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('courses')
      .select('id, code, name, department, level, avg_grade, sqct_grade')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(from, from + COURSE_QUERY_PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Unable to load course catalog: ${error.code}`);
    }

    const page = (data ?? []) as CatalogCourse[];
    courses.push(...page);

    if (page.length < COURSE_QUERY_PAGE_SIZE) {
      break;
    }
  }

  return Array.from(
    new Map(courses.map((course) => [course.id, course])).values(),
  );
}

const courseCatalogCache = createCourseCatalogCache({
  getStore: getRedisStore,
  loadCatalog: loadCourseCatalogFromSupabase,
  ttlSeconds: resolveCourseCatalogTtlSeconds(
    process.env.COURSE_CATALOG_CACHE_TTL_SECONDS,
  ),
  onCacheError: cacheError,
});

export const getCourseCatalog = courseCatalogCache.getCourseCatalog;
export const invalidateCourseCatalog =
  courseCatalogCache.invalidateCourseCatalog;
