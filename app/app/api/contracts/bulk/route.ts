
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import { prisma } from '../../../../lib/db'
import { gmailService } from '../../../../lib/gmail'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { contractIds, action, data } = body

    if (!contractIds || !contractIds.length || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    let results = []

    switch (action) {
      case 'updateStatus':
        if (!data?.status) {
          return NextResponse.json({ error: 'Status is required for update action' }, { status: 400 })
        }

        const updateData: any = { 
          status: data.status,
          updatedAt: new Date()
        }

        // If marking as signed, set signedAt
        if (data.status === 'signed') {
          updateData.signedAt = new Date()
        }

        const updatedContracts = await prisma.contract.updateMany({
          where: {
            id: { in: contractIds }
          },
          data: updateData
        })

        results.push({
          action: 'updateStatus',
          affected: updatedContracts.count,
          status: data.status
        })
        break

      case 'sendReminder':
        // Get contracts with parent information
        const contractsToRemind = await prisma.contract.findMany({
          where: {
            id: { in: contractIds },
            status: { in: ['pending', 'expired'] }
          },
          include: {
            parent: {
              select: {
                name: true,
                email: true
              }
            }
          }
        })

        const reminderResults = []
        const gmailUrls = []

        for (const contract of contractsToRemind) {
          try {
            const subject = `Contract Reminder - ${contract.originalName}`
            const body = `Dear ${contract.parent.name || 'Parent'},\n\nThis is a friendly reminder that your contract "${contract.originalName}" is still pending signature.\n\nPlease review and sign the contract at your earliest convenience.\n\nThank you,\nRise as One Program`

            const draft = await gmailService.createDraft({
              to: [contract.parent.email],
              subject,
              body
            })

            reminderResults.push({
              contractId: contract.id,
              parentEmail: contract.parent.email,
              success: true,
              draft
            })

            gmailUrls.push(draft.webUrl)
          } catch (error) {
            reminderResults.push({
              contractId: contract.id,
              parentEmail: contract.parent.email,
              success: false,
              error: 'Failed to create reminder draft'
            })
          }
        }

        results.push({
          action: 'sendReminder',
          results: reminderResults,
          gmailUrls,
          successful: reminderResults.filter(r => r.success).length,
          failed: reminderResults.filter(r => !r.success).length
        })
        break

      case 'delete':
        const deletedContracts = await prisma.contract.deleteMany({
          where: {
            id: { in: contractIds }
          }
        })

        results.push({
          action: 'delete',
          affected: deletedContracts.count
        })
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      results,
      message: `Bulk operation completed successfully`
    })
  } catch (error) {
    console.error('Bulk contract operation error:', error)
    return NextResponse.json(
      { error: 'Failed to perform bulk operation' },
      { status: 500 }
    )
  }
}
