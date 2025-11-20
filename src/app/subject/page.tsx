'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '../components/Header';
import ClassCard from '../components/ClassCard';
import CourseListItem from '../components/CourseListItem';
import { createClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

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

export default function SubjectPage() {
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

  // Load all courses and extract unique subjects with counts
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

        // Deduplicate courses by ID
        const uniqueCourses = Array.from(
          new Map(allCourses.map(course => [course.id, course])).values()
        );

        // Fetch unverified averages for all courses
        const courseIdsSet = new Set(uniqueCourses.map(c => c.id));
        const unverifiedAveragesMap = new Map<number, number>();
        
        // Fetch all student averages in batches (without filtering by course_id to avoid limits)
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
            // Filter to only include courses we care about
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

        // Calculate unverified averages per course
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

        // Calculate averages
        courseGradesMap.forEach((grades, courseId) => {
          if (grades.length > 0) {
            const sum = grades.reduce((a, b) => a + b, 0);
            const average = sum / grades.length;
            unverifiedAveragesMap.set(courseId, parseFloat(average.toFixed(2)));
          }
        });

        // Add unverified averages to courses
        const coursesWithUnverified = uniqueCourses.map(course => ({
          ...course,
          unverified_average: unverifiedAveragesMap.get(course.id) || null
        }));

        setCourses(coursesWithUnverified);
        
        // Calculate subject counts
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
        
        // If a subject is selected from URL, filter courses
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

  // Filter courses when subject is selected
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

  // Filter subjects based on search
  const filteredSubjects = useMemo(() => {
    if (!subjectSearch.trim()) return subjects;
    const searchLower = subjectSearch.toLowerCase();
    return subjects.filter(subject => 
      subject.name.toLowerCase().includes(searchLower)
    );
  }, [subjects, subjectSearch]);

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

  // Sort courses based on selected option
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
        // If both are Infinity (null), sort by verified average or alphabetically
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
        // If both are -Infinity (null), sort by verified average or alphabetically
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
    { value: 'avg-low-high', label: 'Verified Average: Lowest to Highest' },
    { value: 'avg-high-low', label: 'Verified Average: Highest to Lowest' },
    { value: 'unverified-low-high', label: 'Unverified Average: Lowest to Highest' },
    { value: 'unverified-high-low', label: 'Unverified Average: Highest to Lowest' },
    { value: 'alphabetical', label: 'Alphabetical' },
  ];

  const handleSubjectClick = (subjectName: string) => {
    if (selectedSubject === subjectName) {
      // Deselect if clicking the same subject
      setSelectedSubject('');
    } else {
      setSelectedSubject(subjectName);
    }
    // Scroll to courses section
    setTimeout(() => {
      const coursesSection = document.getElementById('courses-section');
      if (coursesSection) {
        coursesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  return (
    <div className="min-h-screen bg-[#faf9f7] relative">
      <Header />
      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-10 relative z-10">
        {/* Disclaimer Banner */}
        <div className="mb-4 sm:mb-6 card-elevated rounded-xl p-3 sm:p-4 bg-amber-50 border-l-4 border-amber-400">
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

        <div className="mb-6 sm:mb-10">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 mb-2 sm:mb-3 heading-display">Browse by Subject</h1>
          <p className="text-gray-600 text-base sm:text-lg font-light">Select a subject to explore its courses</p>
        </div>

        {/* Subject Selection Section */}
        <div className="mb-10">
          {/* Search Bar */}
          <div className="mb-4 sm:mb-6">
            <div className="relative">
              <svg className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search subjects..."
                value={subjectSearch}
                onChange={(e) => setSubjectSearch(e.target.value)}
                className="w-full pl-10 sm:pl-12 pr-10 sm:pr-4 py-2.5 sm:py-3.5 rounded-xl border border-gray-200 bg-white text-sm sm:text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
              {subjectSearch && (
                <button
                  onClick={() => setSubjectSearch('')}
                  className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Selected Subject Badge */}
          {selectedSubject && (
            <div className="mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3 flex-wrap">
              <span className="text-xs sm:text-sm text-gray-600 font-medium">Selected:</span>
              <button
                onClick={() => setSelectedSubject('')}
                className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-purple-100 text-purple-700 rounded-lg text-xs sm:text-sm font-semibold hover:bg-purple-200 transition-colors"
              >
                <span className="truncate max-w-[150px] sm:max-w-none">{selectedSubject}</span>
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Subjects Grid */}
          {loading ? (
            <div className="card-elevated rounded-xl p-12 sm:p-16 text-center">
              <div className="animate-spin rounded-full h-12 w-12 sm:h-14 sm:w-14 border-[3px] border-purple-200 border-t-purple-600 mx-auto mb-4 sm:mb-5"></div>
              <p className="text-sm sm:text-base text-gray-600 font-medium">Loading subjects...</p>
            </div>
          ) : filteredSubjects.length === 0 ? (
            <div className="card-elevated rounded-xl p-12 sm:p-16 text-center">
              <svg className="w-16 h-16 sm:w-20 sm:h-20 text-gray-300 mx-auto mb-4 sm:mb-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">No subjects found</h3>
              <p className="text-sm sm:text-base text-gray-500">
                {subjectSearch ? `No subjects match "${subjectSearch}"` : 'No subjects available'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {filteredSubjects.map((subject) => {
                const isSelected = selectedSubject === subject.name;
                return (
                  <button
                    key={subject.name}
                    onClick={() => handleSubjectClick(subject.name)}
                    className={`card-elevated rounded-xl p-3 sm:p-4 text-left transition-all ${
                      isSelected
                        ? 'bg-purple-600 text-white border-2 border-purple-700 shadow-lg transform scale-105'
                        : 'bg-white text-gray-900 hover:bg-purple-50 hover:border-purple-200 border-2 border-transparent'
                    }`}
                  >
                    <div className="font-bold text-sm sm:text-base mb-1 truncate" title={subject.name}>
                      {subject.name}
                    </div>
                    <div className={`text-xs sm:text-sm ${isSelected ? 'text-purple-100' : 'text-gray-500'}`}>
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
          <div id="courses-section" className="mb-6 sm:mb-10">
            <div className="mb-6 sm:mb-8 flex items-start justify-between flex-wrap gap-4 sm:gap-6">
              <div className="max-w-2xl w-full sm:w-auto">
                <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-1 sm:mb-2 heading-section">
                  Courses in {selectedSubject}
                </h2>
                <p className="text-sm sm:text-base text-gray-600 font-light">
                  {filteredCourses.length.toLocaleString()} {filteredCourses.length === 1 ? 'course' : 'courses'} found
                </p>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
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
                <div className="relative sort-menu-container flex-1 sm:flex-none">
                  <button
                    onClick={() => setShowSortMenu(!showSortMenu)}
                    className="btn-primary text-white px-3 sm:px-6 py-2.5 sm:py-3 rounded-xl hover:shadow-lg transition-all flex items-center gap-1.5 sm:gap-2.5 shadow-sm font-medium text-xs sm:text-sm w-full sm:w-auto justify-center"
                  >
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                    </svg>
                    <span className="hidden sm:inline">Sort:</span>
                    <span className="truncate max-w-[120px] sm:max-w-none">{sortOptions.find(opt => opt.value === sortOption)?.label}</span>
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-0.5 sm:ml-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showSortMenu && (
                    <div className="absolute right-0 sm:right-0 mt-2 w-[calc(100vw-2rem)] sm:w-72 max-w-[calc(100vw-2rem)] sm:max-w-none bg-white rounded-xl shadow-2xl border border-gray-100 z-20 overflow-hidden">
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

            {/* Courses Display */}
            {filteredCourses.length === 0 ? (
              <div className="card-elevated rounded-xl p-16 text-center">
                <svg className="w-20 h-20 text-gray-300 mx-auto mb-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <h3 className="text-xl font-bold text-gray-800 mb-2">No courses found</h3>
                <p className="text-gray-500">No courses available for {selectedSubject}.</p>
              </div>
            ) : (
              <>
                {viewMode === 'cards' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
                  <div className="card-elevated rounded-xl overflow-hidden">
                    {/* List Header */}
                    <div className="bg-gray-50 border-b border-gray-200 px-4 sm:px-6 py-2.5 sm:py-3 hidden sm:block">
                      <div className="flex items-center justify-between gap-6">
                        <div className="flex-1">
                          <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Course</span>
                        </div>
                        <div className="flex items-center gap-6 flex-shrink-0">
                          <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold w-20 text-center">Average</span>
                          <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold w-16 text-center">Letter</span>
                        </div>
                      </div>
                    </div>
                    {/* List Items */}
                    <div className="divide-y divide-gray-100">
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

        {/* Show message when no subject is selected */}
        {!selectedSubject && !loading && (
          <div className="card-elevated rounded-xl p-16 text-center">
            <svg className="w-20 h-20 text-gray-300 mx-auto mb-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Select a Subject</h3>
            <p className="text-gray-500">Click on a subject above to view its courses.</p>
          </div>
        )}
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
