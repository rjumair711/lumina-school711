import { redirect } from 'next/navigation'
import TestsExamsPage from '@/components/dashboard/tests-exams-page'
import { getAssessmentsData } from '@/app/actions/assessments'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const result = await getAssessmentsData()

  if (!result.success) {
    if (result.unauthorized) redirect('/')
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        {result.error}
      </div>
    )
  }

  return <TestsExamsPage initialData={result.data} />
}
