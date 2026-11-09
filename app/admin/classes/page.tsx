import ClassesPage from '@/components/dashboard/classes-page'
import prisma from '@/lib/prisma'
import { requireSchoolAdminPage } from '@/lib/school-auth'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const { schoolId } = await requireSchoolAdminPage()

  const rawClasses = await prisma.class.findMany({
    where: { schoolId },
    include: {
      classTeacher: { include: { user: true } },
      _count: { select: { students: true } }
    },
    orderBy: [{ name: 'asc' }, { section: 'asc' }]
  })

  const dbTeachers = await prisma.teacher.findMany({
    where: { schoolId },
    include: { user: true },
    orderBy: { createdAt: 'desc' }
  })

  const classes = rawClasses.map(c => ({
    id: c.id,
    name: c.name,
    section: c.section,
    capacity: c.capacity,
    classTeacherId: c.classTeacherId || '',
    classTeacherName: c.classTeacher?.user?.name || 'Not Assigned',
    studentCount: c._count.students
  }))

  const teachers = dbTeachers.map(t => ({
    id: t.id,
    name: t.user?.name || 'Unknown Teacher'
  }))

  return <ClassesPage classes={classes} dbTeachers={teachers} />
}