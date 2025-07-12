
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../../lib/auth'
import { prisma } from '../../../../../lib/db'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { selectedActions, feedback } = body

    // Get the recommendation with actions
    const recommendation = await prisma.aIRecommendation.findUnique({
      where: { id: params.id },
      include: {
        actions: {
          orderBy: { order: 'asc' }
        }
      }
    })

    if (!recommendation) {
      return NextResponse.json({ error: 'Recommendation not found' }, { status: 404 })
    }

    if (recommendation.isExecuted) {
      return NextResponse.json({ error: 'Recommendation already executed' }, { status: 400 })
    }

    const actionsToExecute = recommendation.actions.filter(action => 
      !selectedActions || selectedActions.includes(action.id)
    )

    const executionResults = []

    // Execute each action
    for (const action of actionsToExecute) {
      try {
        const result = await executeAction(action, recommendation, session.user.email!)
        
        await prisma.aIRecommendationAction.update({
          where: { id: action.id },
          data: {
            isExecuted: true,
            executedAt: new Date(),
            executionResult: result
          }
        })

        executionResults.push({
          actionId: action.id,
          actionType: action.actionType,
          success: true,
          result
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        
        await prisma.aIRecommendationAction.update({
          where: { id: action.id },
          data: {
            isExecuted: false,
            errorMessage
          }
        })

        executionResults.push({
          actionId: action.id,
          actionType: action.actionType,
          success: false,
          errorMessage
        })
      }
    }

    // Update recommendation as executed
    const updatedRecommendation = await prisma.aIRecommendation.update({
      where: { id: params.id },
      data: {
        isExecuted: true,
        executedAt: new Date(),
        executedBy: session.user.email!,
        executionResult: {
          totalActions: actionsToExecute.length,
          successfulActions: executionResults.filter(r => r.success).length,
          failedActions: executionResults.filter(r => !r.success).length,
          results: executionResults
        },
        feedback: feedback || null
      },
      include: {
        actions: true
      }
    })

    return NextResponse.json({
      success: true,
      recommendation: updatedRecommendation,
      executionResults
    })

  } catch (error) {
    console.error('AI recommendation execution error:', error)
    return NextResponse.json(
      { error: 'Failed to execute AI recommendation' },
      { status: 500 }
    )
  }
}

async function executeAction(action: any, recommendation: any, executedBy: string) {
  switch (action.actionType) {
    case 'send_message':
      return await executeSendMessage(action.parameters, recommendation, executedBy)
    
    case 'create_reminder':
      return await executeCreateReminder(action.parameters, recommendation, executedBy)
    
    case 'update_status':
      return await executeUpdateStatus(action.parameters, recommendation, executedBy)
    
    case 'generate_content':
      return await executeGenerateContent(action.parameters, recommendation, executedBy)
    
    case 'schedule_call':
      return await executeScheduleCall(action.parameters, recommendation, executedBy)
    
    default:
      throw new Error(`Unknown action type: ${action.actionType}`)
  }
}

async function executeSendMessage(parameters: any, recommendation: any, executedBy: string) {
  const { templateId, subject, body, channel, recipientIds } = parameters

  if (!recipientIds || recipientIds.length === 0) {
    throw new Error('No recipients specified')
  }

  // Send message to each recipient
  const results = []
  for (const parentId of recipientIds) {
    try {
      const messageLog = await prisma.messageLog.create({
        data: {
          parentId,
          templateId: templateId || null,
          subject: subject || null,
          body: body || 'AI-generated follow-up message',
          channel: channel || 'email',
          status: 'sent',
          metadata: {
            source: 'ai_recommendation',
            recommendationId: recommendation.id,
            executedBy
          }
        }
      })

      results.push({
        parentId,
        messageLogId: messageLog.id,
        success: true
      })
    } catch (error) {
      results.push({
        parentId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  return {
    action: 'send_message',
    totalRecipients: recipientIds.length,
    successfulSends: results.filter(r => r.success).length,
    failedSends: results.filter(r => !r.success).length,
    details: results
  }
}

async function executeCreateReminder(parameters: any, recommendation: any, executedBy: string) {
  const { paymentId, reminderType, scheduledFor, message, channel } = parameters

  if (!paymentId) {
    throw new Error('Payment ID is required for reminder creation')
  }

  const reminder = await prisma.paymentReminder.create({
    data: {
      paymentId,
      reminderType: reminderType || 'ai_generated',
      scheduledFor: scheduledFor ? new Date(scheduledFor) : new Date(),
      message: message || 'AI-generated payment reminder',
      channel: channel || 'email',
      status: 'scheduled'
    }
  })

  return {
    action: 'create_reminder',
    reminderId: reminder.id,
    paymentId,
    scheduledFor: reminder.scheduledFor
  }
}

async function executeUpdateStatus(parameters: any, recommendation: any, executedBy: string) {
  const { entityType, entityId, newStatus, notes } = parameters

  switch (entityType) {
    case 'parent':
      await prisma.parent.update({
        where: { id: entityId },
        data: { 
          status: newStatus,
          notes: notes ? `${notes} (Updated by AI recommendation)` : undefined
        }
      })
      break
    
    case 'payment':
      await prisma.payment.update({
        where: { id: entityId },
        data: { 
          status: newStatus,
          notes: notes ? `${notes} (Updated by AI recommendation)` : undefined
        }
      })
      break
    
    default:
      throw new Error(`Unknown entity type for status update: ${entityType}`)
  }

  return {
    action: 'update_status',
    entityType,
    entityId,
    newStatus,
    updatedBy: executedBy
  }
}

async function executeGenerateContent(parameters: any, recommendation: any, executedBy: string) {
  const { contentType, targetAudience, tone, context } = parameters

  // This would integrate with the AI writing API to generate content
  const response = await fetch(`${process.env.NEXTAUTH_URL}/api/ai/writing/compose`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt: `Generate ${contentType} content for ${targetAudience} with ${tone} tone. Context: ${context}`,
      context: context || {},
      tone: tone || 'professional'
    })
  })

  if (!response.ok) {
    throw new Error('Content generation failed')
  }

  const reader = response.body?.getReader()
  const decoder = new TextDecoder()
  let generatedContent = ''

  if (reader) {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      const chunk = decoder.decode(value)
      const lines = chunk.split('\n')
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') break
          try {
            const parsed = JSON.parse(data)
            generatedContent += parsed.content
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
  }

  return {
    action: 'generate_content',
    contentType,
    generatedContent: generatedContent.trim(),
    targetAudience,
    tone
  }
}

async function executeScheduleCall(parameters: any, recommendation: any, executedBy: string) {
  const { parentId, scheduledFor, notes, priority } = parameters

  // Create a task/note for the scheduled call
  // In a real implementation, this might integrate with a calendar system
  
  return {
    action: 'schedule_call',
    parentId,
    scheduledFor: scheduledFor ? new Date(scheduledFor) : new Date(),
    notes: notes || 'AI-recommended follow-up call',
    priority: priority || 'medium',
    scheduledBy: executedBy
  }
}
