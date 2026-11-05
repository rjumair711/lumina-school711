
import CommunicationPage from '@/components/dashboard/communication-page'
import { getCommunicationData } from '@/app/actions/communication'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const initialData = await getCommunicationData()

  return <CommunicationPage initialData={initialData} />
}
