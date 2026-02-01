import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import SplitBillDetailClient from './SplitBillDetailClient'

export default async function SplitBillDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/login')
  }

  return <SplitBillDetailClient splitBillId={params.id} />
}


