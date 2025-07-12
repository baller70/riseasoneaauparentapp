
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../lib/auth'
import { prisma } from '../../../lib/db'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const parentId = searchParams.get('parentId')
    const planId = searchParams.get('planId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = {}

    if (status && status !== 'all') {
      where.status = status
    }

    if (parentId) {
      where.parentId = parentId
    }

    if (planId) {
      where.paymentPlanId = planId
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        parent: true,
        paymentPlan: true,
        reminders: {
          orderBy: { scheduledFor: 'desc' },
          take: 3
        }
      },
      orderBy: [
        { status: 'asc' }, // overdue first, then pending, then paid
        { dueDate: 'desc' }
      ],
      take: limit,
      skip: offset
    })

    const total = await prisma.payment.count({ where })

    return NextResponse.json({
      payments,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    })
  } catch (error) {
    console.error('Payments fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
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
      paymentPlanId,
      amount,
      dueDate,
      notes
    } = body

    if (!parentId || !amount || !dueDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const payment = await prisma.payment.create({
      data: {
        parentId,
        paymentPlanId: paymentPlanId || null,
        amount,
        dueDate: new Date(dueDate),
        notes: notes || null,
        status: 'pending'
      },
      include: {
        parent: true,
        paymentPlan: true
      }
    })

    return NextResponse.json(payment)
  } catch (error) {
    console.error('Payment creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    )
  }
}
