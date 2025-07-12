
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

    const body = await request.json()
    const { reason } = body

    const recurringMessage = await prisma.recurringMessage.update({
      where: { id: params.id },
      data: {
        isActive: false,
        pausedAt: new Date(),
        pausedReason: reason || 'Paused by user'
      }
    })

    // Cancel pending instances
    await prisma.recurringInstance.updateMany({
      where: {
        recurringMessageId: params.id,
        status: 'scheduled',
        scheduledFor: { gt: new Date() }
      },
      data: {
        status: 'cancelled'
      }
    })

    return NextResponse.json(recurringMessage)
  } catch (error) {
    console.error('Recurring message pause error:', error)
    return NextResponse.json(
      { error: 'Failed to pause recurring message' },
      { status: 500 }
    )
  }
}
