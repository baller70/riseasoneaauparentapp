
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

    const scheduledMessages = await prisma.scheduledMessage.findMany({
      include: {
        template: true
      },
      orderBy: { scheduledFor: 'asc' }
    })

    // Add recipient details
    const messagesWithRecipients = await Promise.all(
      scheduledMessages.map(async (message) => {
        const recipients = await prisma.parent.findMany({
          where: { id: { in: message.recipients } },
          select: { id: true, name: true, email: true }
        })

        return {
          ...message,
          recipientDetails: recipients
        }
      })
    )

    return NextResponse.json(messagesWithRecipients)
  } catch (error) {
    console.error('Scheduled messages fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch scheduled messages' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const messageId = searchParams.get('id')

    if (!messageId) {
      return NextResponse.json({ error: 'Message ID required' }, { status: 400 })
    }

    await prisma.scheduledMessage.update({
      where: { id: messageId },
      data: { status: 'cancelled' }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Cancel scheduled message error:', error)
    return NextResponse.json(
      { error: 'Failed to cancel scheduled message' },
      { status: 500 }
    )
  }
}
