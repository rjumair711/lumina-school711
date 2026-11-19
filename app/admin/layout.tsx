import { AdminShell } from '@/components/dashboard/admin-shell'
import prisma from '@/lib/prisma'
import { requireSchoolAdminPage } from '@/lib/school-auth'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireSchoolAdminPage()
  const school = await prisma.school.findUnique({
    where: { id: admin.schoolId },
    select: { name: true },
  })

  return (
    <AdminShell schoolName={school?.name ?? 'My School'} adminName={admin.name}>
      {children}
    </AdminShell>
  )
}
