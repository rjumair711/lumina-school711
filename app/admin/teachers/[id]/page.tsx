import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import TeacherDetailPage from '@/components/dashboard/teacher-detail-page'

export const dynamic = 'force-dynamic'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const teacherData = await prisma.teacher.findUnique({
    where: { id },
    include: {
      user: true,
      classes: true,
      subjects: true
    }
  })

  if (!teacherData) {
    notFound()
  }

  const teacher = {
    id: teacherData.id,
    teacherId: teacherData.teacherId,
    phone: teacherData.phone,
    qualification: teacherData.qualification,
    experience: teacherData.experience,
    user: {
      name: teacherData.user?.name || null,
      email: teacherData.user?.email || null
    },
    classes: teacherData.classes.map(c => ({ id: c.id, name: c.name, section: c.section })),
    subjects: teacherData.subjects.map(s => ({ id: s.id, name: s.name }))
  }

  return <TeacherDetailPage teacher={teacher} />
}