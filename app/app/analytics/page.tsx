
'use client'

import { useEffect, useState } from 'react'
import { AppLayout } from '../../components/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { 
  TrendingUp, 
  TrendingDown,
  Users,
  DollarSign,
  AlertTriangle,
  Calendar,
  MessageSquare,
  RefreshCw,
  Activity,
  BarChart3,
  PieChart,
  Target,
  Zap,
  Clock,
  CheckCircle2,
  Brain
} from 'lucide-react'
import dynamic from 'next/dynamic'

// Dynamic imports for charts to avoid SSR issues
// @ts-ignore
const Chart = dynamic(() => import('react-plotly.js'), {
  ssr: false,
  loading: () => <div className="h-64 flex items-center justify-center">Loading chart...</div>
})

interface DashboardData {
  overview: {
    totalParents: number
    totalRevenue: number
    overduePayments: number
    upcomingDues: number
    activePaymentPlans: number
    messagesSentThisMonth: number
    activeRecurringMessages: number
    pendingRecommendations: number
    backgroundJobsRunning: number
  }
  revenueByMonth: Array<{
    month: string
    revenue: number
    payments: number
  }>
  recentActivity: Array<{
    id: string
    type: string
    description: string
    timestamp: Date
    parentName?: string
  }>
  paymentMethodStats: {
    card: number
    bank_account: number
    other: number
  }
  communicationStats: {
    totalMessages: number
    deliveryRate: number
    channelBreakdown: {
      email: number
      sms: number
    }
    deliveryStats: {
      delivered: number
      sent: number
      failed: number
    }
  }
  recommendationsByPriority: {
    urgent?: number
    high?: number
    medium?: number
    low?: number
  }
  recurringMessageStats: {
    totalRecurring: number
    activeRecurring: number
    messagesSentThisWeek: number
    averageSuccessRate: number
  }
}

export default function AnalyticsPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/analytics/dashboard')
      if (response.ok) {
        const dashboardData = await response.json()
        setData(dashboardData)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchDashboardData()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
      </AppLayout>
    )
  }

  if (!data) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold mb-2">Failed to load analytics data</h3>
          <Button onClick={fetchDashboardData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </AppLayout>
    )
  }

  // Prepare chart data
  const revenueChartData = [{
    x: data.revenueByMonth.map(item => item.month),
    y: data.revenueByMonth.map(item => item.revenue),
    type: 'bar' as const,
    name: 'Revenue',
    marker: { color: '#60B5FF' },
    hovertemplate: '%{x}<br>Revenue: $%{y}<extra></extra>'
  }]

  const paymentMethodPieData = [{
    values: [data.paymentMethodStats.card, data.paymentMethodStats.bank_account, data.paymentMethodStats.other],
    labels: ['Credit Cards', 'Bank Accounts', 'Other'],
    type: 'pie' as const,
    hole: 0.4,
    marker: { 
      colors: ['#60B5FF', '#FF9149', '#FF9898'] 
    },
    hovertemplate: '%{label}<br>Count: %{value}<extra></extra>'
  }]

  const communicationChannelData = [{
    values: [data.communicationStats.channelBreakdown.email, data.communicationStats.channelBreakdown.sms],
    labels: ['Email', 'SMS'],
    type: 'pie' as const,
    hole: 0.4,
    marker: { 
      colors: ['#80D8C3', '#A19AD3'] 
    },
    hovertemplate: '%{label}<br>Messages: %{value}<extra></extra>'
  }]

  const chartLayout = {
    margin: { t: 20, b: 40, l: 40, r: 20 },
    showlegend: false,
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { size: 12 }
  }

  const pieChartLayout = {
    margin: { t: 20, b: 20, l: 20, r: 20 },
    showlegend: true,
    legend: {
      orientation: 'h' as const,
      yanchor: 'top' as const,
      y: -0.1,
      xanchor: 'center' as const,
      x: 0.5
    },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { size: 11 }
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
            <p className="text-muted-foreground">
              Comprehensive insights into your program performance and AI automation
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-1">
              <Activity className="mr-1 h-3 w-3" />
              Real-time
            </Badge>
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              variant="outline"
            >
              {refreshing ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-8 w-8 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold">{data.overview.totalParents}</div>
                  <div className="text-xs text-muted-foreground">Active Parents</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-8 w-8 text-green-600" />
                <div>
                  <div className="text-2xl font-bold">{formatCurrency(data.overview.totalRevenue)}</div>
                  <div className="text-xs text-muted-foreground">Total Revenue</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-8 w-8 text-red-600" />
                <div>
                  <div className="text-2xl font-bold">{data.overview.overduePayments}</div>
                  <div className="text-xs text-muted-foreground">Overdue Payments</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-8 w-8 text-purple-600" />
                <div>
                  <div className="text-2xl font-bold">{data.overview.messagesSentThisMonth}</div>
                  <div className="text-xs text-muted-foreground">Messages This Month</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI & Automation Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Brain className="h-8 w-8 text-purple-600" />
                <div>
                  <div className="text-2xl font-bold">{data.overview.pendingRecommendations}</div>
                  <div className="text-xs text-muted-foreground">AI Recommendations</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <RefreshCw className="h-8 w-8 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold">{data.recurringMessageStats.activeRecurring}</div>
                  <div className="text-xs text-muted-foreground">Recurring Messages</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Zap className="h-8 w-8 text-yellow-600" />
                <div>
                  <div className="text-2xl font-bold">{data.overview.backgroundJobsRunning}</div>
                  <div className="text-xs text-muted-foreground">Background Jobs</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Target className="h-8 w-8 text-green-600" />
                <div>
                  <div className="text-2xl font-bold">{data.recurringMessageStats.averageSuccessRate}%</div>
                  <div className="text-xs text-muted-foreground">Success Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="mr-2 h-5 w-5 text-blue-600" />
                Monthly Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <Chart
                  data={revenueChartData}
                  layout={chartLayout}
                  config={{ responsive: true, displayModeBar: false }}
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <PieChart className="mr-2 h-5 w-5 text-green-600" />
                Payment Methods
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <Chart
                  data={paymentMethodPieData}
                  layout={pieChartLayout}
                  config={{ responsive: true, displayModeBar: false }}
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="mr-2 h-5 w-5 text-purple-600" />
                Communication Channels
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <Chart
                  data={communicationChannelData}
                  layout={pieChartLayout}
                  config={{ responsive: true, displayModeBar: false }}
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Brain className="mr-2 h-5 w-5 text-purple-600" />
                AI Recommendations by Priority
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(data.recommendationsByPriority).map(([priority, count]) => (
                  <div key={priority} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${
                        priority === 'urgent' ? 'bg-red-500' :
                        priority === 'high' ? 'bg-orange-500' :
                        priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                      }`} />
                      <span className="text-sm capitalize">{priority}</span>
                    </div>
                    <span className="font-bold">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Communication Stats */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="mr-2 h-5 w-5 text-blue-600" />
                Communication Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Delivery Rate</span>
                  <span className="font-bold text-green-600">
                    {data.communicationStats.deliveryRate.toFixed(1)}%
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Messages</span>
                  <span className="font-bold">{data.communicationStats.totalMessages}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Delivered</span>
                  <span className="font-bold text-green-600">
                    {data.communicationStats.deliveryStats.delivered}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Failed</span>
                  <span className="font-bold text-red-600">
                    {data.communicationStats.deliveryStats.failed}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <RefreshCw className="mr-2 h-5 w-5 text-purple-600" />
                Recurring Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Campaigns</span>
                  <span className="font-bold">{data.recurringMessageStats.totalRecurring}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Active Campaigns</span>
                  <span className="font-bold text-green-600">
                    {data.recurringMessageStats.activeRecurring}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Messages This Week</span>
                  <span className="font-bold">{data.recurringMessageStats.messagesSentThisWeek}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Average Success Rate</span>
                  <span className="font-bold text-blue-600">
                    {data.recurringMessageStats.averageSuccessRate}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="mr-2 h-5 w-5 text-orange-600" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recentActivity.slice(0, 8).map((activity) => (
                <div key={activity.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
                  <div className={`w-2 h-2 rounded-full ${
                    activity.type === 'payment' ? 'bg-green-500' :
                    activity.type === 'message' ? 'bg-blue-500' :
                    activity.type === 'parent' ? 'bg-purple-500' : 'bg-gray-500'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                  {activity.parentName && (
                    <Badge variant="outline" className="text-xs">
                      {activity.parentName}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
