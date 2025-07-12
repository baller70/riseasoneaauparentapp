
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import { prisma } from '../../../../lib/db'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const template = await prisma.template.findUnique({
      where: { id: params.id },
      include: {
        messageLogs: {
          take: 10,
          orderBy: { sentAt: 'desc' },
          include: {
            parent: {
              select: {
                name: true,
                email: true
              }
            }
          }
        },
        scheduledMessages: {
          orderBy: { scheduledFor: 'asc' },
          take: 10
        },
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    return NextResponse.json(template)
  } catch (error) {
    console.error('Template fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      subject,
      body: templateBody,
      category,
      channel,
      variables,
      isActive
    } = body

    const template = await prisma.template.update({
      where: { id: params.id },
      data: {
        name,
        subject,
        body: templateBody,
        category,
        channel,
        variables: variables || [],
        isActive: isActive !== undefined ? isActive : true,
        updatedAt: new Date()
      }
    })

    return NextResponse.json(template)
  } catch (error) {
    console.error('Template update error:', error)
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Soft delete by setting isActive to false
    await prisma.template.update({
      where: { id: params.id },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({ success: true, message: 'Template deleted successfully' })
  } catch (error) {
    console.error('Template deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    )
  }
}
