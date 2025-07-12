
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

    // Get current date for calculations
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    // Fetch all stats in parallel
    const [
      totalParents,
      totalRevenue,
      overduePayments,
      upcomingDues,
      activePaymentPlans,
      messagesSentThisMonth
    ] = await Promise.all([
      // Total active parents
      prisma.parent.count({
        where: { status: 'active' }
      }),

      // Total revenue from paid payments
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'paid' }
      }),

      // Overdue payments count
      prisma.payment.count({
        where: { status: 'overdue' }
      }),

      // Upcoming dues (next 30 days)
      prisma.payment.count({
        where: {
          status: 'pending',
          dueDate: {
            gte: now,
            lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
          }
        }
      }),

      // Active payment plans
      prisma.paymentPlan.count({
        where: { status: 'active' }
      }),

      // Messages sent this month
      prisma.messageLog.count({
        where: {
          sentAt: {
            gte: startOfMonth,
            lt: startOfNextMonth
          }
        }
      })
    ])

    const stats = {
      totalParents,
      totalRevenue: Number(totalRevenue._sum.amount) || 0,
      overduePayments,
      upcomingDues,
      activePaymentPlans,
      messagesSentThisMonth
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}
