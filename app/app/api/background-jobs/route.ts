
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
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = {}

    if (status && status !== 'all') {
      where.status = status
    }

    if (type && type !== 'all') {
      where.type = type
    }

    const jobs = await prisma.backgroundJob.findMany({
      where,
      include: {
        parentJob: {
          select: {
            id: true,
            name: true,
            status: true
          }
        },
        childJobs: {
          select: {
            id: true,
            name: true,
            status: true,
            progress: true
          }
        },
        logs: {
          orderBy: { timestamp: 'desc' },
          take: 5
        }
      },
      orderBy: [
        { status: 'asc' }, // pending and running first
        { priority: 'asc' }, // higher priority (lower number) first
        { scheduledFor: 'asc' }
      ],
      take: limit,
      skip: offset
    })

    const total = await prisma.backgroundJob.count({ where })

    // Get job statistics
    const stats = await prisma.backgroundJob.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    })

    const jobStats = {
      total,
      pending: stats.find(s => s.status === 'pending')?._count.id || 0,
      running: stats.find(s => s.status === 'running')?._count.id || 0,
      completed: stats.find(s => s.status === 'completed')?._count.id || 0,
      failed: stats.find(s => s.status === 'failed')?._count.id || 0,
      cancelled: stats.find(s => s.status === 'cancelled')?._count.id || 0
    }

    return NextResponse.json({
      jobs,
      stats: jobStats,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    })
  } catch (error) {
    console.error('Background jobs fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch background jobs' },
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
      type,
      name,
      priority,
      scheduledFor,
      parameters,
      parentJobId,
      maxRetries
    } = body

    if (!type || !name) {
      return NextResponse.json({ error: 'Type and name are required' }, { status: 400 })
    }

    const job = await prisma.backgroundJob.create({
      data: {
        type,
        name,
        priority: priority || 5,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : new Date(),
        parameters: parameters || null,
        parentJobId: parentJobId || null,
        maxRetries: maxRetries || 3,
        createdBy: session.user.email!
      },
      include: {
        parentJob: true,
        logs: true
      }
    })

    // Log job creation
    await prisma.jobLog.create({
      data: {
        jobId: job.id,
        level: 'info',
        message: `Job created by ${session.user.email}`,
        data: {
          type,
          name,
          priority,
          scheduledFor
        }
      }
    })

    return NextResponse.json(job)
  } catch (error) {
    console.error('Background job creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create background job' },
      { status: 500 }
    )
  }
}
