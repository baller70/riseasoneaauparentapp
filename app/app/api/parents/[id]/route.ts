
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import { prisma } from '../../../../lib/db'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const parent = await prisma.parent.findUnique({
      where: { id: params.id },
      include: {
        paymentPlans: {
          include: {
            payments: true
          }
        },
        payments: {
          orderBy: {
            dueDate: 'desc'
          }
        },
        messageLogs: {
          orderBy: {
            sentAt: 'desc'
          },
          take: 10
        }
      }
    })

    if (!parent) {
      return NextResponse.json({ error: 'Parent not found' }, { status: 404 })
    }

    return NextResponse.json(parent)
  } catch (error) {
    console.error('Parent fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch parent' },
      { status: 500 }
    )
  }
}
