
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import { prisma } from '../../../../lib/db'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payment = await prisma.payment.findUnique({
      where: { id: params.id },
      include: {
        parent: true,
        paymentPlan: true,
        reminders: {
          orderBy: { scheduledFor: 'desc' }
        }
      }
    })

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    return NextResponse.json(payment)
  } catch (error) {
    console.error('Payment fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      status,
      amount,
      dueDate,
      paidAt,
      failureReason,
      notes
    } = body

    const updateData: any = {
      updatedAt: new Date()
    }

    if (status !== undefined) {
      updateData.status = status
      if (status === 'paid' && !paidAt) {
        updateData.paidAt = new Date()
      } else if (status !== 'paid') {
        updateData.paidAt = null
      }
    }

    if (amount !== undefined) updateData.amount = amount
    if (dueDate !== undefined) updateData.dueDate = new Date(dueDate)
    if (paidAt !== undefined) updateData.paidAt = paidAt ? new Date(paidAt) : null
    if (failureReason !== undefined) updateData.failureReason = failureReason
    if (notes !== undefined) updateData.notes = notes

    const payment = await prisma.payment.update({
      where: { id: params.id },
      data: updateData,
      include: {
        parent: true,
        paymentPlan: true
      }
    })

    return NextResponse.json(payment)
  } catch (error) {
    console.error('Payment update error:', error)
    return NextResponse.json(
      { error: 'Failed to update payment' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payment = await prisma.payment.findUnique({
      where: { id: params.id }
    })

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    if (payment.status === 'paid') {
      return NextResponse.json(
        { error: 'Cannot delete paid payment' },
        { status: 400 }
      )
    }

    await prisma.payment.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Payment deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete payment' },
      { status: 500 }
    )
  }
}
