'use client';

import { useState, useEffect, useMemo } from 'react';
import Header from '../../components/Header';
import { createClient } from '@/lib/supabase';

interface Course {
  id: number;
  code: string;
  name: string;
}

export default function AdminExamsPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [title, setTitle] = useState('');
  const [examType, setExamType] = useState<'midterm' | 'final' | 'quiz' | 'test'>('midterm');
  const [term, setTerm] = useState('');
  const [year, setYear] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch courses for autocomplete (fetch all courses with pagination)
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
            .select('id, code, name')
            .order('code', { ascending: true })
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
        console.log(`Loaded ${uniqueCourses.length} courses for autocomplete`);
      } catch (err) {
        console.error('Error fetching courses:', err);
      } finally {
        setLoadingCourses(false);
      }
    }

    fetchCourses();
  }, []);

  // Filter courses based on search query
  const filteredCourses = useMemo(() => {
    if (!searchQuery.trim() || courses.length === 0) return [];
    const query = searchQuery.toLowerCase().trim();
    const filtered = courses
      .filter((course) => {
        return (
          course.code.toLowerCase().includes(query) ||
          course.name.toLowerCase().includes(query)
        );
      })
      .slice(0, 10); // Limit to 10 results
    console.log(`Filtered ${filtered.length} courses for query: "${searchQuery}"`);
    return filtered;
  }, [searchQuery, courses]);

  const handleCourseSelect = (course: Course) => {
    setSelectedCourse(course);
    setSearchQuery(`${course.code} - ${course.name}`);
    setShowSuggestions(false);
    setError(null);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (value.trim()) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
      setSelectedCourse(null);
    }
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validation
    if (!selectedCourse) {
      setError('Please select a course from the search results');
      return;
    }

    if (!title) {
      setError('Please enter an exam title');
      return;
    }

    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    if (!term) {
      setError('Please enter a term (e.g., Fall 2024)');
      return;
    }

    if (!year || isNaN(parseInt(year))) {
      setError('Please enter a valid year');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('courseId', selectedCourse.id.toString());
      formData.append('courseCode', selectedCourse.code);
      formData.append('title', title);
      formData.append('examType', examType);
      formData.append('term', term);
      formData.append('year', year);

      const response = await fetch('/api/admin/exams', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to upload exam');
        setIsSubmitting(false);
        return;
      }

      // Success
      setSuccess(true);
      setFile(null);
      setTitle('');
      setTerm('');
      setYear('');
      setSelectedCourse(null);
      setSearchQuery('');
      
      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error uploading exam:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f7] relative">
      <Header />
      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-10 relative z-10">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 mb-2 heading-display">
            Upload Class Document
          </h1>
          <p className="text-gray-600 mb-6 sm:mb-8">
            Upload class documents and materials for courses.
          </p>

          <div className="card-elevated rounded-xl p-4 sm:p-6 border-l-[3px] border-purple-600 bg-white">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Course Search with Autocomplete */}
              <div className="relative">
                <label htmlFor="courseSearch" className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                  Course
                </label>
                {loadingCourses ? (
                  <div className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500">
                    Loading courses...
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      id="courseSearch"
                      value={searchQuery}
                      onChange={handleSearchChange}
                      onFocus={() => {
                        if (searchQuery.trim()) {
                          setShowSuggestions(true);
                        }
                      }}
                      onBlur={() => {
                        // Delay hiding suggestions to allow click events
                        setTimeout(() => setShowSuggestions(false), 200);
                      }}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition-all bg-white text-gray-900 font-medium"
                      placeholder="Search by course code or name (e.g., COMPSCI 1020A)"
                      autoComplete="off"
                      required
                    />
                    {showSuggestions && searchQuery.trim() && !loadingCourses && (
                      <>
                        {filteredCourses.length > 0 ? (
                          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-auto">
                            {filteredCourses.map((course) => (
                              <button
                                key={course.id}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault(); // Prevent input blur
                                  handleCourseSelect(course);
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-purple-50 transition-colors border-b border-gray-100 last:border-b-0"
                              >
                                <div className="font-mono text-sm font-semibold text-gray-900">{course.code}</div>
                                <div className="text-xs text-gray-600 mt-0.5">{course.name}</div>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-4 text-sm text-gray-500">
                            No courses found matching "{searchQuery}"
                          </div>
                        )}
                      </>
                    )}
                    {selectedCourse && (
                      <div className="mt-2 text-sm text-gray-600">
                        Selected: <span className="font-semibold font-mono">{selectedCourse.code}</span> - {selectedCourse.name}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Exam Title */}
              <div>
                <label htmlFor="title" className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                  Exam Title
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setError(null);
                  }}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition-all bg-white text-gray-900 font-medium"
                  placeholder="e.g., Document 1, Class Material"
                  required
                />
              </div>

              {/* Exam Type */}
              <div>
                <label htmlFor="examType" className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                  Exam Type
                </label>
                <select
                  id="examType"
                  value={examType}
                  onChange={(e) => {
                    setExamType(e.target.value as 'midterm' | 'final' | 'quiz' | 'test');
                    setError(null);
                  }}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition-all bg-white text-gray-900 font-medium"
                  required
                >
                  <option value="midterm">Midterm</option>
                  <option value="final">Final</option>
                  <option value="quiz">Quiz</option>
                  <option value="test">Test</option>
                </select>
              </div>

              {/* Term and Year */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="term" className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                    Term
                  </label>
                  <input
                    type="text"
                    id="term"
                    value={term}
                    onChange={(e) => {
                      setTerm(e.target.value);
                      setError(null);
                    }}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition-all bg-white text-gray-900 font-medium"
                    placeholder="e.g., Fall 2024"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="year" className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                    Year
                  </label>
                  <input
                    type="number"
                    id="year"
                    value={year}
                    onChange={(e) => {
                      setYear(e.target.value);
                      setError(null);
                    }}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition-all bg-white text-gray-900 font-medium"
                    placeholder="e.g., 2024"
                    min="2000"
                    max={new Date().getFullYear() + 1}
                    required
                  />
                </div>
              </div>

              {/* File Upload */}
              <div>
                <label htmlFor="file-input" className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                  Document File (PDF)
                </label>
                <input
                  type="file"
                  id="file-input"
                  accept=".pdf,application/pdf"
                  onChange={(e) => {
                    const selectedFile = e.target.files?.[0];
                    setFile(selectedFile || null);
                    setError(null);
                  }}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition-all bg-white text-gray-900"
                  required
                />
                {file && (
                  <p className="mt-2 text-sm text-gray-600">
                    Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="flex items-start gap-2 text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg p-3">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Document uploaded successfully!</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || success}
                className={`w-full btn-primary text-white px-6 py-3 rounded-xl hover:shadow-md transition-all font-semibold ${
                  isSubmitting || success ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading...
                  </span>
                ) : success ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Uploaded!
                  </span>
                ) : (
                  'Upload Document'
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

