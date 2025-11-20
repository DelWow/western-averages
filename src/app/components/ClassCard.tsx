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
    <Link href={`/course/${id}`} className="block card-elevated rounded-xl p-5 border-l-[3px] border-purple-600 bg-white relative overflow-hidden group hover:shadow-lg transition-all cursor-pointer">
      {/* Subtle gradient accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
      
      <div className="relative z-10">
        <div className="mb-4 pb-3 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-1.5 leading-tight heading-section">{name}</h3>
          <p className="text-xs text-gray-500 font-mono tracking-wider">{code}</p>
        </div>
        
        <div className="space-y-4">
          {/* Grade Display */}
          <div className="flex items-end justify-between gap-4">
            <div className="flex-1">
              {avgGrade !== null ? (
                <>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1.5 font-medium">Verified Average</p>
                  <div className={`inline-flex items-baseline gap-1 px-3 py-1.5 rounded-lg ${gradeColors.bg}`}>
                    <p className={`text-2xl font-black ${gradeColors.text} leading-none`}>
                      {avgGrade.toFixed(1)}
                    </p>
                    <span className={`text-xs font-semibold ${gradeColors.text} opacity-70`}>%</span>
                  </div>
                  {unverifiedAverage !== null && unverifiedAverage !== undefined && (
                    <div className="mt-2">
                      <p className="text-[9px] text-gray-400 uppercase tracking-widest mb-1 font-medium">Unverified</p>
                      <p className="text-sm font-semibold text-gray-600">
                        {unverifiedAverage.toFixed(1)}%
                      </p>
                    </div>
                  )}
                </>
              ) : unverifiedAverage !== null && unverifiedAverage !== undefined ? (
                <>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1.5 font-medium">Unverified Average</p>
                  <div className={`inline-flex items-baseline gap-1 px-3 py-1.5 rounded-lg ${gradeColors.bg}`}>
                    <p className={`text-2xl font-black ${gradeColors.text} leading-none`}>
                      {unverifiedAverage.toFixed(1)}
                    </p>
                    <span className={`text-xs font-semibold ${gradeColors.text} opacity-70`}>%</span>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1.5 font-medium">Average</p>
                  <div className={`inline-flex items-baseline gap-1 px-3 py-1.5 rounded-lg ${gradeColors.bg}`}>
                    <p className={`text-2xl font-black ${gradeColors.text} leading-none`}>—</p>
                  </div>
                </>
              )}
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1.5 font-medium">Letter</p>
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg ${gradeColors.bg} ${gradeColors.text} font-black text-xl`}>
                {getGradeLetter(avgGrade ?? unverifiedAverage)}
              </div>
            </div>
          </div>

          {/* Subject & Level */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1 font-medium">Subject</p>
              <p className="text-sm font-semibold text-gray-800 truncate">{department}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1 font-medium">Level</p>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${levelColors.text} ${levelColors.bg} border ${levelColors.border}`}>
                {level}000
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

