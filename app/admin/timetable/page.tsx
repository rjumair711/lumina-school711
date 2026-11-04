
import TimetablePage from '@/components/dashboard/time-table-page'
import { getTimetableData } from '@/app/actions/timetable'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const initialData = await getTimetableData()

  return <TimetablePage initialData={initialData} />
}
