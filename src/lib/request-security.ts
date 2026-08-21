import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';

const VISITOR_COOKIE_VERSION = 'v1';
const VISITOR_ID_PATTERN = /^[0-9a-f-]{36}$/i;
const SHA256_HEX_PATTERN = /^[0-9a-f]{64}$/;

type SecurityEnvironment = Record<string, string | undefined>;

export class RequestBodyError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 413 | 415,
  ) {
    super(message);
    this.name = 'RequestBodyError';
  }
}

function normalizeOrigin(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function getAllowedOrigins(
  environment: SecurityEnvironment = process.env,
): Set<string> {
  const allowedOrigins = new Set<string>();
  const configuredValues = [
    ...(environment.ALLOWED_ORIGINS ?? '').split(','),
    environment.URL,
    environment.DEPLOY_PRIME_URL,
  ];

  for (const value of configuredValues) {
    if (!value) continue;
    const origin = normalizeOrigin(value);
    if (origin) allowedOrigins.add(origin);
  }

  if (environment.NODE_ENV !== 'production') {
    allowedOrigins.add('http://localhost:3000');
    allowedOrigins.add('http://127.0.0.1:3000');
  }

  return allowedOrigins;
}

export function isAllowedOrigin(
  request: Pick<Request, 'headers'>,
  environment: SecurityEnvironment = process.env,
): boolean {
  const originHeader = request.headers.get('origin');
  if (!originHeader) return false;

  const origin = normalizeOrigin(originHeader);
  return origin !== null && getAllowedOrigins(environment).has(origin);
}

export function getAllowedTurnstileHostnames(
  environment: SecurityEnvironment = process.env,
): Set<string> {
  const configuredHostnames = new Set(
    (environment.TURNSTILE_ALLOWED_HOSTNAMES ?? '')
      .split(',')
      .map((hostname) => hostname.trim().toLowerCase())
      .filter(Boolean),
  );

  if (configuredHostnames.size > 0) return configuredHostnames;

  const hostnames = new Set<string>();

  for (const origin of getAllowedOrigins(environment)) {
    try {
      hostnames.add(new URL(origin).hostname.toLowerCase());
    } catch {
      // getAllowedOrigins has already validated these values.
    }
  }

  return hostnames;
}

export function getTrustedClientIp(
  request: Pick<Request, 'headers'>,
  environment: SecurityEnvironment = process.env,
): string | null {
  let candidate: string | null = null;

  if (environment.NETLIFY === 'true') {
    candidate = request.headers.get('x-nf-client-connection-ip');
  } else if (environment.TRUST_PROXY_HEADERS === 'true') {
    candidate = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  } else if (environment.NODE_ENV !== 'production') {
    candidate =
      request.headers.get('x-nf-client-connection-ip') ??
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      '127.0.0.1';
  }

  if (!candidate || isIP(candidate) === 0) return null;
  return candidate;
}

export function sanitizeUserAgent(value: string | null): string {
  return (value ?? 'unknown')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 256) || 'unknown';
}

export async function readJsonBody(
  request: Request,
  maxBytes = 8_192,
): Promise<unknown> {
  const contentType = request.headers.get('content-type')?.split(';', 1)[0]?.trim();
  if (contentType !== 'application/json') {
    throw new RequestBodyError('Content-Type must be application/json', 415);
  }

  const contentLengthHeader = request.headers.get('content-length');
  if (contentLengthHeader) {
    const contentLength = Number(contentLengthHeader);
    if (!Number.isSafeInteger(contentLength) || contentLength < 0) {
      throw new RequestBodyError('Invalid Content-Length', 400);
    }
    if (contentLength > maxBytes) {
      throw new RequestBodyError('Request body is too large', 413);
    }
  }

  if (!request.body) {
    throw new RequestBodyError('Invalid request body', 400);
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let bytesRead = 0;
  let body = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      bytesRead += value.byteLength;
      if (bytesRead > maxBytes) {
        await reader.cancel();
        throw new RequestBodyError('Request body is too large', 413);
      }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
  } catch (error) {
    if (error instanceof RequestBodyError) throw error;
    throw new RequestBodyError('Invalid request body', 400);
  }

  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new RequestBodyError('Invalid request body', 400);
  }
}

export function getServerSecret(
  primary: string | undefined,
  fallback: string | undefined,
): string | null {
  const secret = primary || fallback;
  return secret && secret.length >= 32 ? secret : null;
}

export function getIndependentServerSecret(
  primary: string | undefined,
  forbiddenValues: Array<string | undefined>,
  developmentFallback: string | undefined,
  environment: SecurityEnvironment = process.env,
): string | null {
  const secret = getServerSecret(
    primary,
    environment.NODE_ENV === 'production' ? undefined : developmentFallback,
  );
  if (!secret) return null;

  if (
    environment.NODE_ENV === 'production' &&
    forbiddenValues.some((value) => value !== undefined && value === secret)
  ) {
    return null;
  }

  return secret;
}

export function keyedIdentifier(
  secret: string,
  purpose: string,
  value: string,
): string {
  return createHmac('sha256', secret)
    .update(`${purpose}\0${value}`)
    .digest('hex');
}

function visitorCookieSignature(secret: string, visitorId: string): string {
  return keyedIdentifier(secret, 'visitor-cookie-signature', visitorId);
}

export function createVisitorCookie(secret: string): {
  value: string;
  visitorId: string;
} {
  const visitorId = randomUUID();
  const signature = visitorCookieSignature(secret, visitorId);
  return {
    value: `${VISITOR_COOKIE_VERSION}.${visitorId}.${signature}`,
    visitorId,
  };
}

export function verifyVisitorCookie(
  value: string | undefined,
  secret: string,
): string | null {
  if (!value) return null;
  const [version, visitorId, providedSignature, extra] = value.split('.');
  if (
    extra !== undefined ||
    version !== VISITOR_COOKIE_VERSION ||
    !VISITOR_ID_PATTERN.test(visitorId ?? '') ||
    !SHA256_HEX_PATTERN.test(providedSignature ?? '')
  ) {
    return null;
  }

  const expectedSignature = visitorCookieSignature(secret, visitorId);
  const expected = Buffer.from(expectedSignature, 'hex');
  const provided = Buffer.from(providedSignature, 'hex');

  return expected.length === provided.length && timingSafeEqual(expected, provided)
    ? visitorId
    : null;
}

export interface TurnstileVerificationResult {
  success?: boolean;
  hostname?: string;
  action?: string;
  'error-codes'?: string[];
}

export function isValidTurnstileResult(
  result: TurnstileVerificationResult,
  expectedAction: string,
  allowedHostnames: ReadonlySet<string>,
): boolean {
  return (
    result.success === true &&
    result.action === expectedAction &&
    typeof result.hostname === 'string' &&
    allowedHostnames.has(result.hostname.toLowerCase())
  );
}
