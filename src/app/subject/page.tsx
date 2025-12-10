'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '../components/Header';
import ClassCard from '../components/ClassCard';
import CourseListItem from '../components/CourseListItem';
import { createClient } from '@/lib/supabase';

interface Course {
  id: number;
  code: string;
  name: string;
  department: string;
  level: number;
  avg_grade: number | null;
  unverified_average: number | null;
  created_at: string;
}

interface SubjectWithCount {
  name: string;
  count: number;
}

type SortOption = 'letter-grade' | 'avg-low-high' | 'avg-high-low' | 'unverified-low-high' | 'unverified-high-low' | 'alphabetical';

function SubjectPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedSubjectParam = searchParams.get('subject');

  const [subjects, setSubjects] = useState<SubjectWithCount[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>(selectedSubjectParam || '');
  const [loading, setLoading] = useState(true);
  const [sortOption, setSortOption] = useState<SortOption>('avg-high-low');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [subjectSearch, setSubjectSearch] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = createClient();
        let allCourses: Course[] = [];
        let from = 0;
        const pageSize = 1000;
        
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

        const courseIdsSet = new Set(uniqueCourses.map(c => c.id));
        const unverifiedAveragesMap = new Map<number, number>();
        
        let allSubmissions: { course_id: number; grade: number }[] = [];
        let submissionsFrom = 0;
        const submissionsPageSize = 1000;
        
        while (true) {
          const { data: submissionsData, error: submissionsError } = await supabase
            .from('student_averages')
            .select('course_id, grade')
            .range(submissionsFrom, submissionsFrom + submissionsPageSize - 1);

          if (submissionsError) {
            console.error('Error fetching student averages:', submissionsError);
            break;
          }

          if (submissionsData && submissionsData.length > 0) {
            const filteredSubmissions = submissionsData.filter(s => courseIdsSet.has(s.course_id));
            allSubmissions = [...allSubmissions, ...filteredSubmissions];
            submissionsFrom += submissionsPageSize;
            
            if (submissionsData.length < submissionsPageSize) {
              break;
            }
          } else {
            break;
          }
        }

        const courseGradesMap = new Map<number, number[]>();
        allSubmissions.forEach(submission => {
          const courseId = submission.course_id;
          const grade = typeof submission.grade === 'string' ? parseFloat(submission.grade) : submission.grade;
          if (!isNaN(grade) && isFinite(grade)) {
            if (!courseGradesMap.has(courseId)) {
              courseGradesMap.set(courseId, []);
            }
            courseGradesMap.get(courseId)!.push(grade);
          }
        });

        courseGradesMap.forEach((grades, courseId) => {
          if (grades.length > 0) {
            const sum = grades.reduce((a, b) => a + b, 0);
            const average = sum / grades.length;
            unverifiedAveragesMap.set(courseId, parseFloat(average.toFixed(2)));
          }
        });

        const coursesWithUnverified = uniqueCourses.map(course => ({
          ...course,
          unverified_average: unverifiedAveragesMap.get(course.id) || null
        }));

        setCourses(coursesWithUnverified);
        
        const subjectMap = new Map<string, number>();
        coursesWithUnverified.forEach(course => {
          if (course.department) {
            subjectMap.set(course.department, (subjectMap.get(course.department) || 0) + 1);
          }
        });

        const subjectsWithCounts: SubjectWithCount[] = Array.from(subjectMap.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => a.name.localeCompare(b.name));

        setSubjects(subjectsWithCounts);
        
        if (selectedSubjectParam) {
          const filtered = coursesWithUnverified.filter(c => c.department === selectedSubjectParam);
          setFilteredCourses(filtered);
          setSelectedSubject(selectedSubjectParam);
        }
      } catch (error) {
        console.error('Error fetching courses:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [selectedSubjectParam]);

  useEffect(() => {
    if (selectedSubject) {
      const filtered = courses.filter(c => c.department === selectedSubject);
      setFilteredCourses(filtered);
      router.replace(`/subject?subject=${encodeURIComponent(selectedSubject)}`, { scroll: false });
    } else {
      setFilteredCourses([]);
      router.replace('/subject', { scroll: false });
    }
  }, [selectedSubject, courses, router]);

  const filteredSubjects = useMemo(() => {
    if (!subjectSearch.trim()) return subjects;
    const searchLower = subjectSearch.toLowerCase();
    return subjects.filter(subject => 
      subject.name.toLowerCase().includes(searchLower)
    );
  }, [subjects, subjectSearch]);

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

  const sortedCourses = [...filteredCourses].sort((a, b) => {
    switch (sortOption) {
      case 'letter-grade': {
        const gradeA = getGradeLetter(a.avg_grade);
        const gradeB = getGradeLetter(b.avg_grade);
        const gradeOrder: { [key: string]: number } = {
          'A+': 0, 'A': 1, 'A-': 2,
          'B+': 3, 'B': 4, 'B-': 5,
          'C+': 6, 'C': 7, 'C-': 8,
          'D+': 9, 'D': 10, 'D-': 11,
          'F': 12, 'Z': 13
        };
        return (gradeOrder[gradeA] || 13) - (gradeOrder[gradeB] || 13);
      }
      case 'avg-low-high': {
        const avgA = a.avg_grade ?? Infinity;
        const avgB = b.avg_grade ?? Infinity;
        return avgA - avgB;
      }
      case 'avg-high-low': {
        const avgA = a.avg_grade ?? -Infinity;
        const avgB = b.avg_grade ?? -Infinity;
        return avgB - avgA;
      }
      case 'unverified-low-high': {
        const avgA = a.unverified_average ?? Infinity;
        const avgB = b.unverified_average ?? Infinity;
        if (avgA === Infinity && avgB === Infinity) {
          if (a.avg_grade !== null && b.avg_grade !== null) {
            return a.avg_grade - b.avg_grade;
          }
          return a.name.localeCompare(b.name);
        }
        return avgA - avgB;
      }
      case 'unverified-high-low': {
        const avgA = a.unverified_average ?? -Infinity;
        const avgB = b.unverified_average ?? -Infinity;
        if (avgA === -Infinity && avgB === -Infinity) {
          if (a.avg_grade !== null && b.avg_grade !== null) {
            return b.avg_grade - a.avg_grade;
          }
          return a.name.localeCompare(b.name);
        }
        return avgB - avgA;
      }
      case 'alphabetical': {
        return a.name.localeCompare(b.name);
      }
      default:
        return 0;
    }
  });

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'letter-grade', label: 'Letter Grade' },
    { value: 'avg-low-high', label: 'Verified: Low to High' },
    { value: 'avg-high-low', label: 'Verified: High to Low' },
    { value: 'unverified-low-high', label: 'Unverified: Low to High' },
    { value: 'unverified-high-low', label: 'Unverified: High to Low' },
    { value: 'alphabetical', label: 'Alphabetical' },
  ];

  const handleSubjectClick = (subjectName: string) => {
    if (selectedSubject === subjectName) {
      setSelectedSubject('');
    } else {
      setSelectedSubject(subjectName);
    }
    setTimeout(() => {
      const coursesSection = document.getElementById('courses-section');
      if (coursesSection) {
        coursesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <main className="container mx-auto px-4 sm:px-6 py-8">
        {/* Notice Banner */}
        <div className="mb-6 bg-amber-50 border-l-4 border-amber-400 p-4">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-amber-900">
              <strong>Note:</strong> Course averages are community-submitted and may not be completely accurate. Use as a general reference only.
            </p>
          </div>
        </div>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-display font-semibold text-gray-900 mb-2">Browse by Subject</h1>
          <p className="text-gray-600">Select a subject to explore its courses</p>
        </div>

        {/* Subject Selection */}
        <div className="mb-8">
          {/* Search */}
          <div className="mb-4">
            <div className="relative max-w-md">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search subjects..."
                value={subjectSearch}
                onChange={(e) => setSubjectSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F2683] focus:border-transparent"
              />
              {subjectSearch && (
                <button
                  onClick={() => setSubjectSearch('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Selected Subject Badge */}
          {selectedSubject && (
            <div className="mb-4 flex items-center gap-2">
              <span className="text-sm text-gray-600">Selected:</span>
              <button
                onClick={() => setSelectedSubject('')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#4F2683]/10 text-[#4F2683] text-sm font-medium hover:bg-[#4F2683]/20 transition-colors"
              >
                {selectedSubject}
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Subjects Grid */}
          {loading ? (
            <div className="bg-white border border-gray-200 p-12 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-[#4F2683] mx-auto mb-4"></div>
              <p className="text-gray-600">Loading subjects...</p>
            </div>
          ) : filteredSubjects.length === 0 ? (
            <div className="bg-white border border-gray-200 p-12 text-center">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-800 mb-1">No subjects found</h3>
              <p className="text-gray-500 text-sm">
                {subjectSearch ? `No subjects match "${subjectSearch}"` : 'No subjects available'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
              {filteredSubjects.map((subject) => {
                const isSelected = selectedSubject === subject.name;
                return (
                  <button
                    key={subject.name}
                    onClick={() => handleSubjectClick(subject.name)}
                    className={`p-3 text-left transition-all border ${
                      isSelected
                        ? 'bg-[#4F2683] text-white border-[#4F2683]'
                        : 'bg-white text-gray-900 border-gray-200 hover:border-[#4F2683]'
                    }`}
                  >
                    <div className="font-medium text-sm truncate" title={subject.name}>
                      {subject.name}
                    </div>
                    <div className={`text-xs mt-1 ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>
                      {subject.count} {subject.count === 1 ? 'course' : 'courses'}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Courses Section */}
        {selectedSubject && (
          <div id="courses-section" className="mb-8">
            <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
              <div>
                <h2 className="text-xl sm:text-2xl font-display font-semibold text-gray-900">
                  {selectedSubject}
                </h2>
                <p className="text-sm text-gray-600">
                  {filteredCourses.length} {filteredCourses.length === 1 ? 'course' : 'courses'}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                {/* View Toggle */}
                <div className="flex items-center border border-gray-200 bg-white">
                  <button
                    onClick={() => setViewMode('cards')}
                    className={`px-3 py-2 text-sm font-medium flex items-center gap-2 transition-colors ${
                      viewMode === 'cards'
                        ? 'bg-[#4F2683] text-white'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    <span className="hidden sm:inline">Cards</span>
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-2 text-sm font-medium flex items-center gap-2 transition-colors ${
                      viewMode === 'list'
                        ? 'bg-[#4F2683] text-white'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    <span className="hidden sm:inline">List</span>
                  </button>
                </div>

                {/* Sort Dropdown */}
                <div className="relative sort-menu-container">
                  <button
                    onClick={() => setShowSortMenu(!showSortMenu)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#4F2683] text-white text-sm font-medium hover:bg-[#3D1E66] transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                    </svg>
                    <span className="hidden sm:inline">Sort</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showSortMenu && (
                    <div className="absolute right-0 mt-1 w-56 bg-white border border-gray-200 shadow-lg z-20">
                      {sortOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setSortOption(option.value);
                            setShowSortMenu(false);
                          }}
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
            </div>

            {/* Courses Display */}
            {filteredCourses.length === 0 ? (
              <div className="bg-white border border-gray-200 p-12 text-center">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">No courses found</h3>
                <p className="text-gray-500 text-sm">No courses available for {selectedSubject}.</p>
              </div>
            ) : (
              <>
                {viewMode === 'cards' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sortedCourses.map((course, index) => (
                      <ClassCard
                        key={`${course.id}-${index}`}
                        id={course.id}
                        code={course.code}
                        name={course.name}
                        department={course.department}
                        level={course.level}
                        avgGrade={course.avg_grade}
                        unverifiedAverage={course.unverified_average}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="bg-white border border-gray-200">
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
                      {sortedCourses.map((course, index) => (
                        <CourseListItem
                          key={`${course.id}-${index}`}
                          id={course.id}
                          code={course.code}
                          name={course.name}
                          department={course.department}
                          level={course.level}
                          avgGrade={course.avg_grade}
                          unverifiedAverage={course.unverified_average}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* No Subject Selected Message */}
        {!selectedSubject && !loading && (
          <div className="bg-white border border-gray-200 p-12 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-800 mb-1">Select a Subject</h3>
            <p className="text-gray-500 text-sm">Click on a subject above to view its courses.</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#4F2683] text-white mt-12 py-6">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-white/80">
              Western University Course Averages
            </div>
            <a 
              href="https://www.linkedin.com/in/annas-amar/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-white/80 hover:text-white transition-colors"
            >
              Created by Annas Amar
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function SubjectPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white">
        <Header />
        <main className="container mx-auto px-4 sm:px-6 py-8">
          <div className="bg-white border border-gray-200 p-12 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-[#4F2683] mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </main>
      </div>
    }>
      <SubjectPageContent />
    </Suspense>
  );
}
