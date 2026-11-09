import TeachersPage from '@/components/dashboard/teacher-page'
import prisma from '@/lib/prisma'
import { requireSchoolAdminPage } from '@/lib/school-auth'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const { schoolId } = await requireSchoolAdminPage()

  const rawTeachers = await prisma.teacher.findMany({
    where: { schoolId },
    include: { user: true, classes: true, subjects: true },
    orderBy: { createdAt: 'desc' }
  })
  
  const dbClasses = await prisma.class.findMany({
    where: { schoolId },
    orderBy: [{ name: 'asc' }, { section: 'asc' }]
  })
  
  const dbSubjects = await prisma.subject.findMany({
    where: { schoolId },
    orderBy: { name: 'asc' }
  })

  // Array of UI tones to randomly assign to avatars
  const tones = [
    'bg-indigo-100 text-indigo-700',
    'bg-emerald-100 text-emerald-700',
    'bg-rose-100 text-rose-700',
    'bg-amber-100 text-amber-700',
    'bg-sky-100 text-sky-700',
  ]

  const teachers = rawTeachers.map((t, index) => ({
    id: t.id,
    name: t.user?.name || 'Unknown',
    email: t.user?.email || 'N/A',
    initials: (t.user?.name || 'U').substring(0, 2).toUpperCase(),
    phone: t.phone || 'N/A',
    qualification: t.qualification || 'N/A',
    experience: t.experience || 'N/A',
    subject: t.subjects.length > 0 ? t.subjects.map(s => s.name).join(', ') : 'Not Assigned',
    subjectId: t.subjects.length > 0 ? t.subjects[0].id : '',
    classes: t.classes.map(c => `${c.name}-${c.section}`),
    classIds: t.classes.map(c => c.id),
    tone: tones[index % tones.length] // Assign dynamic tone based on row index
  }))

  return <TeachersPage teachers={teachers} dbClasses={dbClasses} dbSubjects={dbSubjects} />
}