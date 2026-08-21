'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Breadcrumbs from '../../components/Breadcrumbs';
import Header from '../../components/Header';
import SubmitAverageForm from '../../components/SubmitAverageForm';
import UnverifiedAveragesSection from '../../components/UnverifiedAveragesSection';
import { createClient } from '@/lib/supabase';
import { trackEvent } from '@/lib/analytics';

interface Course {
  id: number;
  code: string;
  name: string;
  department: string;
  level: number;
  avg_grade: number | null;
  sqct_grade: string | number | null;
  created_at: string;
}

export default function CourseDetailPage() {
  const params = useParams();
  const courseId = params?.id as string;
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    async function fetchCourse() {
      if (!courseId || !/^[1-9]\d{0,9}$/.test(courseId)) {
        setError('Course not found');
        setLoading(false);
        return;
      }

      try {
        const supabase = createClient();
        const { data, error: fetchError } = await supabase
          .from('courses')
          .select('id, code, name, department, level, avg_grade, sqct_grade, created_at')
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

  useEffect(() => {
    if (course) {
      trackEvent('course_view', { course_level: course.level });
    }
  }, [course]);

  const getLevelClass = (level: number) => {
    if (level >= 4) return 'level-4';
    if (level >= 3) return 'level-3';
    if (level >= 2) return 'level-2';
    return 'level-1';
  };

  const getGradeClass = (grade: number | null) => {
    if (grade === null) return 'grade-na';
    if (grade >= 80) return 'grade-a';
    if (grade >= 70) return 'grade-b';
    if (grade >= 60) return 'grade-c';
    return 'grade-d';
  };

  const getGradeLetter = (grade: number | null) => {
    if (grade === null) return '—';
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
      <div className="min-h-screen bg-white">
        <Header />
        <main className="container mx-auto px-4 sm:px-6 py-8">
          <div className="bg-white border border-gray-200 p-12 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-[#4F2683] mx-auto mb-4"></div>
            <p className="text-gray-600">Loading course...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="container mx-auto px-4 sm:px-6 py-8">
          <div className="bg-white border border-gray-200 p-12 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Course Not Found</h3>
            <p className="text-gray-500 text-sm mb-6">{error || 'The course you are looking for does not exist.'}</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#4F2683] text-white text-sm font-medium hover:bg-[#3D1E66] transition-colors"
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

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <main className="container mx-auto px-4 py-6 sm:px-6 sm:py-8">
        <Breadcrumbs
          items={[
            { label: 'All Courses', href: '/' },
            {
              label: course.department,
              href: `/subject?subject=${encodeURIComponent(course.department)}`,
            },
            { label: course.code },
          ]}
          className="mb-6"
        />

        {/* Course Header */}
        <div className="bg-white border border-gray-200 mb-6">
          <div className="h-1 bg-[#4F2683]" />
          <div className="p-4 sm:p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-3 mb-2">
                  <span className="min-w-0 overflow-wrap-anywhere text-sm font-mono text-gray-500">{course.code}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 ${getLevelClass(course.level)}`}>
                    {course.level}000 Level
                  </span>
                </div>
                <h1 className="overflow-wrap-anywhere text-2xl sm:text-3xl font-display font-semibold text-gray-900 mb-2">
                  {course.name}
                </h1>
                <p className="overflow-wrap-anywhere text-gray-600">{course.department}</p>
              </div>
            </div>

            {/* Grade Display */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-gray-100">
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Class Average</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-semibold text-gray-900">
                    {course.avg_grade !== null ? course.avg_grade.toFixed(1) : '—'}
                  </span>
                  {course.avg_grade !== null && <span className="text-lg text-gray-400">%</span>}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Letter Grade</p>
                <div className={`inline-flex items-center justify-center w-16 h-16 text-2xl font-semibold ${getGradeClass(course.avg_grade)}`}>
                  {getGradeLetter(course.avg_grade)}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">SQCT Grade</p>
                <div className="inline-flex min-w-16 h-16 px-4 items-center justify-center bg-[#4F2683]/10 text-[#4F2683] text-2xl font-semibold">
                  {course.sqct_grade === null || course.sqct_grade === '' ? '—' : course.sqct_grade}
                </div>
                <p className="text-xs text-gray-500 mt-2 max-w-xs">
                  Based on Western&apos;s 2025 Student Questionnaires on Courses and Teaching—student feedback about the course and its teaching.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Course Details */}
        <div className="bg-white border border-gray-200 mb-6">
          <div className="bg-gray-50 border-b border-gray-200 px-4 sm:px-6 py-3">
            <h2 className="font-display font-semibold text-gray-900">Course Details</h2>
          </div>
          <div className="p-4 sm:p-6">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-xs uppercase tracking-wider text-gray-500 mb-1">Course Code</dt>
                <dd className="overflow-wrap-anywhere font-mono text-gray-900">{course.code}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-gray-500 mb-1">Department</dt>
                <dd className="overflow-wrap-anywhere text-gray-900">{course.department}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-gray-500 mb-1">Course Level</dt>
                <dd>
                  <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium ${getLevelClass(course.level)}`}>
                    {course.level}000 Level
                  </span>
                </dd>
              </div>
              {course.created_at && (
                <div>
                  <dt className="text-xs uppercase tracking-wider text-gray-500 mb-1">Added to Database</dt>
                  <dd className="text-sm text-gray-600">
                    {new Date(course.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-6">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-amber-900">
              <strong>Note:</strong> Course averages are community-submitted and may not be completely accurate. Use as a general reference only.
            </p>
          </div>
        </div>

        {/* Student Averages Section */}
        <div className="bg-white border border-gray-200">
          <div className="bg-gray-50 border-b border-gray-200 px-4 sm:px-6 py-3">
            <h2 className="font-display font-semibold text-gray-900">Student-Submitted Averages</h2>
            <p className="text-sm text-gray-600 mt-1">View and contribute to community-submitted course averages</p>
          </div>
          <div className="p-3 sm:p-6 space-y-6">
            <SubmitAverageForm 
              courseId={course.id} 
              onSuccess={() => setRefreshTrigger(prev => prev + 1)}
            />
            <UnverifiedAveragesSection 
              courseId={course.id}
              verifiedAverage={course.avg_grade}
              refreshTrigger={refreshTrigger}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#4F2683] text-white mt-12 py-6">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-white/80">
              © 2026 Western University Course Averages
            </div>
            <a 
              href="https://www.linkedin.com/in/annas-amar/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-white/80 hover:text-white transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              LinkedIn
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
