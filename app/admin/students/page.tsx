import StudentsPage from '@/components/dashboard/student-page'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const dbClasses = await prisma.class.findMany({
    orderBy: [{ name: 'asc' }, { section: 'asc' }]
  })

  const rawStudents = await prisma.student.findMany({
    include: { user: true, class: true },
    orderBy: { createdAt: 'desc' }
  })

  const students = rawStudents.map((s) => ({
    id: s.id,
    name: s.user?.name || 'Unknown',
    email: s.user?.email || 'N/A',
    initials: (s.user?.name || 'U').substring(0, 2).toUpperCase(),
    cls: `${s.class.name}-${s.class.section}`,
    classId: s.classId,
    roll: s.rollNo || '',
    dob: s.dob ? s.dob.toISOString().split('T')[0] : '',
    parentName: s.parentName || '',
    parentPhone: s.parentPhone || '',
    parentEmail: s.parentEmail || '',
    address: s.address || '',
    attendanceValue: 100,
    feeStatus: 'Pending',
  }))

  return <StudentsPage students={students} dbClasses={dbClasses} />
}