import { getHomeworkDashboardData } from '@/app/actions/homework'
import HomeworkPage from '@/components/dashboard/homework-page'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const data = await getHomeworkDashboardData()
  return <HomeworkPage initialData={data} />
}
