
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import { prisma } from '../../../../lib/db'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all overdue payments
    const overduePayments = await prisma.payment.findMany({
      where: {
        OR: [
          { status: 'overdue' },
          {
            status: 'pending',
            dueDate: { lt: new Date() }
          }
        ]
      },
      include: {
        parent: true,
        paymentPlan: true
      },
      orderBy: { dueDate: 'asc' }
    })

    // Update status for payments that are now overdue
    const nowOverdue = overduePayments.filter(p => 
      p.status === 'pending' && new Date(p.dueDate) < new Date()
    )

    if (nowOverdue.length > 0) {
      await prisma.payment.updateMany({
        where: {
          id: { in: nowOverdue.map(p => p.id) }
        },
        data: { status: 'overdue' }
      })
    }

    // Calculate days past due and format response
    const overdueList = overduePayments.map(payment => {
      const daysPastDue = Math.floor(
        (new Date().getTime() - new Date(payment.dueDate).getTime()) / (1000 * 60 * 60 * 24)
      )

      return {
        id: payment.id,
        parentId: payment.parentId,
        parentName: payment.parent.name,
        parentEmail: payment.parent.email,
        amount: Number(payment.amount),
        dueDate: payment.dueDate,
        daysPastDue: Math.max(0, daysPastDue),
        remindersSent: payment.remindersSent,
        lastReminderSent: payment.lastReminderSent,
        paymentPlanType: payment.paymentPlan?.type
      }
    })

    return NextResponse.json(overdueList)
  } catch (error) {
    console.error('Overdue payments fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch overdue payments' },
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
    const { paymentIds, action } = body

    if (!paymentIds || !Array.isArray(paymentIds)) {
      return NextResponse.json({ error: 'Payment IDs are required' }, { status: 400 })
    }

    switch (action) {
      case 'sendReminder':
        // Update reminder count and timestamp
        await prisma.payment.updateMany({
          where: { id: { in: paymentIds } },
          data: {
            remindersSent: { increment: 1 },
            lastReminderSent: new Date()
          }
        })

        // In a real app, this would trigger actual reminder emails/messages
        return NextResponse.json({
          success: true,
          message: `Reminders sent for ${paymentIds.length} payments`
        })

      case 'markPaid':
        await prisma.payment.updateMany({
          where: { id: { in: paymentIds } },
          data: {
            status: 'paid',
            paidAt: new Date()
          }
        })

        return NextResponse.json({
          success: true,
          message: `${paymentIds.length} payments marked as paid`
        })

      case 'extendDueDate':
        const { days } = body
        if (!days || days < 1) {
          return NextResponse.json({ error: 'Valid extension days required' }, { status: 400 })
        }

        const payments = await prisma.payment.findMany({
          where: { id: { in: paymentIds } }
        })

        for (const payment of payments) {
          const newDueDate = new Date(payment.dueDate)
          newDueDate.setDate(newDueDate.getDate() + days)

          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              dueDate: newDueDate,
              status: 'pending' // Reset to pending if it was overdue
            }
          })
        }

        return NextResponse.json({
          success: true,
          message: `Due dates extended by ${days} days for ${paymentIds.length} payments`
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Overdue payment action error:', error)
    return NextResponse.json(
      { error: 'Failed to process overdue payment action' },
      { status: 500 }
    )
  }
}
