
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
        parent: true
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
      expiresAt,
      notes,
      signedAt
    } = body

    const updateData: any = {
      updatedAt: new Date()
    }

    if (status !== undefined) {
      updateData.status = status
      if (status === 'signed' && !signedAt) {
        updateData.signedAt = new Date()
      }
    }

    if (templateType !== undefined) updateData.templateType = templateType
    if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null
    if (notes !== undefined) updateData.notes = notes
    if (signedAt !== undefined) updateData.signedAt = signedAt ? new Date(signedAt) : null

    const contract = await prisma.contract.update({
      where: { id: params.id },
      data: updateData,
      include: {
        parent: true
      }
    })

    // Update parent's legacy contract fields for backward compatibility
    if (status !== undefined) {
      await prisma.parent.update({
        where: { id: contract.parentId },
        data: {
          contractStatus: status,
          contractExpiresAt: contract.expiresAt
        }
      })
    }

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

    const contract = await prisma.contract.findUnique({
      where: { id: params.id }
    })

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    await prisma.contract.delete({
      where: { id: params.id }
    })

    // Update parent's legacy contract fields
    await prisma.parent.update({
      where: { id: contract.parentId },
      data: {
        contractUrl: null,
        contractStatus: 'pending',
        contractUploadedAt: null,
        contractExpiresAt: null
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Contract deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete contract' },
      { status: 500 }
    )
  }
}
