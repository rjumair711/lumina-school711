import { redirect } from 'next/navigation'
import DashboardOverview from '@/components/dashboard/admin-overview'
import { getDashboardData } from '@/app/actions/dashboard'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const result = await getDashboardData()

  if (!result.success) {
    if (result.unauthorized) redirect('/')
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        {result.error}
      </div>
    )
  }

  return <DashboardOverview initialData={result.data} />
}
