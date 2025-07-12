

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import { prisma } from '../../../../lib/db'
import { BulkUploadParent, BulkImportResult } from '../../../../lib/types'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { parents }: { parents: BulkUploadParent[] } = await request.json()
    
    if (!parents || !Array.isArray(parents) || parents.length === 0) {
      return NextResponse.json({ error: 'No valid parent data provided' }, { status: 400 })
    }

    const result: BulkImportResult = {
      success: false,
      created: 0,
      failed: 0,
      errors: [],
      successfulParents: []
    }

    // Use transaction for bulk operations
    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < parents.length; i++) {
        const parentData = parents[i]
        const rowNum = i + 1

        try {
          // Double-check for existing email
          const existingParent = await tx.parent.findUnique({
            where: { email: parentData.email }
          })

          if (existingParent) {
            result.failed++
            result.errors.push({
              row: rowNum,
              email: parentData.email,
              message: 'Email already exists in database'
            })
            continue
          }

          // Create parent record
          const createdParent = await tx.parent.create({
            data: {
              name: parentData.name.trim(),
              email: parentData.email.toLowerCase().trim(),
              phone: parentData.phone?.trim() || null,
              address: parentData.address?.trim() || null,
              emergencyContact: parentData.emergencyContact?.trim() || null,
              emergencyPhone: parentData.emergencyPhone?.trim() || null,
              notes: parentData.notes?.trim() || null,
              status: 'active',
              contractStatus: 'pending'
            }
          })

          result.created++
          result.successfulParents.push({
            id: createdParent.id,
            name: createdParent.name,
            email: createdParent.email
          })

        } catch (error) {
          console.error(`Error creating parent ${parentData.email}:`, error)
          result.failed++
          result.errors.push({
            row: rowNum,
            email: parentData.email,
            message: error instanceof Error ? error.message : 'Unknown error occurred'
          })
        }
      }
    })

    result.success = result.created > 0

    return NextResponse.json(result)
  } catch (error) {
    console.error('Bulk import error:', error)
    return NextResponse.json(
      { error: 'Failed to import parents. Please try again.' },
      { status: 500 }
    )
  }
}
