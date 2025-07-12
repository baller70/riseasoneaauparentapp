
'use client'

import { useEffect, useState } from 'react'
import { AppLayout } from '../components/app-layout'
import { StatsCards } from '../components/dashboard/stats-cards'
import { RevenueChart } from '../components/dashboard/revenue-chart'
import { RecentActivityCard } from '../components/dashboard/recent-activity'
import { Button } from '../components/ui/button'
import { Plus, Users, CreditCard, MessageSquare, FileText } from 'lucide-react'
import Link from 'next/link'
import { DashboardStats, PaymentTrend, RecentActivity } from '../lib/types'

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [revenueTrends, setRevenueTrends] = useState<PaymentTrend[]>([])
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsRes, trendsRes, activityRes] = await Promise.all([
          fetch('/api/dashboard/stats'),
          fetch('/api/dashboard/revenue-trends'),
          fetch('/api/dashboard/recent-activity')
        ])

        if (statsRes.ok) {
          const statsData = await statsRes.json()
          setStats(statsData)
        }

        if (trendsRes.ok) {
          const trendsData = await trendsRes.json()
          setRevenueTrends(trendsData)
        }

        if (activityRes.ok) {
          const activityData = await activityRes.json()
          setRecentActivity(activityData)
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome to your Rise as One program management dashboard
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button asChild variant="outline">
              <Link href="/parents">
                <Users className="mr-2 h-4 w-4" />
                Manage Parents
              </Link>
            </Button>
            <Button asChild>
              <Link href="/parents/new">
                <Plus className="mr-2 h-4 w-4" />
                Add Parent
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && <StatsCards stats={stats} />}

        {/* Charts and Activity */}
        <div className="grid gap-4 md:grid-cols-7">
          <RevenueChart data={revenueTrends} />
          <RecentActivityCard activities={recentActivity} />
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-4">
          <Button asChild variant="outline" className="h-20 flex-col">
            <Link href="/parents">
              <Users className="h-6 w-6 mb-2" />
              <span>Manage Parents</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-20 flex-col">
            <Link href="/payments">
              <CreditCard className="h-6 w-6 mb-2" />
              <span>Track Payments</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-20 flex-col">
            <Link href="/communication">
              <MessageSquare className="h-6 w-6 mb-2" />
              <span>Send Messages</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-20 flex-col">
            <Link href="/contracts">
              <FileText className="h-6 w-6 mb-2" />
              <span>Manage Contracts</span>
            </Link>
          </Button>
        </div>
      </div>
    </AppLayout>
  )
}
