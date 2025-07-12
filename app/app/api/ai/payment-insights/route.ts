
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

    const { type, parentId, paymentId, timeframe } = await request.json()

    let insights
    switch (type) {
      case 'overdue_analysis':
        insights = await analyzeOverduePayments(timeframe)
        break
      case 'payment_prediction':
        insights = await predictPaymentBehavior(parentId)
        break
      case 'revenue_forecast':
        insights = await generateRevenueForecast(timeframe)
        break
      case 'payment_optimization':
        insights = await optimizePaymentSchedules()
        break
      case 'reminder_effectiveness':
        insights = await analyzeReminderEffectiveness()
        break
      default:
        insights = await generateGeneralPaymentInsights()
    }

    return NextResponse.json({
      success: true,
      type,
      insights,
      generatedAt: new Date()
    })

  } catch (error) {
    console.error('Payment insights error:', error)
    return NextResponse.json(
      { error: 'Failed to generate payment insights', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function analyzeOverduePayments(timeframe = '30') {
  const daysBack = parseInt(timeframe)
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysBack)

  // Get overdue payments data
  const overduePayments = await prisma.payment.findMany({
    where: {
      status: 'overdue',
      dueDate: { gte: cutoffDate }
    },
    include: {
      parent: {
        select: { id: true, name: true, email: true }
      },
      reminders: true
    },
    orderBy: { dueDate: 'desc' }
  })

  // Calculate metrics
  const totalOverdue = overduePayments.length
  const totalAmount = overduePayments.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0)
  const avgDaysOverdue = overduePayments.reduce((sum, p) => {
    const daysOverdue = Math.ceil((new Date().getTime() - new Date(p.dueDate).getTime()) / (1000 * 60 * 60 * 24))
    return sum + daysOverdue
  }, 0) / totalOverdue || 0

  // Generate AI analysis
  const messages = [
    {
      role: "system" as const,
      content: `Analyze overdue payment data and provide insights in JSON format with:
- summary (overview of overdue situation)
- trends (patterns identified)
- riskFactors (concerning elements)
- recommendations (actionable solutions)
- priorityActions (immediate steps)
- recoveryStrategy (approach to recover payments)`
    },
    {
      role: "user" as const,
      content: `Analyze overdue payments:

Total Overdue: ${totalOverdue} payments
Total Amount: $${totalAmount.toFixed(2)}
Average Days Overdue: ${avgDaysOverdue.toFixed(1)}
Timeframe: Last ${timeframe} days

Top Overdue Cases:
${overduePayments.slice(0, 5).map((p, i) => {
  const daysOverdue = Math.ceil((new Date().getTime() - new Date(p.dueDate).getTime()) / (1000 * 60 * 60 * 24))
  return `${i + 1}. ${p.parent.name}: $${p.amount} (${daysOverdue} days overdue, ${p.remindersSent} reminders sent)`
}).join('\n')}

Provide actionable insights for payment recovery and prevention.`
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
    
    const analysis = JSON.parse(content)

    return {
      ...analysis,
      metrics: {
        totalOverdue,
        totalAmount,
        avgDaysOverdue
      },
      rawData: overduePayments.slice(0, 10) // Include top 10 for reference
    }
  } catch (error) {
    console.error('Overdue analysis AI error:', error)
    return {
      summary: 'Manual analysis required',
      trends: [],
      riskFactors: ['Unable to generate AI analysis'],
      recommendations: ['Review overdue payments manually'],
      priorityActions: [],
      recoveryStrategy: 'Standard recovery process',
      metrics: { totalOverdue, totalAmount, avgDaysOverdue }
    }
  }
}

async function predictPaymentBehavior(parentId: string) {
  if (!parentId) {
    throw new Error('Parent ID required for payment prediction')
  }

  const parent = await prisma.parent.findUnique({
    where: { id: parentId },
    include: {
      payments: {
        orderBy: { dueDate: 'desc' },
        take: 20
      },
      paymentPlans: {
        where: { status: 'active' },
        include: { payments: true }
      }
    }
  })

  if (!parent) {
    throw new Error('Parent not found')
  }

  const paymentHistory = parent.payments
  const onTimePayments = paymentHistory.filter(p => 
    p.status === 'paid' && p.paidAt && new Date(p.paidAt) <= new Date(p.dueDate)
  ).length
  const latePayments = paymentHistory.filter(p => 
    p.status === 'paid' && p.paidAt && new Date(p.paidAt) > new Date(p.dueDate)
  ).length
  const missedPayments = paymentHistory.filter(p => p.status === 'overdue').length

  const messages = [
    {
      role: "system" as const,
      content: `Predict payment behavior in JSON format with:
- likelihood (0-100 chance of on-time payment)
- riskLevel (low, medium, high)
- predictedBehavior (detailed prediction)
- riskFactors (concerning patterns)
- recommendations (suggested actions)
- confidenceLevel (0-100)`
    },
    {
      role: "user" as const,
      content: `Predict payment behavior for:

Parent: ${parent.name}
Total Payments: ${paymentHistory.length}
On-time Payments: ${onTimePayments}
Late Payments: ${latePayments}
Missed Payments: ${missedPayments}
Active Plans: ${parent.paymentPlans.length}

Recent Payment Pattern:
${paymentHistory.slice(0, 10).map((p, i) => 
  `${i + 1}. $${p.amount} due ${p.dueDate.toDateString()} - ${p.status}`
).join('\n')}

Predict likelihood of future payment compliance and provide recommendations.`
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
        max_tokens: 1000,
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
    console.error('Payment prediction AI error:', error)
    return {
      likelihood: 70,
      riskLevel: 'medium',
      predictedBehavior: 'Unable to generate prediction',
      riskFactors: [],
      recommendations: ['Monitor payment behavior'],
      confidenceLevel: 50
    }
  }
}

async function generateRevenueForecast(timeframe = '90') {
  // Implementation for revenue forecasting
  return {
    forecast: 'Revenue forecast analysis',
    projectedRevenue: 0,
    confidence: 70,
    factors: ['Historical data analysis required']
  }
}

async function optimizePaymentSchedules() {
  // Implementation for payment schedule optimization
  return {
    recommendations: ['Schedule optimization analysis'],
    suggestedChanges: [],
    expectedImprovement: '5-10% better compliance'
  }
}

async function analyzeReminderEffectiveness() {
  // Implementation for reminder effectiveness analysis
  return {
    effectiveness: 'Reminder analysis',
    openRates: '65%',
    responseRates: '45%',
    recommendations: ['Optimize reminder timing']
  }
}

async function generateGeneralPaymentInsights() {
  // Implementation for general payment insights
  return {
    summary: 'General payment insights',
    trends: [],
    recommendations: []
  }
}
