
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import { prisma } from '../../../../lib/db'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { parentId } = await request.json()

    if (!parentId) {
      return NextResponse.json({ error: 'Parent ID is required' }, { status: 400 })
    }

    // Fetch comprehensive parent data
    const parent = await prisma.parent.findUnique({
      where: { id: parentId },
      include: {
        payments: {
          orderBy: { dueDate: 'desc' },
          include: { reminders: true }
        },
        contracts: {
          orderBy: { createdAt: 'desc' }
        },
        paymentPlans: {
          include: { payments: true }
        },
        messageLogs: {
          orderBy: { sentAt: 'desc' },
          take: 20
        }
      }
    })

    if (!parent) {
      return NextResponse.json({ error: 'Parent not found' }, { status: 404 })
    }

    // Calculate metrics
    const metrics = calculateParentMetrics(parent)
    
    // Generate AI analysis
    const analysis = await generateAIAnalysis(parent, metrics)

    return NextResponse.json({
      success: true,
      parentId,
      analysis,
      metrics,
      lastUpdated: new Date()
    })

  } catch (error) {
    console.error('Parent analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze parent', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

function calculateParentMetrics(parent: any) {
  const now = new Date()
  
  // Payment reliability
  const totalPayments = parent.payments.length
  const paidOnTime = parent.payments.filter((p: any) => 
    p.status === 'paid' && p.paidAt && new Date(p.paidAt) <= new Date(p.dueDate)
  ).length
  const paymentReliability = totalPayments > 0 ? (paidOnTime / totalPayments) * 100 : 0

  // Overdue payments
  const overduePayments = parent.payments.filter((p: any) => p.status === 'overdue').length
  
  // Communication responsiveness (simplified - based on message frequency)
  const recentMessages = parent.messageLogs.filter((m: any) => {
    const messageDate = new Date(m.sentAt)
    const daysDiff = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24)
    return daysDiff <= 30
  })
  
  // Contract compliance
  const activeContracts = parent.contracts.filter((c: any) => c.status === 'signed').length
  const totalContracts = parent.contracts.length
  const contractCompliance = totalContracts > 0 ? (activeContracts / totalContracts) * 100 : 0

  // Financial health
  const totalOwed = parent.payments
    .filter((p: any) => p.status === 'pending' || p.status === 'overdue')
    .reduce((sum: number, p: any) => sum + parseFloat(p.amount.toString()), 0)

  return {
    paymentReliability,
    overduePayments,
    recentCommunications: recentMessages.length,
    contractCompliance,
    totalOwed,
    totalPayments,
    activePlans: parent.paymentPlans.filter((pp: any) => pp.status === 'active').length
  }
}

async function generateAIAnalysis(parent: any, metrics: any) {
  const messages = [
    {
      role: "system" as const,
      content: `You are an AI analyst for the "Rise as One Yearly Program" parent management system. Analyze parent data and provide insights, risk assessments, and recommendations.

Provide analysis in JSON format with:
- riskScore (0-100, where 100 is highest risk)
- riskLevel (low, medium, high, critical)
- keyInsights (array of important observations)
- recommendations (array of actionable suggestions)
- factors (object with positive, negative, neutral arrays)
- paymentPrediction (likelihood of future payment issues 0-100)
- engagementScore (0-100 based on communication and compliance)
- priorityActions (array of immediate actions needed)`
    },
    {
      role: "user" as const,
      content: `Analyze this parent's profile:

Parent: ${parent.name} (${parent.email})
Payment Reliability: ${metrics.paymentReliability}%
Overdue Payments: ${metrics.overduePayments}
Recent Communications: ${metrics.recentCommunications}
Contract Compliance: ${metrics.contractCompliance}%
Total Owed: $${metrics.totalOwed}
Total Payments: ${metrics.totalPayments}
Active Plans: ${metrics.activePlans}

Payment History:
${parent.payments.slice(0, 5).map((p: any) => 
  `- $${p.amount} due ${p.dueDate.toDateString()} (${p.status})`
).join('\n')}

Contract Status:
${parent.contracts.slice(0, 3).map((c: any) => 
  `- ${c.originalName}: ${c.status} (expires: ${c.expiresAt ? c.expiresAt.toDateString() : 'N/A'})`
).join('\n')}

Provide comprehensive analysis and actionable recommendations.`
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
        max_tokens: 1500,
        temperature: 0.3
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
    console.error('AI analysis error:', error)
    return {
      riskScore: metrics.overduePayments > 0 ? 70 : 30,
      riskLevel: metrics.overduePayments > 2 ? 'high' : 'medium',
      keyInsights: ['Unable to generate AI analysis'],
      recommendations: ['Review parent data manually'],
      factors: { positive: [], negative: [], neutral: [] },
      paymentPrediction: 50,
      engagementScore: 50,
      priorityActions: []
    }
  }
}
