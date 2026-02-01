import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import NewSplitBillClient from './NewSplitBillClient'

export default async function NewSplitBillPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/login')
  }

  return <NewSplitBillClient />
}



