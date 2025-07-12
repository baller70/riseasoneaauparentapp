
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
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = {}

    if (status && status !== 'all') {
      if (status === 'active') {
        where.isActive = true
        where.pausedAt = null
      } else if (status === 'paused') {
        where.pausedAt = { not: null }
      } else if (status === 'inactive') {
        where.isActive = false
      }
    }

    const recurringMessages = await prisma.recurringMessage.findMany({
      where,
      include: {
        template: true,
        instances: {
          orderBy: { scheduledFor: 'desc' },
          take: 5
        },
        recipients: {
          include: {
            parent: true
          },
          where: {
            isActive: true
          },
          take: 10
        },
        _count: {
          select: {
            instances: true,
            recipients: true
          }
        }
      },
      orderBy: [
        { isActive: 'desc' },
        { createdAt: 'desc' }
      ],
      take: limit,
      skip: offset
    })

    const total = await prisma.recurringMessage.count({ where })

    return NextResponse.json({
      recurringMessages,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    })
  } catch (error) {
    console.error('Recurring messages fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recurring messages' },
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
      name,
      templateId,
      subject,
      body: messageBody,
      channel,
      interval,
      intervalValue,
      customSchedule,
      targetAudience,
      audienceFilter,
      startDate,
      endDate,
      stopConditions,
      maxMessages,
      escalationRules,
      variables
    } = body

    if (!name || !messageBody || !interval) {
      return NextResponse.json({ error: 'Name, body, and interval are required' }, { status: 400 })
    }

    // Create recurring message
    const recurringMessage = await prisma.recurringMessage.create({
      data: {
        name,
        templateId: templateId || null,
        subject: subject || null,
        body: messageBody,
        channel: channel || 'email',
        interval,
        intervalValue: intervalValue || 1,
        customSchedule: customSchedule || null,
        targetAudience: targetAudience || 'all',
        audienceFilter: audienceFilter || null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        stopConditions: stopConditions || [],
        maxMessages: maxMessages || null,
        escalationRules: escalationRules || null,
        variables: variables || [],
        createdBy: session.user.email!
      },
      include: {
        template: true
      }
    })

    // Add recipients based on target audience
    await addRecipientsToRecurringMessage(recurringMessage.id, targetAudience, audienceFilter)

    // Schedule first instance
    await scheduleNextInstance(recurringMessage.id)

    return NextResponse.json(recurringMessage)
  } catch (error) {
    console.error('Recurring message creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create recurring message' },
      { status: 500 }
    )
  }
}

async function addRecipientsToRecurringMessage(
  recurringMessageId: string, 
  targetAudience: string, 
  audienceFilter: any
) {
  let parentIds: string[] = []

  switch (targetAudience) {
    case 'all':
      const allParents = await prisma.parent.findMany({
        where: { status: 'active' },
        select: { id: true }
      })
      parentIds = allParents.map(p => p.id)
      break

    case 'overdue_payments':
      const overdueParents = await prisma.parent.findMany({
        where: {
          status: 'active',
          payments: {
            some: {
              status: 'overdue',
              dueDate: { lt: new Date() }
            }
          }
        },
        select: { id: true }
      })
      parentIds = overdueParents.map(p => p.id)
      break

    case 'specific_parents':
      if (audienceFilter?.parentIds) {
        parentIds = audienceFilter.parentIds
      }
      break

    case 'payment_plan_type':
      if (audienceFilter?.paymentPlanType) {
        const planParents = await prisma.parent.findMany({
          where: {
            status: 'active',
            paymentPlans: {
              some: {
                type: audienceFilter.paymentPlanType,
                status: 'active'
              }
            }
          },
          select: { id: true }
        })
        parentIds = planParents.map(p => p.id)
      }
      break
  }

  // Add recipients
  const recipients = parentIds.map(parentId => ({
    recurringMessageId,
    parentId
  }))

  await prisma.recurringRecipient.createMany({
    data: recipients,
    skipDuplicates: true
  })
}

async function scheduleNextInstance(recurringMessageId: string) {
  const recurringMessage = await prisma.recurringMessage.findUnique({
    where: { id: recurringMessageId }
  })

  if (!recurringMessage || !recurringMessage.isActive) {
    return
  }

  let nextRun: Date

  switch (recurringMessage.interval) {
    case 'daily':
      nextRun = new Date(recurringMessage.startDate)
      nextRun.setDate(nextRun.getDate() + recurringMessage.intervalValue)
      break
    case 'weekly':
      nextRun = new Date(recurringMessage.startDate)
      nextRun.setDate(nextRun.getDate() + (recurringMessage.intervalValue * 7))
      break
    case 'monthly':
      nextRun = new Date(recurringMessage.startDate)
      nextRun.setMonth(nextRun.getMonth() + recurringMessage.intervalValue)
      break
    case 'custom':
      // For custom schedules, we'd implement cron parsing here
      // For now, default to daily
      nextRun = new Date(recurringMessage.startDate)
      nextRun.setDate(nextRun.getDate() + 1)
      break
    default:
      nextRun = new Date(recurringMessage.startDate)
  }

  // Don't schedule if past end date
  if (recurringMessage.endDate && nextRun > recurringMessage.endDate) {
    return
  }

  // Create next instance
  await prisma.recurringInstance.create({
    data: {
      recurringMessageId,
      scheduledFor: nextRun
    }
  })
}
