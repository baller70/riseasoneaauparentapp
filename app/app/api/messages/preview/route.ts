
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
      subject,
      body: messageBody,
      recipients,
      variables = {}
    } = body

    // Get parent info for preview
    const parent = await prisma.parent.findFirst({
      where: { id: { in: recipients } }
    })

    if (!parent && recipients.length > 0) {
      return NextResponse.json({ error: 'No valid recipients found' }, { status: 400 })
    }

    // Process variables for preview
    let processedSubject = subject || ''
    let processedBody = messageBody || ''

    if (parent) {
      const templateVariables = {
        parentName: parent.name,
        parentEmail: parent.email,
        programName: 'Rise as One Yearly Program',
        ...variables
      }

      Object.entries(templateVariables).forEach(([key, value]) => {
        const regex = new RegExp(`{${key}}`, 'g')
        processedSubject = processedSubject.replace(regex, String(value))
        processedBody = processedBody.replace(regex, String(value))
      })
    }

    return NextResponse.json({
      subject: processedSubject,
      body: processedBody,
      recipientCount: recipients.length,
      estimatedDelivery: new Date()
    })

  } catch (error) {
    console.error('Message preview error:', error)
    return NextResponse.json(
      { error: 'Failed to generate preview' },
      { status: 500 }
    )
  }
}
