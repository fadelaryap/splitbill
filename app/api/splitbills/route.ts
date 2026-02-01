import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const splitBills = await prisma.splitBill.findMany({
      where: {
        OR: [
          { createdById: user.id },
          {
            participants: {
              some: {
                userId: user.id,
              },
            },
          },
        ],
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        expenses: {
          include: {
            participants: {
              include: {
                participant: true,
              },
            },
          },
        },
        _count: {
          select: {
            participants: true,
            expenses: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    return NextResponse.json({ splitBills })
  } catch (error: any) {
    console.error('Get split bills error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { title, description } = await req.json()

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    const userData = await prisma.user.findUnique({ where: { id: user.id } })

    const splitBill = await prisma.splitBill.create({
      data: {
        title,
        description: description || null,
        createdById: user.id,
        participants: {
          create: {
            userId: user.id,
            name: userData?.name || 'You',
            isRegistered: true,
          },
        },
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json({ splitBill })
  } catch (error: any) {
    console.error('Create split bill error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

