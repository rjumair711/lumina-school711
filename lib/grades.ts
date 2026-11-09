// Shared grading rules (used on server and client).

export const ASSESSMENT_STATUSES = ['Draft', 'Scheduled', 'Completed', 'Cancelled'] as const
export type AssessmentStatus = (typeof ASSESSMENT_STATUSES)[number]

export const EXAM_TYPES = [
  'Unit Exam',
  'Mid Term',
  'Final Term',
  'Annual Exam',
  'Pre-Board',
  'Other',
] as const

// Used when a test/paper has no explicit passing marks.
export const DEFAULT_PASS_PERCENT = 33

export function passMarkFor(totalMarks: number, passingMarks: number | null | undefined) {
  return passingMarks ?? Math.ceil((totalMarks * DEFAULT_PASS_PERCENT) / 100)
}

const GRADE_SCALE: { min: number; grade: string }[] = [
  { min: 90, grade: 'A+' },
  { min: 80, grade: 'A' },
  { min: 70, grade: 'B+' },
  { min: 60, grade: 'B' },
  { min: 50, grade: 'C' },
  { min: 40, grade: 'D' },
  { min: DEFAULT_PASS_PERCENT, grade: 'E' },
  { min: 0, grade: 'F' },
]

export const GRADES = GRADE_SCALE.map((g) => g.grade)

export function gradeFor(percent: number | null | undefined): string {
  if (percent === null || percent === undefined || !Number.isFinite(percent)) return '—'
  return GRADE_SCALE.find((g) => percent >= g.min)?.grade ?? 'F'
}

export const round1 = (n: number) => Math.round(n * 10) / 10

export type MarkRow = { marksObtained: number | null; isAbsent: boolean }

// Summary of a set of marks for one test or paper.
export function summarize(rows: MarkRow[], totalMarks: number, passingMarks: number | null) {
  const scored = rows
    .filter((r) => !r.isAbsent && r.marksObtained !== null)
    .map((r) => r.marksObtained as number)
  const passMark = passMarkFor(totalMarks, passingMarks)
  const passed = scored.filter((m) => m >= passMark).length

  return {
    entered: rows.filter((r) => r.isAbsent || r.marksObtained !== null).length,
    appeared: scored.length,
    absent: rows.filter((r) => r.isAbsent).length,
    average: scored.length ? round1(scored.reduce((a, b) => a + b, 0) / scored.length) : null,
    averagePercent:
      scored.length && totalMarks
        ? round1((scored.reduce((a, b) => a + b, 0) / scored.length / totalMarks) * 100)
        : null,
    highest: scored.length ? Math.max(...scored) : null,
    lowest: scored.length ? Math.min(...scored) : null,
    passed,
    failed: scored.length - passed,
    passRate: scored.length ? round1((passed / scored.length) * 100) : null,
    passMark,
  }
}
