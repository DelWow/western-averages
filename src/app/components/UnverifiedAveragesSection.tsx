'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

interface StudentAverage {
  id: string;
  course_id: number;
  grade: number;
  term: 'fall' | 'winter' | 'summer' | null;
  year: number | null;
  created_at: string;
  user_ip: string | null;
  user_agent: string | null;
}

interface AverageStats {
  verified_average: number | null;
  unverified_count: number;
  unverified_average: number | null;
  unverified_min: number | null;
  unverified_max: number | null;
  unverified_median: number | null;
  last_submission: string | null;
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

        const { data: statsData, error: statsError } = await supabase
          .rpc('get_course_average_stats', { course_id_param: courseId })
          .single();

        if (statsError) {
          if (statsError.code !== 'PGRST116') {
            console.warn('Stats function not available, using fallback:', statsError.message);
          }
          const { data: submissions, error: submissionsError } = await supabase
            .from('student_averages')
            .select('*')
            .eq('course_id', courseId)
            .order('created_at', { ascending: false });

          if (submissionsError) {
            console.error('Error fetching submissions:', submissionsError);
            setError('Failed to load student averages');
            setLoading(false);
            return;
          }

          const grades = submissions?.map(s => parseFloat(s.grade)) || [];
          const count = grades.length;
          
          const calculatedStats: AverageStats = {
            verified_average: verifiedAverage,
            unverified_count: count,
            unverified_average: count > 0 ? parseFloat((grades.reduce((a, b) => a + b, 0) / count).toFixed(2)) : null,
            unverified_min: count > 0 ? Math.min(...grades) : null,
            unverified_max: count > 0 ? Math.max(...grades) : null,
            unverified_median: count > 0 ? calculateMedian(grades) : null,
            last_submission: submissions && submissions.length > 0 ? submissions[0].created_at : null,
          };

          setStats(calculatedStats);
          setRecentSubmissions((submissions || []).slice(0, 10));
        } else {
          setStats(statsData as AverageStats);
          
          const { data: submissions, error: submissionsError } = await supabase
            .from('student_averages')
            .select('*')
            .eq('course_id', courseId)
            .order('created_at', { ascending: false })
            .limit(showAll ? 50 : 10);

          if (submissionsError) {
            console.error('Error fetching submissions:', submissionsError);
          } else {
            setRecentSubmissions(submissions || []);
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load student averages');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [courseId, refreshTrigger, showAll, verifiedAverage]);

  const calculateMedian = (numbers: number[]): number => {
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  };

  const getGradeClass = (grade: number | null) => {
    if (grade === null) return 'grade-na';
    if (grade >= 80) return 'grade-a';
    if (grade >= 70) return 'grade-b';
    if (grade >= 60) return 'grade-c';
    return 'grade-d';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
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
              recentSubmissions.map((submission) => (
                <div
                  key={submission.id}
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
                      <p className="text-xs text-gray-400">{formatDate(submission.created_at)}</p>
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
