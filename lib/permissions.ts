// Permission catalog for teacher accounts. Shared by server and client.
// Keys are stored on Teacher.permissions; never rename a key once used.

export type PermissionDef = {
  key: string
  label: string
  description: string
  // Grants access to money or personal data, or to school-wide changes.
  sensitive?: boolean
  // Other permissions this one needs to be useful.
  requires?: string[]
}

export type PermissionGroup = {
  id: string
  title: string
  items: PermissionDef[]
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: 'students',
    title: 'Students',
    items: [
      { key: 'students.view', label: 'View student profiles', description: 'See student details, roll numbers and parent contacts for their classes.' },
      { key: 'students.manage', label: 'Add and edit students', description: 'Create, update and move students between classes.', sensitive: true, requires: ['students.view'] },
    ],
  },
  {
    id: 'attendance',
    title: 'Attendance',
    items: [
      { key: 'attendance.view', label: 'View attendance records', description: 'See attendance history and summaries.' },
      { key: 'attendance.mark', label: "Mark today's attendance", description: 'Record daily or subject-wise attendance for the current day.', requires: ['attendance.view'] },
      { key: 'attendance.edit', label: 'Edit past attendance', description: 'Change attendance for earlier dates.', sensitive: true, requires: ['attendance.mark'] },
    ],
  },
  {
    id: 'assessments',
    title: 'Tests, exams & results',
    items: [
      { key: 'assessments.view', label: 'View tests and results', description: 'See schedules, marks and ranked results.' },
      { key: 'assessments.marks', label: 'Enter marks', description: 'Enter and update marks for tests and exam papers.', requires: ['assessments.view'] },
      { key: 'assessments.manage', label: 'Create tests and exams', description: 'Schedule tests, exams and subject papers.', requires: ['assessments.view'] },
    ],
  },
  {
    id: 'teaching',
    title: 'Homework & timetable',
    items: [
      { key: 'homework.manage', label: 'Manage homework', description: 'Create, update and close homework assignments.' },
      { key: 'timetable.view', label: 'View timetable', description: 'See class and personal timetables.' },
      { key: 'timetable.manage', label: 'Edit timetable', description: 'Add, move or remove lessons.', sensitive: true, requires: ['timetable.view'] },
    ],
  },
  {
    id: 'communication',
    title: 'Communication',
    items: [
      { key: 'notices.create', label: 'Draft notices', description: 'Write notices that an administrator publishes.' },
      { key: 'notices.publish', label: 'Publish notices', description: 'Publish notices directly to students, parents or staff.', sensitive: true, requires: ['notices.create'] },
      { key: 'messages.send', label: 'Message parents & staff', description: 'Send direct messages to people in the school.' },
    ],
  },
  {
    id: 'admin',
    title: 'Administration',
    items: [
      { key: 'fees.view', label: 'View fee status', description: 'See fee balances and payment history.', sensitive: true },
      { key: 'reports.view', label: 'View reports', description: 'Open school-wide attendance, finance and academic reports.', sensitive: true },
      { key: 'classes.manage', label: 'Manage classes & subjects', description: 'Edit classes, sections and subject assignments.', sensitive: true },
      { key: 'ai.use', label: 'Use AI assistant', description: 'Generate comments, letters and notices with AI.' },
    ],
  },
]

export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((g) => g.items)
export const PERMISSION_KEYS = new Set(ALL_PERMISSIONS.map((p) => p.key))
export const PERMISSION_BY_KEY = new Map(ALL_PERMISSIONS.map((p) => [p.key, p]))

export type RolePreset = {
  id: string
  name: string
  description: string
  permissions: string[]
}

export const ROLE_PRESETS: RolePreset[] = [
  {
    id: 'read-only',
    name: 'Read only',
    description: 'Can look up students, attendance, results and the timetable.',
    permissions: ['students.view', 'attendance.view', 'assessments.view', 'timetable.view'],
  },
  {
    id: 'subject-teacher',
    name: 'Subject teacher',
    description: 'Teaches subjects: attendance, homework and marks.',
    permissions: [
      'students.view', 'attendance.view', 'attendance.mark', 'assessments.view',
      'assessments.marks', 'homework.manage', 'timetable.view', 'notices.create',
      'messages.send', 'ai.use',
    ],
  },
  {
    id: 'class-teacher',
    name: 'Class teacher',
    description: 'Subject teacher plus class records and corrections.',
    permissions: [
      'students.view', 'students.manage', 'attendance.view', 'attendance.mark',
      'attendance.edit', 'assessments.view', 'assessments.marks', 'homework.manage',
      'timetable.view', 'notices.create', 'messages.send', 'fees.view', 'ai.use',
    ],
  },
  {
    id: 'exam-coordinator',
    name: 'Exam coordinator',
    description: 'Runs tests and exams and views academic reports.',
    permissions: [
      'students.view', 'attendance.view', 'assessments.view', 'assessments.marks',
      'assessments.manage', 'timetable.view', 'notices.create', 'notices.publish',
      'reports.view', 'ai.use',
    ],
  },
]

// Adds any permissions required by the selected ones.
export function withRequirements(keys: Iterable<string>): string[] {
  const out = new Set<string>()
  const visit = (key: string) => {
    if (out.has(key) || !PERMISSION_KEYS.has(key)) return
    out.add(key)
    PERMISSION_BY_KEY.get(key)?.requires?.forEach(visit)
  }
  for (const k of keys) visit(k)
  return ALL_PERMISSIONS.map((p) => p.key).filter((k) => out.has(k))
}

// Removes permissions whose requirements are no longer granted.
export function withoutOrphans(keys: Iterable<string>): string[] {
  const set = new Set(keys)
  let changed = true
  while (changed) {
    changed = false
    for (const key of [...set]) {
      const req = PERMISSION_BY_KEY.get(key)?.requires ?? []
      if (req.some((r) => !set.has(r))) {
        set.delete(key)
        changed = true
      }
    }
  }
  return ALL_PERMISSIONS.map((p) => p.key).filter((k) => set.has(k))
}

export function matchPreset(keys: string[]): RolePreset | null {
  const sorted = [...keys].sort().join(',')
  return ROLE_PRESETS.find((p) => [...p.permissions].sort().join(',') === sorted) ?? null
}
