
'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AppLayout } from '../../../components/app-layout'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Textarea } from '../../../components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Badge } from '../../../components/ui/badge'
import { Checkbox } from '../../../components/ui/checkbox'
import { Separator } from '../../../components/ui/separator'
import { 
  ArrowLeft, 
  Send, 
  Eye,
  Search,
  Calendar,
  Users,
  Mail,
  Smartphone,
  MessageSquare,
  Clock
} from 'lucide-react'
import Link from 'next/link'
import { ParentWithRelations, TemplateWithRelations, MessagePreview } from '../../../lib/types'

function SendMessagePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const templateId = searchParams.get('templateId')

  const [templates, setTemplates] = useState<TemplateWithRelations[]>([])
  const [parents, setParents] = useState<ParentWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [preview, setPreview] = useState<MessagePreview | null>(null)

  // Form fields
  const [selectedTemplateId, setSelectedTemplateId] = useState(templateId || '')
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateWithRelations | null>(null)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [channel, setChannel] = useState('email')
  const [selectedParents, setSelectedParents] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [scheduledFor, setScheduledFor] = useState('')
  const [variables, setVariables] = useState<Record<string, string>>({})

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [templatesRes, parentsRes] = await Promise.all([
          fetch('/api/templates'),
          fetch('/api/parents')
        ])

        if (templatesRes.ok) {
          const templatesData = await templatesRes.json()
          setTemplates(templatesData.filter((t: TemplateWithRelations) => t.isActive))
        }

        if (parentsRes.ok) {
          const parentsData = await parentsRes.json()
          setParents(parentsData.filter((p: ParentWithRelations) => p.status === 'active'))
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  useEffect(() => {
    if (selectedTemplateId && templates.length > 0) {
      const template = templates.find(t => t.id === selectedTemplateId)
      if (template) {
        setSelectedTemplate(template)
        setSubject(template.subject)
        setBody(template.body)
        setChannel(template.channel)
      }
    }
  }, [selectedTemplateId, templates])

  const filteredParents = parents.filter(parent =>
    parent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    parent.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleParentSelection = (parentId: string, selected: boolean) => {
    if (selected) {
      setSelectedParents(prev => [...prev, parentId])
    } else {
      setSelectedParents(prev => prev.filter(id => id !== parentId))
    }
  }

  const selectAllParents = () => {
    setSelectedParents(filteredParents.map(p => p.id))
  }

  const clearSelection = () => {
    setSelectedParents([])
  }

  const generatePreview = async () => {
    if (!subject.trim() && !body.trim()) {
      alert('Please enter a subject or message body')
      return
    }

    try {
      const response = await fetch('/api/messages/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subject,
          body,
          recipients: selectedParents,
          variables
        })
      })

      if (response.ok) {
        const previewData = await response.json()
        setPreview(previewData)
        setShowPreview(true)
      }
    } catch (error) {
      console.error('Failed to generate preview:', error)
    }
  }

  const handleSend = async () => {
    if (!body.trim()) {
      alert('Message body is required')
      return
    }

    if (selectedParents.length === 0) {
      alert('Please select at least one recipient')
      return
    }

    setSending(true)
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          templateId: selectedTemplateId || undefined,
          subject,
          body,
          channel,
          recipients: selectedParents,
          scheduledFor: scheduledFor || undefined,
          variables
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.scheduled) {
          alert(`Message scheduled successfully for ${selectedParents.length} recipients`)
          router.push('/communication/scheduled')
        } else {
          alert(`Message sent successfully to ${result.sent} recipients`)
          router.push('/communication/history')
        }
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to send message')
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      alert('Failed to send message')
    } finally {
      setSending(false)
    }
  }

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
              <h1 className="text-3xl font-bold tracking-tight">Send Message</h1>
              <p className="text-muted-foreground">
                Compose and send messages to parents
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={generatePreview}>
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
            <Button 
              onClick={handleSend} 
              disabled={sending || selectedParents.length === 0 || !body.trim()}
            >
              {scheduledFor ? <Clock className="mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}
              {sending ? 'Sending...' : scheduledFor ? 'Schedule Message' : 'Send Now'}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Message Composition */}
          <div className="lg:col-span-2 space-y-6">
            {/* Template Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Template (Optional)</CardTitle>
              </CardHeader>
              <CardContent>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                >
                  <option value="">Choose a template or write custom message</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} ({template.category})
                    </option>
                  ))}
                </select>
              </CardContent>
            </Card>

            {/* Message Content */}
            <Card>
              <CardHeader>
                <CardTitle>Message Content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Subject</label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Enter subject line..."
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Message Body</label>
                  <Textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Enter your message here..."
                    rows={8}
                  />
                </div>

                <div className="flex items-center space-x-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Channel</label>
                    <select
                      value={channel}
                      onChange={(e) => setChannel(e.target.value)}
                      className="px-3 py-2 border border-input rounded-md bg-background"
                    >
                      <option value="email">Email</option>
                      <option value="sms">SMS</option>
                    </select>
                  </div>

                  <div className="flex-1">
                    <label className="text-sm font-medium mb-2 block">Schedule (Optional)</label>
                    <Input
                      type="datetime-local"
                      value={scheduledFor}
                      onChange={(e) => setScheduledFor(e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                    />
                  </div>
                </div>

                {selectedTemplate?.variables && selectedTemplate.variables.length > 0 && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Custom Variables</label>
                    <div className="space-y-2">
                      {selectedTemplate.variables
                        .filter(v => !['parentName', 'parentEmail', 'programName'].includes(v))
                        .map((variable) => (
                        <div key={variable} className="flex items-center space-x-2">
                          <span className="text-sm w-20">{`{${variable}}`}</span>
                          <Input
                            placeholder={`Enter value for ${variable}`}
                            value={variables[variable] || ''}
                            onChange={(e) => setVariables(prev => ({
                              ...prev,
                              [variable]: e.target.value
                            }))}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recipients */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Recipients ({selectedParents.length})</span>
                  <div className="flex items-center space-x-2">
                    <Button size="sm" variant="outline" onClick={selectAllParents}>
                      Select All
                    </Button>
                    <Button size="sm" variant="outline" onClick={clearSelection}>
                      Clear
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search parents..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="max-h-96 overflow-y-auto space-y-2">
                  {filteredParents.map((parent) => (
                    <div key={parent.id} className="flex items-center space-x-3 p-2 hover:bg-muted rounded-lg">
                      <Checkbox
                        checked={selectedParents.includes(parent.id)}
                        onCheckedChange={(checked) => handleParentSelection(parent.id, checked as boolean)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{parent.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{parent.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Preview */}
            {showPreview && preview && (
              <Card>
                <CardHeader>
                  <CardTitle>Message Preview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Subject</label>
                    <p className="text-sm font-medium">{preview.subject}</p>
                  </div>
                  <Separator />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Message</label>
                    <div className="mt-1 p-3 bg-muted rounded-lg">
                      <pre className="whitespace-pre-wrap font-sans text-sm">{preview.body}</pre>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between text-sm">
                    <span>Recipients: {preview.recipientCount}</span>
                    <div className="flex items-center space-x-1">
                      {getChannelIcon(channel)}
                      <span>{channel}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

export default function SendMessagePageWrapper() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    }>
      <SendMessagePage />
    </Suspense>
  )
}
