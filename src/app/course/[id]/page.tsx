'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '../../components/Header';
import SubmitAverageForm from '../../components/SubmitAverageForm';
import UnverifiedAveragesSection from '../../components/UnverifiedAveragesSection';
import { createClient } from '@/lib/supabase';

interface Course {
  id: number;
  code: string;
  name: string;
  department: string;
  level: number;
  avg_grade: number | null;
  created_at: string;
}

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params?.id as string;
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    async function fetchCourse() {
      if (!courseId) {
        setError('Course ID is required');
        setLoading(false);
        return;
      }

      try {
        const supabase = createClient();
        const { data, error: fetchError } = await supabase
          .from('courses')
          .select('*')
          .eq('id', courseId)
          .single();

        if (fetchError) {
          console.error('Error fetching course:', fetchError);
          setError('Course not found');
          setLoading(false);
          return;
        }

        if (data) {
          setCourse(data);
        } else {
          setError('Course not found');
        }
      } catch (err) {
        console.error('Error fetching course:', err);
        setError('Failed to load course');
      } finally {
        setLoading(false);
      }
    }

    fetchCourse();
  }, [courseId]);

  const getLevelColor = (level: number) => {
    if (level >= 4) return { text: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' };
    if (level >= 3) return { text: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' };
    if (level >= 2) return { text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' };
    return { text: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200' };
  };

  const getGradeColor = (grade: number | null) => {
    if (grade === null) return { text: 'text-slate-400', bg: 'bg-slate-50' };
    if (grade >= 80) return { text: 'text-emerald-700', bg: 'bg-emerald-50' };
    if (grade >= 70) return { text: 'text-blue-700', bg: 'bg-blue-50' };
    if (grade >= 60) return { text: 'text-amber-700', bg: 'bg-amber-50' };
    return { text: 'text-red-700', bg: 'bg-red-50' };
  };

  const getGradeLetter = (grade: number | null) => {
    if (grade === null) return 'N/A';
    if (grade >= 90) return 'A+';
    if (grade >= 85) return 'A';
    if (grade >= 80) return 'A-';
    if (grade >= 77) return 'B+';
    if (grade >= 73) return 'B';
    if (grade >= 70) return 'B-';
    if (grade >= 67) return 'C+';
    if (grade >= 63) return 'C';
    if (grade >= 60) return 'C-';
    if (grade >= 57) return 'D+';
    if (grade >= 53) return 'D';
    if (grade >= 50) return 'D-';
    return 'F';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf9f7] relative">
        <Header />
        <main className="container mx-auto px-4 py-10 relative z-10">
          <div className="card-elevated rounded-xl p-16 text-center">
            <div className="animate-spin rounded-full h-14 w-14 border-[3px] border-purple-200 border-t-purple-600 mx-auto mb-5"></div>
            <p className="text-gray-600 font-medium">Loading course information...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-[#faf9f7] relative">
        <Header />
        <main className="container mx-auto px-4 py-10 relative z-10">
          <div className="card-elevated rounded-xl p-16 text-center">
            <svg className="w-20 h-20 text-gray-300 mx-auto mb-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Course Not Found</h3>
            <p className="text-gray-500 mb-6">{error || 'The course you are looking for does not exist.'}</p>
            <Link
              href="/"
              className="btn-primary text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all inline-flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to All Courses
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const levelColors = getLevelColor(course.level);
  const gradeColors = getGradeColor(course.avg_grade);

  return (
    <div className="min-h-screen bg-[#faf9f7] relative">
      <Header />
      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-10 relative z-10">
        {/* Back Button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 sm:mb-6 transition-colors font-medium text-sm sm:text-base"
        >
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to All Courses
        </Link>

        {/* Course Detail Card */}
        <div className="card-elevated rounded-xl bg-white border-l-[4px] border-purple-600 overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-purple-50 to-transparent px-4 sm:px-6 md:px-8 py-6 sm:py-8 border-b border-gray-100">
            <div className="flex items-start justify-between gap-4 sm:gap-6 flex-wrap">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 mb-2 sm:mb-3 heading-display">{course.name}</h1>
                <p className="text-lg sm:text-xl text-gray-600 font-mono tracking-wider mb-3 sm:mb-4">{course.code}</p>
                <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                  <span className="text-sm sm:text-base text-gray-700 font-semibold">{course.department}</span>
                  <span className="text-gray-400 hidden sm:inline">•</span>
                  <span className={`inline-flex items-center px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-bold ${levelColors.text} ${levelColors.bg} border ${levelColors.border}`}>
                    {course.level}000 Level
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              {/* Grade Information */}
              <div className="space-y-4 sm:space-y-6">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 heading-section">Grade Information</h2>
                
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-widest mb-2 font-medium">Average Grade</p>
                    <div className={`inline-flex items-baseline gap-2 px-3 sm:px-4 py-2 sm:py-3 rounded-xl ${gradeColors.bg}`}>
                      <p className={`text-3xl sm:text-4xl font-black ${gradeColors.text} leading-none`}>
                        {course.avg_grade !== null ? course.avg_grade.toFixed(1) : '—'}
                      </p>
                      {course.avg_grade !== null && (
                        <span className={`text-base sm:text-lg font-semibold ${gradeColors.text} opacity-70`}>%</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-widest mb-2 font-medium">Letter Grade</p>
                    <div className={`inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-xl ${gradeColors.bg} ${gradeColors.text} font-black text-2xl sm:text-3xl`}>
                      {getGradeLetter(course.avg_grade)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Course Details */}
              <div className="space-y-4 sm:space-y-6">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 heading-section">Course Details</h2>
                
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-widest mb-2 font-medium">Course Code</p>
                    <p className="text-base sm:text-lg font-mono text-gray-900">{course.code}</p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-widest mb-2 font-medium">Department</p>
                    <p className="text-base sm:text-lg font-semibold text-gray-900">{course.department}</p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-widest mb-2 font-medium">Course Level</p>
                    <span className={`inline-flex items-center px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-bold ${levelColors.text} ${levelColors.bg} border ${levelColors.border}`}>
                      {course.level}000 Level
                    </span>
                  </div>

                  {course.created_at && (
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-widest mb-2 font-medium">Added to Database</p>
                      <p className="text-xs sm:text-sm text-gray-600">
                        {new Date(course.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-6 sm:mt-8 card-elevated rounded-xl p-3 sm:p-4 bg-amber-50 border-l-4 border-amber-400">
          <div className="flex items-start gap-2 sm:gap-3">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-amber-900 font-medium leading-relaxed">
                <span className="font-semibold">Disclaimer:</span> Course averages displayed here are not guaranteed to be completely accurate and rely on the goodwill of students sharing their course averages. These figures should be used as a general reference only.
              </p>
            </div>
          </div>
        </div>

        {/* Student Averages Section */}
        <div className="mt-6 sm:mt-8 space-y-4 sm:space-y-6">
          <div className="border-t border-gray-200 pt-6 sm:pt-8">
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 mb-2 heading-section">Student-Submitted Averages</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">View and contribute to community-submitted course averages</p>
          </div>

          {/* Submit Form */}
          <SubmitAverageForm 
            courseId={course.id} 
            onSuccess={() => setRefreshTrigger(prev => prev + 1)}
          />

          {/* Display Section */}
          <UnverifiedAveragesSection 
            courseId={course.id}
            verifiedAverage={course.avg_grade}
            refreshTrigger={refreshTrigger}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-purple-900 text-white mt-16 py-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M20 20.5V18H0v-2h20v-2H0v-2h20v-2H0V8h20V6H0V4h20V2H0V0h22v20h2V0h2v20h2V0h2v20h2V0h2v20h2V0h2v20h2v2H20v-1.5zM0 20h2v20H0V20zm4 0h2v20H4V20zm4 0h2v20H8V20zm4 0h2v20h-2V20zm4 0h2v20h-2V20zm4 4h20v2H20v-2zm0 4h20v2H20v-2zm0 4h20v2H20v-2zm0 4h20v2H20v-2z'/%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <a 
            href="https://www.linkedin.com/in/annas-amar/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-purple-200/90 hover:text-purple-100 underline transition-colors font-medium"
          >
            LinkedIn
          </a>
        </div>
      </footer>
    </div>
  );
}

