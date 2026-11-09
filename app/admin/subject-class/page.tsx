import { redirect } from 'next/navigation'
import SubjectClassPage from '@/components/dashboard/subject-class-page'
import { getSubjectClassData } from '@/app/actions/subject-class'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const result = await getSubjectClassData()

  if (!result.success) {
    if (result.unauthorized) redirect('/')
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        {result.error}
      </div>
    )
  }

  return <SubjectClassPage initialData={result.data} />
}
