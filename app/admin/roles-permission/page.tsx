import { redirect } from 'next/navigation'
import RolesPermissionsPage from '@/components/dashboard/roles-permissions-page'
import { getPermissionsData } from '@/app/actions/permissions'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const result = await getPermissionsData()

  if (!result.success) {
    if (result.unauthorized) redirect('/')
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        {result.error}
      </div>
    )
  }

  return <RolesPermissionsPage initialData={result.data} />
}
