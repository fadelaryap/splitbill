import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

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
    const { title, amount, taxAmount, taxIncluded, description, participantIds } = await req.json()

    if (!title || !amount || !participantIds || participantIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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
      include: {
        participants: true,
      },
    })

    if (!splitBill) {
      return NextResponse.json(
        { error: 'Split bill not found or access denied' },
        { status: 404 }
      )
    }

    // Verify all participant IDs belong to this split bill
    const validParticipantIds = splitBill.participants.map(p => p.id)
    const invalidIds = participantIds.filter((id: string) => !validParticipantIds.includes(id))

    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: 'Invalid participant IDs' },
        { status: 400 }
      )
    }

    // Calculate amount per participant
    const totalAmount = taxIncluded ? amount : amount + (taxAmount || 0)
    const amountPerParticipant = totalAmount / participantIds.length

    // Create expense
    const expense = await prisma.expense.create({
      data: {
        splitBillId,
        title,
        amount: taxIncluded ? amount - (taxAmount || 0) : amount,
        taxAmount: taxAmount || 0,
        taxIncluded: taxIncluded || false,
        description: description || null,
        participants: {
          create: participantIds.map((participantId: string) => ({
            participantId,
            amount: amountPerParticipant,
          })),
        },
      },
      include: {
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
    })

    return NextResponse.json({ expense })
  } catch (error: any) {
    console.error('Create expense error:', error)
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
    const expenseId = searchParams.get('expenseId')

    if (!expenseId) {
      return NextResponse.json(
        { error: 'Expense ID is required' },
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

    await prisma.expense.delete({
      where: { id: expenseId },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete expense error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

