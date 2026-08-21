import Link from 'next/link';

interface ClassCardProps {
  id: number;
  code: string;
  name: string;
  department: string;
  level: number;
  avgGrade: number | null;
  sqctGrade?: string | number | null;
  unverifiedAverage?: number | null;
  showUnverified?: boolean;
}

export default function ClassCard({
  id,
  code,
  name,
  department,
  level,
  avgGrade,
  sqctGrade = null,
  unverifiedAverage = null,
  showUnverified = true,
}: ClassCardProps) {
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
  const displaySqctGrade = sqctGrade === null || sqctGrade === '' ? '—' : sqctGrade;

  return (
    <Link 
      href={`/course/${id}`} 
      className="block min-w-0 bg-white border border-gray-200 hover:border-[#4F2683] hover:shadow-md transition-all"
    >
      {/* Purple accent bar */}
      <div className="h-1 bg-[#4F2683]" />
      
      <div className="p-4">
        {/* Course code and level */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="min-w-0 overflow-wrap-anywhere text-xs font-mono text-gray-500 tracking-wide">{code}</span>
          <span className={`text-xs font-medium px-2 py-0.5 ${getLevelClass(level)}`}>
            {level}000
          </span>
        </div>
        
        {/* Course name */}
        <h3 className="overflow-wrap-anywhere font-display text-base font-semibold text-gray-900 mb-3 leading-snug line-clamp-2">
          {name}
        </h3>
        
        {/* Department */}
        <p className="overflow-wrap-anywhere text-xs text-gray-500 mb-4">{department}</p>

        {/* SQCT Grade */}
        <div className="flex items-center justify-between gap-3 py-2.5 px-3 mb-3 bg-gray-50 border border-gray-100">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] uppercase tracking-wider text-gray-500">SQCT Grade</p>
              <span
                className="group relative inline-flex text-gray-400 hover:text-[#4F2683] focus:text-[#4F2683] focus:outline-none"
                tabIndex={0}
                aria-label="About SQCT grades"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" strokeWidth="2" />
                  <path strokeLinecap="round" strokeWidth="2" d="M12 11v5m0-8h.01" />
                </svg>
                <span
                  role="tooltip"
                  className="pointer-events-none fixed inset-x-4 bottom-4 z-20 w-auto bg-gray-900 px-3 py-2 text-[11px] normal-case leading-relaxed tracking-normal text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus:opacity-100 sm:absolute sm:inset-x-auto sm:left-1/2 sm:bottom-full sm:mb-2 sm:w-64 sm:-translate-x-1/2"
                >
                  SQCT stands for Student Questionnaires on Courses and Teaching. This grade is based on 2025 student feedback.
                </span>
              </span>
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5">2025 results</p>
          </div>
          <span className="text-sm font-semibold text-[#4F2683]">{displaySqctGrade}</span>
        </div>
        
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
            {showUnverified && avgGrade !== null && unverifiedAverage !== null && (
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
