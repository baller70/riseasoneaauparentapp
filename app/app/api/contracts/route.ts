
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../lib/auth'
import { prisma } from '../../../lib/db'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const templateType = searchParams.get('templateType')

    const where: any = {}
    
    if (status && status !== 'all') {
      where.status = status
    }
    
    if (templateType && templateType !== 'all') {
      where.templateType = templateType
    }

    // Get contracts from new Contract model
    const contracts = await prisma.contract.findMany({
      where,
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        }
      },
      orderBy: [
        { status: 'asc' }, // pending first, then signed, then expired
        { uploadedAt: 'desc' }
      ]
    })

    // Also get parents without contracts for backward compatibility
    const parentsWithoutContracts = await prisma.parent.findMany({
      where: {
        contracts: {
          none: {}
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        contractStatus: true,
        contractUploadedAt: true,
        contractExpiresAt: true,
        contractUrl: true
      }
    })

    // Combine both datasets
    const allContracts = [
      ...contracts.map(contract => ({
        id: contract.id,
        parentId: contract.parentId,
        parentName: contract.parent.name,
        parentEmail: contract.parent.email,
        contractStatus: contract.status,
        contractUploadedAt: contract.uploadedAt,
        contractExpiresAt: contract.expiresAt,
        contractUrl: contract.fileUrl,
        fileName: contract.fileName,
        originalName: contract.originalName,
        templateType: contract.templateType,
        notes: contract.notes,
        signedAt: contract.signedAt,
        isNewContract: true
      })),
      ...parentsWithoutContracts.map(parent => ({
        id: parent.id,
        parentId: parent.id,
        parentName: parent.name,
        parentEmail: parent.email,
        contractStatus: parent.contractStatus,
        contractUploadedAt: parent.contractUploadedAt,
        contractExpiresAt: parent.contractExpiresAt,
        contractUrl: parent.contractUrl,
        fileName: null,
        originalName: null,
        templateType: null,
        notes: null,
        signedAt: null,
        isNewContract: false
      }))
    ]

    return NextResponse.json(allContracts)
  } catch (error) {
    console.error('Contracts fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contracts' },
      { status: 500 }
    )
  }
}
