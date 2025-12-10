'use client';

import Link from 'next/link';

interface ClassCardProps {
  id: number;
  code: string;
  name: string;
  department: string;
  level: number;
  avgGrade: number | null;
  unverifiedAverage: number | null;
}

export default function ClassCard({ id, code, name, department, level, avgGrade, unverifiedAverage }: ClassCardProps) {
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

  const displayGrade = avgGrade ?? unverifiedAverage;
  const isUnverified = avgGrade === null && unverifiedAverage !== null;

  return (
    <Link 
      href={`/course/${id}`} 
      className="block bg-white border border-gray-200 hover:border-[#4F2683] hover:shadow-md transition-all"
    >
      {/* Purple accent bar */}
      <div className="h-1 bg-[#4F2683]" />
      
      <div className="p-4">
        {/* Course code and level */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="text-xs font-mono text-gray-500 tracking-wide">{code}</span>
          <span className={`text-xs font-medium px-2 py-0.5 ${getLevelClass(level)}`}>
            {level}000
          </span>
        </div>
        
        {/* Course name */}
        <h3 className="font-display text-base font-semibold text-gray-900 mb-3 leading-snug line-clamp-2">
          {name}
        </h3>
        
        {/* Department */}
        <p className="text-xs text-gray-500 mb-4">{department}</p>
        
        {/* Grade section */}
        <div className="flex items-end justify-between pt-3 border-t border-gray-100">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">
              {isUnverified ? 'Unverified Avg' : 'Class Average'}
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-semibold text-gray-900">
                {displayGrade !== null ? displayGrade.toFixed(1) : '—'}
              </span>
              {displayGrade !== null && <span className="text-sm text-gray-400">%</span>}
            </div>
            {avgGrade !== null && unverifiedAverage !== null && (
              <p className="text-xs text-gray-400 mt-1">
                Unverified: {unverifiedAverage.toFixed(1)}%
              </p>
            )}
          </div>
          
          <div className={`w-12 h-12 flex items-center justify-center font-semibold text-lg ${getGradeClass(displayGrade)}`}>
            {getGradeLetter(displayGrade)}
          </div>
        </div>
      </div>
    </Link>
  );
}
