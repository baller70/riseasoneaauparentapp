
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

    const { action, parentIds, trigger, customRules } = await request.json()

    let automationResults
    switch (action) {
      case 'auto_reminders':
        automationResults = await createAutomaticReminders(parentIds, customRules)
        break
      case 'risk_alerts':
        automationResults = await generateRiskAlerts(parentIds)
        break
      case 'payment_follow_ups':
        automationResults = await createPaymentFollowUps(parentIds)
        break
      case 'contract_renewals':
        automationResults = await handleContractRenewals(parentIds)
        break
      case 'bulk_personalization':
        automationResults = await bulkPersonalizeMessages(parentIds, customRules)
        break
      default:
        automationResults = await suggestWorkflowAutomation()
    }

    return NextResponse.json({
      success: true,
      action,
      results: automationResults,
      processedAt: new Date()
    })

  } catch (error) {
    console.error('Workflow automation error:', error)
    return NextResponse.json(
      { error: 'Failed to execute workflow automation', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function createAutomaticReminders(parentIds: string[], customRules: any) {
  const overduePayments = await prisma.payment.findMany({
    where: {
      parentId: { in: parentIds },
      status: 'overdue'
    },
    include: {
      parent: true,
      reminders: true
    }
  })

  const reminderSuggestions = []
  
  for (const payment of overduePayments) {
    const daysPastDue = Math.ceil((new Date().getTime() - new Date(payment.dueDate).getTime()) / (1000 * 60 * 60 * 24))
    
    let urgencyLevel = 1
    if (daysPastDue > 30) urgencyLevel = 5
    else if (daysPastDue > 14) urgencyLevel = 4
    else if (daysPastDue > 7) urgencyLevel = 3
    else if (daysPastDue > 3) urgencyLevel = 2
    
    // Generate AI reminder content
    const aiMessage = await generateReminderMessage(payment, urgencyLevel)
    
    reminderSuggestions.push({
      parentId: payment.parentId,
      paymentId: payment.id,
      urgencyLevel,
      daysPastDue,
      suggestedMessage: aiMessage,
      recommendedChannel: urgencyLevel > 3 ? 'both' : 'email',
      shouldSchedule: true
    })
  }

  return {
    totalProcessed: parentIds.length,
    remindersGenerated: reminderSuggestions.length,
    suggestions: reminderSuggestions
  }
}

async function generateReminderMessage(payment: any, urgencyLevel: number) {
  const messages = [
    {
      role: "system" as const,
      content: `Generate payment reminder message in JSON format with:
- subject (email subject line)
- body (message content)
- tone (based on urgency level)
- callToAction (specific action requested)`
    },
    {
      role: "user" as const,
      content: `Generate payment reminder:

Parent: ${payment.parent.name}
Amount: $${payment.amount}
Due Date: ${payment.dueDate.toDateString()}
Days Overdue: ${Math.ceil((new Date().getTime() - new Date(payment.dueDate).getTime()) / (1000 * 60 * 60 * 24))}
Previous Reminders: ${payment.remindersSent}
Urgency Level: ${urgencyLevel}/5

Create appropriate reminder message for this urgency level.`
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
        max_tokens: 800,
        temperature: 0.6
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
    console.error('Reminder generation error:', error)
    return {
      subject: `Payment Reminder - $${payment.amount}`,
      body: 'Please complete your payment at your earliest convenience.',
      tone: 'professional',
      callToAction: 'Complete payment now'
    }
  }
}

async function generateRiskAlerts(parentIds: string[]) {
  const parents = await prisma.parent.findMany({
    where: { id: { in: parentIds } },
    include: {
      payments: { orderBy: { dueDate: 'desc' }, take: 10 },
      contracts: true,
      paymentPlans: { where: { status: 'active' } }
    }
  })

  const riskAlerts = []
  
  for (const parent of parents) {
    const overdueCount = parent.payments.filter(p => p.status === 'overdue').length
    const totalPayments = parent.payments.length
    const onTimeRate = totalPayments > 0 ? 
      parent.payments.filter(p => p.status === 'paid' && 
        p.paidAt && new Date(p.paidAt) <= new Date(p.dueDate)
      ).length / totalPayments : 0

    if (overdueCount > 2 || onTimeRate < 0.7) {
      riskAlerts.push({
        parentId: parent.id,
        parentName: parent.name,
        riskLevel: overdueCount > 3 ? 'high' : 'medium',
        factors: [
          `${overdueCount} overdue payments`,
          `${(onTimeRate * 100).toFixed(1)}% on-time payment rate`
        ],
        recommendations: [
          'Contact parent to discuss payment plan',
          'Review contract terms',
          'Consider payment assistance options'
        ]
      })
    }
  }

  return {
    totalAssessed: parents.length,
    riskAlertsGenerated: riskAlerts.length,
    alerts: riskAlerts
  }
}

async function createPaymentFollowUps(parentIds: string[]) {
  // Implementation for payment follow-ups
  return {
    followUpsCreated: 0,
    recommendations: ['Schedule follow-up communications']
  }
}

async function handleContractRenewals(parentIds: string[]) {
  // Implementation for contract renewals
  return {
    renewalsProcessed: 0,
    recommendations: ['Review contract expiration dates']
  }
}

async function bulkPersonalizeMessages(parentIds: string[], customRules: any) {
  // Implementation for bulk message personalization
  return {
    messagesPersonalized: 0,
    recommendations: ['Apply personalization rules']
  }
}

async function suggestWorkflowAutomation() {
  return {
    suggestions: [
      'Auto-generate payment reminders',
      'Create risk assessment alerts',
      'Schedule contract renewal notifications'
    ]
  }
}
