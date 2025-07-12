
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../lib/auth'
import { prisma } from '../../../lib/db'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const paymentPlans = await prisma.paymentPlan.findMany({
      include: {
        parent: true,
        payments: {
          orderBy: { dueDate: 'asc' }
        }
      },
      orderBy: [
        { status: 'asc' },
        { nextDueDate: 'asc' }
      ]
    })

    return NextResponse.json(paymentPlans)
  } catch (error) {
    console.error('Payment plans fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment plans' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      parentId,
      type,
      totalAmount,
      installmentAmount,
      installments,
      startDate,
      description
    } = body

    // Validate required fields
    if (!parentId || !type || !totalAmount || !installmentAmount || !installments || !startDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Calculate next due date
    const nextDueDate = new Date(startDate)

    const paymentPlan = await prisma.paymentPlan.create({
      data: {
        parentId,
        type,
        totalAmount,
        installmentAmount,
        installments,
        startDate: new Date(startDate),
        nextDueDate,
        description,
        status: 'active'
      },
      include: {
        parent: true
      }
    })

    // Create individual payment records
    const payments = []
    for (let i = 0; i < installments; i++) {
      const dueDate = new Date(startDate)
      dueDate.setMonth(dueDate.getMonth() + i)

      payments.push({
        parentId,
        paymentPlanId: paymentPlan.id,
        dueDate,
        amount: installmentAmount,
        status: 'pending'
      })
    }

    await prisma.payment.createMany({
      data: payments
    })

    return NextResponse.json(paymentPlan)
  } catch (error) {
    console.error('Payment plan creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create payment plan' },
      { status: 500 }
    )
  }
}
