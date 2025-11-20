'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

interface StudentAverage {
  id: string; // uuid
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

        // Try to use the stats function if available, otherwise calculate manually
        const { data: statsData, error: statsError } = await supabase
          .rpc('get_course_average_stats', { course_id_param: courseId })
          .single();

        if (statsError) {
          // Fallback: calculate stats manually if function doesn't exist
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
          setStats(statsData);
          
          // Fetch recent submissions
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
  }, [courseId, refreshTrigger, showAll]);

  const calculateMedian = (numbers: number[]): number => {
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  };

  const getGradeColor = (grade: number | null) => {
    if (grade === null) return { text: 'text-slate-400', bg: 'bg-slate-50' };
    if (grade >= 80) return { text: 'text-emerald-700', bg: 'bg-emerald-50' };
    if (grade >= 70) return { text: 'text-blue-700', bg: 'bg-blue-50' };
    if (grade >= 60) return { text: 'text-amber-700', bg: 'bg-amber-50' };
    return { text: 'text-red-700', bg: 'bg-red-50' };
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
      <div className="card-elevated rounded-xl p-8 bg-white border-l-[3px] border-purple-600">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-[3px] border-purple-200 border-t-purple-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-elevated rounded-xl p-6 bg-white border-l-[3px] border-red-500">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  const hasSubmissions = stats && stats.unverified_count > 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Statistics Section */}
      {hasSubmissions && (
        <div className="card-elevated rounded-xl p-4 sm:p-6 bg-white border-l-[3px] border-purple-600">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 heading-section">Student-Submitted Averages</h3>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
              <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider mb-1 font-medium">Total Submissions</p>
              <p className="text-xl sm:text-2xl font-black text-gray-900">{stats.unverified_count}</p>
            </div>
            
            {stats.unverified_average !== null && (
              <>
                <div className="bg-blue-50 rounded-lg p-3 sm:p-4">
                  <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider mb-1 font-medium">Average</p>
                  <p className="text-xl sm:text-2xl font-black text-blue-700">{stats.unverified_average.toFixed(1)}%</p>
                </div>
                
                <div className="bg-emerald-50 rounded-lg p-3 sm:p-4">
                  <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider mb-1 font-medium">Median</p>
                  <p className="text-xl sm:text-2xl font-black text-emerald-700">
                    {stats.unverified_median !== null ? stats.unverified_median.toFixed(1) : '—'}%
                  </p>
                </div>
                
                {stats.unverified_min !== null && stats.unverified_max !== null && (
                  <>
                    <div className="bg-amber-50 rounded-lg p-3 sm:p-4">
                      <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider mb-1 font-medium">Lowest</p>
                      <p className="text-xl sm:text-2xl font-black text-amber-700">{stats.unverified_min.toFixed(1)}%</p>
                    </div>
                    
                    <div className="bg-purple-50 rounded-lg p-3 sm:p-4">
                      <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider mb-1 font-medium">Highest</p>
                      <p className="text-xl sm:text-2xl font-black text-purple-700">{stats.unverified_max.toFixed(1)}%</p>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* Comparison with Verified Average */}
          {verifiedAverage !== null && stats.unverified_average !== null && (
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-3 sm:p-4 border border-purple-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] sm:text-xs text-gray-600 uppercase tracking-wider mb-1 font-medium">Verified vs Unverified</p>
                  <div className="flex flex-wrap items-baseline gap-1.5 sm:gap-2">
                    <span className="text-sm sm:text-lg font-semibold text-gray-700">Verified:</span>
                    <span className="text-base sm:text-xl font-black text-purple-700">{verifiedAverage.toFixed(1)}%</span>
                    <span className="text-gray-400 hidden sm:inline">•</span>
                    <span className="text-sm sm:text-lg font-semibold text-gray-700">Unverified:</span>
                    <span className="text-base sm:text-xl font-black text-blue-700">{stats.unverified_average.toFixed(1)}%</span>
                    <span className="text-xs sm:text-sm text-gray-500">
                      ({stats.unverified_average > verifiedAverage ? '+' : ''}
                      {(stats.unverified_average - verifiedAverage).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Submissions */}
      {hasSubmissions && (
        <div className="card-elevated rounded-xl p-4 sm:p-6 bg-white border-l-[3px] border-gray-300">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-3 sm:mb-4">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 heading-section">
              Recent Submissions
            </h3>
            {recentSubmissions.length >= 10 && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="text-xs sm:text-sm text-purple-600 hover:text-purple-700 font-semibold transition-colors text-left sm:text-right"
              >
                {showAll ? 'Show Less' : `Show All (${stats?.unverified_count || 0})`}
              </button>
            )}
          </div>

          <div className="space-y-2">
            {recentSubmissions.length > 0 ? (
              recentSubmissions.map((submission) => {
                const gradeColors = getGradeColor(submission.grade);
                return (
                  <div
                    key={submission.id}
                    className="flex items-center justify-between p-2.5 sm:p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg ${gradeColors.bg} flex items-center justify-center flex-shrink-0`}>
                        <span className={`text-base sm:text-lg font-black ${gradeColors.text}`}>
                          {submission.grade.toFixed(1)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1 flex-wrap">
                          <p className="text-xs sm:text-sm font-semibold text-gray-900">{submission.grade.toFixed(1)}%</p>
                          {submission.term && submission.year && (
                            <>
                              <span className="text-gray-300 hidden sm:inline">•</span>
                              <span className="text-[10px] sm:text-xs font-medium text-gray-600">
                                {formatTermYear(submission.term, submission.year)}
                              </span>
                            </>
                          )}
                        </div>
                        <p className="text-[10px] sm:text-xs text-gray-500">{formatDate(submission.created_at)}</p>
                      </div>
                    </div>
                    <span className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider font-medium flex-shrink-0 ml-1 sm:ml-2 hidden sm:inline">Unverified</span>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No submissions yet</p>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!hasSubmissions && (
        <div className="card-elevated rounded-xl p-8 bg-gray-50 border-l-[3px] border-gray-300 text-center">
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

