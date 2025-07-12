
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import { prisma } from '../../../../lib/db'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const parentId = searchParams.get('parentId')
    const channel = searchParams.get('channel')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = {}

    if (parentId) {
      where.parentId = parentId
    }

    if (channel && channel !== 'all') {
      where.channel = channel
    }

    if (status && status !== 'all') {
      where.status = status
    }

    const messages = await prisma.messageLog.findMany({
      where,
      include: {
        parent: {
          select: {
            name: true,
            email: true
          }
        },
        template: {
          select: {
            name: true,
            category: true
          }
        }
      },
      orderBy: {
        sentAt: 'desc'
      },
      take: limit,
      skip: offset
    })

    const total = await prisma.messageLog.count({ where })

    return NextResponse.json({
      messages,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    })
  } catch (error) {
    console.error('Message history fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch message history' },
      { status: 500 }
    )
  }
}
