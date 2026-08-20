'use client';

import { useCallback, useRef, useState } from 'react';
import Turnstile, { TurnstileRef } from './Turnstile';

interface SubmitAverageFormProps {
  courseId: number;
  onSuccess?: () => void;
}

export default function SubmitAverageForm({ courseId, onSuccess }: SubmitAverageFormProps) {
  const [average, setAverage] = useState('');
  const [term, setTerm] = useState<'fall' | 'winter' | 'summer' | ''>('');
  const [year, setYear] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileRef>(null);
  
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';

  const resetTurnstile = useCallback(() => {
    setTurnstileToken(null);
    turnstileRef.current?.resetTurnstile();
  }, []);

  const handleTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token);
    setError(null);
  }, []);

  const handleTurnstileExpire = useCallback(() => {
    setTurnstileToken(null);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const avg = parseFloat(average);
    const yearNum = parseInt(year);
    
    if (isNaN(avg) || avg < 0 || avg > 100) {
      setError('Please enter a valid average between 0 and 100');
      return;
    }

    if (!term) {
      setError('Please select a term');
      return;
    }

    if (!year || isNaN(yearNum) || yearNum < 2000 || yearNum > new Date().getFullYear() + 1) {
      setError(`Please enter a valid year between 2000 and ${new Date().getFullYear() + 1}`);
      return;
    }

    if (turnstileSiteKey && !turnstileToken) {
      setError('Please complete the verification challenge');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/averages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          average: avg,
          term,
          year: yearNum,
          turnstileToken,
        }),
      });

      const result = await response.json().catch(() => null);
      resetTurnstile();

      if (!response.ok || !result?.success) {
        setError(result?.error || 'Failed to submit average. Please try again.');
        return;
      }

      setSuccess(true);
      setAverage('');
      setTerm('');
      setYear('');
      
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
          setSuccess(false);
        }, 2000);
      } else {
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Error submitting average:', err);
      resetTurnstile();
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200">
      <div className="bg-blue-50 border-b border-blue-100 px-4 sm:px-6 py-3">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <h2 className="font-display font-semibold text-gray-900">Submit Your Average</h2>
        </div>
        <p className="text-sm text-gray-600 mt-1">Help other students by sharing your course average</p>
      </div>

      <form onSubmit={handleSubmit} className="p-3 min-[360px]:p-4 sm:p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Term Selection */}
          <div>
            <label htmlFor="term" className="block text-xs uppercase tracking-wider text-gray-500 mb-1.5 font-medium">
              Term
            </label>
            <select
              id="term"
              value={term}
              onChange={(e) => {
                setTerm(e.target.value as 'fall' | 'winter' | 'summer' | '');
                setError(null);
                setSuccess(false);
              }}
              className={`w-full px-3 py-2.5 border text-sm focus:outline-none focus:ring-2 focus:ring-[#4F2683] focus:border-transparent ${
                error && !term ? 'border-red-300 bg-red-50' : 'border-gray-200'
              }`}
              required
              disabled={isSubmitting || success}
            >
              <option value="">Select term...</option>
              <option value="fall">Fall</option>
              <option value="winter">Winter</option>
              <option value="summer">Summer</option>
            </select>
          </div>

          {/* Year Input */}
          <div>
            <label htmlFor="year" className="block text-xs uppercase tracking-wider text-gray-500 mb-1.5 font-medium">
              Year
            </label>
            <input
              type="number"
              id="year"
              value={year}
              onChange={(e) => {
                setYear(e.target.value);
                setError(null);
                setSuccess(false);
              }}
              className={`w-full px-3 py-2.5 border text-sm focus:outline-none focus:ring-2 focus:ring-[#4F2683] focus:border-transparent ${
                error && (!year || isNaN(parseInt(year))) ? 'border-red-300 bg-red-50' : 'border-gray-200'
              }`}
              placeholder="e.g., 2024"
              min="2000"
              max={new Date().getFullYear() + 1}
              required
              disabled={isSubmitting || success}
            />
          </div>
        </div>

        {/* Average Input */}
        <div>
          <label htmlFor="average" className="block text-xs uppercase tracking-wider text-gray-500 mb-1.5 font-medium">
            Your Course Average (%)
          </label>
          <div className="relative">
            <input
              type="number"
              id="average"
              value={average}
              onChange={(e) => {
                setAverage(e.target.value);
                setError(null);
                setSuccess(false);
              }}
              className={`w-full px-3 py-2.5 border text-sm focus:outline-none focus:ring-2 focus:ring-[#4F2683] focus:border-transparent ${
                error ? 'border-red-300 bg-red-50' : success ? 'border-green-300 bg-green-50' : 'border-gray-200'
              }`}
              placeholder="e.g., 85.5"
              min="0"
              max="100"
              step="0.1"
              required
              disabled={isSubmitting || success}
            />
            {average && !error && !success && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 p-3 border border-red-200">
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="flex items-start gap-2 text-sm text-green-700 bg-green-50 p-3 border border-green-200">
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Thank you! Your average has been submitted successfully.</span>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 p-3">
          <p className="text-xs text-blue-800">
            <strong>Note:</strong> Your submission will be marked as unverified and will help build a community-driven average for this course.
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 p-3">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-xs text-amber-900">
              <strong>Important:</strong> Once submitted, your average cannot be removed or edited. Please double-check your information before submitting.
            </p>
          </div>
        </div>

        {turnstileSiteKey && (
          <Turnstile
            ref={turnstileRef}
            siteKey={turnstileSiteKey}
            action="turnstile-spin-v2"
            onVerify={handleTurnstileVerify}
            onError={resetTurnstile}
            onExpire={handleTurnstileExpire}
            className="mx-auto"
          />
        )}

        <button
          type="submit"
          disabled={isSubmitting || success || (!!turnstileSiteKey && !turnstileToken)}
          className={`w-full bg-[#4F2683] text-white px-4 py-2.5 text-sm font-medium hover:bg-[#3D1E66] transition-colors ${
            isSubmitting || success || (!!turnstileSiteKey && !turnstileToken) ? 'opacity-60 cursor-not-allowed' : ''
          }`}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Submitting...
            </span>
          ) : success ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Submitted!
            </span>
          ) : (
            'Submit Average'
          )}
        </button>
      </form>
    </div>
  );
}
