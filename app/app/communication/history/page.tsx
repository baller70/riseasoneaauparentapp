
'use client'

import { useEffect, useState } from 'react'
import { AppLayout } from '../../../components/app-layout'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Badge } from '../../../components/ui/badge'
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  Download,
  Mail,
  Smartphone,
  MessageSquare,
  Eye,
  Calendar,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react'
import Link from 'next/link'
import { MessageLogWithRelations } from '../../../lib/types'

export default function MessageHistoryPage() {
  const [messages, setMessages] = useState<MessageLogWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [channelFilter, setChannelFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 50,
    offset: 0,
    hasMore: false
  })

  useEffect(() => {
    fetchMessages()
  }, [channelFilter, statusFilter])

  const fetchMessages = async (offset = 0) => {
    try {
      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: offset.toString()
      })

      if (channelFilter !== 'all') {
        params.append('channel', channelFilter)
      }

      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }

      const response = await fetch(`/api/messages?${params}`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredMessages = messages.filter(message => {
    const matchesSearch = 
      message.parent?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.parent?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.body.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesSearch
  })

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return <Mail className="h-4 w-4" />
      case 'sms':
        return <Smartphone className="h-4 w-4" />
      case 'both':
        return <MessageSquare className="h-4 w-4" />
      default:
        return <MessageSquare className="h-4 w-4" />
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-orange-600" />
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return 'default'
      case 'failed':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  const exportMessages = async () => {
    try {
      // In a real app, this would generate a CSV/Excel export
      const csvContent = [
        'Date,Parent,Email,Channel,Subject,Status',
        ...filteredMessages.map(msg => 
          `${new Date(msg.sentAt).toLocaleDateString()},${msg.parent?.name},${msg.parent?.email},${msg.channel},"${msg.subject}",${msg.status}`
        )
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `message-history-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export messages:', error)
    }
  }

  const loadMore = () => {
    fetchMessages(pagination.offset + pagination.limit)
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
          <div className="flex items-center space-x-4">
            <Button variant="outline" asChild>
              <Link href="/communication">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Message History</h1>
              <p className="text-muted-foreground">
                View all sent messages and their delivery status
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={exportMessages}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pagination.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Delivered</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {messages.filter(m => m.status === 'sent' || m.status === 'delivered').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {messages.filter(m => m.status === 'failed').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {messages.filter(m => {
                  const messageDate = new Date(m.sentAt)
                  const now = new Date()
                  return messageDate.getMonth() === now.getMonth() && 
                         messageDate.getFullYear() === now.getFullYear()
                }).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search messages by parent name, email, or content..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
                className="px-3 py-2 border border-input rounded-md bg-background"
              >
                <option value="all">All Channels</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-input rounded-md bg-background"
              >
                <option value="all">All Status</option>
                <option value="sent">Sent</option>
                <option value="delivered">Delivered</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Messages List */}
        <Card>
          <CardHeader>
            <CardTitle>Message History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredMessages.length > 0 ? (
                <>
                  {filteredMessages.map((message) => (
                    <div key={message.id} className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-start space-x-4 flex-1">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(message.status)}
                          <Badge variant="outline" className="flex items-center space-x-1">
                            {getChannelIcon(message.channel)}
                            <span>{message.channel}</span>
                          </Badge>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <p className="font-medium">{message.parent?.name}</p>
                            <Badge variant={getStatusVariant(message.status)}>
                              {message.status}
                            </Badge>
                            {message.template && (
                              <Badge variant="outline">
                                Template: {message.template.name}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">{message.parent?.email}</p>
                          {message.subject && (
                            <p className="text-sm font-medium mb-1">{message.subject}</p>
                          )}
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {message.body.substring(0, 150)}...
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right ml-4">
                        <p className="text-sm text-muted-foreground">
                          {new Date(message.sentAt).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(message.sentAt).toLocaleTimeString()}
                        </p>
                        {message.deliveredAt && (
                          <p className="text-xs text-green-600">
                            Delivered: {new Date(message.deliveredAt).toLocaleTimeString()}
                          </p>
                        )}
                        {message.errorMessage && (
                          <p className="text-xs text-red-600 mt-1">
                            Error: {message.errorMessage}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {pagination.hasMore && (
                    <div className="flex justify-center mt-6">
                      <Button variant="outline" onClick={loadMore}>
                        Load More Messages
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No messages found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm || channelFilter !== 'all' || statusFilter !== 'all'
                      ? 'Try adjusting your search criteria'
                      : 'Start sending messages to see them here'
                    }
                  </p>
                  <Button asChild>
                    <Link href="/communication/send">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Send Your First Message
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
