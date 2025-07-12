
'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { AppLayout } from '../../components/app-layout'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { AIInput } from '../../components/ui/ai-input'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Checkbox } from '../../components/ui/checkbox'
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  DollarSign,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Users,
  CreditCard,
  BarChart3,
  Mail,
  RefreshCw,
  Eye,
  Brain,
  Wand2,
  Sparkles,
  Target,
  Shield
} from 'lucide-react'
import Link from 'next/link'
import { PaymentWithRelations, PaymentStats, PaymentAnalytics } from '../../lib/types'

// Dynamic import for charts
// @ts-ignore
const Recharts = dynamic(() => import('recharts'), { ssr: false, loading: () => <div>Loading chart...</div> })

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentWithRelations[]>([])
  const [analytics, setAnalytics] = useState<PaymentAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedPayments, setSelectedPayments] = useState<string[]>([])
  const [bulkOperating, setBulkOperating] = useState(false)
  const [aiInsights, setAiInsights] = useState<any>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [showAiActions, setShowAiActions] = useState(false)

  useEffect(() => {
    fetchData()
  }, [statusFilter])

  const fetchData = async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)

      const [paymentsRes, analyticsRes] = await Promise.all([
        fetch(`/api/payments?${params}`),
        fetch('/api/payments/analytics')
      ])

      if (paymentsRes.ok) {
        const data = await paymentsRes.json()
        setPayments(data.payments || data)
      }

      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json()
        setAnalytics(analyticsData)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.parent?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.parent?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const handlePaymentSelection = (paymentId: string, selected: boolean) => {
    if (selected) {
      setSelectedPayments(prev => [...prev, paymentId])
    } else {
      setSelectedPayments(prev => prev.filter(id => id !== paymentId))
    }
  }

  const selectAllPayments = () => {
    setSelectedPayments(filteredPayments.map(p => p.id))
  }

  const clearSelection = () => {
    setSelectedPayments([])
  }

  const performBulkOperation = async (action: string) => {
    if (selectedPayments.length === 0) {
      alert('Please select payments first')
      return
    }

    const confirmationMessages = {
      markPaid: `Mark ${selectedPayments.length} payments as paid?`,
      sendReminder: `Send reminders for ${selectedPayments.length} payments?`
    }

    if (!confirm(confirmationMessages[action as keyof typeof confirmationMessages])) {
      return
    }

    setBulkOperating(true)
    try {
      const response = await fetch('/api/payments/overdue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          paymentIds: selectedPayments,
          action
        })
      })

      if (response.ok) {
        await fetchData()
        setSelectedPayments([])
        const result = await response.json()
        alert(result.message)
      } else {
        const error = await response.json()
        alert(error.error || 'Operation failed')
      }
    } catch (error) {
      console.error('Bulk operation failed:', error)
      alert('Operation failed')
    } finally {
      setBulkOperating(false)
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'paid':
        return 'default'
      case 'pending':
        return 'secondary'
      case 'overdue':
        return 'destructive'
      case 'failed':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4" />
      case 'pending':
        return <Clock className="h-4 w-4" />
      case 'overdue':
        return <AlertTriangle className="h-4 w-4" />
      case 'failed':
        return <XCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const calculateSummary = () => {
    const total = filteredPayments.reduce((sum, payment) => sum + Number(payment.amount), 0)
    const paid = filteredPayments.filter(p => p.status === 'paid').reduce((sum, payment) => sum + Number(payment.amount), 0)
    const pending = filteredPayments.filter(p => p.status === 'pending').reduce((sum, payment) => sum + Number(payment.amount), 0)
    const overdue = filteredPayments.filter(p => p.status === 'overdue').reduce((sum, payment) => sum + Number(payment.amount), 0)

    return { total, paid, pending, overdue }
  }

  const summary = calculateSummary()

  // AI Functions
  const fetchAIPaymentInsights = async () => {
    setAiLoading(true)
    try {
      const response = await fetch('/api/ai/payment-insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          paymentData: {
            totalPayments: filteredPayments.length,
            overdueCount: filteredPayments.filter(p => p.status === 'overdue').length,
            pendingCount: filteredPayments.filter(p => p.status === 'pending').length,
            totalAmount: summary.total,
            overdueAmount: summary.overdue
          }
        })
      })

      if (response.ok) {
        const data = await response.json()
        setAiInsights(data.insights)
      }
    } catch (error) {
      console.error('Failed to fetch AI payment insights:', error)
    } finally {
      setAiLoading(false)
    }
  }

  const generateAIReminders = async () => {
    if (selectedPayments.length === 0) {
      alert('Please select overdue payments first')
      return
    }

    setAiLoading(true)
    try {
      const response = await fetch('/api/ai/bulk-operations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          operation: 'generate_payment_reminders',
          paymentIds: selectedPayments,
          parameters: {
            tone: 'professional',
            urgency: 'medium'
          }
        })
      })

      if (response.ok) {
        const data = await response.json()
        alert(`Generated ${data.results.successfullyGenerated} AI-powered payment reminders`)
      }
    } catch (error) {
      console.error('AI reminder generation error:', error)
      alert('Failed to generate AI reminders')
    } finally {
      setAiLoading(false)
    }
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

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">AI-Enhanced Payments Dashboard</h1>
            <p className="text-muted-foreground">
              Smart payment management with predictive insights and automation
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-1">
              <Brain className="mr-1 h-3 w-3" />
              AI Powered
            </Badge>
            <Button 
              onClick={fetchAIPaymentInsights}
              disabled={aiLoading}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg"
            >
              {aiLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              ) : (
                <Brain className="mr-2 h-4 w-4" />
              )}
              {aiLoading ? 'AI Analyzing...' : 'AI Payment Insights'}
            </Button>
            {selectedPayments.length > 0 && (
              <Button 
                onClick={generateAIReminders}
                disabled={aiLoading}
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
              >
                <Wand2 className="mr-2 h-4 w-4" />
                AI Reminders ({selectedPayments.length})
              </Button>
            )}
            <Button asChild variant="outline">
              <Link href="/payments/overdue">
                <AlertTriangle className="mr-2 h-4 w-4" />
                Overdue ({analytics?.overdueAnalysis.totalOverdue || 0})
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/payment-plans">
                <Calendar className="mr-2 h-4 w-4" />
                Payment Plans
              </Link>
            </Button>
            <Button asChild>
              <Link href="/payment-plans/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Plan
              </Link>
            </Button>
          </div>
        </div>

        {/* Analytics Cards */}
        <div className="grid gap-4 md:grid-cols-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${analytics?.stats.totalRevenue?.toLocaleString() || summary.total.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 inline mr-1" />
                All time
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Collected</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">${analytics?.stats.totalPaid?.toLocaleString() || summary.paid.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {analytics?.stats.paymentSuccessRate?.toFixed(1) || '0'}% success rate
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">${analytics?.stats.totalPending?.toLocaleString() || summary.pending.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting payment
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">${analytics?.stats.totalOverdue?.toLocaleString() || summary.overdue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {analytics?.overdueAnalysis.averageDaysOverdue?.toFixed(0) || 0} avg days late
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Payment Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.stats.averagePaymentTime?.toFixed(0) || 0}</div>
              <p className="text-xs text-muted-foreground">days after due</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Plans</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{payments.filter(p => p.paymentPlan).length}</div>
              <p className="text-xs text-muted-foreground">payment plans</p>
            </CardContent>
          </Card>
        </div>

        {/* AI Payment Insights Section */}
        <div className="relative">
          <div className="absolute -top-2 left-4 z-10">
            <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-1 shadow-md">
              <Brain className="mr-1 h-3 w-3" />
              AI Insights
            </Badge>
          </div>
          <Card className="border-purple-200 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold flex items-center text-purple-800">
                    <Brain className="mr-2 h-6 w-6 text-purple-600" />
                    AI Payment Intelligence
                  </CardTitle>
                  <p className="text-sm text-purple-600 mt-1">Predictive insights and smart recommendations</p>
                </div>
                <Button
                  onClick={fetchAIPaymentInsights}
                  disabled={aiLoading}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                  size="sm"
                >
                  {aiLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  {aiLoading ? 'Analyzing...' : 'Generate AI Insights'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {aiLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                  <span className="ml-2 text-sm text-muted-foreground">AI analyzing payment patterns...</span>
                </div>
              ) : aiInsights ? (
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center text-blue-700">
                      <TrendingUp className="mr-1 h-4 w-4" />
                      Payment Predictions
                    </h4>
                    {aiInsights.predictions?.slice(0, 3).map((prediction: string, index: number) => (
                      <div key={index} className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-sm">{prediction}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center text-orange-700">
                      <AlertTriangle className="mr-1 h-4 w-4" />
                      Risk Alerts
                    </h4>
                    {aiInsights.risks?.slice(0, 3).map((risk: string, index: number) => (
                      <div key={index} className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-sm">{risk}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center text-green-700">
                      <Target className="mr-1 h-4 w-4" />
                      Optimization Tips
                    </h4>
                    {aiInsights.optimizations?.slice(0, 3).map((tip: string, index: number) => (
                      <div key={index} className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-sm">{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Brain className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Click "Generate AI Insights" to get payment intelligence
                  </p>
                  <div className="grid grid-cols-3 gap-4 mt-6">
                    <div className="text-center p-4 border border-purple-200 rounded-lg bg-white/50">
                      <TrendingUp className="h-8 w-8 mb-2 mx-auto text-purple-600" />
                      <h4 className="font-medium text-sm mb-1">Payment Predictions</h4>
                      <p className="text-xs text-muted-foreground">Forecast payment behavior and timing</p>
                    </div>
                    <div className="text-center p-4 border border-purple-200 rounded-lg bg-white/50">
                      <Shield className="h-8 w-8 mb-2 mx-auto text-purple-600" />
                      <h4 className="font-medium text-sm mb-1">Risk Assessment</h4>
                      <p className="text-xs text-muted-foreground">Identify high-risk payment scenarios</p>
                    </div>
                    <div className="text-center p-4 border border-purple-200 rounded-lg bg-white/50">
                      <Target className="h-8 w-8 mb-2 mx-auto text-purple-600" />
                      <h4 className="font-medium text-sm mb-1">Smart Optimization</h4>
                      <p className="text-xs text-muted-foreground">Improve collection strategies</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Revenue Trend Chart */}
        {analytics?.monthlyRevenue && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Revenue Trend (12 Months)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80 flex items-center justify-center bg-muted/50 rounded-lg">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Revenue trend chart</p>
                  <p className="text-xs text-muted-foreground">
                    {analytics.monthlyRevenue.length} months of data
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bulk Operations */}
        {selectedPayments.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium">
                    {selectedPayments.length} payment{selectedPayments.length !== 1 ? 's' : ''} selected
                  </span>
                  <Button variant="outline" size="sm" onClick={clearSelection}>
                    Clear Selection
                  </Button>
                </div>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => performBulkOperation('markPaid')}
                    disabled={bulkOperating}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Mark as Paid
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => performBulkOperation('sendReminder')}
                    disabled={bulkOperating}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Send Reminders
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Button size="sm" variant="outline" onClick={selectAllPayments}>
                  Select All
                </Button>
                <Button size="sm" variant="outline" onClick={clearSelection}>
                  Clear
                </Button>
              </div>
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 z-10" />
                  <AIInput
                    placeholder="Search by parent name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    fieldType="search_query"
                    context="Search for payments by parent name, email, or payment details"
                    tone="casual"
                    onAIGeneration={(text) => setSearchTerm(text)}
                  />
                </div>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-input rounded-md bg-background"
              >
                <option value="all">All Status</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
                <option value="failed">Failed</option>
              </select>
              <Button variant="outline" onClick={fetchData}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Payments Table */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredPayments.length > 0 ? (
                filteredPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <Checkbox
                        checked={selectedPayments.includes(payment.id)}
                        onCheckedChange={(checked) => handlePaymentSelection(payment.id, checked as boolean)}
                      />
                      <div className="flex items-center space-x-2">
                        <Badge variant={getStatusVariant(payment.status)} className="flex items-center space-x-1">
                          {getStatusIcon(payment.status)}
                          <span>{payment.status}</span>
                        </Badge>
                        {payment.paymentPlan && (
                          <Badge variant="outline" className="capitalize">
                            {payment.paymentPlan.type}
                          </Badge>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{payment.parent?.name}</p>
                        <p className="text-sm text-muted-foreground">{payment.parent?.email}</p>
                        {payment.remindersSent > 0 && (
                          <p className="text-xs text-orange-600">
                            {payment.remindersSent} reminder{payment.remindersSent !== 1 ? 's' : ''} sent
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-xl font-semibold">${Number(payment.amount).toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">
                        Due: {new Date(payment.dueDate).toLocaleDateString()}
                      </p>
                      {payment.paidAt && (
                        <p className="text-sm text-green-600">
                          Paid: {new Date(payment.paidAt).toLocaleDateString()}
                        </p>
                      )}
                      {payment.status === 'overdue' && (
                        <p className="text-sm text-red-600">
                          {Math.floor((new Date().getTime() - new Date(payment.dueDate).getTime()) / (1000 * 60 * 60 * 24))} days overdue
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/payments/${payment.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Link>
                      </Button>
                      {payment.status === 'pending' && (
                        <Button size="sm">
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Mark Paid
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No payments found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm || statusFilter !== 'all' 
                      ? 'Try adjusting your search criteria'
                      : 'Payment records will appear here once you start managing payments'
                    }
                  </p>
                  <Button asChild>
                    <Link href="/payment-plans/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Payment Plan
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
