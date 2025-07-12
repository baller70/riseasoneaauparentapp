
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
      channel = 'email',
      customizePerParent = true
    } = body

    if (!parentIds || !parentIds.length || !subject || !messageBody) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get parent information
    const parents = await prisma.parent.findMany({
      where: {
        id: { in: parentIds }
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true
      }
    })

    if (parents.length === 0) {
      return NextResponse.json({ error: 'No valid parents found' }, { status: 400 })
    }

    const results = []
    const gmailUrls = []

    for (const parent of parents) {
      let personalizedSubject = subject
      let personalizedBody = messageBody

      if (customizePerParent) {
        // Replace template variables
        personalizedSubject = personalizedSubject.replace(/\{parentName\}/g, parent.name || 'Parent')
        personalizedSubject = personalizedSubject.replace(/\{parentEmail\}/g, parent.email)
        
        personalizedBody = personalizedBody.replace(/\{parentName\}/g, parent.name || 'Parent')
        personalizedBody = personalizedBody.replace(/\{parentEmail\}/g, parent.email)
        personalizedBody = personalizedBody.replace(/\{parentPhone\}/g, parent.phone || 'N/A')
      }

      try {
        if (channel === 'email') {
          // Create Gmail draft
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
        } else if (channel === 'sms') {
          // For SMS, we'll just log it as scheduled since we don't have SMS integration
          await prisma.messageLog.create({
            data: {
              parentId: parent.id,
              templateId: templateId || null,
              subject: personalizedSubject,
              body: personalizedBody,
              channel: 'sms',
              status: 'scheduled',
              metadata: {
                phone: parent.phone
              }
            }
          })

          results.push({
            parentId: parent.id,
            parentName: parent.name,
            parentPhone: parent.phone,
            success: true,
            message: 'SMS scheduled (would be sent via SMS provider)'
          })
        }
      } catch (error) {
        console.error(`Failed to process message for parent ${parent.id}:`, error)
        results.push({
          parentId: parent.id,
          parentName: parent.name,
          success: false,
          error: 'Failed to process message'
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
      gmailUrls: channel === 'email' ? gmailUrls : [],
      message: `Processed ${successCount} messages successfully${channel === 'email' ? ' (Gmail drafts created)' : ''}`
    })
  } catch (error) {
    console.error('Bulk communication error:', error)
    return NextResponse.json(
      { error: 'Failed to send bulk communications' },
      { status: 500 }
    )
  }
}
