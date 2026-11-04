
import { getSubjectClassData } from '@/app/actions/subject-class'
import SubjectClassPage from '@/components/dashboard/subject-class-page'

export default async function Page() {
  const initialData = await getSubjectClassData()

  return <SubjectClassPage initialData={initialData} />
}
