
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

    const job = await prisma.backgroundJob.findUnique({
      where: { id: params.id },
      include: {
        parentJob: true,
        childJobs: true,
        logs: {
          orderBy: { timestamp: 'desc' }
        }
      }
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    return NextResponse.json(job)
  } catch (error) {
    console.error('Background job fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch background job' },
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
    const { status, progress, currentStep, result, errorMessage } = body

    const job = await prisma.backgroundJob.update({
      where: { id: params.id },
      data: {
        status: status || undefined,
        progress: progress !== undefined ? progress : undefined,
        currentStep: currentStep !== undefined ? currentStep : undefined,
        result: result !== undefined ? result : undefined,
        errorMessage: errorMessage !== undefined ? errorMessage : undefined,
        startedAt: status === 'running' ? new Date() : undefined,
        completedAt: (status === 'completed' || status === 'failed') ? new Date() : undefined,
        updatedAt: new Date()
      }
    })

    // Log status change
    if (status) {
      await prisma.jobLog.create({
        data: {
          jobId: params.id,
          level: status === 'failed' ? 'error' : 'info',
          message: `Job status changed to ${status}`,
          data: {
            newStatus: status,
            progress,
            currentStep,
            errorMessage
          }
        }
      })
    }

    return NextResponse.json(job)
  } catch (error) {
    console.error('Background job update error:', error)
    return NextResponse.json(
      { error: 'Failed to update background job' },
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

    // Cancel the job instead of deleting
    const job = await prisma.backgroundJob.update({
      where: { id: params.id },
      data: {
        status: 'cancelled',
        completedAt: new Date()
      }
    })

    // Log cancellation
    await prisma.jobLog.create({
      data: {
        jobId: params.id,
        level: 'info',
        message: `Job cancelled by ${session.user.email}`,
        data: {
          cancelledBy: session.user.email,
          cancelledAt: new Date()
        }
      }
    })

    return NextResponse.json({ success: true, job })
  } catch (error) {
    console.error('Background job cancellation error:', error)
    return NextResponse.json(
      { error: 'Failed to cancel background job' },
      { status: 500 }
    )
  }
}
