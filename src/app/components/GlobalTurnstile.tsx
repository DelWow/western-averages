'use client';

import { useEffect, useState } from 'react';
import Turnstile, { TurnstileRef } from './Turnstile';
import { useRef } from 'react';

const TURNSTILE_TOKEN_KEY = 'turnstile_token';
const TURNSTILE_TOKEN_EXPIRY = 'turnstile_token_expiry';

// Check if we're running on localhost
export function isLocalhost(): boolean {
  if (typeof window === 'undefined') {
    // Server-side: check environment variable or hostname
    return process.env.NODE_ENV === 'development' || 
           (typeof process !== 'undefined' && process.env.VERCEL_ENV !== 'production');
  }
  // Client-side: check window.location
  const hostname = window.location.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

export function getTurnstileToken(): string | null {
  if (typeof window === 'undefined') return null;
  
  const token = sessionStorage.getItem(TURNSTILE_TOKEN_KEY);
  const expiry = sessionStorage.getItem(TURNSTILE_TOKEN_EXPIRY);
  
  // Check if token has expired (tokens are valid for 5 minutes)
  if (token && expiry) {
    const expiryTime = parseInt(expiry, 10);
    if (Date.now() < expiryTime) {
      return token;
    } else {
      // Token expired, clear it
      sessionStorage.removeItem(TURNSTILE_TOKEN_KEY);
      sessionStorage.removeItem(TURNSTILE_TOKEN_EXPIRY);
    }
  }
  
  return token;
}

export function setTurnstileToken(token: string): void {
  if (typeof window === 'undefined') return;
  
  // Store token with expiry (5 minutes from now)
  const expiryTime = Date.now() + 5 * 60 * 1000;
  sessionStorage.setItem(TURNSTILE_TOKEN_KEY, token);
  sessionStorage.setItem(TURNSTILE_TOKEN_EXPIRY, expiryTime.toString());
}

export function clearTurnstileToken(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(TURNSTILE_TOKEN_KEY);
  sessionStorage.removeItem(TURNSTILE_TOKEN_EXPIRY);
}

export default function GlobalTurnstile() {
  const [showWidget, setShowWidget] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const turnstileRef = useRef<TurnstileRef>(null);
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';

  useEffect(() => {
    // Check if we already have a valid token
    const existingToken = getTurnstileToken();
    if (existingToken) {
      setIsVerified(true);
      return;
    }

    // Only show widget if site key is configured
    if (turnstileSiteKey) {
      // Small delay to ensure page is fully loaded
      const timer = setTimeout(() => {
        setShowWidget(true);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [turnstileSiteKey]);

  const handleVerify = (token: string) => {
    setTurnstileToken(token);
    setIsVerified(true);
    setShowWidget(false);
  };

  const handleError = () => {
    // On error, allow retry after a delay
    setTimeout(() => {
      if (turnstileRef.current) {
        turnstileRef.current.resetTurnstile();
      }
    }, 2000);
  };

  const handleExpire = () => {
    clearTurnstileToken();
    setIsVerified(false);
    setShowWidget(true);
  };

  // Don't render anything if already verified, no site key, or on localhost
  if (isVerified || !turnstileSiteKey || isLocalhost()) {
    return null;
  }

  // Show widget in a fixed position (top-right corner, subtle)
  if (!showWidget) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-xs">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900 mb-1">
            Verify you're human
          </p>
          <p className="text-xs text-gray-600 mb-3">
            Complete this verification to submit forms
          </p>
          <div className="flex justify-center">
            <Turnstile
              ref={turnstileRef}
              siteKey={turnstileSiteKey}
              onVerify={handleVerify}
              onError={handleError}
              onExpire={handleExpire}
              theme="auto"
              size="normal"
            />
          </div>
        </div>
        <button
          onClick={() => setShowWidget(false)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

