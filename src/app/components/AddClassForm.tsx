'use client';

import { useState } from 'react';

interface AddClassFormProps {
  onSubmit: (data: { className: string; classCode: string; average: number }) => void;
  onCancel: () => void;
  initialData?: { className: string; classCode: string; average: number };
}

export default function AddClassForm({ onSubmit, onCancel, initialData }: AddClassFormProps) {
  const [className, setClassName] = useState(initialData?.className || '');
  const [classCode, setClassCode] = useState(initialData?.classCode || '');
  const [average, setAverage] = useState(initialData?.average.toString() || '');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    const avg = parseFloat(average);
    
    // Validation
    if (!className || !classCode || isNaN(avg) || avg < 0 || avg > 100) {
      setError('Please fill in all fields correctly');
      return;
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

        <div className="flex gap-3 pt-3">
          <button
            type="submit"
            className="flex-1 btn-primary text-white px-6 py-3 rounded-xl hover:shadow-md transition-all font-semibold"
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
