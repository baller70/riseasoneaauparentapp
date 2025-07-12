
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import { prisma } from '../../../../lib/db'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const recurringMessage = await prisma.recurringMessage.findUnique({
      where: { id: params.id },
      include: {
        template: true,
        instances: {
          include: {
            logs: {
              include: {
                parent: true,
                messageLog: true
              }
            }
          },
          orderBy: { scheduledFor: 'desc' }
        },
        recipients: {
          include: {
            parent: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!recurringMessage) {
      return NextResponse.json({ error: 'Recurring message not found' }, { status: 404 })
    }

    return NextResponse.json(recurringMessage)
  } catch (error) {
    console.error('Recurring message fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recurring message' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
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
      variables,
      isActive
    } = body

    const recurringMessage = await prisma.recurringMessage.update({
      where: { id: params.id },
      data: {
        name: name || undefined,
        subject: subject !== undefined ? subject : undefined,
        body: messageBody || undefined,
        channel: channel || undefined,
        interval: interval || undefined,
        intervalValue: intervalValue || undefined,
        customSchedule: customSchedule !== undefined ? customSchedule : undefined,
        targetAudience: targetAudience || undefined,
        audienceFilter: audienceFilter !== undefined ? audienceFilter : undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : undefined,
        stopConditions: stopConditions || undefined,
        maxMessages: maxMessages !== undefined ? maxMessages : undefined,
        escalationRules: escalationRules !== undefined ? escalationRules : undefined,
        variables: variables || undefined,
        isActive: isActive !== undefined ? isActive : undefined,
        updatedAt: new Date()
      },
      include: {
        template: true,
        instances: true,
        recipients: true
      }
    })

    return NextResponse.json(recurringMessage)
  } catch (error) {
    console.error('Recurring message update error:', error)
    return NextResponse.json(
      { error: 'Failed to update recurring message' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // First deactivate instead of hard delete
    await prisma.recurringMessage.update({
      where: { id: params.id },
      data: {
        isActive: false,
        pausedAt: new Date(),
        pausedReason: 'Deleted by user'
      }
    })

    // Deactivate all recipients
    await prisma.recurringRecipient.updateMany({
      where: { recurringMessageId: params.id },
      data: {
        isActive: false,
        stoppedAt: new Date(),
        stopReason: 'manual_stop'
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Recurring message deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete recurring message' },
      { status: 500 }
    )
  }
}
