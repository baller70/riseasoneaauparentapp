
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../lib/auth'
import { prisma } from '../../../lib/db'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const parents = await prisma.parent.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        contractStatus: true,
        contractUploadedAt: true,
        contractExpiresAt: true,
        contractUrl: true
      },
      orderBy: [
        { contractStatus: 'asc' }, // pending first, then signed, then expired
        { contractUploadedAt: 'desc' }
      ]
    })

    const contracts = parents.map(parent => ({
      id: parent.id,
      parentName: parent.name,
      parentEmail: parent.email,
      contractStatus: parent.contractStatus,
      contractUploadedAt: parent.contractUploadedAt,
      contractExpiresAt: parent.contractExpiresAt,
      contractUrl: parent.contractUrl
    }))

    return NextResponse.json(contracts)
  } catch (error) {
    console.error('Contracts fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contracts' },
      { status: 500 }
    )
  }
}
