
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../../lib/auth'
import { prisma } from '../../../../../lib/db'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const recurringMessage = await prisma.recurringMessage.update({
      where: { id: params.id },
      data: {
        isActive: true,
        pausedAt: null,
        pausedReason: null
      }
    })

    // Schedule next instance if none pending
    const pendingInstances = await prisma.recurringInstance.count({
      where: {
        recurringMessageId: params.id,
        status: 'scheduled',
        scheduledFor: { gt: new Date() }
      }
    })

    if (pendingInstances === 0) {
      await scheduleNextInstance(params.id)
    }

    return NextResponse.json(recurringMessage)
  } catch (error) {
    console.error('Recurring message resume error:', error)
    return NextResponse.json(
      { error: 'Failed to resume recurring message' },
      { status: 500 }
    )
  }
}

async function scheduleNextInstance(recurringMessageId: string) {
  const recurringMessage = await prisma.recurringMessage.findUnique({
    where: { id: recurringMessageId }
  })

  if (!recurringMessage || !recurringMessage.isActive) {
    return
  }

  let nextRun: Date = new Date()

  switch (recurringMessage.interval) {
    case 'daily':
      nextRun.setDate(nextRun.getDate() + recurringMessage.intervalValue)
      break
    case 'weekly':
      nextRun.setDate(nextRun.getDate() + (recurringMessage.intervalValue * 7))
      break
    case 'monthly':
      nextRun.setMonth(nextRun.getMonth() + recurringMessage.intervalValue)
      break
    default:
      nextRun.setDate(nextRun.getDate() + 1)
  }

  // Don't schedule if past end date
  if (recurringMessage.endDate && nextRun > recurringMessage.endDate) {
    return
  }

  await prisma.recurringInstance.create({
    data: {
      recurringMessageId,
      scheduledFor: nextRun
    }
  })
}
