
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
          include: {
            parent: true
          },
          orderBy: { sentAt: 'desc' }
        },
        scheduledMessages: {
          orderBy: { scheduledFor: 'desc' }
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
        isActive,
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

    // Check if template is being used in scheduled messages
    const scheduledMessages = await prisma.scheduledMessage.findMany({
      where: { 
        templateId: params.id,
        status: 'scheduled'
      }
    })

    if (scheduledMessages.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete template with scheduled messages' },
        { status: 400 }
      )
    }

    await prisma.template.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Template deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    )
  }
}
