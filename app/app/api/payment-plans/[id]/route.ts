
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

    const paymentPlan = await prisma.paymentPlan.findUnique({
      where: { id: params.id },
      include: {
        parent: true,
        payments: {
          orderBy: { dueDate: 'asc' }
        }
      }
    })

    if (!paymentPlan) {
      return NextResponse.json({ error: 'Payment plan not found' }, { status: 404 })
    }

    return NextResponse.json(paymentPlan)
  } catch (error) {
    console.error('Payment plan fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment plan' },
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
      type,
      totalAmount,
      installmentAmount,
      installments,
      startDate,
      nextDueDate,
      status,
      description
    } = body

    const paymentPlan = await prisma.paymentPlan.update({
      where: { id: params.id },
      data: {
        type,
        totalAmount,
        installmentAmount,
        installments,
        startDate: startDate ? new Date(startDate) : undefined,
        nextDueDate: nextDueDate ? new Date(nextDueDate) : undefined,
        status,
        description,
        updatedAt: new Date()
      },
      include: {
        parent: true,
        payments: true
      }
    })

    return NextResponse.json(paymentPlan)
  } catch (error) {
    console.error('Payment plan update error:', error)
    return NextResponse.json(
      { error: 'Failed to update payment plan' },
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

    // Check if there are any paid payments
    const paidPayments = await prisma.payment.findMany({
      where: {
        paymentPlanId: params.id,
        status: 'paid'
      }
    })

    if (paidPayments.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete payment plan with paid payments' },
        { status: 400 }
      )
    }

    // Delete all pending payments first
    await prisma.payment.deleteMany({
      where: { paymentPlanId: params.id }
    })

    // Delete the payment plan
    await prisma.paymentPlan.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Payment plan deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete payment plan' },
      { status: 500 }
    )
  }
}
