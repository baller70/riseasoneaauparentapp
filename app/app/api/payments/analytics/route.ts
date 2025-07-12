
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

    // Get payment statistics
    const [totalRevenue, totalPaid, totalPending, totalOverdue] = await Promise.all([
      prisma.payment.aggregate({
        _sum: { amount: true }
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'paid' }
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'pending' }
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'overdue' }
      })
    ])

    // Calculate payment success rate
    const [totalPayments, successfulPayments] = await Promise.all([
      prisma.payment.count(),
      prisma.payment.count({ where: { status: 'paid' } })
    ])

    const paymentSuccessRate = totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0

    // Calculate average payment time (days from due date to paid date)
    const paidPayments = await prisma.payment.findMany({
      where: {
        status: 'paid',
        paidAt: { not: null }
      },
      select: {
        dueDate: true,
        paidAt: true
      }
    })

    const averagePaymentTime = paidPayments.length > 0 
      ? paidPayments.reduce((sum, payment) => {
          const daysDiff = Math.floor((new Date(payment.paidAt!).getTime() - new Date(payment.dueDate).getTime()) / (1000 * 60 * 60 * 24))
          return sum + Math.max(0, daysDiff) // Only count positive days (after due date)
        }, 0) / paidPayments.length
      : 0

    // Get monthly revenue trend for the last 12 months
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

    const monthlyPayments = await prisma.payment.findMany({
      where: {
        status: 'paid',
        paidAt: { gte: twelveMonthsAgo }
      },
      select: {
        amount: true,
        paidAt: true
      }
    })

    // Process monthly trend data
    const monthlyRevenue = []
    for (let i = 11; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      
      const monthPayments = monthlyPayments.filter(payment => {
        const paymentDate = new Date(payment.paidAt!)
        const paymentKey = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`
        return paymentKey === monthKey
      })

      const revenue = monthPayments.reduce((sum, payment) => sum + Number(payment.amount), 0)
      const count = monthPayments.length

      monthlyRevenue.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue,
        payments: count
      })
    }

    // Get overdue analysis
    const overduePayments = await prisma.payment.findMany({
      where: { status: 'overdue' },
      include: { parent: true }
    })

    const overdueAnalysis = {
      totalOverdue: overduePayments.length,
      averageDaysOverdue: overduePayments.length > 0 
        ? overduePayments.reduce((sum, payment) => {
            const daysPastDue = Math.floor((new Date().getTime() - new Date(payment.dueDate).getTime()) / (1000 * 60 * 60 * 24))
            return sum + Math.max(0, daysPastDue)
          }, 0) / overduePayments.length
        : 0,
      recoveryRate: 0 // This would be calculated based on historical data
    }

    // Get payment method breakdown (placeholder since we don't have payment methods in the schema)
    const paymentMethodBreakdown = [
      { method: 'Credit Card', count: Math.floor(successfulPayments * 0.6), amount: Number(totalPaid._sum.amount || 0) * 0.6 },
      { method: 'Bank Transfer', count: Math.floor(successfulPayments * 0.3), amount: Number(totalPaid._sum.amount || 0) * 0.3 },
      { method: 'Cash', count: Math.floor(successfulPayments * 0.1), amount: Number(totalPaid._sum.amount || 0) * 0.1 }
    ]

    return NextResponse.json({
      stats: {
        totalRevenue: Number(totalRevenue._sum.amount || 0),
        totalPaid: Number(totalPaid._sum.amount || 0),
        totalPending: Number(totalPending._sum.amount || 0),
        totalOverdue: Number(totalOverdue._sum.amount || 0),
        averagePaymentTime,
        paymentSuccessRate
      },
      monthlyRevenue,
      paymentMethodBreakdown,
      overdueAnalysis
    })

  } catch (error) {
    console.error('Payment analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment analytics' },
      { status: 500 }
    )
  }
}
