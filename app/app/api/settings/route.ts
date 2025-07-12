
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../lib/auth'
import { prisma } from '../../../lib/db'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const settings = await prisma.systemSettings.findMany({
      orderBy: {
        key: 'asc'
      }
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Settings fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Map the frontend settings to database keys
    const settingsMap = {
      program_name: body.programName,
      program_fee: body.programFee,
      email_from_address: body.emailFromAddress,
      sms_from_number: body.smsFromNumber,
      reminder_days: body.reminderDays,
      late_fee_amount: body.lateFeeAmount,
      grace_period_days: body.gracePeriodDays
    }

    // Update each setting
    for (const [key, value] of Object.entries(settingsMap)) {
      await prisma.systemSettings.upsert({
        where: { key },
        update: { 
          value: value?.toString() || '',
          updatedAt: new Date()
        },
        create: { 
          key, 
          value: value?.toString() || '',
          description: `System setting for ${key.replace(/_/g, ' ')}`
        }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Settings update error:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}
