import { redirect } from 'next/navigation'
import { format, startOfMonth } from 'date-fns'
import ReportsPage from '@/components/dashboard/reports-page'
import { REPORT_TABS, type ReportTab } from '@/lib/report-tabs'
import { getReportsData } from '@/app/actions/reports'

export const dynamic = 'force-dynamic'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

const first = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] : v) ?? ''

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams

  const today = new Date()
  const defaults = {
    from: format(startOfMonth(today), 'yyyy-MM-dd'),
    to: format(today, 'yyyy-MM-dd'),
  }

  const requested = {
    from: first(params.from) || defaults.from,
    to: first(params.to) || defaults.to,
    classId: first(params.class) || null,
    subjectId: first(params.subject) || null,
  }

  let result = await getReportsData(requested)

  if (!result.ok && result.unauthorized) redirect('/')

  // A bad or stale URL (e.g. a deleted class) falls back to the defaults.
  if (!result.ok) {
    result = await getReportsData({ ...defaults, classId: null, subjectId: null })
    if (!result.ok && result.unauthorized) redirect('/')
  }

  if (!result.ok) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        {result.error}
      </div>
    )
  }

  const tabParam = first(params.tab) as ReportTab
  const initialTab = REPORT_TABS.includes(tabParam) ? tabParam : 'overview'

  return <ReportsPage initialData={result.data} initialTab={initialTab} />
}
