
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../../../../lib/auth'
import { prisma } from '../../../../../../../lib/db'

export async function POST(request: Request, { params }: { params: { id: string; versionId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { feedback } = body

    // Get the template version
    const templateVersion = await prisma.templateVersion.findUnique({
      where: { id: params.versionId },
      include: {
        template: true,
        improvements: true
      }
    })

    if (!templateVersion) {
      return NextResponse.json({ error: 'Template version not found' }, { status: 404 })
    }

    // Update the main template with the improved version
    await prisma.template.update({
      where: { id: params.id },
      data: {
        name: templateVersion.name,
        subject: templateVersion.subject,
        body: templateVersion.body,
        category: templateVersion.category,
        channel: templateVersion.channel,
        variables: templateVersion.variables,
        isAiGenerated: templateVersion.isAiGenerated,
        updatedAt: new Date()
      }
    })

    // Mark improvements as accepted
    await prisma.templateImprovement.updateMany({
      where: { templateVersionId: params.versionId },
      data: {
        accepted: true,
        acceptedAt: new Date(),
        acceptedBy: session.user.email!,
        feedback: feedback || null
      }
    })

    // Update template version usage count
    await prisma.templateVersion.update({
      where: { id: params.versionId },
      data: {
        usageCount: { increment: 1 }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Template version accepted and applied'
    })

  } catch (error) {
    console.error('Template version acceptance error:', error)
    return NextResponse.json(
      { error: 'Failed to accept template version' },
      { status: 500 }
    )
  }
}
