export function buildContentSecurityPolicy(
  nonce: string,
  isDevelopment: boolean,
): string {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    [
      "script-src 'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      isDevelopment ? "'unsafe-eval'" : '',
      'https://challenges.cloudflare.com',
      'https://www.googletagmanager.com',
      'https://*.clarity.ms',
    ]
      .filter(Boolean)
      .join(' '),
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    [
      "img-src 'self' data: blob:",
      'https://*.google-analytics.com',
      'https://*.clarity.ms',
      'https://c.bing.com',
    ].join(' '),
    [
      "connect-src 'self'",
      isDevelopment ? 'ws:' : '',
      'https://*.supabase.co',
      'wss://*.supabase.co',
      'https://challenges.cloudflare.com',
      'https://www.googletagmanager.com',
      'https://*.google-analytics.com',
      'https://*.analytics.google.com',
      'https://*.clarity.ms',
      'https://c.bing.com',
    ]
      .filter(Boolean)
      .join(' '),
    'frame-src https://challenges.cloudflare.com',
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    ...(isDevelopment ? [] : ['upgrade-insecure-requests']),
  ].join('; ');
}
