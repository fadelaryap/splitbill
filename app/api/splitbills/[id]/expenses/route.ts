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
    const { 
      title, 
      date, 
      items, // Array of { name, quantity, price, taxAmount, participantId }
      taxAmount, 
      taxIncluded, 
      description 
    } = await req.json()

    if (!title || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: title and items' },
        { status: 400 }
      )
    }

    // Validate items
    for (const item of items) {
      if (!item.name || !item.participantId || item.price === undefined || item.quantity === undefined) {
        return NextResponse.json(
          { error: 'Each item must have: name, quantity, price, and participantId' },
          { status: 400 }
        )
      }
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
    const itemParticipantIds = items.map((item: any) => item.participantId)
    const invalidIds = itemParticipantIds.filter((id: string) => !validParticipantIds.includes(id))

    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: 'Invalid participant IDs in items' },
        { status: 400 }
      )
    }

    // Parse date or use current date
    const expenseDate = date ? new Date(date) : new Date()

    // Create expense with items
    const expense = await prisma.expense.create({
      data: {
        splitBillId,
        title,
        date: expenseDate,
        taxAmount: taxAmount || 0,
        taxIncluded: taxIncluded || false,
        description: description || null,
        items: {
          create: items.map((item: any) => ({
            name: item.name,
            quantity: item.quantity || 1,
            price: item.price,
            taxAmount: item.taxAmount || 0,
            participantId: item.participantId,
          })),
        },
      },
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
      },
    })

    // Calculate totals per participant for backward compatibility (ExpenseParticipant)
    const participantTotals: Record<string, number> = {}
    expense.items.forEach((item) => {
      const total = (item.price * item.quantity) + (item.taxAmount || 0)
      participantTotals[item.participantId] = (participantTotals[item.participantId] || 0) + total
    })

    // Create ExpenseParticipant records for backward compatibility
    await prisma.expenseParticipant.createMany({
      data: Object.entries(participantTotals).map(([participantId, amount]) => ({
        expenseId: expense.id,
        participantId,
        amount,
      })),
      skipDuplicates: true,
    })

    // Fetch expense with all relations
    const expenseWithParticipants = await prisma.expense.findUnique({
      where: { id: expense.id },
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
    })

    return NextResponse.json({ expense: expenseWithParticipants })
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

