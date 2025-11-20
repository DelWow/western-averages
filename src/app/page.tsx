'use client';

import { useState, useEffect } from 'react';
import Header from './components/Header';
import ClassCard from './components/ClassCard';
import CourseListItem from './components/CourseListItem';
import StatsCard from './components/StatsCard';
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

type SortOption = 'letter-grade' | 'avg-low-high' | 'avg-high-low' | 'alphabetical' | 'level';

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
        const pageSize = 1000; // Supabase default limit
        
        // Fetch all courses using pagination
        while (true) {
          const { data, error } = await supabase
            .from('courses')
            .select('*')
            .order('created_at', { ascending: false })
            .range(from, from + pageSize - 1);

          if (error) {
            console.error('Error fetching courses:', error);
            break;
          }

          if (data && data.length > 0) {
            allCourses = [...allCourses, ...data];
            from += pageSize;
            
            // If we got fewer rows than requested, we've reached the end
            if (data.length < pageSize) {
              break;
            }
          } else {
            break;
          }
        }

        // Deduplicate courses by ID (keep first occurrence)
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

  // Reset to page 1 when sort option changes
  useEffect(() => {
    setCurrentPage(1);
  }, [sortOption]);

  // Close sort menu when clicking outside
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

  // Helper function to get letter grade from numeric grade
  const getGradeLetter = (grade: number | null): string => {
    if (grade === null) return 'Z'; // Put null grades at the end
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

  // Sort courses based on selected option
  const sortedCourses = [...courses].sort((a, b) => {
    // Always put N/A (null) averages after courses with averages
    const aIsNull = a.avg_grade === null;
    const bIsNull = b.avg_grade === null;
    
    if (aIsNull && !bIsNull) return 1; // a goes after b
    if (!aIsNull && bIsNull) return -1; // b goes after a
    if (aIsNull && bIsNull) {
      // Both are null, sort alphabetically
      return a.name.localeCompare(b.name);
    }
    
    // Both have averages, proceed with normal sorting
    switch (sortOption) {
      case 'letter-grade': {
        const gradeA = getGradeLetter(a.avg_grade);
        const gradeB = getGradeLetter(b.avg_grade);
        // Sort by letter grade (A+ > A > A- > B+ > ... > F)
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
        return (a.avg_grade ?? 0) - (b.avg_grade ?? 0);
      }
      case 'avg-high-low': {
        return (b.avg_grade ?? 0) - (a.avg_grade ?? 0);
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
    { value: 'avg-low-high', label: 'Average: Lowest to Highest' },
    { value: 'avg-high-low', label: 'Average: Highest to Lowest' },
    { value: 'level', label: 'Level: Low to High' },
    { value: 'alphabetical', label: 'Alphabetical' },
  ];

  // Calculate pagination
  const totalPages = Math.ceil(sortedCourses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCourses = sortedCourses.slice(startIndex, endIndex);

  // Pagination handlers
  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    <div className="min-h-screen bg-[#faf9f7] relative">
      <Header />
      <main className="container mx-auto px-4 py-10 relative z-10">
        {/* Disclaimer Banner */}
        <div className="mb-6 card-elevated rounded-xl p-4 bg-amber-50 border-l-4 border-amber-400">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm text-amber-900 font-medium leading-relaxed mb-2">
                <span className="font-semibold">Disclaimer:</span> Course averages displayed here are not guaranteed to be completely accurate and rely on the goodwill of students sharing their course averages. These figures should be used as a general reference only.
              </p>
              <p className="text-sm text-amber-900 font-medium leading-relaxed mb-2">
                <span className="font-semibold">Note:</span> This list is very incomplete. Help us grow the database by submitting course averages from your transcripts!
              </p>
              <a
                href="https://docs.google.com/forms/d/e/1FAIpQLSc899eAANEN86_cyUbraw4Afl87euBG98rMiLrNBXyrGiwuCw/viewform?usp=sharing&ouid=112869558789053127474"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-semibold text-amber-800 hover:text-amber-900 underline transition-colors mt-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Submit course averages from transcripts
              </a>
            </div>
          </div>
        </div>

        <div className="mb-10 flex items-start justify-between flex-wrap gap-6">
          <div className="max-w-2xl">
            <h1 className="text-5xl font-black text-gray-900 mb-3 heading-display">Course Averages</h1>
            <p className="text-gray-600 text-lg font-light leading-relaxed">Explore grade distributions across Western's course catalog</p>
          </div>
          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="flex items-center bg-white rounded-xl p-1 shadow-sm border border-gray-200">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-4 py-2 rounded-lg transition-all text-sm font-medium flex items-center gap-2 ${
                  viewMode === 'cards'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Card view"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                <span className="hidden sm:inline">Cards</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-lg transition-all text-sm font-medium flex items-center gap-2 ${
                  viewMode === 'list'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="List view"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <span className="hidden sm:inline">List</span>
              </button>
            </div>
            {/* Sort Button */}
            <div className="relative sort-menu-container">
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="btn-primary text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all flex items-center gap-2.5 shadow-sm font-medium text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                </svg>
                <span className="hidden sm:inline">Sort:</span> {sortOptions.find(opt => opt.value === sortOption)?.label}
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showSortMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 z-20 overflow-hidden">
                  {sortOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSortOption(option.value);
                        setShowSortMenu(false);
                      }}
                      className={`w-full text-left px-5 py-3.5 hover:bg-purple-50 transition-colors text-sm ${
                        sortOption === option.value ? 'bg-purple-100 text-purple-700 font-semibold' : 'text-gray-700 font-medium'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
          <StatsCard
            title="Total Courses"
            value={courses.length.toLocaleString()}
            subtitle="Active courses in database"
            icon={
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            }
          />
          <StatsCard
            title="Subjects"
            value={new Set(courses.map(c => c.department)).size}
            subtitle="Unique academic subjects"
            icon={
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            }
          />
        </div>

        {/* Courses Grid */}
        {loading ? (
          <div className="card-elevated rounded-xl p-16 text-center">
            <div className="animate-spin rounded-full h-14 w-14 border-[3px] border-purple-200 border-t-purple-600 mx-auto mb-5"></div>
            <p className="text-gray-600 font-medium">Loading courses...</p>
          </div>
        ) : courses.length === 0 ? (
          <div className="card-elevated rounded-xl p-16 text-center">
            <svg className="w-20 h-20 text-gray-300 mx-auto mb-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No courses available</h3>
            <p className="text-gray-500">Courses will appear here once they are added to the database.</p>
          </div>
        ) : (
          <>
            {viewMode === 'cards' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
                {paginatedCourses.map((course, index) => (
                  <ClassCard
                    key={`${course.id}-${index}`}
                    code={course.code}
                    name={course.name}
                    department={course.department}
                    level={course.level}
                    avgGrade={course.avg_grade}
                  />
                ))}
              </div>
            ) : (
              <div className="card-elevated rounded-xl overflow-hidden mb-10">
                {/* List Header */}
                <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
                  <div className="flex items-center justify-between gap-6">
                    <div className="flex-1">
                      <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Course</span>
                    </div>
                    <div className="flex items-center gap-6 flex-shrink-0">
                      <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold w-20 text-right">Average</span>
                      <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold w-16 text-right">Letter</span>
                    </div>
                  </div>
                </div>
                {/* List Items */}
                <div className="divide-y divide-gray-100">
                  {paginatedCourses.map((course, index) => (
                    <CourseListItem
                      key={`${course.id}-${index}`}
                      code={course.code}
                      name={course.name}
                      department={course.department}
                      level={course.level}
                      avgGrade={course.avg_grade}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="card-elevated rounded-xl p-6 mt-10">
                <div className="flex items-center justify-between flex-wrap gap-5">
                  <div className="text-sm text-gray-600 font-medium">
                    Showing <span className="font-semibold text-gray-900">{startIndex + 1}</span> to <span className="font-semibold text-gray-900">{Math.min(endIndex, sortedCourses.length)}</span> of <span className="font-semibold text-gray-900">{sortedCourses.length.toLocaleString()}</span> courses
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={goToPreviousPage}
                      disabled={currentPage === 1}
                      className={`px-4 py-2.5 rounded-xl transition-all ${
                        currentPage === 1
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'btn-primary text-white hover:shadow-md'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>

                    <div className="flex items-center gap-1.5">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                        // Show first page, last page, current page, and pages around current
                        const showPage =
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 2 && page <= currentPage + 2);

                        if (!showPage) {
                          // Show ellipsis
                          const prevPage = page - 1;
                          const nextPage = page + 1;
                          if (
                            (prevPage === 1 || prevPage === currentPage - 3) &&
                            (nextPage === totalPages || nextPage === currentPage + 3)
                          ) {
                            return (
                              <span key={page} className="px-2 text-gray-400 font-medium">
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
                            className={`px-4 py-2.5 rounded-xl transition-all text-sm font-medium ${
                              currentPage === page
                                ? 'btn-primary text-white shadow-md'
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
                      className={`px-4 py-2.5 rounded-xl transition-all ${
                        currentPage === totalPages
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'btn-primary text-white hover:shadow-md'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-purple-900 text-white mt-16 py-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M20 20.5V18H0v-2h20v-2H0v-2h20v-2H0V8h20V6H0V4h20V2H0V0h22v20h2V0h2v20h2V0h2v20h2V0h2v20h2V0h2v20h2v2H20v-1.5zM0 20h2v20H0V20zm4 0h2v20H4V20zm4 0h2v20H8V20zm4 0h2v20h-2V20zm4 0h2v20h-2V20zm4 4h20v2H20v-2zm0 4h20v2H20v-2zm0 4h20v2H20v-2zm0 4h20v2H20v-2z'/%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <p className="text-purple-200/90 font-medium">Western University Class Averages Tracker</p>
          <p className="text-xs text-purple-300/70 mt-3 font-light">© {new Date().getFullYear()} Western University</p>
        </div>
      </footer>
    </div>
  );
}
