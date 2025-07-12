
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import { gmailService } from '../../../../lib/gmail'
import { prisma } from '../../../../lib/db'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      to,
      subject,
      body: messageBody,
      templateId,
      parentIds
    } = body

    if (!to || !subject || !messageBody) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create Gmail draft
    const draft = await gmailService.createDraft({
      to: Array.isArray(to) ? to : [to],
      subject,
      body: messageBody
    })

    // Log the message creation
    if (parentIds && parentIds.length > 0) {
      for (const parentId of parentIds) {
        await prisma.messageLog.create({
          data: {
            parentId,
            templateId: templateId || null,
            subject,
            body: messageBody,
            channel: 'email',
            status: 'draft_created',
            metadata: {
              draftId: draft.draftId,
              webUrl: draft.webUrl
            }
          }
        })
      }
    }

    // Update template usage count if template was used
    if (templateId) {
      await prisma.template.update({
        where: { id: templateId },
        data: {
          usageCount: {
            increment: 1
          }
        }
      })
    }

    return NextResponse.json({
      success: true,
      draft,
      message: 'Gmail draft created successfully'
    })
  } catch (error) {
    console.error('Gmail draft creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create Gmail draft' },
      { status: 500 }
    )
  }
}
