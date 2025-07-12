
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import { prisma } from '../../../../lib/db'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get contract statistics
    const [total, signed, pending, expired, expiringSoon] = await Promise.all([
      prisma.contract.count(),
      prisma.contract.count({ where: { status: 'signed' } }),
      prisma.contract.count({ where: { status: 'pending' } }),
      prisma.contract.count({ where: { status: 'expired' } }),
      prisma.contract.count({
        where: {
          status: 'signed',
          expiresAt: {
            gte: new Date(),
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
          }
        }
      })
    ])

    // Get recent activity
    const recentContracts = await prisma.contract.findMany({
      include: { parent: true },
      orderBy: { updatedAt: 'desc' },
      take: 10
    })

    // Get contracts by template type
    const contractsByTemplate = await prisma.contract.groupBy({
      by: ['templateType'],
      _count: { _all: true }
    })

    // Get monthly contract trend
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const monthlyTrend = await prisma.contract.groupBy({
      by: ['uploadedAt'],
      _count: { _all: true },
      where: {
        uploadedAt: { gte: sixMonthsAgo }
      }
    })

    // Process monthly trend data
    const trendData = []
    for (let i = 5; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      
      const count = monthlyTrend.filter(item => {
        const itemDate = new Date(item.uploadedAt)
        const itemKey = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}`
        return itemKey === monthKey
      }).reduce((sum, item) => sum + item._count._all, 0)

      trendData.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        contracts: count
      })
    }

    return NextResponse.json({
      stats: {
        total,
        signed,
        pending,
        expired,
        expiringSoon
      },
      recentContracts,
      contractsByTemplate,
      monthlyTrend: trendData
    })

  } catch (error) {
    console.error('Contract stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contract statistics' },
      { status: 500 }
    )
  }
}
