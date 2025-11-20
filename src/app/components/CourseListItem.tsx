'use client';

import Link from 'next/link';

interface CourseListItemProps {
  id: number;
  code: string;
  name: string;
  department: string;
  level: number;
  avgGrade: number | null;
  unverifiedAverage: number | null;
}

export default function CourseListItem({ id, code, name, department, level, avgGrade, unverifiedAverage }: CourseListItemProps) {
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

  const levelColors = getLevelColor(level);
  const gradeColors = getGradeColor(avgGrade ?? unverifiedAverage);

  return (
    <Link href={`/course/${id}`} className="block group bg-white border-b border-gray-100 hover:bg-gray-50/50 transition-colors px-4 sm:px-6 py-3 sm:py-4 cursor-pointer">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-6">
        {/* Course Info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 mb-1.5">
            <h3 className="text-sm sm:text-base font-bold text-gray-900 truncate">{name}</h3>
            <span className="text-xs text-gray-500 font-mono tracking-wider flex-shrink-0">{code}</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm flex-wrap">
            <span className="text-gray-600 font-medium">{department}</span>
            <span className="text-gray-400 hidden sm:inline">•</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${levelColors.text} ${levelColors.bg} border ${levelColors.border}`}>
              {level}000
            </span>
          </div>
        </div>

        {/* Grade Info */}
        <div className="flex items-center gap-4 sm:gap-6 flex-shrink-0">
          <div className="text-center w-20">
            {avgGrade !== null ? (
              <>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1 font-medium">Verified</p>
                <div className={`inline-flex items-baseline gap-1 px-2 sm:px-3 py-1 rounded-lg ${gradeColors.bg}`}>
                  <p className={`text-base sm:text-lg font-black ${gradeColors.text} leading-none`}>
                    {avgGrade.toFixed(1)}
                  </p>
                  <span className={`text-xs font-semibold ${gradeColors.text} opacity-70`}>%</span>
                </div>
                {unverifiedAverage !== null && (
                  <div className="mt-1">
                    <p className="text-[9px] text-gray-400 uppercase tracking-widest mb-0.5 font-medium">Unverified</p>
                    <p className="text-xs sm:text-sm font-semibold text-gray-600">
                      {unverifiedAverage.toFixed(1)}%
                    </p>
                  </div>
                )}
              </>
            ) : unverifiedAverage !== null ? (
              <>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1 font-medium">Unverified</p>
                <div className={`inline-flex items-baseline gap-1 px-2 sm:px-3 py-1 rounded-lg ${gradeColors.bg}`}>
                  <p className={`text-base sm:text-lg font-black ${gradeColors.text} leading-none`}>
                    {unverifiedAverage.toFixed(1)}
                  </p>
                  <span className={`text-xs font-semibold ${gradeColors.text} opacity-70`}>%</span>
                </div>
              </>
            ) : (
              <>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1 font-medium">Average</p>
                <div className={`inline-flex items-baseline gap-1 px-2 sm:px-3 py-1 rounded-lg ${gradeColors.bg}`}>
                  <p className={`text-base sm:text-lg font-black ${gradeColors.text} leading-none`}>—</p>
                </div>
              </>
            )}
          </div>
          <div className="text-center w-16">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1 font-medium">Letter</p>
            <div className={`inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg ${gradeColors.bg} ${gradeColors.text} font-black text-sm sm:text-base`}>
              {getGradeLetter(avgGrade ?? unverifiedAverage)}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

