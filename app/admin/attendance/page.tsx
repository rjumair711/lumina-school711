import AttendancePageClient from '@/components/dashboard/attendence-page'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function AttendancePage() {
  const school = await prisma.school.findFirst()
  if (!school) return <div>No school configured.</div>

  const classes = await prisma.class.findMany({
    where: { schoolId: school.id },
    select: { id: true, name: true, section: true },
    orderBy: [{ name: 'asc' }, { section: 'asc' }]
  })

  const subjects = await prisma.subject.findMany({
    where: { schoolId: school.id },
    select: { id: true, name: true, code: true },
    orderBy: { name: 'asc' }
  })

  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Attendance Portal</h2>
          <p className="text-muted-foreground mt-1">Manage daily attendance for students and teaching staff.</p>
        </div>
      </div>
      <AttendancePageClient classes={classes} subjects={subjects} schoolId={school.id} />
    </div>
  )
}