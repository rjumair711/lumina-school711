import {
  Activity, BookOpen, CalendarCheck, CalendarDays, CircleDollarSign,
  FolderOpen, GraduationCap, LayoutDashboard, MessageCircle, Receipt,
  Settings2, ShieldCheck, Sparkles, UserRoundPlus, Users
} from 'lucide-react'

export const navItems = [
  ['Dashboard', LayoutDashboard],
  ['Students', Users],
  ['Teachers', GraduationCap],
  ['Classes', BookOpen],
  ['Attendance', CalendarCheck],
  ['Fees', CircleDollarSign],
  ['Homework', ClipboardListIconName], // ClipboardList
  ['Timetable', CalendarDays],
  ['Notice Board', Activity],
  ['Communication', MessageCircle],
  ['Reports', Receipt],
  ['AI Assistant', Sparkles],
  ['Roles & Permissions', ShieldCheck],
  ['Subject & Class', BookOpen],
  ['Tests & Exams', ClipboardListIconName],
  ['Study Materials', FolderOpen],
  ['Settings', Settings2],
] as const

export const attendance = [
  { day: 'Thu', value: 154 },
  { day: 'Fri', value: 158 },
  { day: 'Sat', value: 151 },
  { day: 'Sun', value: 0 },
  { day: 'Mon', value: 146 },
  { day: 'Tue', value: 0 },
  { day: 'Wed', value: 0 },
]

export const fees = [
  { month: 'Mar', value: 330000 },
  { month: 'Apr', value: 570000 },
  { month: 'May', value: 0 },
  { month: 'Jun', value: 0 },
  { month: 'Jul', value: 600000 },
  { month: 'Aug', value: 880000 },
]

export const performance = [
  { name: 'Class 9', value: 70 },
  { name: 'Class 2', value: 67 },
  { name: 'Class 3', value: 73 },
  { name: 'Class 7', value: 67 },
  { name: 'Class 5', value: 65 },
]

export const activity = [
  ['Student enrolled', 'Zafar (Class 9)', '2 days ago', UserRoundPlus],
  ['Student enrolled', 'Areeb Chauhan...', '2 days ago', UserRoundPlus],
  ['Student enrolled', 'Ayesha Farooq...', '2 days ago', UserRoundPlus],
  ['Fee payment received', 'Anas Rast...', '3 days ago', Receipt],
  ['Fee payment received', 'Marium C...', '3 days ago', Receipt],
] as const

export const exams = [
  'Unit Test 2 — English',
  'Unit Test 2 — Mathematics',
  'Unit Test 2 — Science',
  'Unit Test 2 — Urdu',
  'Unit Test 2 — Social Studies',
]

export const pending = [
  ['AA', 'Areeba Ansari'],
  ['AS', 'Ayesha Siddiqui'],
  ['DR', 'Aditi Sharma'],
  ['AK', 'Danish Rastogi'],
  ['AK', 'Anas Kashyap'],
]

export const studentsData = [
  ['AA', 'Ayesha Abbasi', 'stu20260007@student.alfiah.edu.in', '1-A', '1', 92, 'pending'],
  ['AS', 'Aditi Sharma', 'stu20260008@student.alfiah.edu.in', '1-B', '1', 88, 'pending'],
  ['IS', 'Iqra Saifi', 'stu20260009@student.alfiah.edu.in', '1-B', '2', 92, 'pending'],
  ['AK', 'Anas Kashyap', 'stu20260010@student.alfiah.edu.in', '1-A', '2', 88, 'pending'],
  ['KJ', 'Kabir Jain', 'stu20260011@student.alfiah.edu.in', '1-A', '3', 88, 'pending'],
  ['SF', 'Sanya Farooqui', 'stu20260012@student.alfiah.edu.in', '1-B', '3', 92, 'paid'],
  ['KS', 'Kavya Sharma', 'stu20260013@student.alfiah.edu.in', '1-A', '4', 100, 'pending'],
  ['MA', 'Mahira Abbasi', 'stu20260014@student.alfiah.edu.in', '1-B', '4', 96, 'pending'],
  ['DR', 'Danish Rastogi', 'stu20260015@student.alfiah.edu.in', '1-A', '5', 88, 'pending'],
  ['TA', 'Tanvi Ahmad', 'stu20260016@student.alfiah.edu.in', '1-B', '5', 92, 'pending'],
] as const

export const teachersData = [
  { initials: 'AS', name: 'Ayesha Siddiqui', subject: 'Environmental Studies', email: 'ayesha.siddiqui@alfiah.edu.in', phone: '+91 98765 43210', qualification: 'M.Sc, B.Ed', classes: ['1-A', '1-B'], tone: 'bg-orange-100 text-orange-700' },
  { initials: 'RK', name: 'Rohan Kumar', subject: 'Mathematics', email: 'rohan.kumar@alfiah.edu.in', phone: '+91 98123 45678', qualification: 'M.Sc, B.Ed', classes: ['2-A', '3-A'], tone: 'bg-rose-100 text-rose-700' },
  { initials: 'NP', name: 'Neha Patel', subject: 'English Literature', email: 'neha.patel@alfiah.edu.in', phone: '+91 98987 12345', qualification: 'M.A, B.Ed', classes: ['4-B', '5-A'], tone: 'bg-amber-100 text-amber-700' },
  { initials: 'MA', name: 'Mohammed Asif', subject: 'Science', email: 'mohammed.asif@alfiah.edu.in', phone: '+91 97654 32109', qualification: 'M.Sc, B.Ed', classes: ['6-A', '7-B'], tone: 'bg-orange-100 text-orange-700' },
  { initials: 'SD', name: 'Shalini Desai', subject: 'Social Studies', email: 'shalini.desai@alfiah.edu.in', phone: '+91 98234 56789', qualification: 'M.A, B.Ed', classes: ['8-A', '9-A'], tone: 'bg-rose-100 text-rose-700' },
  { initials: 'VK', name: 'Vikram Khanna', subject: 'Computer Science', email: 'vikram.khanna@alfiah.edu.in', phone: '+91 99001 22334', qualification: 'MCA, B.Ed', classes: ['10-A', '10-B'], tone: 'bg-amber-100 text-amber-700' },
]

export const feeRows = [
  ['AA', 'Ayesha Abbasi', '1-A', 'STU-2026-007', '₹48,000', '₹40,000', '₹8,000', 'Pending'],
  ['AS', 'Aditi Sharma', '1-B', 'STU-2026-008', '₹48,000', '₹48,000', '₹0', 'Paid'],
  ['IS', 'Iqra Saifi', '1-B', 'STU-2026-009', '₹52,500', '₹42,500', '₹10,000', 'Pending'],
  ['AK', 'Anas Kashyap', '1-A', 'STU-2026-010', '₹45,000', '₹35,000', '₹10,000', 'Pending'],
]

export const defaulters = [
  ['Ayesha Abbasi', '1-A', 'Admission & Development Fee (2026-27)', '15 Aug 2026', '₹8,000', '₹8,000'],
  ['Iqra Saifi', '1-B', 'Annual Tuition Fee (2026-27)', '10 Aug 2026', '₹10,000', '₹10,000'],
  ['Anas Kashyap', '1-A', 'Transport Fee — Term 1', '05 Aug 2026', '₹10,000', '₹10,000'],
]

export const homeworkAssignments = [
  { title: 'English: Weekly Assignment', subject: 'English', description: 'Answer all questions from the weekly assignment sheet and submit your work.', due: '2026-09-08', className: 'Class 3-A', teacher: 'Neha Patel', status: 'Overdue', submitted: 7, total: 7 },
  { title: 'Mathematics: Fractions', subject: 'Mathematics', description: 'Complete exercises 4.1 to 4.3 from the fractions chapter.', due: '2026-09-12', className: 'Class 5-A', teacher: 'Rohan Kumar', status: 'Active', submitted: 18, total: 28 },
  { title: 'Science: Our Environment', subject: 'Science', description: 'Write a short note about three ways to protect our environment.', due: '2026-09-15', className: 'Class 6-A', teacher: 'Mohammed Asif', status: 'Active', submitted: 14, total: 24 },
  { title: 'Social Studies: My Community', subject: 'Social Studies', description: 'Prepare a one-page project about your local community.', due: '2026-09-20', className: 'Class 4-B', teacher: 'Shalini Desai', status: 'Draft', submitted: 0, total: 22 },
  { title: 'English: Reading Practice', subject: 'English', description: 'Read the selected story and answer the comprehension questions.', due: '2026-09-05', className: 'Class 2-A', teacher: 'Neha Patel', status: 'Completed', submitted: 26, total: 26 },
  { title: 'Mathematics: Geometry Basics', subject: 'Mathematics', description: 'Draw and label the shapes from today\'s geometry lesson.', due: '2026-09-18', className: 'Class 3-A', teacher: 'Rohan Kumar', status: 'Active', submitted: 9, total: 21 },
]

export const timetableRows = [
  { period: 'Period 1', time: '08:00 - 08:45', cells: [{ subject: 'English', teacher: 'Ms. Neha' }, { subject: 'Mathematics', teacher: 'Mr. Rohan' }, { subject: 'Computer Science', teacher: 'Mr. Vikram' }, { subject: 'Art & Craft', teacher: 'Ms. Ayesha' }, { subject: 'English', teacher: 'Ms. Neha' }, { subject: 'Mathematics', teacher: 'Mr. Rohan' }] },
  { period: 'Period 2', time: '08:45 - 09:30', cells: [{ subject: 'Mathematics', teacher: 'Mr. Rohan' }, { subject: 'English', teacher: 'Ms. Neha' }, { subject: 'Art & Craft', teacher: 'Ms. Ayesha' }, { subject: 'Computer Science', teacher: 'Mr. Vikram' }, { subject: 'Mathematics', teacher: 'Mr. Rohan' }, { subject: 'English', teacher: 'Ms. Neha' }] },
  { period: 'Short Break', time: '09:30 - 09:45', break: true },
  { period: 'Period 3', time: '09:45 - 10:30', cells: [{ subject: 'Computer Science', teacher: 'Mr. Vikram' }, { subject: 'Art & Craft', teacher: 'Ms. Ayesha' }, { subject: 'English', teacher: 'Ms. Neha' }, { subject: 'Mathematics', teacher: 'Mr. Rohan' }, { subject: 'Computer Science', teacher: 'Mr. Vikram' }, { subject: 'Art & Craft', teacher: 'Ms. Ayesha' }] },
  { period: 'Period 4', time: '10:30 - 11:15', cells: [{ subject: 'Art & Craft', teacher: 'Ms. Ayesha' }, { subject: 'Computer Science', teacher: 'Mr. Vikram' }, { subject: 'Mathematics', teacher: 'Mr. Rohan' }, { subject: 'English', teacher: 'Ms. Neha' }, { subject: 'Art & Craft', teacher: 'Ms. Ayesha' }, { subject: 'Computer Science', teacher: 'Mr. Vikram' }] },
  { period: 'Lunch Break', time: '11:15 - 12:00', break: true },
  { period: 'Period 5', time: '12:00 - 12:45', cells: [{ subject: 'English', teacher: 'Ms. Neha' }, { subject: 'Mathematics', teacher: 'Mr. Rohan' }, { subject: 'Art & Craft', teacher: 'Ms. Ayesha' }, { subject: 'Computer Science', teacher: 'Mr. Vikram' }, { subject: 'English', teacher: 'Ms. Neha' }, { subject: 'Mathematics', teacher: 'Mr. Rohan' }] },
]

export const notices = [
  { title: 'Change in School Timings', priority: 'High', description: 'School timings will change from Monday, 3rd August. The new schedule will be shared with all classes.', date: '2026-07-29', author: 'Samar Ali' },
  { title: 'Independence Day Celebration', priority: 'Medium', description: 'Students are requested to participate in the Independence Day celebration and cultural program.', date: '2026-07-27', author: 'Ayesha Siddiqui' },
  { title: 'Parent–Teacher Meeting', priority: 'Medium', description: 'The next parent–teacher meeting will be held on Saturday, 22nd August from 10:00 AM to 1:00 PM.', date: '2026-07-24', author: 'School Admin' },
  { title: 'Annual Sports Day', priority: 'High', description: 'Annual Sports Day registrations are now open. Please contact the class teacher to register.', date: '2026-07-20', author: 'Mohammed Asif' },
]

export const conversations = [
  { initials: 'AS', name: 'Anjali Singh', role: 'Class 9-A', preview: 'I wanted to ask about the upcoming test...', time: '18:40' },
  { initials: 'RK', name: 'Rohan Kumar', role: 'Teacher', preview: 'The assignment has been shared with Class 3.', time: '17:25' },
  { initials: 'NP', name: 'Neha Patel', role: 'Teacher', preview: 'Could you confirm the parent meeting time?', time: '16:10' },
  { initials: 'MA', name: 'Mohammed Asif', role: 'Admin', preview: 'The notice board has been updated.', time: 'Yesterday' },
  { initials: 'FA', name: 'Fatima Ahmed', role: 'Class 5-B', preview: 'Thank you for the quick response.', time: 'Yesterday' },
  { initials: 'VK', name: 'Vikram Khanna', role: 'Teacher', preview: 'Please review the timetable changes.', time: 'Mon' },
]

export const permissionTeachers = [
  { initials: 'AS', name: 'Anjali Singh', id: 'TCH-2026-0038', email: 'anjali.singh@alfiah.edu.in' },
  { initials: 'SA', name: 'Samar Ali', id: 'TCH-2026-0039', email: 'samar.ali@alfiah.edu.in' },
  { initials: 'RK', name: 'Rohan Kumar', id: 'TCH-2026-2021', email: 'rohan.kumar@alfiah.edu.in' },
  { initials: 'NP', name: 'Neha Patel', id: 'TCH-2026-0042', email: 'neha.patel@alfiah.edu.in' },
  { initials: 'MA', name: 'Mohammed Asif', id: 'TCH-2026-0045', email: 'mohammed.asif@alfiah.edu.in' },
]

export const permissionGroups = [
  { title: 'STUDENTS', items: ['View student profiles', 'Add and edit students', 'Manage student documents'] },
  { title: 'ATTENDANCE', items: ['View attendance records', 'Mark attendance', 'Edit attendance records'] },
  { title: 'EXAMS & RESULTS', items: ['View exam results', 'Create and manage exams', 'Publish results'] },
  { title: 'HOMEWORK & CLASSES', items: ['Manage homework', 'Manage classes and subjects'] },
]

export const reportFeeData = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((month, index) => ({ month, collected: [620,840,1120,780,1260,980,1420,1180,1340,960,1500,1280][index], pending: [340,420,380,520,260,460,310,390,280,510,220,360][index] }))
export const reportAttendanceData = ['1-A','1-B','2-A','2-B','3-A','3-B','4-A','4-B','5-A','5-B','6-A','6-B','7-A','7-B','8-A','8-B','9-A','9-B'].map((name, index) => ({ name, value: [81,88,76,92,84,79,91,86,94,82,89,77,95,83,90,87,81,93][index] }))
export const reportClasses = ['1-A','1-B','2-A','2-B','3-A','3-B','4-A','4-B','5-A','5-B','6-A','6-B','7-A','7-B','8-A','8-B','9-A','9-B','10-A','10-B']

export const subjectCatalog = [
  { name: 'English', code: 'ENG', description: 'Language and literature' },
  { name: 'Mathematics', code: 'MATH', description: 'Numbers, algebra and geometry' },
  { name: 'Science', code: 'SCI', description: 'Life, physical and earth sciences' },
  { name: 'Social Studies', code: 'SST', description: 'History, geography and civics' },
  { name: 'Urdu', code: 'URD', description: 'Urdu language and literature' },
  { name: 'Hindi', code: 'HIN', description: 'Hindi language and literature' },
  { name: 'Computer Science', code: 'CS', description: 'Computing and digital skills' },
  { name: 'Art', code: 'ART', description: 'Visual arts and creativity' },
]

export const testRows = [
  ['Unit Test 2 — English', 'English', '9 - A', 'Aug 28, 2026', '50', '45 min', 'Completed'],
  ['Unit Test 2 — Mathematics', 'Mathematics', '9 - A', 'Aug 29, 2026', '50', '60 min', 'Scheduled'],
  ['Unit Test 2 — Science', 'Science', '8 - B', 'Sep 02, 2026', '40', '45 min', 'Scheduled'],
  ['Unit Test 1 — Urdu', 'Urdu', '7 - A', 'Aug 18, 2026', '50', '45 min', 'Completed'],
] as const

export const examRows = [
  ['Term 1 Examination', 'Annual Exam', '9 - A', 'Sep 10, 2026', 'Sep 18, 2026', 'Scheduled'],
  ['Mid Term Examination', 'Mid Term', '8 - B', 'Sep 22, 2026', 'Sep 29, 2026', 'Draft'],
  ['Unit Assessment Week', 'Unit Exam', '7 - A', 'Oct 05, 2026', 'Oct 09, 2026', 'Scheduled'],
] as const

export const materials = [
  { title: 'Science - Practice Worksheet', teacher: 'Rakesh Sharma - Teacher', description: 'Practice questions covering key concepts from the current science unit.', type: 'Worksheet', subject: 'Science', className: 'Class 10-B', date: '17 Aug 2026', downloads: 114 },
  { title: 'Mathematics - Algebra Notes', teacher: 'Priya Menon - Teacher', description: 'Concise revision notes and worked examples for algebraic expressions.', type: 'Notes', subject: 'Mathematics', className: 'Class 9-A', date: '15 Aug 2026', downloads: 86 },
  { title: 'English Grammar Paper', teacher: 'Neha Patel - Teacher', description: 'End-of-unit assessment paper for grammar and comprehension practice.', type: 'Paper', subject: 'English', className: 'Class 8-B', date: '12 Aug 2026', downloads: 72 },
  { title: 'Social Studies Revision PDF', teacher: 'Shalini Desai - Teacher', description: 'A quick reference guide to the topics covered this term.', type: 'Pdf', subject: 'Social Studies', className: 'Class 7-A', date: '10 Aug 2026', downloads: 63 },
  { title: 'Physics Lab Worksheet', teacher: 'Mohammed Asif - Teacher', description: 'Lab activities and observation prompts for the upcoming practical.', type: 'Worksheet', subject: 'Science', className: 'Class 10-A', date: '08 Aug 2026', downloads: 51 },
  { title: 'Hindi Literature Notes', teacher: 'Ayesha Siddiqui - Teacher', description: 'Chapter summaries and important questions for revision.', type: 'Notes', subject: 'Hindi', className: 'Class 6-B', date: '05 Aug 2026', downloads: 44 },
] as const

// Placeholder name constant helper
function ClipboardListIconName() { return null }