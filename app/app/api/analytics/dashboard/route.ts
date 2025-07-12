
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

    // Get date ranges
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Basic statistics
    const [
      totalParents,
      totalRevenue,
      overduePayments,
      upcomingDues,
      activePaymentPlans,
      messagesSentThisMonth,
      activeRecurringMessages,
      pendingRecommendations,
      backgroundJobsRunning
    ] = await Promise.all([
      // Total active parents
      prisma.parent.count({
        where: { status: 'active' }
      }),
      
      // Total revenue (paid payments)
      prisma.payment.aggregate({
        where: { status: 'paid' },
        _sum: { amount: true }
      }),
      
      // Overdue payments
      prisma.payment.count({
        where: {
          status: 'overdue',
          dueDate: { lt: now }
        }
      }),
      
      // Upcoming dues (next 7 days)
      prisma.payment.count({
        where: {
          status: 'pending',
          dueDate: {
            gte: now,
            lte: sevenDaysAgo
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
          sentAt: { gte: thirtyDaysAgo }
        }
      }),
      
      // Active recurring messages
      prisma.recurringMessage.count({
        where: { isActive: true }
      }),
      
      // Pending AI recommendations
      prisma.aIRecommendation.count({
        where: {
          isExecuted: false,
          dismissedAt: null,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: now } }
          ]
        }
      }),
      
      // Running background jobs
      prisma.backgroundJob.count({
        where: { status: 'running' }
      })
    ])

    // Revenue trends (last 6 months)
    const sixMonthsAgo = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000)
    const revenueByMonth = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', "paidAt") as month,
        SUM(amount) as revenue,
        COUNT(*) as payments
      FROM "Payment"
      WHERE status = 'paid' 
        AND "paidAt" >= ${sixMonthsAgo}
      GROUP BY DATE_TRUNC('month', "paidAt")
      ORDER BY month ASC
    `

    // Recent activity
    const recentActivity = await getRecentActivity()

    // Payment method breakdown from Stripe
    const paymentMethodStats = await getPaymentMethodBreakdown()

    // Communication analytics
    const communicationStats = await getCommunicationAnalytics(thirtyDaysAgo)

    // AI recommendations by priority
    const recommendationsByPriority = await prisma.aIRecommendation.groupBy({
      by: ['priority'],
      where: {
        isExecuted: false,
        dismissedAt: null,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } }
        ]
      },
      _count: { id: true }
    })

    // Recurring message performance
    const recurringMessageStats = await getRecurringMessageStats()

    return NextResponse.json({
      overview: {
        totalParents,
        totalRevenue: Number(totalRevenue._sum.amount) || 0,
        overduePayments,
        upcomingDues,
        activePaymentPlans,
        messagesSentThisMonth,
        activeRecurringMessages,
        pendingRecommendations,
        backgroundJobsRunning
      },
      revenueByMonth: revenueByMonth || [],
      recentActivity,
      paymentMethodStats,
      communicationStats,
      recommendationsByPriority: recommendationsByPriority.reduce((acc: any, item) => {
        acc[item.priority] = item._count.id
        return acc
      }, {}),
      recurringMessageStats
    })

  } catch (error) {
    console.error('Dashboard analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard analytics' },
      { status: 500 }
    )
  }
}

async function getRecentActivity() {
  const activities = []

  // Recent payments
  const recentPayments = await prisma.payment.findMany({
    where: {
      status: 'paid',
      paidAt: { not: null }
    },
    include: { parent: true },
    orderBy: { paidAt: 'desc' },
    take: 5
  })

  for (const payment of recentPayments) {
    activities.push({
      id: payment.id,
      type: 'payment',
      description: `Payment of $${payment.amount} received from ${payment.parent.name}`,
      timestamp: payment.paidAt!,
      parentName: payment.parent.name
    })
  }

  // Recent messages
  const recentMessages = await prisma.messageLog.findMany({
    include: { parent: true },
    orderBy: { sentAt: 'desc' },
    take: 5
  })

  for (const message of recentMessages) {
    activities.push({
      id: message.id,
      type: 'message',
      description: `Message sent to ${message.parent.name}: ${message.subject || 'No subject'}`,
      timestamp: message.sentAt,
      parentName: message.parent.name
    })
  }

  // Recent parent additions
  const recentParents = await prisma.parent.findMany({
    orderBy: { createdAt: 'desc' },
    take: 3
  })

  for (const parent of recentParents) {
    activities.push({
      id: parent.id,
      type: 'parent',
      description: `New parent added: ${parent.name}`,
      timestamp: parent.createdAt,
      parentName: parent.name
    })
  }

  // Sort by timestamp and return top 10
  return activities
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 10)
}

async function getPaymentMethodBreakdown() {
  try {
    const stripePaymentMethods = await prisma.stripePaymentMethod.groupBy({
      by: ['type'],
      _count: { id: true }
    })

    return {
      card: stripePaymentMethods.find(pm => pm.type === 'card')?._count.id || 0,
      bank_account: stripePaymentMethods.find(pm => pm.type === 'us_bank_account')?._count.id || 0,
      other: stripePaymentMethods.filter(pm => !['card', 'us_bank_account'].includes(pm.type))
        .reduce((sum, pm) => sum + pm._count.id, 0)
    }
  } catch (error) {
    return {
      card: 0,
      bank_account: 0,
      other: 0
    }
  }
}

async function getCommunicationAnalytics(startDate: Date) {
  const [totalMessages, deliveryStats, channelBreakdown] = await Promise.all([
    prisma.messageLog.count({
      where: { sentAt: { gte: startDate } }
    }),
    
    prisma.messageLog.groupBy({
      by: ['status'],
      where: { sentAt: { gte: startDate } },
      _count: { id: true }
    }),
    
    prisma.messageLog.groupBy({
      by: ['channel'],
      where: { sentAt: { gte: startDate } },
      _count: { id: true }
    })
  ])

  const deliveredCount = deliveryStats.find(s => s.status === 'delivered')?._count.id || 0
  const sentCount = deliveryStats.find(s => s.status === 'sent')?._count.id || 0
  const failedCount = deliveryStats.find(s => s.status === 'failed')?._count.id || 0

  return {
    totalMessages,
    deliveryRate: totalMessages > 0 ? ((deliveredCount + sentCount) / totalMessages) * 100 : 0,
    channelBreakdown: {
      email: channelBreakdown.find(c => c.channel === 'email')?._count.id || 0,
      sms: channelBreakdown.find(c => c.channel === 'sms')?._count.id || 0
    },
    deliveryStats: {
      delivered: deliveredCount,
      sent: sentCount,
      failed: failedCount
    }
  }
}

async function getRecurringMessageStats() {
  const [totalRecurring, activeRecurring, recentInstances] = await Promise.all([
    prisma.recurringMessage.count(),
    
    prisma.recurringMessage.count({
      where: { isActive: true }
    }),
    
    prisma.recurringInstance.findMany({
      where: {
        actualSentAt: { 
          not: null,
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) 
        }
      },
      include: { recurringMessage: true }
    })
  ])

  const totalMessagesSent = recentInstances.reduce((sum, instance) => sum + instance.successCount, 0)
  const averageSuccessRate = recentInstances.length > 0 
    ? recentInstances.reduce((sum, instance) => {
        const rate = instance.recipientCount > 0 ? (instance.successCount / instance.recipientCount) * 100 : 0
        return sum + rate
      }, 0) / recentInstances.length
    : 0

  return {
    totalRecurring,
    activeRecurring,
    messagesSentThisWeek: totalMessagesSent,
    averageSuccessRate: Math.round(averageSuccessRate)
  }
}
