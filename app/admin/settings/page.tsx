import SettingsPage from '@/components/dashboard/settings-page'
import prisma from '@/lib/prisma'
import { requireSchoolAdminPage } from '@/lib/school-auth'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const admin = await requireSchoolAdminPage()
  const [school, user] = await Promise.all([
    prisma.school.findUnique({
      where: { id: admin.schoolId },
      select: { name: true, email: true, phone: true, address: true },
    }),
    prisma.user.findUnique({ where: { id: admin.id }, select: { name: true, email: true } }),
  ])

  return (
    <SettingsPage
      school={{
        name: school?.name ?? '',
        email: school?.email ?? '',
        phone: school?.phone ?? '',
        address: school?.address ?? '',
      }}
      admin={{ name: user?.name ?? '', email: user?.email ?? '' }}
    />
  )
}
