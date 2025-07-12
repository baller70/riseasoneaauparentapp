
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import { prisma } from '../../../../lib/db'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch comprehensive dashboard data
    const [
      totalParents,
      totalRevenue,
      overduePayments,
      upcomingDues,
      activeContracts,
      recentMessages
    ] = await Promise.all([
      prisma.parent.count({ where: { status: 'active' } }),
      prisma.payment.aggregate({
        where: { status: 'paid' },
        _sum: { amount: true }
      }),
      prisma.payment.count({ where: { status: 'overdue' } }),
      prisma.payment.count({
        where: {
          status: 'pending',
          dueDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
          }
        }
      }),
      prisma.contract.count({ where: { status: 'signed' } }),
      prisma.messageLog.count({
        where: {
          sentAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      })
    ])

    // Get recent activity for context
    const recentPayments = await prisma.payment.findMany({
      where: { status: 'paid' },
      include: { parent: { select: { name: true } } },
      orderBy: { paidAt: 'desc' },
      take: 10
    })

    const recentContracts = await prisma.contract.findMany({
      include: { parent: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5
    })

    // Generate AI insights
    const insights = await generateDashboardInsights({
      totalParents,
      totalRevenue: totalRevenue._sum.amount || 0,
      overduePayments,
      upcomingDues,
      activeContracts,
      recentMessages,
      recentPayments,
      recentContracts
    })

    return NextResponse.json({
      success: true,
      insights,
      metrics: {
        totalParents,
        totalRevenue: totalRevenue._sum.amount || 0,
        overduePayments,
        upcomingDues,
        activeContracts,
        recentMessages
      },
      generatedAt: new Date()
    })

  } catch (error) {
    console.error('Dashboard insights error:', error)
    return NextResponse.json(
      { error: 'Failed to generate dashboard insights', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function generateDashboardInsights(data: any) {
  const {
    totalParents,
    totalRevenue,
    overduePayments,
    upcomingDues,
    activeContracts,
    recentMessages,
    recentPayments,
    recentContracts
  } = data

  // Calculate key ratios
  const overdueRate = totalParents > 0 ? (overduePayments / totalParents * 100) : 0
  const contractSigningRate = totalParents > 0 ? (activeContracts / totalParents * 100) : 0
  const avgRevenuePerParent = totalParents > 0 ? (totalRevenue / totalParents) : 0

  const messages = [
    {
      role: "system" as const,
      content: `You are an AI business analyst for the "Rise as One Yearly Program". Generate executive dashboard insights in JSON format with:

- executiveSummary (high-level overview)
- keyInsights (array of important observations)
- alerts (urgent issues requiring attention)
- opportunities (growth and improvement areas)
- recommendations (actionable suggestions)
- trends (patterns and forecasts)
- riskFactors (potential concerns)
- successMetrics (positive indicators)
- priorityActions (immediate actions needed)

Focus on actionable insights and business intelligence.`
    },
    {
      role: "user" as const,
      content: `Generate dashboard insights for:

Key Metrics:
- Total Active Parents: ${totalParents}
- Total Revenue: $${totalRevenue.toFixed(2)}
- Overdue Payments: ${overduePayments} (${overdueRate.toFixed(1)}% of parents)
- Upcoming Dues (7 days): ${upcomingDues}
- Active Contracts: ${activeContracts} (${contractSigningRate.toFixed(1)}% signing rate)
- Messages Sent (30 days): ${recentMessages}
- Average Revenue per Parent: $${avgRevenuePerParent.toFixed(2)}

Recent Activity:
- Recent Payments: ${recentPayments.length} completed
- Recent Contracts: ${recentContracts.length} uploaded
- Latest Payment: $${recentPayments[0]?.amount || 0} from ${recentPayments[0]?.parent?.name || 'N/A'}

Provide strategic insights and actionable recommendations for program management.`
    }
  ]

  try {
    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: messages,
        response_format: { type: "json_object" },
        max_tokens: 2000,
        temperature: 0.4
      })
    })

    if (!response.ok) {
      throw new Error(`AI API error: ${response.statusText}`)
    }

    const aiResponse = await response.json()
    let content = aiResponse.choices[0].message.content
    
    // Remove markdown code blocks if present
    if (content.includes('```json')) {
      content = content.replace(/```json\s*/g, '').replace(/\s*```/g, '')
    }
    
    return JSON.parse(content)
  } catch (error) {
    console.error('Dashboard insights AI error:', error)
    return {
      executiveSummary: 'Dashboard metrics available for review',
      keyInsights: [
        `Managing ${totalParents} active parents`,
        `$${totalRevenue.toFixed(2)} total revenue generated`,
        `${overduePayments} payments currently overdue`
      ],
      alerts: overduePayments > 5 ? ['High number of overdue payments requires attention'] : [],
      opportunities: ['Review payment processes for optimization'],
      recommendations: ['Monitor overdue payments closely', 'Engage with parents proactively'],
      trends: ['Manual analysis recommended'],
      riskFactors: overdueRate > 20 ? ['High overdue rate may impact cash flow'] : [],
      successMetrics: [`${contractSigningRate.toFixed(1)}% contract signing rate`],
      priorityActions: overduePayments > 0 ? ['Follow up on overdue payments'] : []
    }
  }
}
