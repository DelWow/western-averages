'use client';

export default function TurnstileDebug() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';
  
  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded-lg text-xs z-50 max-w-xs">
      <div className="font-bold mb-2">Turnstile Debug</div>
      <div>Site Key: {siteKey ? `✅ Set (${siteKey.substring(0, 10)}...)` : '❌ NOT SET'}</div>
      <div className="mt-2 text-gray-300">
        Check browser console for more details
      </div>
    </div>
  );
}

