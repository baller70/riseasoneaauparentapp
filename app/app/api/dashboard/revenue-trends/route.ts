
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

    // Get the last 12 months of revenue data
    const now = new Date()
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1)

    const payments = await prisma.payment.findMany({
      where: {
        status: 'paid',
        paidAt: {
          gte: twelveMonthsAgo
        }
      },
      select: {
        amount: true,
        paidAt: true
      }
    })

    // Group payments by month
    const monthlyData = new Map()
    
    // Initialize all months with 0
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      monthlyData.set(monthKey, { revenue: 0, payments: 0 })
    }

    // Aggregate payments by month
    payments.forEach(payment => {
      if (payment.paidAt) {
        const monthKey = payment.paidAt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        const existing = monthlyData.get(monthKey) || { revenue: 0, payments: 0 }
        monthlyData.set(monthKey, {
          revenue: existing.revenue + Number(payment.amount),
          payments: existing.payments + 1
        })
      }
    })

    // Convert to array format for the chart
    const trends = Array.from(monthlyData.entries()).map(([month, data]) => ({
      month,
      revenue: data.revenue,
      payments: data.payments
    }))

    return NextResponse.json(trends)
  } catch (error) {
    console.error('Revenue trends error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch revenue trends' },
      { status: 500 }
    )
  }
}
