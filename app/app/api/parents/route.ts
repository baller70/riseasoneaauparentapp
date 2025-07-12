
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
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (status && status !== 'all') {
      where.status = status
    }

    const parents = await prisma.parent.findMany({
      where,
      include: {
        payments: {
          where: { status: 'overdue' },
          select: { id: true, amount: true, dueDate: true }
        },
        contracts: {
          where: { status: 'pending' },
          select: { id: true, originalName: true }
        },
        _count: {
          select: {
            payments: true,
            contracts: true,
            messageLogs: true
          }
        }
      },
      orderBy: [
        { status: 'asc' },
        { name: 'asc' }
      ],
      take: limit,
      skip: offset
    })

    const total = await prisma.parent.count({ where })

    return NextResponse.json({
      parents,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    })
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

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
    }

    // Check if email already exists
    const existingParent = await prisma.parent.findUnique({
      where: { email }
    })

    if (existingParent) {
      return NextResponse.json({ error: 'A parent with this email already exists' }, { status: 400 })
    }

    const parent = await prisma.parent.create({
      data: {
        name,
        email,
        phone: phone || null,
        address: address || null,
        emergencyContact: emergencyContact || null,
        emergencyPhone: emergencyPhone || null,
        notes: notes || null,
        status: 'active'
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
