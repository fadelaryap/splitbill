import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const splitBillId = req.url.split('/').slice(-2)[0]
    const { userId: participantUserId, name, email } = await req.json()

    // Verify user has access to this split bill
    const splitBill = await prisma.splitBill.findFirst({
      where: {
        id: splitBillId,
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
    })

    if (!splitBill) {
      return NextResponse.json(
        { error: 'Split bill not found or access denied' },
        { status: 404 }
      )
    }

    // If userId is provided, verify it exists and get user info
    let participantName = name
    let participantEmail = email || null
    let isRegistered = false

    if (participantUserId) {
      const user = await prisma.user.findUnique({
        where: { id: participantUserId },
      })

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }

      participantName = user.name
      participantEmail = user.email
      isRegistered = true

      // Check if already a participant
      const existing = await prisma.splitBillParticipant.findFirst({
        where: {
          splitBillId,
          userId: participantUserId,
        },
      })

      if (existing) {
        return NextResponse.json(
          { error: 'User is already a participant' },
          { status: 400 }
        )
      }
    } else {
      if (!name) {
        return NextResponse.json(
          { error: 'Name is required for guest participants' },
          { status: 400 }
        )
      }
    }

    const participant = await prisma.splitBillParticipant.create({
      data: {
        splitBillId,
        userId: participantUserId || null,
        name: participantName,
        email: participantEmail,
        isRegistered,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json({ participant })
  } catch (error: any) {
    console.error('Add participant error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const splitBillId = req.url.split('/').slice(-2)[0]
    const { searchParams } = new URL(req.url)
    const participantId = searchParams.get('participantId')

    if (!participantId) {
      return NextResponse.json(
        { error: 'Participant ID is required' },
        { status: 400 }
      )
    }

    // Verify user has access to this split bill
    const splitBill = await prisma.splitBill.findFirst({
      where: {
        id: splitBillId,
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
    })

    if (!splitBill) {
      return NextResponse.json(
        { error: 'Split bill not found or access denied' },
        { status: 404 }
      )
    }

    await prisma.splitBillParticipant.delete({
      where: { id: participantId },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Remove participant error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

