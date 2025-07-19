
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
    const { operation, parentIds, parameters } = body

    if (!operation || !parentIds || !Array.isArray(parentIds)) {
      return NextResponse.json(
        { error: 'Missing required fields: operation, parentIds' },
        { status: 400 }
      )
    }

    switch (operation) {
      case 'assess_parent_risks':
        return await assessParentRisks(parentIds)
      
      case 'generate_personalized_messages':
        return await generatePersonalizedMessages(parentIds, parameters)
      
      default:
        return NextResponse.json(
          { error: 'Unknown operation' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('AI bulk operations error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function assessParentRisks(parentIds: string[]) {
  try {
    // Fetch parent data with related information
    const parents = await prisma.parent.findMany({
      where: {
        id: { in: parentIds }
      },
      include: {
        payments: {
          orderBy: { dueDate: 'desc' },
          take: 10
        },
        paymentPlans: true,
        messageLogs: {
          orderBy: { sentAt: 'desc' },
          take: 5
        },
        contracts: true
      }
    })

    const assessments = parents.map(parent => {
      // Calculate risk factors
      const overduePayments = parent.payments.filter(p => p.status === 'overdue').length
      const totalPayments = parent.payments.length
      const paymentReliability = totalPayments > 0 ? 
        ((totalPayments - overduePayments) / totalPayments) * 100 : 100

      // Communication responsiveness (simplified)
      const recentMessages = parent.messageLogs.slice(0, 5)
      const responsiveMessages = recentMessages.filter(m => m.status === 'delivered').length
      const communicationScore = recentMessages.length > 0 ? 
        (responsiveMessages / recentMessages.length) * 100 : 100

      // Contract compliance
      const hasValidContract = parent.contracts.some(c => c.status === 'signed')
      const contractScore = hasValidContract ? 100 : 30

      // Calculate overall risk score (lower is better)
      const riskScore = Math.round(
        (paymentReliability * 0.5) + 
        (communicationScore * 0.3) + 
        (contractScore * 0.2)
      )

      // Determine risk level
      let riskLevel: string
      if (riskScore >= 80) riskLevel = 'low'
      else if (riskScore >= 60) riskLevel = 'medium'
      else riskLevel = 'high'

      return {
        parentId: parent.id,
        parentName: parent.name,
        riskScore,
        riskLevel,
        paymentReliability: Math.round(paymentReliability),
        communicationResponsiveness: Math.round(communicationScore),
        contractCompliance: Math.round(contractScore),
        factors: {
          overduePayments,
          totalPayments,
          hasValidContract,
          recentMessageCount: recentMessages.length
        },
        recommendations: generateRiskRecommendations(riskLevel, {
          overduePayments,
          hasValidContract,
          communicationScore
        })
      }
    })

    return NextResponse.json({
      success: true,
      results: {
        assessments,
        summary: {
          totalAssessed: assessments.length,
          highRisk: assessments.filter(a => a.riskLevel === 'high').length,
          mediumRisk: assessments.filter(a => a.riskLevel === 'medium').length,
          lowRisk: assessments.filter(a => a.riskLevel === 'low').length
        }
      }
    })
  } catch (error) {
    console.error('Risk assessment error:', error)
    return NextResponse.json(
      { error: 'Failed to assess parent risks' },
      { status: 500 }
    )
  }
}

async function generatePersonalizedMessages(parentIds: string[], parameters: any) {
  try {
    const parents = await prisma.parent.findMany({
      where: {
        id: { in: parentIds }
      },
      include: {
        payments: {
          where: { status: { in: ['pending', 'overdue'] } },
          orderBy: { dueDate: 'asc' },
          take: 1
        }
      }
    })

    const messages = parents.map(parent => {
      const upcomingPayment = parent.payments[0]
      const messageType = parameters?.messageType || 'general'
      const tone = parameters?.tone || 'friendly'

      let subject = ''
      let body = ''

      switch (messageType) {
        case 'payment_reminder':
          subject = `Payment Reminder for ${parent.name}`
          body = `Hi ${parent.name},\n\nThis is a friendly reminder about your upcoming payment${upcomingPayment ? ` of $${upcomingPayment.amount} due on ${upcomingPayment.dueDate.toLocaleDateString()}` : ''}.\n\nPlease let us know if you have any questions!\n\nBest regards,\nRise as One Team`
          break
        
        case 'welcome':
          subject = `Welcome to Rise as One, ${parent.name}!`
          body = `Dear ${parent.name},\n\nWelcome to the Rise as One Basketball Program! We're thrilled to have you and your family join our basketball community.\n\nWe'll be in touch with more details about practice schedules and program information.\n\nWelcome to the team!\n\nRise as One Coaching Staff`
          break
        
        default:
          subject = `Update from Rise as One Basketball Program`
          body = `Hi ${parent.name},\n\nWe hope this message finds you well! We wanted to reach out with some updates about the Rise as One Basketball Program.\n\nThank you for being part of our basketball family.\n\nBest regards,\nRise as One Team`
      }

      return {
        parentId: parent.id,
        parentName: parent.name,
        parentEmail: parent.email,
        subject,
        body,
        messageType,
        tone,
        personalizationLevel: 85,
        context: [
          'Parent name personalization',
          upcomingPayment ? 'Payment information included' : 'General messaging',
          'Program-specific content'
        ]
      }
    })

    return NextResponse.json({
      success: true,
      results: {
        messages,
        successfullyGenerated: messages.length,
        summary: {
          totalGenerated: messages.length,
          messageType: parameters?.messageType || 'general',
          averagePersonalization: 85
        }
      }
    })
  } catch (error) {
    console.error('Message generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate personalized messages' },
      { status: 500 }
    )
  }
}

function generateRiskRecommendations(riskLevel: string, factors: any): string[] {
  const recommendations: string[] = []

  switch (riskLevel) {
    case 'high':
      recommendations.push('Schedule immediate follow-up call')
      if (factors.overduePayments > 0) {
        recommendations.push('Send payment reminder with payment options')
      }
      if (!factors.hasValidContract) {
        recommendations.push('Priority contract renewal required')
      }
      recommendations.push('Consider payment plan adjustment')
      break
    
    case 'medium':
      recommendations.push('Monitor payment patterns closely')
      if (factors.overduePayments > 0) {
        recommendations.push('Send friendly payment reminder')
      }
      recommendations.push('Increase communication frequency')
      break
    
    case 'low':
      recommendations.push('Maintain regular communication')
      recommendations.push('Consider for program expansion opportunities')
      break
  }

  return recommendations
}
