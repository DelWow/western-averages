'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

interface StudentAverage {
  grade: number;
  term: 'fall' | 'winter' | 'summer' | null;
  year: number | null;
  submitted_on: string;
}

interface AverageStats {
  verified_average: number | null;
  unverified_count: number;
  unverified_average: number | null;
  unverified_min: number | null;
  unverified_max: number | null;
  unverified_median: number | null;
}

function toFiniteNumber(value: unknown): number | null {
  if (
    value === null ||
    value === undefined ||
    value === '' ||
    typeof value === 'boolean'
  ) {
    return null;
  }
  const numberValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function normalizeStats(value: Record<string, unknown>): AverageStats {
  return {
    verified_average: toFiniteNumber(value.verified_average),
    unverified_count: toFiniteNumber(value.unverified_count) ?? 0,
    unverified_average: toFiniteNumber(value.unverified_average),
    unverified_min: toFiniteNumber(value.unverified_min),
    unverified_max: toFiniteNumber(value.unverified_max),
    unverified_median: toFiniteNumber(value.unverified_median),
  };
}

function normalizeSubmission(value: Record<string, unknown>): StudentAverage | null {
  const grade = toFiniteNumber(value.grade);
  if (
    grade === null ||
    typeof value.submitted_on !== 'string'
  ) {
    return null;
  }

  return {
    grade,
    term:
      value.term === 'fall' || value.term === 'winter' || value.term === 'summer'
        ? value.term
        : null,
    year: toFiniteNumber(value.year),
    submitted_on: value.submitted_on,
  };
}

interface UnverifiedAveragesSectionProps {
  courseId: number;
  verifiedAverage: number | null;
  refreshTrigger?: number;
}

export default function UnverifiedAveragesSection({ 
  courseId, 
  verifiedAverage,
  refreshTrigger = 0 
}: UnverifiedAveragesSectionProps) {
  const [stats, setStats] = useState<AverageStats | null>(null);
  const [recentSubmissions, setRecentSubmissions] = useState<StudentAverage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const supabase = createClient();

        const [statsResult, submissionsResult] = await Promise.all([
          supabase
            .rpc('get_public_course_average_stats', {
              course_id_param: courseId,
            })
            .single(),
          supabase.rpc('get_public_student_averages', {
            course_id_param: courseId,
            result_limit: showAll ? 50 : 10,
          }),
        ]);

        if (statsResult.error || submissionsResult.error || !statsResult.data) {
          console.error(
            'Error fetching public student averages:',
            statsResult.error?.code ?? submissionsResult.error?.code ?? 'missing data',
          );
          setError('Failed to load student averages');
          return;
        }

        setStats(normalizeStats(statsResult.data as Record<string, unknown>));
        setRecentSubmissions(
          (submissionsResult.data ?? [])
            .map((submission: unknown) =>
              normalizeSubmission(submission as Record<string, unknown>),
            )
            .filter(
              (submission: StudentAverage | null): submission is StudentAverage =>
                submission !== null,
            ),
        );
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load student averages');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [courseId, refreshTrigger, showAll, verifiedAverage]);

  const getGradeClass = (grade: number | null) => {
    if (grade === null) return 'grade-na';
    if (grade >= 80) return 'grade-a';
    if (grade >= 70) return 'grade-b';
    if (grade >= 60) return 'grade-c';
    return 'grade-d';
  };

  const formatDate = (dateString: string) => {
    const dateParts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
    if (!dateParts) return '';

    const now = new Date();
    const torontoParts = Object.fromEntries(
      new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Toronto',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
        .formatToParts(now)
        .map(({ type, value }) => [type, value]),
    );
    const submittedUtc = Date.UTC(
      Number(dateParts[1]),
      Number(dateParts[2]) - 1,
      Number(dateParts[3]),
    );
    const todayUtc = Date.UTC(
      Number(torontoParts.year),
      Number(torontoParts.month) - 1,
      Number(torontoParts.day),
    );
    const diffDays = Math.round((todayUtc - submittedUtc) / 86_400_000);

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`;

    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC',
      month: 'short',
      day: 'numeric',
      year:
        Number(dateParts[1]) !== Number(torontoParts.year)
          ? 'numeric'
          : undefined,
    }).format(new Date(submittedUtc));
  };

  const formatTerm = (term: string | null) => {
    if (!term) return '';
    return term.charAt(0).toUpperCase() + term.slice(1);
  };

  const formatTermYear = (term: string | null, year: number | null) => {
    if (!term || !year) return '';
    return `${formatTerm(term)} ${year}`;
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 p-8">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-[#4F2683]"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  const hasSubmissions = stats && stats.unverified_count > 0;

  return (
    <div className="space-y-4">
      {/* Statistics Section */}
      {hasSubmissions && (
        <div className="bg-white border border-gray-200">
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
            <h3 className="font-display font-semibold text-gray-900">Submission Statistics</h3>
          </div>
          
          <div className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              <div className="bg-gray-50 p-3">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Total</p>
                <p className="text-xl font-semibold text-gray-900">{stats.unverified_count}</p>
              </div>
              
              {stats.unverified_average !== null && (
                <>
                  <div className="bg-blue-50 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Average</p>
                    <p className="text-xl font-semibold text-blue-700">{stats.unverified_average.toFixed(1)}%</p>
                  </div>
                  
                  <div className="bg-green-50 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Median</p>
                    <p className="text-xl font-semibold text-green-700">
                      {stats.unverified_median !== null ? stats.unverified_median.toFixed(1) : '—'}%
                    </p>
                  </div>
                  
                  {stats.unverified_min !== null && stats.unverified_max !== null && (
                    <>
                      <div className="bg-amber-50 p-3">
                        <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Low</p>
                        <p className="text-xl font-semibold text-amber-700">{stats.unverified_min.toFixed(1)}%</p>
                      </div>
                      
                      <div className="bg-purple-50 p-3">
                        <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">High</p>
                        <p className="text-xl font-semibold text-purple-700">{stats.unverified_max.toFixed(1)}%</p>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Comparison with Verified Average */}
            {verifiedAverage !== null && stats.unverified_average !== null && (
              <div className="bg-[#4F2683]/5 border border-[#4F2683]/20 p-3">
                <p className="text-xs text-gray-600 mb-1">Verified vs Unverified</p>
                <div className="flex items-baseline gap-4 flex-wrap">
                  <span className="text-sm">
                    <span className="text-gray-600">Verified:</span>{' '}
                    <span className="font-semibold text-gray-900">{verifiedAverage.toFixed(1)}%</span>
                  </span>
                  <span className="text-sm">
                    <span className="text-gray-600">Unverified:</span>{' '}
                    <span className="font-semibold text-gray-900">{stats.unverified_average.toFixed(1)}%</span>
                  </span>
                  <span className="text-xs text-gray-500">
                    ({stats.unverified_average > verifiedAverage ? '+' : ''}
                    {(stats.unverified_average - verifiedAverage).toFixed(1)}%)
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Submissions */}
      {hasSubmissions && (
        <div className="bg-white border border-gray-200">
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between">
            <h3 className="font-display font-semibold text-gray-900">Recent Submissions</h3>
            {recentSubmissions.length >= 10 && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="text-xs text-[#4F2683] hover:text-[#3D1E66] font-medium transition-colors"
              >
                {showAll ? 'Show Less' : `Show All (${stats?.unverified_count || 0})`}
              </button>
            )}
          </div>

          <div>
            {recentSubmissions.length > 0 ? (
              recentSubmissions.map((submission, index) => (
                <div
                  key={`${submission.grade}-${submission.term}-${submission.year}-${submission.submitted_on}-${index}`}
                  className="flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 flex items-center justify-center flex-shrink-0 ${getGradeClass(submission.grade)}`}>
                      <span className="text-sm font-semibold">
                        {submission.grade.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <p className="text-sm font-medium text-gray-900">{submission.grade.toFixed(1)}%</p>
                        {submission.term && submission.year && (
                          <span className="text-xs text-gray-500">
                            {formatTermYear(submission.term, submission.year)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">{formatDate(submission.submitted_on)}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider hidden sm:inline">Unverified</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-6">No submissions yet</p>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!hasSubmissions && (
        <div className="bg-gray-50 border border-gray-200 p-8 text-center">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-600 font-medium mb-1">No student submissions yet</p>
          <p className="text-sm text-gray-500">Be the first to share your average!</p>
        </div>
      )}
    </div>
  );
}
