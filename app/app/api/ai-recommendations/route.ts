
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
    const category = searchParams.get('category')
    const priority = searchParams.get('priority')
    const isExecuted = searchParams.get('executed')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = {}

    if (category && category !== 'all') {
      where.category = category
    }

    if (priority && priority !== 'all') {
      where.priority = priority
    }

    if (isExecuted !== null && isExecuted !== undefined) {
      where.isExecuted = isExecuted === 'true'
    }

    // Don't show dismissed recommendations by default
    if (!searchParams.get('includeDismissed')) {
      where.dismissedAt = null
    }

    // Don't show expired recommendations
    where.OR = [
      { expiresAt: null },
      { expiresAt: { gt: new Date() } }
    ]

    const recommendations = await prisma.aIRecommendation.findMany({
      where,
      include: {
        actions: {
          orderBy: { order: 'asc' }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { confidence: 'desc' },
        { createdAt: 'desc' }
      ],
      take: limit,
      skip: offset
    })

    const total = await prisma.aIRecommendation.count({ where })

    return NextResponse.json({
      recommendations,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    })
  } catch (error) {
    console.error('AI recommendations fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch AI recommendations' },
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
      type,
      category,
      title,
      description,
      priority,
      confidence,
      expectedImpact,
      targetEntityType,
      targetEntityId,
      context,
      actions,
      autoExecutable,
      expiresAt
    } = body

    if (!type || !category || !title || !description) {
      return NextResponse.json({ error: 'Type, category, title, and description are required' }, { status: 400 })
    }

    // Create the recommendation
    const recommendation = await prisma.aIRecommendation.create({
      data: {
        type,
        category,
        title,
        description,
        priority: priority || 'medium',
        confidence: confidence || 75,
        expectedImpact: expectedImpact || 'medium',
        targetEntityType,
        targetEntityId: targetEntityId || null,
        context: context || {},
        actionable: true,
        autoExecutable: autoExecutable || false,
        expiresAt: expiresAt ? new Date(expiresAt) : null
      }
    })

    // Create associated actions
    if (actions && actions.length > 0) {
      const actionData = actions.map((action: any, index: number) => ({
        recommendationId: recommendation.id,
        actionType: action.actionType,
        title: action.title,
        description: action.description,
        parameters: action.parameters || {},
        order: action.order || index + 1,
        isRequired: action.isRequired !== false
      }))

      await prisma.aIRecommendationAction.createMany({
        data: actionData
      })
    }

    // Get the complete recommendation with actions
    const completeRecommendation = await prisma.aIRecommendation.findUnique({
      where: { id: recommendation.id },
      include: {
        actions: {
          orderBy: { order: 'asc' }
        }
      }
    })

    return NextResponse.json(completeRecommendation)
  } catch (error) {
    console.error('AI recommendation creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create AI recommendation' },
      { status: 500 }
    )
  }
}
