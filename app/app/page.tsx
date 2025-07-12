
'use client'

import { useEffect, useState } from 'react'
import { AppLayout } from '../components/app-layout'
import { StatsCards } from '../components/dashboard/stats-cards'
import { RevenueChart } from '../components/dashboard/revenue-chart'
import { RecentActivityCard } from '../components/dashboard/recent-activity'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Plus, Users, CreditCard, MessageSquare, FileText, Brain, TrendingUp, AlertTriangle, Lightbulb, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { DashboardStats, PaymentTrend, RecentActivity, AIAnalyticsInsight } from '../lib/types'

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [revenueTrends, setRevenueTrends] = useState<PaymentTrend[]>([])
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [aiInsights, setAiInsights] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)

  const fetchAIInsights = async () => {
    try {
      setAiLoading(true)
      const response = await fetch('/api/ai/dashboard-insights')
      if (response.ok) {
        const data = await response.json()
        setAiInsights(data.insights)
      }
    } catch (error) {
      console.error('Failed to fetch AI insights:', error)
    } finally {
      setAiLoading(false)
    }
  }

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

        // Fetch AI insights
        await fetchAIInsights()
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

        {/* AI Insights Section */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* AI Executive Summary */}
          <Card className="md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Brain className="mr-2 h-4 w-4 text-purple-600" />
                AI Insights & Recommendations
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchAIInsights}
                disabled={aiLoading}
              >
                <RefreshCw className={`h-4 w-4 ${aiLoading ? 'animate-spin' : ''}`} />
              </Button>
            </CardHeader>
            <CardContent>
              {aiLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                  <span className="ml-2 text-sm text-muted-foreground">Generating insights...</span>
                </div>
              ) : aiInsights ? (
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    {aiInsights.executiveSummary}
                  </div>
                  
                  {aiInsights.alerts && aiInsights.alerts.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold flex items-center text-red-600">
                        <AlertTriangle className="mr-1 h-4 w-4" />
                        Urgent Alerts
                      </h4>
                      {aiInsights.alerts.slice(0, 2).map((alert: string, index: number) => (
                        <div key={index} className="flex items-start space-x-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                          <span className="text-sm text-red-700">{alert}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {aiInsights.keyInsights && aiInsights.keyInsights.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold flex items-center text-blue-600">
                        <TrendingUp className="mr-1 h-4 w-4" />
                        Key Insights
                      </h4>
                      {aiInsights.keyInsights.slice(0, 3).map((insight: string, index: number) => (
                        <div key={index} className="flex items-start space-x-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                          <span className="text-sm">{insight}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Brain className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Click refresh to generate AI insights
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center">
                <Lightbulb className="mr-2 h-4 w-4 text-yellow-600" />
                Priority Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {aiInsights?.priorityActions ? (
                <div className="space-y-3">
                  {aiInsights.priorityActions.slice(0, 4).map((action: string, index: number) => (
                    <div key={index} className="flex items-start space-x-3">
                      <Badge variant="outline" className="text-xs">
                        {index + 1}
                      </Badge>
                      <span className="text-sm flex-1">{action}</span>
                    </div>
                  ))}
                  {aiInsights.priorityActions.length > 4 && (
                    <p className="text-xs text-muted-foreground">
                      +{aiInsights.priorityActions.length - 4} more actions
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Lightbulb className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-xs text-muted-foreground">
                    No recommendations available
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

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
