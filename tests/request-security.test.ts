import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createVisitorCookie,
  getAllowedTurnstileHostnames,
  getIndependentServerSecret,
  getServerSecret,
  getTrustedClientIp,
  isAllowedOrigin,
  isValidTurnstileResult,
  keyedIdentifier,
  readJsonBody,
  RequestBodyError,
  sanitizeUserAgent,
  verifyVisitorCookie,
} from '../src/lib/request-security';
import { buildContentSecurityPolicy } from '../src/lib/content-security-policy';

const productionEnvironment = {
  NODE_ENV: 'production',
  ALLOWED_ORIGINS:
    'https://westernaverages.xyz,https://deploy-preview.example.netlify.app',
  TURNSTILE_ALLOWED_HOSTNAMES:
    'westernaverages.xyz,deploy-preview.example.netlify.app',
};

test('origin checks use exact normalized origins', () => {
  const allowedRequest = new Request('https://westernaverages.xyz/api/averages', {
    headers: { origin: 'https://westernaverages.xyz' },
  });
  const suffixSpoof = new Request('https://westernaverages.xyz/api/averages', {
    headers: { origin: 'https://westernaverages.xyz.attacker.example' },
  });
  const missingOrigin = new Request('https://westernaverages.xyz/api/averages');

  assert.equal(isAllowedOrigin(allowedRequest, productionEnvironment), true);
  assert.equal(isAllowedOrigin(suffixSpoof, productionEnvironment), false);
  assert.equal(isAllowedOrigin(missingOrigin, productionEnvironment), false);
});

test('Netlify client IP is trusted only in a Netlify environment', () => {
  const request = new Request('https://westernaverages.xyz/api/averages', {
    headers: {
      'x-nf-client-connection-ip': '203.0.113.8',
      'x-forwarded-for': '198.51.100.4',
    },
  });

  assert.equal(
    getTrustedClientIp(request, { NODE_ENV: 'production', NETLIFY: 'true' }),
    '203.0.113.8',
  );
  assert.equal(
    getTrustedClientIp(request, { NODE_ENV: 'production' }),
    null,
  );
});

test('invalid trusted IP headers are rejected', () => {
  const request = new Request('https://westernaverages.xyz', {
    headers: { 'x-nf-client-connection-ip': 'not-an-ip' },
  });
  assert.equal(
    getTrustedClientIp(request, { NODE_ENV: 'production', NETLIFY: 'true' }),
    null,
  );
});

test('JSON reader accepts small JSON and rejects other content types', async () => {
  const request = new Request('https://westernaverages.xyz/api/averages', {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ average: 85.5 }),
  });
  assert.deepEqual(await readJsonBody(request), { average: 85.5 });

  const wrongContentType = new Request(
    'https://westernaverages.xyz/api/averages',
    {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: '{}',
    },
  );
  await assert.rejects(
    () => readJsonBody(wrongContentType),
    (error: unknown) =>
      error instanceof RequestBodyError && error.status === 415,
  );
});

test('JSON reader enforces the streaming byte limit', async () => {
  const request = new Request('https://westernaverages.xyz/api/averages', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ value: 'x'.repeat(100) }),
  });

  await assert.rejects(
    () => readJsonBody(request, 32),
    (error: unknown) =>
      error instanceof RequestBodyError && error.status === 413,
  );
});

test('Turnstile acceptance binds both action and exact hostname', () => {
  const hostnames = getAllowedTurnstileHostnames(productionEnvironment);
  const validResult = {
    success: true,
    action: 'turnstile-spin-v2',
    hostname: 'westernaverages.xyz',
  };

  assert.equal(
    isValidTurnstileResult(validResult, 'turnstile-spin-v2', hostnames),
    true,
  );
  assert.equal(
    isValidTurnstileResult(
      { ...validResult, hostname: 'westernaverages.xyz.attacker.example' },
      'turnstile-spin-v2',
      hostnames,
    ),
    false,
  );
  assert.equal(
    isValidTurnstileResult(
      { ...validResult, action: 'different-action' },
      'turnstile-spin-v2',
      hostnames,
    ),
    false,
  );
});

test('visitor cookies are signed and tampering is detected', () => {
  const secret = 'a'.repeat(32);
  const cookie = createVisitorCookie(secret);
  assert.equal(verifyVisitorCookie(cookie.value, secret), cookie.visitorId);

  const replacement = cookie.value.endsWith('0') ? '1' : '0';
  const tampered = `${cookie.value.slice(0, -1)}${replacement}`;
  assert.equal(verifyVisitorCookie(tampered, secret), null);
  assert.equal(verifyVisitorCookie(cookie.value, 'b'.repeat(32)), null);
});

test('keyed identifiers are fixed length and purpose-separated', () => {
  const secret = 'a'.repeat(32);
  const first = keyedIdentifier(secret, 'first-purpose', 'value');
  const second = keyedIdentifier(secret, 'second-purpose', 'value');
  assert.match(first, /^[0-9a-f]{64}$/);
  assert.notEqual(first, second);
});

test('server secrets and user-agent metadata are bounded', () => {
  assert.equal(getServerSecret('short', undefined), null);
  assert.equal(getServerSecret(undefined, 'x'.repeat(32)), 'x'.repeat(32));
  assert.equal(sanitizeUserAgent('agent\r\nspoof'), 'agent spoof');
  assert.equal(sanitizeUserAgent('x'.repeat(300)).length, 256);
});

test('production requires dedicated application secrets', () => {
  const credential = 'c'.repeat(32);
  const dedicated = 'd'.repeat(32);

  assert.equal(
    getIndependentServerSecret(undefined, [credential], credential, {
      NODE_ENV: 'production',
    }),
    null,
  );
  assert.equal(
    getIndependentServerSecret(credential, [credential], undefined, {
      NODE_ENV: 'production',
    }),
    null,
  );
  const publicCredentialEnvironment = {
    NODE_ENV: 'production',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: credential,
  };
  assert.equal(
    getIndependentServerSecret(
      credential,
      [publicCredentialEnvironment.NEXT_PUBLIC_SUPABASE_ANON_KEY],
      undefined,
      publicCredentialEnvironment,
    ),
    null,
  );
  assert.equal(
    getIndependentServerSecret(dedicated, [credential], undefined, {
      NODE_ENV: 'production',
    }),
    dedicated,
  );
  assert.equal(
    getIndependentServerSecret(undefined, [credential], credential, {
      NODE_ENV: 'development',
    }),
    credential,
  );
});

test('production CSP uses a nonce and disallows arbitrary inline scripts', () => {
  const policy = buildContentSecurityPolicy('test-nonce', false);
  const scriptDirective = policy
    .split('; ')
    .find((directive) => directive.startsWith('script-src '));

  assert.ok(scriptDirective);
  assert.match(scriptDirective, /'nonce-test-nonce'/);
  assert.match(scriptDirective, /'strict-dynamic'/);
  assert.doesNotMatch(scriptDirective, /'unsafe-inline'/);
  assert.doesNotMatch(scriptDirective, /'unsafe-eval'/);
});
