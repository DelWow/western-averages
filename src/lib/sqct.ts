type SqctGrade = string | number | null | undefined;

const letterGradeRanks: Record<string, number> = {
  F: 0,
  'D-': 1,
  D: 2,
  'D+': 3,
  'C-': 4,
  C: 5,
  'C+': 6,
  'B-': 7,
  B: 8,
  'B+': 9,
  'A-': 10,
  A: 11,
  'A+': 12,
};

function getSqctGradeRank(grade: SqctGrade): number | null {
  if (grade === null || grade === undefined) return null;
  if (typeof grade === 'number') return Number.isFinite(grade) ? grade : null;

  const normalizedGrade = grade.trim().toUpperCase().replace('−', '-');
  if (!normalizedGrade) return null;

  const numericGrade = Number(normalizedGrade.replace(/%$/, ''));
  if (Number.isFinite(numericGrade)) return numericGrade;

  return letterGradeRanks[normalizedGrade] ?? null;
}

export function compareSqctGrades(
  gradeA: SqctGrade,
  gradeB: SqctGrade,
  direction: 'ascending' | 'descending'
): number {
  const gradeAIsMissing = gradeA === null || gradeA === undefined || String(gradeA).trim() === '';
  const gradeBIsMissing = gradeB === null || gradeB === undefined || String(gradeB).trim() === '';

  if (gradeAIsMissing && !gradeBIsMissing) return 1;
  if (!gradeAIsMissing && gradeBIsMissing) return -1;

  const rankA = getSqctGradeRank(gradeA);
  const rankB = getSqctGradeRank(gradeB);

  if (rankA === null && rankB !== null) return 1;
  if (rankA !== null && rankB === null) return -1;

  if (rankA !== null && rankB !== null) {
    return direction === 'ascending' ? rankA - rankB : rankB - rankA;
  }

  const textA = gradeA === null || gradeA === undefined ? '' : String(gradeA);
  const textB = gradeB === null || gradeB === undefined ? '' : String(gradeB);
  const textComparison = textA.localeCompare(textB, undefined, {
    numeric: true,
    sensitivity: 'base',
  });

  return direction === 'ascending' ? textComparison : -textComparison;
}
