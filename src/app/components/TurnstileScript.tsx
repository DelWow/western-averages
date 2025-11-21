'use client';

import Script from 'next/script';

export default function TurnstileScript() {
  // Check if we're on localhost
  if (typeof window === 'undefined') {
    return null;
  }

  const hostname = window.location.hostname;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';

  // Don't load script on localhost
  if (isLocalhost) {
    return null;
  }

  return (
    <Script
      src="https://challenges.cloudflare.com/turnstile/v0/api.js"
      strategy="lazyOnload"
    />
  );
}

