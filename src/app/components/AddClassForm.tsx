'use client';

import { useState, useRef, useEffect } from 'react';
import { getTurnstileToken, clearTurnstileToken } from './GlobalTurnstile';

interface AddClassFormProps {
  onSubmit: (data: { className: string; classCode: string; average: number }) => void;
  onCancel: () => void;
  initialData?: { className: string; classCode: string; average: number };
}

export default function AddClassForm({ onSubmit, onCancel, initialData }: AddClassFormProps) {
  const [className, setClassName] = useState(initialData?.className || '');
  const [classCode, setClassCode] = useState(initialData?.classCode || '');
  const [average, setAverage] = useState(initialData?.average.toString() || '');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';

  // Get token from sessionStorage on mount
  useEffect(() => {
    const token = getTurnstileToken();
    if (token) {
      setTurnstileToken(token);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    const avg = parseFloat(average);
    
    // Validation
    if (!className || !classCode || isNaN(avg) || avg < 0 || avg > 100) {
      setError('Please fill in all fields correctly');
      return;
    }

    // Verify Turnstile token if site key is configured
    if (turnstileSiteKey) {
      // Get fresh token from sessionStorage
      const currentToken = getTurnstileToken();
      if (!currentToken) {
        setError('Please complete the verification challenge that appears when you first visit the site');
        return;
      }
      // Use the token from sessionStorage
      setTurnstileToken(currentToken);

      // Verify token with our API
      try {
        const verifyResponse = await fetch('/api/turnstile/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token: currentToken }),
        });

        const verifyResult = await verifyResponse.json();

        if (!verifyResult.success) {
          // Token invalid, clear it so user can verify again
          clearTurnstileToken();
          setTurnstileToken(null);
          setError('Verification expired. Please refresh the page to verify again.');
          return;
        }
      } catch (verifyError) {
        console.error('Turnstile verification error:', verifyError);
        setError('Verification error. Please try again.');
        return;
      }
    }

    // Submit the form
    onSubmit({ className, classCode, average: avg });
    setClassName('');
    setClassCode('');
    setAverage('');
    // Don't clear token - keep it for future submissions
  };

  return (
    <div className="card-elevated rounded-xl p-6 border-l-[3px] border-purple-600 bg-white">
      <h2 className="text-2xl font-black text-gray-900 mb-6 heading-section">
        {initialData ? 'Edit Class' : 'Add New Class'}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="className" className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
            Class Name
          </label>
          <input
            type="text"
            id="className"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition-all bg-white text-gray-900 font-medium"
            placeholder="e.g., Introduction to Computer Science"
            required
          />
        </div>
        <div>
          <label htmlFor="classCode" className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
            Class Code
          </label>
          <input
            type="text"
            id="classCode"
            value={classCode}
            onChange={(e) => setClassCode(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition-all bg-white text-gray-900 font-mono"
            placeholder="e.g., CS 1026"
            required
          />
        </div>
        <div>
          <label htmlFor="average" className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
            Average (%)
          </label>
          <input
            type="number"
            id="average"
            value={average}
            onChange={(e) => setAverage(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition-all bg-white text-gray-900 font-medium"
            placeholder="e.g., 85.5"
            min="0"
            max="100"
            step="0.1"
            required
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-start gap-2 text-sm text-red-600">
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Show message if verification needed */}
        {turnstileSiteKey && !turnstileToken && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-800 text-center">
              <span className="font-semibold">Note:</span> Please complete the verification challenge that appears when you first visit the site to submit forms.
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-3">
          <button
            type="submit"
            disabled={!!turnstileSiteKey && !turnstileToken}
            className={`flex-1 btn-primary text-white px-6 py-3 rounded-xl hover:shadow-md transition-all font-semibold ${
              !!turnstileSiteKey && !turnstileToken ? 'opacity-60 cursor-not-allowed' : ''
            }`}
          >
            {initialData ? 'Update Class' : 'Add Class'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-100 text-gray-800 px-6 py-3 rounded-xl hover:bg-gray-200 transition-all font-semibold"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

