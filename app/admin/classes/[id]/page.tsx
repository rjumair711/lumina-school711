import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import ClassDetailPage from '@/components/dashboard/class-detail-page'

export const dynamic = 'force-dynamic'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    const classData = await prisma.class.findUnique({
        where: { id },
        include: {
            classTeacher: { include: { user: true } },
            students: { include: { user: true } },
            subjects: true,
            teachers: { include: { user: true } }
        }
    })

    if (!classData) {
        notFound()
    }

    const cls = {
        id: classData.id,
        name: classData.name,
        section: classData.section,
        capacity: classData.capacity,
        classTeacherName: classData.classTeacher?.user?.name || 'Not Assigned',
        students: classData.students.map(s => ({
            id: s.id,
            name: s.user?.name || 'Unknown',
            email: s.user?.email || 'N/A',
            rollNo: s.rollNo || '-',
            initials: (s.user?.name || 'U').substring(0, 2).toUpperCase()
        })),
        subjects: classData.subjects.map(s => ({
            id: s.id,
            name: s.name,
            code: s.code
        })),
        teachers: classData.teachers.map(t => ({
            id: t.id,
            name: t.user?.name || 'Unknown',
            qualification: t.qualification || '-'
        }))
    }

    return <ClassDetailPage cls={cls} />
}