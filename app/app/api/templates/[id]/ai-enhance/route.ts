
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
    const {
      improvementType,
      targetAudience,
      desiredTone,
      specificInstructions
    } = body

    // Get the current template
    const template = await prisma.template.findUnique({
      where: { id: params.id },
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Generate AI enhancement
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/ai/writing/improve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: template.body,
        context: `Template enhancement for ${improvementType}. Category: ${template.category}. Target audience: ${targetAudience || 'parents'}. Desired tone: ${desiredTone || 'professional'}.`,
        tone: desiredTone || 'professional',
        improvementType,
        specificInstructions: specificInstructions || `Enhance this ${template.category} template for better ${improvementType}. Keep the same core message but improve clarity, engagement, and effectiveness.`
      })
    })

    if (!response.ok) {
      throw new Error('AI enhancement failed')
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    let improvedContent = ''

    if (reader) {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              break
            }
            try {
              const parsed = JSON.parse(data)
              improvedContent += parsed.content
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    }

    if (!improvedContent.trim()) {
      throw new Error('No improved content generated')
    }

    // Create new template version
    const currentVersion = template.versions[0]?.version || '1.0'
    const versionParts = currentVersion.split('.')
    const newVersion = `${versionParts[0]}.${parseInt(versionParts[1]) + 1}`

    const templateVersion = await prisma.templateVersion.create({
      data: {
        templateId: template.id,
        version: newVersion,
        name: template.name,
        subject: template.subject,
        body: improvedContent.trim(),
        category: template.category,
        channel: template.channel,
        variables: template.variables,
        isAiGenerated: true,
        aiPrompt: `${improvementType} enhancement with tone: ${desiredTone}. ${specificInstructions || ''}`,
        changeDescription: `AI-enhanced for ${improvementType}`,
        createdBy: session.user.email!
      }
    })

    // Create improvement record
    await prisma.templateImprovement.create({
      data: {
        templateVersionId: templateVersion.id,
        improvementType,
        originalText: template.body,
        improvedText: improvedContent.trim(),
        reason: `Enhanced for ${improvementType}. ${specificInstructions || 'Automated AI improvement to increase effectiveness and engagement.'}`,
        confidence: 85, // Default confidence score
        accepted: false
      }
    })

    return NextResponse.json({
      success: true,
      templateVersion,
      originalContent: template.body,
      improvedContent: improvedContent.trim(),
      improvementType,
      version: newVersion
    })

  } catch (error) {
    console.error('Template AI enhancement error:', error)
    return NextResponse.json(
      { error: 'Failed to enhance template with AI' },
      { status: 500 }
    )
  }
}
