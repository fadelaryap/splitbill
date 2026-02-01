import { NextResponse } from 'next/server'
import { clearAuthToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST() {
  await clearAuthToken()
  return NextResponse.json({ success: true })
}

