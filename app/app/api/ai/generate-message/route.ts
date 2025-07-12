
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import { prisma } from '../../../../lib/db'
import { AIMessageRequest } from '../../../../lib/types'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: AIMessageRequest = await request.json()
    const { context, customInstructions, includePersonalization, templateId } = body

    // Fetch parent data if provided
    let parentData = null
    if (context.parentId) {
      parentData = await prisma.parent.findUnique({
        where: { id: context.parentId },
        include: {
          payments: { 
            orderBy: { dueDate: 'desc' },
            take: 5,
            include: { reminders: true }
          },
          contracts: {
            orderBy: { createdAt: 'desc' },
            take: 3
          },
          paymentPlans: {
            where: { status: 'active' },
            include: { payments: true }
          },
          messageLogs: {
            orderBy: { sentAt: 'desc' },
            take: 5
          }
        }
      })
    }

    // Fetch payment data if provided
    let paymentData = null
    if (context.paymentId) {
      paymentData = await prisma.payment.findUnique({
        where: { id: context.paymentId },
        include: {
          parent: true,
          paymentPlan: true,
          reminders: true
        }
      })
    }

    // Fetch contract data if provided
    let contractData = null
    if (context.contractId) {
      contractData = await prisma.contract.findUnique({
        where: { id: context.contractId },
        include: { parent: true }
      })
    }

    // Build context for AI
    const aiContext = buildAIContext(parentData, paymentData, contractData, context)
    
    // Generate personalized message using AI
    const messages = [
      {
        role: "system" as const,
        content: `You are an intelligent assistant for the "Rise as One Yearly Program" parent communication system. Generate personalized, professional messages for parents based on the provided context.

Guidelines:
- Use a ${context.tone} tone
- Message type: ${context.messageType}
- Urgency level: ${context.urgencyLevel}/5
- ${includePersonalization ? 'Include personal details when relevant' : 'Keep message general'}
- Always be respectful and supportive
- Focus on the child's development and program benefits
- Include clear next steps or call-to-action when appropriate

Context: ${aiContext}`
      },
      {
        role: "user" as const,
        content: `Generate a ${context.messageType} message with the following requirements:
- Tone: ${context.tone}
- Urgency: ${context.urgencyLevel}/5
${customInstructions ? `- Additional instructions: ${customInstructions}` : ''}

Please provide both subject line and message body in JSON format:
{
  "subject": "Subject line here",
  "body": "Message body here with proper formatting",
  "reasoning": "Brief explanation of personalization choices",
  "suggestions": ["Alternative subject 1", "Alternative subject 2"]
}`
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
        response_format: { type: "json_object" },
        max_tokens: 2000,
        temperature: 0.7
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
    
    const generatedContent = JSON.parse(content)

    return NextResponse.json({
      success: true,
      message: generatedContent,
      context: {
        parentName: parentData?.name,
        messageType: context.messageType,
        tone: context.tone,
        personalized: includePersonalization
      }
    })

  } catch (error) {
    console.error('AI message generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate message', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

function buildAIContext(parentData: any, paymentData: any, contractData: any, context: any): string {
  let contextParts = []

  if (parentData) {
    contextParts.push(`Parent: ${parentData.name} (${parentData.email})`)
    
    if (parentData.payments?.length > 0) {
      const latestPayment = parentData.payments[0]
      contextParts.push(`Latest payment: $${latestPayment.amount} due ${latestPayment.dueDate.toDateString()} (Status: ${latestPayment.status})`)
      
      const overduePayments = parentData.payments.filter((p: any) => p.status === 'overdue')
      if (overduePayments.length > 0) {
        contextParts.push(`Overdue payments: ${overduePayments.length}`)
      }
    }

    if (parentData.contracts?.length > 0) {
      const latestContract = parentData.contracts[0]
      contextParts.push(`Contract status: ${latestContract.status}`)
      if (latestContract.expiresAt) {
        contextParts.push(`Contract expires: ${latestContract.expiresAt.toDateString()}`)
      }
    }

    if (parentData.paymentPlans?.length > 0) {
      const activePlan = parentData.paymentPlans[0]
      contextParts.push(`Payment plan: ${activePlan.type} ($${activePlan.installmentAmount} x ${activePlan.installments})`)
    }

    const recentMessages = parentData.messageLogs?.length || 0
    contextParts.push(`Recent communications: ${recentMessages} messages`)
  }

  if (paymentData) {
    contextParts.push(`Payment amount: $${paymentData.amount}`)
    contextParts.push(`Due date: ${paymentData.dueDate.toDateString()}`)
    contextParts.push(`Payment status: ${paymentData.status}`)
    if (paymentData.remindersSent > 0) {
      contextParts.push(`Reminders sent: ${paymentData.remindersSent}`)
    }
  }

  if (contractData) {
    contextParts.push(`Contract: ${contractData.originalName}`)
    contextParts.push(`Contract status: ${contractData.status}`)
    if (contractData.expiresAt) {
      const daysUntilExpiry = Math.ceil((new Date(contractData.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      contextParts.push(`Days until expiry: ${daysUntilExpiry}`)
    }
  }

  return contextParts.join('\n')
}
