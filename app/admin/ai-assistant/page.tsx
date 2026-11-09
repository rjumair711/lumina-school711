import { redirect } from 'next/navigation'
import AIAssistantPage from '@/components/dashboard/ai-assistant-page'
import { getAiAssistantData } from '@/app/actions/ai'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const result = await getAiAssistantData()

  if (!result.success) {
    if (result.unauthorized) redirect('/')
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        {result.error}
      </div>
    )
  }

  return <AIAssistantPage initialData={result.data} />
}
