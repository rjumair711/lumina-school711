import { redirect } from 'next/navigation'
import StudyMaterialsPage from '@/components/dashboard/study-materials-page'
import { getMaterialsData } from '@/app/actions/materials'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const result = await getMaterialsData()

  if (!result.success) {
    if (result.unauthorized) redirect('/')
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        {result.error}
      </div>
    )
  }

  return <StudyMaterialsPage initialData={result.data} />
}
