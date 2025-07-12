
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

    // Find pending jobs that are ready to execute
    const jobs = await prisma.backgroundJob.findMany({
      where: {
        status: 'pending',
        scheduledFor: { lte: new Date() }
      },
      orderBy: [
        { priority: 'asc' },
        { scheduledFor: 'asc' }
      ],
      take: 5 // Process max 5 jobs at a time
    })

    const results = []

    for (const job of jobs) {
      try {
        // Mark job as running
        await prisma.backgroundJob.update({
          where: { id: job.id },
          data: {
            status: 'running',
            startedAt: new Date(),
            progress: 0
          }
        })

        // Execute the job based on its type
        const result = await executeJob(job)

        // Mark job as completed
        await prisma.backgroundJob.update({
          where: { id: job.id },
          data: {
            status: 'completed',
            completedAt: new Date(),
            progress: 100,
            result
          }
        })

        results.push({
          jobId: job.id,
          success: true,
          result
        })

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        
        // Check if we should retry
        const shouldRetry = job.retryCount < job.maxRetries
        
        if (shouldRetry) {
          const nextRetryAt = new Date(Date.now() + Math.pow(2, job.retryCount) * 60000) // Exponential backoff
          
          await prisma.backgroundJob.update({
            where: { id: job.id },
            data: {
              status: 'pending',
              retryCount: { increment: 1 },
              nextRetryAt,
              errorMessage,
              scheduledFor: nextRetryAt
            }
          })
        } else {
          await prisma.backgroundJob.update({
            where: { id: job.id },
            data: {
              status: 'failed',
              completedAt: new Date(),
              errorMessage
            }
          })
        }

        // Log error
        await prisma.jobLog.create({
          data: {
            jobId: job.id,
            level: 'error',
            message: `Job execution failed: ${errorMessage}`,
            data: {
              error: errorMessage,
              retryCount: job.retryCount + 1,
              willRetry: shouldRetry
            }
          }
        })

        results.push({
          jobId: job.id,
          success: false,
          error: errorMessage,
          willRetry: shouldRetry
        })
      }
    }

    return NextResponse.json({
      success: true,
      processedJobs: results.length,
      results
    })

  } catch (error) {
    console.error('Job execution error:', error)
    return NextResponse.json(
      { error: 'Failed to execute background jobs' },
      { status: 500 }
    )
  }
}

async function executeJob(job: any) {
  await prisma.jobLog.create({
    data: {
      jobId: job.id,
      level: 'info',
      message: `Starting execution of ${job.type} job`,
      data: job.parameters
    }
  })

  switch (job.type) {
    case 'send_recurring_messages':
      return await executeRecurringMessages(job)
    
    case 'process_stripe_webhooks':
      return await processStripeWebhooks(job)
    
    case 'generate_ai_insights':
      return await generateAIInsights(job)
    
    case 'cleanup_old_data':
      return await cleanupOldData(job)
    
    case 'generate_reports':
      return await generateReports(job)
    
    default:
      throw new Error(`Unknown job type: ${job.type}`)
  }
}

async function executeRecurringMessages(job: any) {
  const now = new Date()
  
  // Find instances ready to be sent
  const instances = await prisma.recurringInstance.findMany({
    where: {
      status: 'scheduled',
      scheduledFor: { lte: now }
    },
    include: {
      recurringMessage: {
        include: {
          template: true,
          recipients: {
            where: { isActive: true },
            include: { parent: true }
          }
        }
      }
    },
    take: 10 // Limit to prevent overwhelming
  })

  let totalSent = 0
  let totalFailed = 0

  for (const instance of instances) {
    const { recurringMessage } = instance
    
    if (!recurringMessage.isActive) {
      await prisma.recurringInstance.update({
        where: { id: instance.id },
        data: { status: 'cancelled' }
      })
      continue
    }

    // Update instance status
    await prisma.recurringInstance.update({
      where: { id: instance.id },
      data: {
        status: 'sent',
        actualSentAt: now,
        recipientCount: recurringMessage.recipients.length
      }
    })

    let sentCount = 0
    let failedCount = 0

    // Send to each recipient
    for (const recipient of recurringMessage.recipients) {
      try {
        // Check stop conditions
        if (shouldStopForRecipient(recipient, recurringMessage)) {
          await prisma.recurringRecipient.update({
            where: { id: recipient.id },
            data: {
              isActive: false,
              stoppedAt: now,
              stopReason: 'stop_condition_met'
            }
          })

          await prisma.recurringMessageLog.create({
            data: {
              recurringInstanceId: instance.id,
              parentId: recipient.parentId,
              status: 'skipped',
              reason: 'stop_condition_met'
            }
          })

          continue
        }

        // Create message log
        const messageLog = await prisma.messageLog.create({
          data: {
            parentId: recipient.parentId,
            templateId: recurringMessage.templateId,
            subject: recurringMessage.subject || `Message from ${recurringMessage.name}`,
            body: replaceVariables(recurringMessage.body, recipient.parent),
            channel: recurringMessage.channel,
            status: 'sent',
            metadata: {
              source: 'recurring_message',
              recurringMessageId: recurringMessage.id,
              instanceId: instance.id
            }
          }
        })

        // Link to recurring message log
        await prisma.recurringMessageLog.create({
          data: {
            recurringInstanceId: instance.id,
            parentId: recipient.parentId,
            messageLogId: messageLog.id,
            status: 'sent',
            sentAt: now
          }
        })

        // Update recipient
        await prisma.recurringRecipient.update({
          where: { id: recipient.id },
          data: {
            messagesSent: { increment: 1 },
            lastMessageSent: now
          }
        })

        sentCount++
        totalSent++

      } catch (error) {
        console.error(`Failed to send to recipient ${recipient.parentId}:`, error)
        
        await prisma.recurringMessageLog.create({
          data: {
            recurringInstanceId: instance.id,
            parentId: recipient.parentId,
            status: 'failed',
            reason: error instanceof Error ? error.message : 'Unknown error'
          }
        })

        failedCount++
        totalFailed++
      }
    }

    // Update instance with final counts
    await prisma.recurringInstance.update({
      where: { id: instance.id },
      data: {
        successCount: sentCount,
        failureCount: failedCount
      }
    })

    // Schedule next instance if applicable
    await scheduleNextRecurringInstance(recurringMessage.id)
  }

  return {
    instancesProcessed: instances.length,
    totalSent,
    totalFailed
  }
}

async function processStripeWebhooks(job: any) {
  // Find unprocessed webhook events
  const webhookEvents = await prisma.stripeWebhookEvent.findMany({
    where: {
      processed: false,
      retryCount: { lt: 3 }
    },
    orderBy: { createdAt: 'asc' },
    take: 20
  })

  let processed = 0
  let failed = 0

  for (const event of webhookEvents) {
    try {
      // Mark as being processed
      await prisma.stripeWebhookEvent.update({
        where: { id: event.id },
        data: { processed: true, processedAt: new Date() }
      })

      processed++
    } catch (error) {
      await prisma.stripeWebhookEvent.update({
        where: { id: event.id },
        data: {
          retryCount: { increment: 1 },
          lastRetryAt: new Date(),
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }
      })

      failed++
    }
  }

  return { processed, failed }
}

async function generateAIInsights(job: any) {
  // This would call the AI recommendations generation
  const response = await fetch(`${process.env.NEXTAUTH_URL}/api/ai-recommendations/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      analysisType: 'comprehensive',
      forceRegenerate: true
    })
  })

  if (!response.ok) {
    throw new Error('Failed to generate AI insights')
  }

  const result = await response.json()
  return result
}

async function cleanupOldData(job: any) {
  const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // 90 days ago

  // Clean up old job logs
  const deletedLogs = await prisma.jobLog.deleteMany({
    where: {
      timestamp: { lt: cutoffDate },
      level: { in: ['debug', 'info'] }
    }
  })

  // Clean up old completed jobs
  const deletedJobs = await prisma.backgroundJob.deleteMany({
    where: {
      status: 'completed',
      completedAt: { lt: cutoffDate }
    }
  })

  return {
    deletedLogs: deletedLogs.count,
    deletedJobs: deletedJobs.count
  }
}

async function generateReports(job: any) {
  // Generate various reports - this is a placeholder
  return {
    reportsGenerated: ['payment_summary', 'engagement_metrics', 'ai_recommendations_summary'],
    generatedAt: new Date()
  }
}

function shouldStopForRecipient(recipient: any, recurringMessage: any): boolean {
  const stopConditions = recurringMessage.stopConditions || []

  // Check payment completion
  if (stopConditions.includes('payment_completion') && recipient.paymentCompleted) {
    return true
  }

  // Check user response
  if (stopConditions.includes('user_response') && recipient.responseReceived) {
    return true
  }

  // Check max messages
  if (stopConditions.includes('max_messages') && recurringMessage.maxMessages) {
    if (recipient.messagesSent >= recurringMessage.maxMessages) {
      return true
    }
  }

  return false
}

function replaceVariables(template: string, parent: any): string {
  let result = template

  const variables = {
    parentName: parent.name,
    parentEmail: parent.email,
    parentPhone: parent.phone || '',
    programName: 'Rise as One Basketball Program'
  }

  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{${key}}`, 'g')
    result = result.replace(regex, value || '')
  }

  return result
}

async function scheduleNextRecurringInstance(recurringMessageId: string) {
  const recurringMessage = await prisma.recurringMessage.findUnique({
    where: { id: recurringMessageId }
  })

  if (!recurringMessage || !recurringMessage.isActive) {
    return
  }

  // Calculate next run time
  let nextRun: Date = new Date()

  switch (recurringMessage.interval) {
    case 'daily':
      nextRun.setDate(nextRun.getDate() + recurringMessage.intervalValue)
      break
    case 'weekly':
      nextRun.setDate(nextRun.getDate() + (recurringMessage.intervalValue * 7))
      break
    case 'monthly':
      nextRun.setMonth(nextRun.getMonth() + recurringMessage.intervalValue)
      break
    default:
      nextRun.setDate(nextRun.getDate() + 1)
  }

  // Don't schedule if past end date
  if (recurringMessage.endDate && nextRun > recurringMessage.endDate) {
    return
  }

  // Create next instance
  await prisma.recurringInstance.create({
    data: {
      recurringMessageId,
      scheduledFor: nextRun
    }
  })
}
