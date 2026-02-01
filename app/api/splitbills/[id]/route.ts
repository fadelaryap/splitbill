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

    const id = req.url.split('/').slice(-1)[0]

    const splitBill = await prisma.splitBill.findFirst({
      where: {
        id,
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
            expenses: {
              include: {
                expense: true,
              },
            },
          },
        },
        expenses: {
          include: {
            items: {
              include: {
                participant: {
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
            },
            participants: {
              include: {
                participant: {
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
            },
          },
          orderBy: {
            date: 'desc',
          },
        },
      },
    })

    if (!splitBill) {
      return NextResponse.json(
        { error: 'Split bill not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ splitBill })
  } catch (error: any) {
    console.error('Get split bill error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

