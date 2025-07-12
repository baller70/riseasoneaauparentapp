
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

    const body = await request.json()
    const { 
      analysisType = 'comprehensive',
      targetEntityType,
      targetEntityId,
      forceRegenerate = false
    } = body

    const recommendations = []

    // Generate payment-related recommendations
    if (!targetEntityType || targetEntityType === 'payment') {
      const paymentRecommendations = await generatePaymentRecommendations(targetEntityId)
      recommendations.push(...paymentRecommendations)
    }

    // Generate parent engagement recommendations
    if (!targetEntityType || targetEntityType === 'parent') {
      const engagementRecommendations = await generateEngagementRecommendations(targetEntityId)
      recommendations.push(...engagementRecommendations)
    }

    // Generate contract-related recommendations
    if (!targetEntityType || targetEntityType === 'contract') {
      const contractRecommendations = await generateContractRecommendations(targetEntityId)
      recommendations.push(...contractRecommendations)
    }

    // Generate communication recommendations
    const communicationRecommendations = await generateCommunicationRecommendations()
    recommendations.push(...communicationRecommendations)

    // Save recommendations to database
    const savedRecommendations = []
    for (const rec of recommendations) {
      const saved = await prisma.aIRecommendation.create({
        data: {
          type: rec.type,
          category: rec.category,
          title: rec.title,
          description: rec.description,
          priority: rec.priority,
          confidence: rec.confidence,
          expectedImpact: rec.expectedImpact,
          targetEntityType: rec.targetEntityType,
          targetEntityId: rec.targetEntityId,
          context: rec.context,
          actionable: rec.actionable,
          autoExecutable: rec.autoExecutable,
          expiresAt: (rec as any).expiresAt || null
        }
      })

      // Save actions
      if (rec.actions?.length > 0) {
        await prisma.aIRecommendationAction.createMany({
          data: rec.actions.map((action: any, index: number) => ({
            recommendationId: saved.id,
            actionType: action.actionType,
            title: action.title,
            description: action.description,
            parameters: action.parameters,
            order: index + 1,
            isRequired: action.isRequired !== false
          }))
        })
      }

      savedRecommendations.push(saved)
    }

    return NextResponse.json({
      success: true,
      recommendations: savedRecommendations,
      totalGenerated: savedRecommendations.length
    })

  } catch (error) {
    console.error('AI recommendation generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate AI recommendations' },
      { status: 500 }
    )
  }
}

async function generatePaymentRecommendations(targetPaymentId?: string) {
  const recommendations = []

  // Find overdue payments
  const overduePayments = await prisma.payment.findMany({
    where: {
      status: 'overdue',
      dueDate: { lt: new Date() },
      ...(targetPaymentId ? { id: targetPaymentId } : {})
    },
    include: {
      parent: true,
      paymentPlan: true
    },
    take: 10
  })

  for (const payment of overduePayments) {
    const daysPastDue = Math.floor(
      (new Date().getTime() - payment.dueDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'
    let expectedImpact: 'low' | 'medium' | 'high' = 'medium'

    if (daysPastDue > 30) {
      priority = 'urgent'
      expectedImpact = 'high'
    } else if (daysPastDue > 14) {
      priority = 'high'
      expectedImpact = 'high'
    } else if (daysPastDue > 7) {
      priority = 'medium'
      expectedImpact = 'medium'
    }

    recommendations.push({
      type: 'payment_follow_up',
      category: 'payment',
      title: `Follow up on overdue payment from ${payment.parent.name}`,
      description: `Payment of $${payment.amount} is ${daysPastDue} days overdue. Consider sending a personalized follow-up message or offering payment plan options.`,
      priority,
      confidence: daysPastDue > 14 ? 90 : 75,
      expectedImpact,
      targetEntityType: 'payment',
      targetEntityId: payment.id,
      context: {
        parentId: payment.parentId,
        parentName: payment.parent.name,
        amount: payment.amount.toString(),
        daysPastDue,
        remindersSent: payment.remindersSent
      },
      actionable: true,
      autoExecutable: daysPastDue > 30,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      actions: [
        {
          actionType: 'send_message',
          title: 'Send personalized follow-up',
          description: `Send a ${priority === 'urgent' ? 'urgent' : 'friendly'} follow-up message about the overdue payment`,
          parameters: {
            recipientIds: [payment.parentId],
            subject: `Payment Reminder - ${daysPastDue} days past due`,
            body: `Hi ${payment.parent.name}, your payment of $${payment.amount} was due ${daysPastDue} days ago. Please contact us to discuss payment options.`,
            channel: 'email'
          },
          isRequired: true
        },
        {
          actionType: 'create_reminder',
          title: 'Schedule follow-up reminder',
          description: 'Create a reminder to follow up if no response received',
          parameters: {
            paymentId: payment.id,
            reminderType: 'follow_up',
            scheduledFor: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
            message: 'Follow up on overdue payment reminder',
            channel: 'email'
          },
          isRequired: false
        }
      ]
    })
  }

  return recommendations
}

async function generateEngagementRecommendations(targetParentId?: string) {
  const recommendations = []

  // Find parents with low engagement
  const parents = await prisma.parent.findMany({
    where: {
      status: 'active',
      ...(targetParentId ? { id: targetParentId } : {})
    },
    include: {
      messageLogs: {
        orderBy: { sentAt: 'desc' },
        take: 5
      },
      payments: {
        orderBy: { dueDate: 'desc' },
        take: 3
      },
      contracts: {
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    },
    take: 10
  })

  for (const parent of parents) {
    const lastMessage = parent.messageLogs[0]
    const daysSinceLastMessage = lastMessage 
      ? Math.floor((new Date().getTime() - lastMessage.sentAt.getTime()) / (1000 * 60 * 60 * 24))
      : 999

    const recentPayments = parent.payments.filter(p => 
      p.status === 'paid' && p.paidAt && 
      (new Date().getTime() - p.paidAt.getTime()) < (30 * 24 * 60 * 60 * 1000)
    )

    // Recommend engagement if no recent communication
    if (daysSinceLastMessage > 30) {
      recommendations.push({
        type: 'engagement_boost',
        category: 'relationship',
        title: `Re-engage with ${parent.name}`,
        description: `No communication with ${parent.name} for ${daysSinceLastMessage} days. Consider sending a check-in message or program update.`,
        priority: daysSinceLastMessage > 60 ? 'high' : 'medium',
        confidence: 80,
        expectedImpact: 'medium',
        targetEntityType: 'parent',
        targetEntityId: parent.id,
        context: {
          parentId: parent.id,
          parentName: parent.name,
          daysSinceLastMessage,
          recentPaymentCount: recentPayments.length
        },
        actionable: true,
        autoExecutable: false,
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        actions: [
          {
            actionType: 'send_message',
            title: 'Send check-in message',
            description: 'Send a friendly check-in message to re-engage',
            parameters: {
              recipientIds: [parent.id],
              subject: 'How are things going?',
              body: `Hi ${parent.name}, we wanted to check in and see how things are going with the program. Let us know if you have any questions!`,
              channel: 'email'
            },
            isRequired: true
          }
        ]
      })
    }
  }

  return recommendations
}

async function generateContractRecommendations(targetContractId?: string) {
  const recommendations = []

  // Find contracts expiring soon
  const expiringContracts = await prisma.contract.findMany({
    where: {
      status: 'signed',
      expiresAt: {
        gte: new Date(),
        lte: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 days
      },
      ...(targetContractId ? { id: targetContractId } : {})
    },
    include: {
      parent: true
    },
    take: 10
  })

  for (const contract of expiringContracts) {
    const daysUntilExpiry = Math.floor(
      (contract.expiresAt!.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    )

    recommendations.push({
      type: 'contract_renewal',
      category: 'contract',
      title: `Contract renewal needed for ${contract.parent.name}`,
      description: `Contract expires in ${daysUntilExpiry} days. Consider sending renewal information and scheduling a discussion.`,
      priority: daysUntilExpiry < 30 ? 'high' : 'medium',
      confidence: 85,
      expectedImpact: 'high',
      targetEntityType: 'contract',
      targetEntityId: contract.id,
      context: {
        parentId: contract.parentId,
        parentName: contract.parent.name,
        contractId: contract.id,
        daysUntilExpiry,
        currentStatus: contract.status
      },
      actionable: true,
      autoExecutable: false,
      expiresAt: contract.expiresAt,
      actions: [
        {
          actionType: 'send_message',
          title: 'Send renewal notification',
          description: 'Send information about contract renewal process',
          parameters: {
            recipientIds: [contract.parentId],
            subject: 'Contract Renewal - Action Required',
            body: `Hi ${contract.parent.name}, your contract expires in ${daysUntilExpiry} days. We'd like to discuss renewal options with you.`,
            channel: 'email'
          },
          isRequired: true
        },
        {
          actionType: 'schedule_call',
          title: 'Schedule renewal discussion',
          description: 'Schedule a call to discuss renewal terms',
          parameters: {
            parentId: contract.parentId,
            scheduledFor: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            notes: 'Contract renewal discussion',
            priority: 'high'
          },
          isRequired: false
        }
      ]
    })
  }

  return recommendations
}

async function generateCommunicationRecommendations() {
  const recommendations = []

  // Analyze template performance
  const templates = await prisma.template.findMany({
    where: { isActive: true },
    include: {
      messageLogs: {
        where: {
          sentAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      },
      versions: {
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    }
  })

  for (const template of templates) {
    const messageCount = template.messageLogs.length
    const hasAIVersion = template.versions.some(v => v.isAiGenerated)

    // Recommend AI enhancement for frequently used templates without AI versions
    if (messageCount > 5 && !hasAIVersion) {
      recommendations.push({
        type: 'template_optimization',
        category: 'communication',
        title: `Optimize "${template.name}" template with AI`,
        description: `This template has been used ${messageCount} times in the last 30 days but hasn't been AI-optimized. Consider enhancing it for better engagement.`,
        priority: 'medium',
        confidence: 75,
        expectedImpact: 'medium',
        targetEntityType: 'template',
        targetEntityId: template.id,
        context: {
          templateId: template.id,
          templateName: template.name,
          usageCount: messageCount,
          category: template.category
        },
        actionable: true,
        autoExecutable: false,
        actions: [
          {
            actionType: 'generate_content',
            title: 'AI-enhance template',
            description: 'Use AI to improve template effectiveness and engagement',
            parameters: {
              contentType: 'template_enhancement',
              targetAudience: 'parents',
              tone: 'professional',
              context: `Enhance ${template.category} template for better engagement`
            },
            isRequired: true
          }
        ]
      })
    }
  }

  return recommendations
}
