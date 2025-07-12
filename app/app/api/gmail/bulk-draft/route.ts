
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
      parentIds,
      templateId,
      subject,
      body: messageBody,
      customizePerParent = false
    } = body

    if (!parentIds || !parentIds.length || !subject || !messageBody) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get parent information for personalization
    const parents = await prisma.parent.findMany({
      where: {
        id: { in: parentIds }
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    })

    const results = []
    const gmailUrls = []

    for (const parent of parents) {
      let personalizedSubject = subject
      let personalizedBody = messageBody

      if (customizePerParent) {
        // Replace common variables
        personalizedSubject = personalizedSubject.replace(/\{parentName\}/g, parent.name || 'Parent')
        personalizedBody = personalizedBody.replace(/\{parentName\}/g, parent.name || 'Parent')
        personalizedBody = personalizedBody.replace(/\{parentEmail\}/g, parent.email)
      }

      try {
        // Create Gmail draft for this parent
        const draft = await gmailService.createDraft({
          to: [parent.email],
          subject: personalizedSubject,
          body: personalizedBody
        })

        // Log the message
        await prisma.messageLog.create({
          data: {
            parentId: parent.id,
            templateId: templateId || null,
            subject: personalizedSubject,
            body: personalizedBody,
            channel: 'email',
            status: 'draft_created',
            metadata: {
              draftId: draft.draftId,
              webUrl: draft.webUrl
            }
          }
        })

        results.push({
          parentId: parent.id,
          parentName: parent.name,
          parentEmail: parent.email,
          success: true,
          draft
        })

        gmailUrls.push(draft.webUrl)
      } catch (error) {
        console.error(`Failed to create draft for parent ${parent.id}:`, error)
        results.push({
          parentId: parent.id,
          parentName: parent.name,
          parentEmail: parent.email,
          success: false,
          error: 'Failed to create draft'
        })
      }
    }

    // Update template usage count if template was used
    if (templateId) {
      await prisma.template.update({
        where: { id: templateId },
        data: {
          usageCount: {
            increment: results.filter(r => r.success).length
          }
        }
      })
    }

    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: parentIds.length,
        successful: successCount,
        failed: failureCount
      },
      gmailUrls,
      message: `Created ${successCount} Gmail drafts successfully`
    })
  } catch (error) {
    console.error('Bulk Gmail draft creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create bulk Gmail drafts' },
      { status: 500 }
    )
  }
}
