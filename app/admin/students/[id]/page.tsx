import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import StudentDetailPage from '@/components/dashboard/student-detail-page'

export const dynamic = 'force-dynamic'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const studentData = await prisma.student.findUnique({
    where: { id },
    include: {
      user: true,
      class: {
        include: {
          classTeacher: {
            include: { user: true }
          }
        }
      },
      attendances: true,
      fees: true
    }
  })

  if (!studentData) {
    notFound()
  }

  const presentCount = studentData.attendances.filter((a) => a.status === 'PRESENT').length
  const absentCount = studentData.attendances.filter((a) => a.status === 'ABSENT').length
  const lateCount = studentData.attendances.filter((a) => a.status === 'LATE').length

  const student = {
    id: studentData.id,
    studentId: studentData.studentId,
    rollNo: studentData.rollNo,
    dob: studentData.dob ? studentData.dob.toISOString().split('T')[0] : null,
    address: studentData.address,
    parentName: studentData.parentName,
    parentPhone: studentData.parentPhone,
    parentEmail: studentData.parentEmail,
    className: studentData.class.name,
    section: studentData.class.section,
    classTeacherName: studentData.class.classTeacher?.user?.name || null,
    user: {
      name: studentData.user?.name || null,
      email: studentData.user?.email || null
    },
    attendancesCount: studentData.attendances.length,
    presentCount,
    absentCount,
    lateCount,
    feeHistory: studentData.fees.map((f) => ({
      id: f.id,
      title: f.title,
      totalAmount: f.totalAmount,
      paidAmount: f.paidAmount,
      status: f.status,
      dueDate: f.dueDate.toISOString().split('T')[0]
    }))
  }

  return <StudentDetailPage student={student} />
}