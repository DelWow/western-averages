'use client';

import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';

declare global {
  interface Window {
    turnstile: {
      render: (element: HTMLElement, options: {
        sitekey: string;
        action?: string;
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
  action?: string;
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
  action,
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
    // Check if script is already loaded (from Next.js Script component in layout)
    if (window.turnstile) {
      const readyTimer = setTimeout(() => setIsLoaded(true), 0);
      return () => clearTimeout(readyTimer);
    }

    // Check if script tag already exists (from Next.js Script component)
    const existingScript = document.querySelector('script[src="https://challenges.cloudflare.com/turnstile/v0/api.js"]');
    if (existingScript) {
      // Script is loading via Next.js Script component, wait for it
      let checkTurnstile: NodeJS.Timeout | null = null;
      let timeoutId: NodeJS.Timeout | null = null;

      // Set a timeout to detect if script fails to load (e.g., corporate network blocking)
      timeoutId = setTimeout(() => {
        if (!window.turnstile) {
          setError('Network restriction detected. Please try using cellular data or a different network.');
          if (checkTurnstile) clearInterval(checkTurnstile);
        }
      }, 10000); // 10 second timeout

      checkTurnstile = setInterval(() => {
        if (window.turnstile) {
          setIsLoaded(true);
          if (checkTurnstile) clearInterval(checkTurnstile);
          if (timeoutId) clearTimeout(timeoutId);
        }
      }, 100);

      // Also listen for load event
      existingScript.addEventListener('load', () => {
        setIsLoaded(true);
        if (checkTurnstile) clearInterval(checkTurnstile);
        if (timeoutId) clearTimeout(timeoutId);
      });

      // Handle script load errors (e.g., corporate network blocking)
      existingScript.addEventListener('error', () => {
        setError('Network restriction detected. Please try using cellular data or a different network.');
        if (checkTurnstile) clearInterval(checkTurnstile);
        if (timeoutId) clearTimeout(timeoutId);
      });

      // Cleanup interval on unmount
      return () => {
        if (checkTurnstile) clearInterval(checkTurnstile);
        if (timeoutId) clearTimeout(timeoutId);
        // Cleanup: remove widget only (don't remove script as it might be used by other instances)
        if (widgetIdRef.current && window.turnstile) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {
            // Ignore cleanup errors
          }
        }
      };
    }

    // Fallback: If Next.js Script component didn't load it, try dynamic loading
    // (This should rarely happen, but provides a fallback)
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      setIsLoaded(true);
    };
    
    script.onerror = () => {
      setError('Network restriction detected. Please try using cellular data or a different network.');
    };

    document.body.appendChild(script);

    return () => {
      // Cleanup: remove widget only (don't remove script as it might be used by other instances)
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, []);

  useEffect(() => {
    if (!siteKey) {
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
          action,
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
  }, [isLoaded, siteKey, action, onVerify, onError, onExpire, theme, size]);

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
  const displayError = siteKey ? error : 'Turnstile site key is not configured';

  if (displayError && (displayError.includes('not configured') || displayError.includes('Failed to render') || displayError.includes('Network restriction'))) {
    return (
      <div className={`text-red-600 text-sm ${className}`}>
        <p className="mb-2">{displayError}</p>
        {displayError.includes('Network restriction') && (
          <p className="text-xs text-gray-600 mb-2">
            This often happens on corporate WiFi networks. Try switching to cellular data or a personal network.
          </p>
        )}
        <button
          onClick={reset}
          className="mt-2 text-xs underline hover:no-underline"
        >
          Try again
        </button>
      </div>
    );
  }

  // Always show container, even if widget hasn't loaded yet
  return (
    <div 
      ref={containerRef} 
      className={`turnstile-container max-w-full ${className}`}
      style={{ minHeight: '65px' }}
      data-testid="turnstile-container"
    >
      {!isLoaded && (
        <div className="text-xs text-gray-400 text-center py-4">
          Loading verification...
        </div>
      )}
    </div>
  );
});

Turnstile.displayName = 'Turnstile';

export default Turnstile;
