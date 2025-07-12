
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

    const { operation, parentIds, parameters } = await request.json()

    let results
    switch (operation) {
      case 'generate_personalized_messages':
        results = await generatePersonalizedMessages(parentIds, parameters)
        break
      case 'assess_parent_risks':
        results = await assessParentRisks(parentIds)
        break
      case 'optimize_payment_schedules':
        results = await optimizePaymentSchedules(parentIds, parameters)
        break
      case 'analyze_communication_effectiveness':
        results = await analyzeCommunicationEffectiveness(parentIds)
        break
      case 'predict_retention_risk':
        results = await predictRetentionRisk(parentIds)
        break
      default:
        throw new Error('Unknown bulk operation')
    }

    return NextResponse.json({
      success: true,
      operation,
      results,
      processedCount: parentIds?.length || 0,
      timestamp: new Date()
    })

  } catch (error) {
    console.error('Bulk operations error:', error)
    return NextResponse.json(
      { error: 'Failed to execute bulk operation', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function generatePersonalizedMessages(parentIds: string[], parameters: any) {
  const { messageType, tone, includeDetails } = parameters

  const parents = await prisma.parent.findMany({
    where: { id: { in: parentIds } },
    include: {
      payments: { orderBy: { dueDate: 'desc' }, take: 5 },
      contracts: { orderBy: { createdAt: 'desc' }, take: 3 },
      paymentPlans: { where: { status: 'active' } }
    }
  })

  const personalizedMessages = []

  for (const parent of parents) {
    try {
      const context = buildParentContext(parent, includeDetails)
      const aiMessage = await generateAIMessage(context, messageType, tone, parent.name)
      
      personalizedMessages.push({
        parentId: parent.id,
        parentName: parent.name,
        parentEmail: parent.email,
        message: aiMessage,
        personalizationLevel: calculatePersonalizationLevel(context),
        generatedAt: new Date()
      })
    } catch (error) {
      console.error(`Failed to generate message for parent ${parent.id}:`, error)
      personalizedMessages.push({
        parentId: parent.id,
        parentName: parent.name,
        parentEmail: parent.email,
        message: null,
        error: 'Failed to generate personalized message',
        generatedAt: new Date()
      })
    }
  }

  return {
    totalProcessed: parents.length,
    successfullyGenerated: personalizedMessages.filter(m => m.message).length,
    failed: personalizedMessages.filter(m => !m.message).length,
    messages: personalizedMessages
  }
}

async function assessParentRisks(parentIds: string[]) {
  const parents = await prisma.parent.findMany({
    where: { id: { in: parentIds } },
    include: {
      payments: { orderBy: { dueDate: 'desc' } },
      contracts: true,
      paymentPlans: { where: { status: 'active' } },
      messageLogs: { orderBy: { sentAt: 'desc' }, take: 10 }
    }
  })

  const riskAssessments = []

  for (const parent of parents) {
    const metrics = calculateRiskMetrics(parent)
    const aiAssessment = await generateRiskAssessment(parent, metrics)
    
    riskAssessments.push({
      parentId: parent.id,
      parentName: parent.name,
      riskScore: metrics.riskScore,
      riskLevel: metrics.riskLevel,
      assessment: aiAssessment,
      metrics,
      assessedAt: new Date()
    })
  }

  return {
    totalAssessed: parents.length,
    highRisk: riskAssessments.filter(r => r.riskLevel === 'high').length,
    mediumRisk: riskAssessments.filter(r => r.riskLevel === 'medium').length,
    lowRisk: riskAssessments.filter(r => r.riskLevel === 'low').length,
    assessments: riskAssessments
  }
}

function buildParentContext(parent: any, includeDetails: boolean) {
  const context = {
    name: parent.name,
    email: parent.email,
    totalPayments: parent.payments.length,
    recentPayments: parent.payments.slice(0, 3),
    activeContracts: parent.contracts.filter((c: any) => c.status === 'signed').length,
    activePlans: parent.paymentPlans.length
  }

  if (includeDetails) {
    context.recentPayments = parent.payments.slice(0, 5)
    // Add more detailed context
  }

  return context
}

async function generateAIMessage(context: any, messageType: string, tone: string, parentName: string) {
  const messages = [
    {
      role: "system" as const,
      content: `Generate a personalized ${messageType} message with ${tone} tone for a parent in the "Rise as One Yearly Program". Return only the message content as plain text.`
    },
    {
      role: "user" as const,
      content: `Generate message for ${parentName} with context: ${JSON.stringify(context)}`
    }
  ]

  const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4.1-mini',
      messages: messages,
      max_tokens: 500,
      temperature: 0.7
    })
  })

  if (!response.ok) {
    throw new Error(`AI API error: ${response.statusText}`)
  }

  const aiResponse = await response.json()
  return aiResponse.choices[0].message.content
}

function calculatePersonalizationLevel(context: any): number {
  let score = 0
  if (context.recentPayments?.length > 0) score += 30
  if (context.activeContracts > 0) score += 20
  if (context.activePlans > 0) score += 25
  if (context.totalPayments > 5) score += 25
  return Math.min(score, 100)
}

function calculateRiskMetrics(parent: any) {
  const totalPayments = parent.payments.length
  const overduePayments = parent.payments.filter((p: any) => p.status === 'overdue').length
  const onTimePayments = parent.payments.filter((p: any) => 
    p.status === 'paid' && p.paidAt && new Date(p.paidAt) <= new Date(p.dueDate)
  ).length

  const paymentReliability = totalPayments > 0 ? (onTimePayments / totalPayments) * 100 : 100
  const overdueRate = totalPayments > 0 ? (overduePayments / totalPayments) * 100 : 0

  let riskScore = 0
  if (overdueRate > 30) riskScore += 40
  else if (overdueRate > 15) riskScore += 25
  else if (overdueRate > 5) riskScore += 10

  if (paymentReliability < 70) riskScore += 30
  else if (paymentReliability < 85) riskScore += 15

  const riskLevel = riskScore > 60 ? 'high' : riskScore > 30 ? 'medium' : 'low'

  return {
    riskScore,
    riskLevel,
    paymentReliability,
    overdueRate,
    totalPayments,
    overduePayments
  }
}

async function generateRiskAssessment(parent: any, metrics: any) {
  // Simplified risk assessment generation
  return {
    summary: `Risk level: ${metrics.riskLevel}`,
    factors: [
      `Payment reliability: ${metrics.paymentReliability.toFixed(1)}%`,
      `Overdue rate: ${metrics.overdueRate.toFixed(1)}%`
    ],
    recommendations: metrics.riskLevel === 'high' ? 
      ['Immediate follow-up required', 'Consider payment plan adjustment'] :
      ['Monitor payment patterns', 'Maintain regular communication']
  }
}

async function optimizePaymentSchedules(parentIds: string[], parameters: any) {
  return { message: 'Payment schedule optimization not yet implemented' }
}

async function analyzeCommunicationEffectiveness(parentIds: string[]) {
  return { message: 'Communication analysis not yet implemented' }
}

async function predictRetentionRisk(parentIds: string[]) {
  return { message: 'Retention risk prediction not yet implemented' }
}
