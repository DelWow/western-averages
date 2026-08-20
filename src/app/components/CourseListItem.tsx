'use client';

import Link from 'next/link';

interface CourseListItemProps {
  id: number;
  code: string;
  name: string;
  department: string;
  level: number;
  avgGrade: number | null;
  unverifiedAverage?: number | null;
  showUnverified?: boolean;
}

export default function CourseListItem({
  id,
  code,
  name,
  department,
  level,
  avgGrade,
  unverifiedAverage = null,
  showUnverified = true,
}: CourseListItemProps) {
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

  const displayGrade = showUnverified ? (avgGrade ?? unverifiedAverage) : avgGrade;
  const isUnverified = showUnverified && avgGrade === null && unverifiedAverage !== null;

  return (
    <Link 
      href={`/course/${id}`} 
      className="block bg-white border-b border-gray-100 hover:bg-gray-50 transition-colors px-4 sm:px-5 py-3"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Course Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <span className="min-w-0 overflow-wrap-anywhere text-xs font-mono text-gray-400">{code}</span>
            <span className={`text-xs font-medium px-1.5 py-0.5 ${getLevelClass(level)}`}>
              {level}000
            </span>
          </div>
          <h3 className="overflow-wrap-anywhere font-medium text-gray-900 text-sm sm:text-base sm:truncate">{name}</h3>
          <p className="overflow-wrap-anywhere text-xs text-gray-500 mt-0.5">{department}</p>
        </div>

        {/* Grade Info */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">
              {isUnverified ? 'Unverified' : 'Average'}
            </p>
            <div className="flex items-baseline gap-0.5 justify-end">
              <span className="text-lg font-semibold text-gray-900">
                {displayGrade !== null ? displayGrade.toFixed(1) : '—'}
              </span>
              {displayGrade !== null && <span className="text-xs text-gray-400">%</span>}
            </div>
            {showUnverified && avgGrade !== null && unverifiedAverage !== null && (
              <p className="text-[10px] text-gray-400">
                Unverified: {unverifiedAverage.toFixed(1)}%
              </p>
            )}
          </div>
          
          <div className={`w-10 h-10 flex items-center justify-center font-semibold text-sm ${getGradeClass(displayGrade)}`}>
            {getGradeLetter(displayGrade)}
          </div>
        </div>
      </div>
    </Link>
  );
}
