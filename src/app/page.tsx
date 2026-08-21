'use client';

import { useState, useEffect } from 'react';
import Header from './components/Header';
import ClassCard from './components/ClassCard';
import CourseListItem from './components/CourseListItem';
import StatsCard from './components/StatsCard';
import { createClient } from '@/lib/supabase';
import { compareSqctGrades } from '@/lib/sqct';
import { trackEvent } from '@/lib/analytics';

interface Course {
  id: number;
  code: string;
  name: string;
  department: string;
  level: number;
  avg_grade: number | null;
  sqct_grade: string | number | null;
}

type SortOption =
  | 'letter-grade'
  | 'avg-low-high'
  | 'avg-high-low'
  | 'sqct-low-high'
  | 'sqct-high-low'
  | 'alphabetical'
  | 'level';

export default function Home() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOption, setSortOption] = useState<SortOption>('avg-high-low');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const itemsPerPage = 300;

  // Load courses from Supabase on mount
  useEffect(() => {
    async function fetchCourses() {
      try {
        const supabase = createClient();
        let allCourses: Course[] = [];
        let from = 0;
        const pageSize = 1000;
        
        while (true) {
          const { data, error } = await supabase
            .from('courses')
            .select('id, code, name, department, level, avg_grade, sqct_grade')
            .order('created_at', { ascending: false })
            .range(from, from + pageSize - 1);

          if (error) {
            console.error('Error fetching courses:', error);
            break;
          }

          if (data && data.length > 0) {
            allCourses = [...allCourses, ...data];
            from += pageSize;
            
            if (data.length < pageSize) {
              break;
            }
          } else {
            break;
          }
        }

        const uniqueCourses = Array.from(
          new Map(allCourses.map(course => [course.id, course])).values()
        );

        setCourses(uniqueCourses);
      } catch (error) {
        console.error('Error fetching courses:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchCourses();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [sortOption]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.sort-menu-container')) {
        setShowSortMenu(false);
      }
    };

    if (showSortMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSortMenu]);

  const getGradeLetter = (grade: number | null): string => {
    if (grade === null) return 'Z';
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

  const sortedCourses = [...courses].sort((a, b) => {
    switch (sortOption) {
      case 'letter-grade': {
        const aIsNull = a.avg_grade === null;
        const bIsNull = b.avg_grade === null;
        
        if (aIsNull && !bIsNull) return 1;
        if (!aIsNull && bIsNull) return -1;
        if (aIsNull && bIsNull) {
          return a.name.localeCompare(b.name);
        }
        
        const gradeA = getGradeLetter(a.avg_grade);
        const gradeB = getGradeLetter(b.avg_grade);
        const gradeOrder: { [key: string]: number } = {
          'A+': 0, 'A': 1, 'A-': 2,
          'B+': 3, 'B': 4, 'B-': 5,
          'C+': 6, 'C': 7, 'C-': 8,
          'D+': 9, 'D': 10, 'D-': 11,
          'F': 12
        };
        return (gradeOrder[gradeA] || 12) - (gradeOrder[gradeB] || 12);
      }
      case 'avg-low-high': {
        const aIsNull = a.avg_grade === null;
        const bIsNull = b.avg_grade === null;
        
        if (aIsNull && !bIsNull) return 1;
        if (!aIsNull && bIsNull) return -1;
        if (aIsNull && bIsNull) {
          return a.name.localeCompare(b.name);
        }
        
        return (a.avg_grade ?? 0) - (b.avg_grade ?? 0);
      }
      case 'avg-high-low': {
        const aIsNull = a.avg_grade === null;
        const bIsNull = b.avg_grade === null;
        
        if (aIsNull && !bIsNull) return 1;
        if (!aIsNull && bIsNull) return -1;
        if (aIsNull && bIsNull) {
          return a.name.localeCompare(b.name);
        }
        
        return (b.avg_grade ?? 0) - (a.avg_grade ?? 0);
      }
      case 'sqct-low-high': {
        return compareSqctGrades(a.sqct_grade, b.sqct_grade, 'ascending');
      }
      case 'sqct-high-low': {
        return compareSqctGrades(a.sqct_grade, b.sqct_grade, 'descending');
      }
      case 'alphabetical': {
        return a.name.localeCompare(b.name);
      }
      case 'level': {
        return a.level - b.level;
      }
      default:
        return 0;
    }
  });

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'letter-grade', label: 'Letter Grade' },
    { value: 'avg-low-high', label: 'Verified: Low to High' },
    { value: 'avg-high-low', label: 'Verified: High to Low' },
    { value: 'sqct-low-high', label: 'SQCT: Low to High' },
    { value: 'sqct-high-low', label: 'SQCT: High to Low' },
    { value: 'level', label: 'Course Level' },
    { value: 'alphabetical', label: 'Alphabetical' },
  ];

  const totalPages = Math.ceil(sortedCourses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCourses = sortedCourses.slice(startIndex, endIndex);
  const coursesWithSqctGrades = courses.filter(
    course => course.sqct_grade !== null && String(course.sqct_grade).trim() !== ''
  ).length;

  const goToPage = (page: number) => {
    if (page === currentPage) return;

    trackEvent('pagination', { page_number: page });
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const changeViewMode = (mode: 'cards' | 'list') => {
    if (mode === viewMode) return;

    trackEvent('view_mode_change', { view_mode: mode });
    setViewMode(mode);
  };

  const changeSortOption = (option: SortOption) => {
    if (option !== sortOption) {
      trackEvent('sort_courses', { sort_method: option });
      setSortOption(option);
    }

    setShowSortMenu(false);
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <main className="container mx-auto px-4 py-6 sm:px-6 sm:py-8">
        {/* Notice Banner */}
        <div className="mb-6 bg-amber-50 border-l-4 border-amber-400 p-3 sm:p-4">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-amber-900">
              <p className="mb-2">
                <strong>Note:</strong> Course averages are community-submitted and may not be completely accurate. Use as a general reference only.
              </p>
              <p className="mb-2">
                This database is incomplete. Help us grow by submitting your course averages.
              </p>
              <a
                href="https://docs.google.com/forms/d/e/1FAIpQLSc899eAANEN86_cyUbraw4Afl87euBG98rMiLrNBXyrGiwuCw/viewform?usp=sharing&ouid=112869558789053127474"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-amber-800 hover:text-amber-900 underline font-medium"
              >
                Submit course averages from transcripts
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Page Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-display font-semibold text-gray-900 mb-2">Course Averages</h1>
          <p className="text-gray-600">Browse grade distributions across Western University courses</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <StatsCard
            title="Total Courses"
            value={courses.length.toLocaleString()}
            subtitle={`${courses.filter(c => c.avg_grade !== null).length.toLocaleString()} with verified course averages`}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            }
          />
          <StatsCard
            title="SQCT Coverage"
            value={coursesWithSqctGrades.toLocaleString()}
            subtitle="Courses with 2025 SQCT grades"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6M9 8h6m4 13H5a2 2 0 01-2-2V5a2 2 0 012-2h10l6 6v10a2 2 0 01-2 2z" />
              </svg>
            }
          />
          <StatsCard
            title="Subjects"
            value={new Set(courses.map(c => c.department)).size}
            subtitle="Academic departments"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            }
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between gap-3 sm:gap-4 mb-6 flex-wrap">
          {/* View Toggle */}
          <div className="flex items-center border border-gray-200 bg-white">
            <button
              onClick={() => changeViewMode('cards')}
              className={`min-h-11 px-3 py-2 text-sm font-medium flex items-center gap-2 transition-colors ${
                viewMode === 'cards'
                  ? 'bg-[#4F2683] text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Cards
            </button>
            <button
              onClick={() => changeViewMode('list')}
              className={`min-h-11 px-3 py-2 text-sm font-medium flex items-center gap-2 transition-colors ${
                viewMode === 'list'
                  ? 'bg-[#4F2683] text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              List
            </button>
          </div>

          {/* Sort Dropdown */}
          <div className="relative min-w-0 sort-menu-container">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="flex min-h-11 max-w-full items-center gap-2 px-3 sm:px-4 py-2 bg-[#4F2683] text-white text-sm font-medium hover:bg-[#3D1E66] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              </svg>
              <span className="truncate">Sort: {sortOptions.find(opt => opt.value === sortOption)?.label}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showSortMenu && (
              <div className="absolute right-0 mt-1 w-56 max-w-[calc(100vw-2rem)] bg-white border border-gray-200 shadow-lg z-20">
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => changeSortOption(option.value)}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                      sortOption === option.value ? 'bg-[#4F2683]/10 text-[#4F2683] font-medium' : 'text-gray-700'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="bg-white border border-gray-200 p-12 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-[#4F2683] mx-auto mb-4"></div>
            <p className="text-gray-600">Loading courses...</p>
          </div>
        ) : courses.length === 0 ? (
          <div className="bg-white border border-gray-200 p-12 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-800 mb-1">No courses available</h3>
            <p className="text-gray-500 text-sm">Courses will appear here once added to the database.</p>
          </div>
        ) : (
          <>
            {viewMode === 'cards' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {paginatedCourses.map((course, index) => (
                  <ClassCard
                    key={`${course.id}-${index}`}
                    id={course.id}
                    code={course.code}
                    name={course.name}
                    department={course.department}
                    level={course.level}
                    avgGrade={course.avg_grade}
                    sqctGrade={course.sqct_grade}
                    showUnverified={false}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white border border-gray-200 mb-8">
                {/* List Header */}
                <div className="bg-gray-50 border-b-2 border-[#4F2683] px-4 sm:px-5 py-3 hidden sm:block">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider text-gray-500 font-medium">Course</span>
                    <div className="flex items-center gap-8">
                      <span className="text-xs uppercase tracking-wider text-gray-500 font-medium w-20 text-right">Average</span>
                      <span className="text-xs uppercase tracking-wider text-gray-500 font-medium w-10 text-center">Grade</span>
                    </div>
                  </div>
                </div>
                {/* List Items */}
                <div>
                  {paginatedCourses.map((course, index) => (
                    <CourseListItem
                      key={`${course.id}-${index}`}
                      id={course.id}
                      code={course.code}
                      name={course.name}
                      department={course.department}
                      level={course.level}
                      avgGrade={course.avg_grade}
                      showUnverified={false}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white border border-gray-200 p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-sm text-gray-600">
                    Showing <span className="font-medium">{startIndex + 1}</span> to <span className="font-medium">{Math.min(endIndex, sortedCourses.length)}</span> of <span className="font-medium">{sortedCourses.length.toLocaleString()}</span> courses
                  </p>
                  <div className="flex w-full max-w-full items-center justify-center gap-1 sm:w-auto sm:justify-start">
                    <button
                      onClick={goToPreviousPage}
                      disabled={currentPage === 1}
                      className={`min-h-10 px-2 sm:px-3 py-1.5 text-sm transition-colors ${
                        currentPage === 1
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-[#4F2683] text-white hover:bg-[#3D1E66]'
                      }`}
                    >
                      Previous
                    </button>

                    <div className="flex min-w-0 items-center gap-1 mx-1 sm:mx-2 overflow-x-auto">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                        const showPage =
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1);

                        if (!showPage) {
                          const prevPage = page - 1;
                          const nextPage = page + 1;
                          if (
                            (prevPage === 1 || prevPage === currentPage - 2) &&
                            (nextPage === totalPages || nextPage === currentPage + 2)
                          ) {
                            return (
                              <span key={page} className="px-2 text-gray-400 text-sm">
                                ...
                              </span>
                            );
                          }
                          return null;
                        }

                        return (
                          <button
                            key={page}
                            onClick={() => goToPage(page)}
                            className={`min-h-10 min-w-9 px-2 sm:px-3 py-1.5 text-sm font-medium transition-colors ${
                              currentPage === page
                                ? 'bg-[#4F2683] text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={goToNextPage}
                      disabled={currentPage === totalPages}
                      className={`min-h-10 px-2 sm:px-3 py-1.5 text-sm transition-colors ${
                        currentPage === totalPages
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-[#4F2683] text-white hover:bg-[#3D1E66]'
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
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
