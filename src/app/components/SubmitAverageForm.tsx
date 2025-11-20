'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const avg = parseFloat(average);
    const yearNum = parseInt(year);
    
    // Validation
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

    setIsSubmitting(true);

    try {
      const supabase = createClient();
      
      // Get user's IP address (if available)
      // Note: This is a client-side approach. For production, consider using a server-side API route
      const response = await fetch('https://api.ipify.org?format=json').catch(() => null);
      const ipData = response ? await response.json().catch(() => null) : null;
      const ipAddress = ipData?.ip || null;

      const { error: insertError } = await supabase
        .from('student_averages')
        .insert({
          course_id: courseId,
          grade: avg,
          term: term,
          year: yearNum,
          user_ip: ipAddress,
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        });

      if (insertError) {
        console.error('Error submitting average:', insertError);
        setError(insertError.message || 'Failed to submit average. Please try again.');
        setIsSubmitting(false);
        return;
      }

      // Success
      setSuccess(true);
      setAverage('');
      setTerm('');
      setYear('');
      
      // Call success callback to refresh data
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
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card-elevated rounded-xl p-4 sm:p-6 border-l-[3px] border-blue-500 bg-white">
      <div className="flex items-start gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-50 flex items-center justify-center">
          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 mb-1 heading-section">Submit Your Average</h2>
          <p className="text-xs sm:text-sm text-gray-600">Help other students by sharing your course average</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Term Selection */}
          <div>
            <label htmlFor="term" className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
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
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all bg-white text-gray-900 font-medium ${
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
            <label htmlFor="year" className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
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
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all bg-white text-gray-900 font-medium ${
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
          <label htmlFor="average" className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
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
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all bg-white text-gray-900 font-medium ${
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
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">%</div>
            )}
          </div>
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

        {/* Success Message */}
        {success && (
          <div className="flex items-start gap-2 text-sm text-green-600">
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Thank you! Your average has been submitted successfully.</span>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-800 leading-relaxed">
            <span className="font-semibold">Note:</span> Your submission will be marked as unverified and will help build a community-driven average for this course.
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-300 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-xs text-amber-900 leading-relaxed">
              <span className="font-semibold">Important:</span> Once submitted, your average cannot be removed or edited. Please double-check your information before submitting.
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || success}
          className={`w-full btn-primary text-white px-6 py-3 rounded-xl hover:shadow-md transition-all font-semibold ${
            isSubmitting || success ? 'opacity-60 cursor-not-allowed' : ''
          }`}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Submitting...
            </span>
          ) : success ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

