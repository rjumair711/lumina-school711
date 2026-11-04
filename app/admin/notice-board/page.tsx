
import { getNoticeBoardData } from '@/app/actions/notices'
import NoticeBoardPage from '@/components/dashboard/notice-board-page'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const initialData = await getNoticeBoardData()

  return <NoticeBoardPage initialData={initialData} />
}
