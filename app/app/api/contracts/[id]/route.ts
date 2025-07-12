
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

    const contract = await prisma.contract.findUnique({
      where: { id: params.id },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        }
      }
    })

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    return NextResponse.json(contract)
  } catch (error) {
    console.error('Contract fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contract' },
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
      status,
      templateType,
      notes,
      expiresAt,
      signedAt
    } = body

    const updateData: any = {}

    if (status) updateData.status = status
    if (templateType !== undefined) updateData.templateType = templateType
    if (notes !== undefined) updateData.notes = notes
    if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null
    if (signedAt !== undefined) updateData.signedAt = signedAt ? new Date(signedAt) : null

    // If status is being set to 'signed' and no signedAt provided, set it to now
    if (status === 'signed' && !signedAt) {
      updateData.signedAt = new Date()
    }

    const contract = await prisma.contract.update({
      where: { id: params.id },
      data: updateData,
      include: {
        parent: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json(contract)
  } catch (error) {
    console.error('Contract update error:', error)
    return NextResponse.json(
      { error: 'Failed to update contract' },
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

    // Delete the contract record
    await prisma.contract.delete({
      where: { id: params.id }
    })

    // Note: In production, you might also want to delete the actual file
    // For now, we'll just delete the database record

    return NextResponse.json({ 
      success: true, 
      message: 'Contract deleted successfully' 
    })
  } catch (error) {
    console.error('Contract deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete contract' },
      { status: 500 }
    )
  }
}
