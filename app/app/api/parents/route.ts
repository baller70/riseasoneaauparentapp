
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
      include: {
        paymentPlans: {
          include: {
            payments: true
          }
        },
        payments: true,
        messageLogs: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(parents)
  } catch (error) {
    console.error('Parents fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch parents' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      email,
      phone,
      address,
      emergencyContact,
      emergencyPhone,
      notes
    } = body

    // Check if parent with this email already exists
    const existingParent = await prisma.parent.findUnique({
      where: { email }
    })

    if (existingParent) {
      return NextResponse.json(
        { error: 'Parent with this email already exists' },
        { status: 400 }
      )
    }

    const parent = await prisma.parent.create({
      data: {
        name,
        email,
        phone,
        address,
        emergencyContact,
        emergencyPhone,
        notes,
        status: 'active',
        contractStatus: 'pending'
      }
    })

    return NextResponse.json(parent)
  } catch (error) {
    console.error('Parent creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create parent' },
      { status: 500 }
    )
  }
}
