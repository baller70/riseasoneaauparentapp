
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import { prisma } from '../../../../lib/db'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { contractIds, action, data } = body

    if (!contractIds || !Array.isArray(contractIds) || contractIds.length === 0) {
      return NextResponse.json({ error: 'Contract IDs are required' }, { status: 400 })
    }

    let results = []

    switch (action) {
      case 'updateStatus':
        if (!data?.status) {
          return NextResponse.json({ error: 'Status is required' }, { status: 400 })
        }

        const updateData: any = {
          status: data.status,
          updatedAt: new Date()
        }

        if (data.status === 'signed') {
          updateData.signedAt = new Date()
        }

        await prisma.contract.updateMany({
          where: { id: { in: contractIds } },
          data: updateData
        })

        // Update parent legacy fields
        const contracts = await prisma.contract.findMany({
          where: { id: { in: contractIds } },
          select: { parentId: true }
        })

        await Promise.all(
          contracts.map(contract =>
            prisma.parent.update({
              where: { id: contract.parentId },
              data: { contractStatus: data.status }
            })
          )
        )

        results = await prisma.contract.findMany({
          where: { id: { in: contractIds } },
          include: { parent: true }
        })
        break

      case 'delete':
        const contractsToDelete = await prisma.contract.findMany({
          where: { id: { in: contractIds } },
          select: { id: true, parentId: true }
        })

        await prisma.contract.deleteMany({
          where: { id: { in: contractIds } }
        })

        // Update parent legacy fields
        await Promise.all(
          contractsToDelete.map(contract =>
            prisma.parent.update({
              where: { id: contract.parentId },
              data: {
                contractUrl: null,
                contractStatus: 'pending',
                contractUploadedAt: null,
                contractExpiresAt: null
              }
            })
          )
        )

        results = [{ action: 'deleted', count: contractIds.length }]
        break

      case 'sendReminder':
        // In a real app, this would trigger reminder emails/messages
        // For now, we'll just log the action
        results = [{ action: 'reminded', count: contractIds.length }]
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      action,
      affected: contractIds.length,
      results
    })

  } catch (error) {
    console.error('Bulk contract operation error:', error)
    return NextResponse.json(
      { error: 'Failed to perform bulk operation' },
      { status: 500 }
    )
  }
}
