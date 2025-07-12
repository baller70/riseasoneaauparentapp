
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../../lib/auth'
import { prisma } from '../../../../../lib/db'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const versions = await prisma.templateVersion.findMany({
      where: { templateId: params.id },
      include: {
        improvements: true,
        analytics: true,
        template: {
          select: {
            name: true,
            category: true,
            channel: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(versions)
  } catch (error) {
    console.error('Template versions fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch template versions' },
      { status: 500 }
    )
  }
}
