
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

    const formData = await request.formData()
    const file = formData.get('file') as File
    const parentId = formData.get('parentId') as string
    const templateType = formData.get('templateType') as string
    const expiresAt = formData.get('expiresAt') as string
    const notes = formData.get('notes') as string

    if (!file || !parentId) {
      return NextResponse.json({ error: 'File and parent ID are required' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only PDF and image files are allowed.' 
      }, { status: 400 })
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ 
        error: 'File size too large. Maximum size is 10MB.' 
      }, { status: 400 })
    }

    // Convert file to base64 for storage (in a real app, you'd upload to cloud storage)
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const fileUrl = `data:${file.type};base64,${base64}`

    // Create contract record
    const contract = await prisma.contract.create({
      data: {
        parentId,
        fileName: `contract_${Date.now()}_${file.name}`,
        originalName: file.name,
        fileUrl,
        fileSize: file.size,
        mimeType: file.type,
        templateType: templateType || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        notes: notes || null,
        status: 'pending'
      },
      include: {
        parent: true
      }
    })

    // Update parent's legacy contract fields for backward compatibility
    await prisma.parent.update({
      where: { id: parentId },
      data: {
        contractUrl: fileUrl,
        contractStatus: 'pending',
        contractUploadedAt: new Date(),
        contractExpiresAt: expiresAt ? new Date(expiresAt) : null
      }
    })

    return NextResponse.json(contract)

  } catch (error) {
    console.error('Contract upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload contract' },
      { status: 500 }
    )
  }
}
