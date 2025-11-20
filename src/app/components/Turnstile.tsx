'use client';

import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';

declare global {
  interface Window {
    turnstile: {
      render: (element: HTMLElement, options: {
        sitekey: string;
        callback?: (token: string) => void;
        'error-callback'?: () => void;
        'expired-callback'?: () => void;
        theme?: 'light' | 'dark' | 'auto';
        size?: 'normal' | 'compact';
      }) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

interface TurnstileProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact';
  className?: string;
}

export interface TurnstileRef {
  resetTurnstile: () => void;
}

const Turnstile = forwardRef<TurnstileRef, TurnstileProps>(({
  siteKey,
  onVerify,
  onError,
  onExpire,
  theme = 'auto',
  size = 'normal',
  className = '',
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debug: Log component mount
  useEffect(() => {
    console.log('=== Turnstile Component Mounted ===');
    console.log('Site Key received:', siteKey ? `${siteKey.substring(0, 10)}...` : 'EMPTY');
  }, [siteKey]);

  useEffect(() => {
    // Check if script is already loaded
    if (window.turnstile) {
      setIsLoaded(true);
      return;
    }

    // Check if script tag already exists
    const existingScript = document.querySelector('script[src="https://challenges.cloudflare.com/turnstile/v0/api.js"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => setIsLoaded(true));
      return;
    }

    // Load Turnstile script
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      setIsLoaded(true);
    };
    
    script.onerror = () => {
      setError('Failed to load Turnstile script');
    };

    document.body.appendChild(script);

    return () => {
      // Cleanup: remove widget only (don't remove script as it might be used by other instances)
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
  }, []);

  useEffect(() => {
    if (!siteKey) {
      setError('Turnstile site key is not configured');
      console.warn('Turnstile: Site key is missing. Check NEXT_PUBLIC_TURNSTILE_SITE_KEY in .env.local');
      return;
    }

    // Wait for both script and container to be ready
    if (!isLoaded || !containerRef.current || !window.turnstile || widgetIdRef.current) {
      return;
    }

    // Use a small delay to ensure the container is fully in the DOM
    const timer = setTimeout(() => {
      if (!containerRef.current || widgetIdRef.current) {
        return;
      }

      try {
        console.log('Turnstile: Rendering widget with site key:', siteKey.substring(0, 10) + '...');
        const widgetId = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token: string) => {
            console.log('Turnstile: Verification successful');
            setError(null); // Clear any previous errors
            onVerify(token);
          },
          'error-callback': () => {
            // Don't set error state immediately - the widget should still be visible
            console.error('Turnstile: Verification failed');
            // Only show error if it's a critical issue
            if (onError) {
              onError();
            }
          },
          'expired-callback': () => {
            console.warn('Turnstile: Token expired');
            if (onExpire) {
              onExpire();
            }
          },
          theme,
          size,
        });
        widgetIdRef.current = widgetId;
        console.log('Turnstile: Widget rendered successfully with ID:', widgetId);
      } catch (e) {
        setError('Failed to render Turnstile widget');
        console.error('Turnstile render error:', e);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isLoaded, siteKey, onVerify, onError, onExpire, theme, size]);

  const reset = useCallback(() => {
    if (widgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.reset(widgetIdRef.current);
        setError(null);
      } catch (e) {
        console.error('Turnstile reset error:', e);
      }
    }
  }, []);

  // Expose reset function via ref
  useImperativeHandle(ref, () => ({
    resetTurnstile: reset,
  }), [reset]);

  // Show error only for critical errors (not verification failures)
  if (error && (error.includes('not configured') || error.includes('Failed to render'))) {
    return (
      <div className={`text-red-600 text-sm ${className}`}>
        <p>{error}</p>
        <button
          onClick={reset}
          className="mt-2 text-xs underline hover:no-underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={className} style={{ minHeight: '65px' }} />
  );
});

Turnstile.displayName = 'Turnstile';

export default Turnstile;

