import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q')

    if (!query || query.length < 2) {
      return NextResponse.json({ users: [] })
    }

    // SQLite doesn't support case-insensitive mode, so we filter in memory
    const allUsers = await prisma.user.findMany({
      where: {
        id: { not: user.id },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    })

    const queryLower = query.toLowerCase()
    const users = allUsers
      .filter(
        (user) =>
          user.name.toLowerCase().includes(queryLower) ||
          user.email.toLowerCase().includes(queryLower)
      )
      .slice(0, 10)

    return NextResponse.json({ users })
  } catch (error: any) {
    console.error('Search users error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

