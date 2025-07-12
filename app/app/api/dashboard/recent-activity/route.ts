
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

    // Get recent activities from different sources
    const [recentPayments, recentMessages, recentParents] = await Promise.all([
      // Recent payments
      prisma.payment.findMany({
        where: {
          paidAt: { not: null }
        },
        include: {
          parent: true
        },
        orderBy: {
          paidAt: 'desc'
        },
        take: 10
      }),

      // Recent messages
      prisma.messageLog.findMany({
        include: {
          parent: true
        },
        orderBy: {
          sentAt: 'desc'
        },
        take: 10
      }),

      // Recently added parents
      prisma.parent.findMany({
        orderBy: {
          createdAt: 'desc'
        },
        take: 5
      })
    ])

    // Combine and format activities
    const activities: any[] = []

    // Add payment activities
    recentPayments.forEach(payment => {
      activities.push({
        id: `payment-${payment.id}`,
        type: 'payment',
        description: `Payment of $${payment.amount} received`,
        parentName: payment.parent?.name,
        timestamp: payment.paidAt || payment.createdAt
      })
    })

    // Add message activities
    recentMessages.forEach(message => {
      activities.push({
        id: `message-${message.id}`,
        type: 'message',
        description: `${message.channel.toUpperCase()} message sent`,
        parentName: message.parent?.name,
        timestamp: message.sentAt
      })
    })

    // Add parent activities
    recentParents.forEach(parent => {
      activities.push({
        id: `parent-${parent.id}`,
        type: 'parent',
        description: `New parent registered`,
        parentName: parent.name,
        timestamp: parent.createdAt
      })
    })

    // Sort by timestamp and take the most recent 15
    const sortedActivities = activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 15)

    return NextResponse.json(sortedActivities)
  } catch (error) {
    console.error('Recent activity error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recent activity' },
      { status: 500 }
    )
  }
}
