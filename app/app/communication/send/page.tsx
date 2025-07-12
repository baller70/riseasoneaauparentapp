
'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { AppLayout } from '../../../components/app-layout'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Textarea } from '../../../components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Badge } from '../../../components/ui/badge'
import { Checkbox } from '../../../components/ui/checkbox'
import { 
  Send, 
  Users, 
  Mail, 
  Smartphone, 
  MessageSquare,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Wand2
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface Parent {
  id: string
  name: string
  email: string
  phone?: string
}

interface Template {
  id: string
  name: string
  subject: string
  body: string
  category: string
  channel: string
  isActive: boolean
}

function SendMessagePageContent() {
  const searchParams = useSearchParams()
  const templateId = searchParams.get('templateId')
  
  const [parents, setParents] = useState<Parent[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [selectedParents, setSelectedParents] = useState<string[]>([])
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [channel, setChannel] = useState('email')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [templateId])

  const fetchData = async () => {
    try {
      const [parentsRes, templatesRes] = await Promise.all([
        fetch('/api/parents'),
        fetch('/api/templates')
      ])

      if (parentsRes.ok) {
        const parentsData = await parentsRes.json()
        setParents(parentsData)
      }

      if (templatesRes.ok) {
        const templatesData = await templatesRes.json()
        setTemplates(templatesData)
        
        // If templateId is provided, select that template
        if (templateId) {
          const template = templatesData.find((t: Template) => t.id === templateId)
          if (template) {
            setSelectedTemplate(template)
            setSubject(template.subject)
            setBody(template.body)
            setChannel(template.channel)
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template)
    setSubject(template.subject)
    setBody(template.body)
    setChannel(template.channel)
  }

  const handleParentSelection = (parentId: string, selected: boolean) => {
    if (selected) {
      setSelectedParents(prev => [...prev, parentId])
    } else {
      setSelectedParents(prev => prev.filter(id => id !== parentId))
    }
  }

  const selectAllParents = () => {
    setSelectedParents(parents.map(p => p.id))
  }

  const clearSelection = () => {
    setSelectedParents([])
  }

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error('Please provide both subject and message body')
      return
    }

    if (selectedParents.length === 0) {
      toast.error('Please select at least one parent')
      return
    }

    setSending(true)
    try {
      const response = await fetch('/api/communication/send-bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          parentIds: selectedParents,
          templateId: selectedTemplate?.id,
          subject,
          body,
          channel,
          customizePerParent: true
        })
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(result.message)
        
        // If Gmail URLs were created, open them
        if (result.gmailUrls && result.gmailUrls.length > 0) {
          const shouldOpen = confirm(`${result.gmailUrls.length} Gmail drafts have been created. Would you like to open them now?`)
          if (shouldOpen) {
            result.gmailUrls.forEach((url: string, index: number) => {
              setTimeout(() => {
                window.open(url, `_blank${index}`)
              }, index * 500) // Stagger the openings
            })
          }
        }

        // Reset form
        setSelectedParents([])
        setSubject('')
        setBody('')
        setSelectedTemplate(null)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to send messages')
      }
    } catch (error) {
      console.error('Send error:', error)
      toast.error('Failed to send messages')
    } finally {
      setSending(false)
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
            <Button asChild variant="outline" size="sm">
              <Link href="/communication">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Communication
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Send Message</h1>
              <p className="text-muted-foreground">
                Compose and send messages to parents (creates Gmail drafts)
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Message Composition */}
          <div className="lg:col-span-2 space-y-6">
            {/* Template Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5" />
                  Select Template (Optional)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 max-h-40 overflow-y-auto">
                  {templates.filter(t => t.isActive).map((template) => (
                    <div
                      key={template.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedTemplate?.id === template.id
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleTemplateSelect(template)}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{template.name}</h4>
                        <Badge variant="outline">{template.category}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{template.subject}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Message Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Message Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Channel</label>
                  <div className="flex items-center space-x-4 mt-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        value="email"
                        checked={channel === 'email'}
                        onChange={(e) => setChannel(e.target.value)}
                      />
                      <Mail className="h-4 w-4" />
                      <span>Email</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        value="sms"
                        checked={channel === 'sms'}
                        onChange={(e) => setChannel(e.target.value)}
                      />
                      <Smartphone className="h-4 w-4" />
                      <span>SMS</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Subject</label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Enter message subject..."
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Message Body</label>
                  <Textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Enter your message here..."
                    rows={8}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Use variables: {'{parentName}'}, {'{parentEmail}'}, {'{parentPhone}'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Parent Selection */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Recipients
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {selectedParents.length}/{parents.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Button size="sm" variant="outline" onClick={selectAllParents}>
                    Select All
                  </Button>
                  <Button size="sm" variant="outline" onClick={clearSelection}>
                    Clear
                  </Button>
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {parents.map((parent) => (
                    <div
                      key={parent.id}
                      className="flex items-center space-x-3 p-2 border rounded-lg"
                    >
                      <Checkbox
                        checked={selectedParents.includes(parent.id)}
                        onCheckedChange={(checked) => 
                          handleParentSelection(parent.id, checked as boolean)
                        }
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{parent.name}</p>
                        <p className="text-xs text-muted-foreground">{parent.email}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t">
                  <Button
                    onClick={handleSend}
                    disabled={sending || selectedParents.length === 0}
                    className="w-full"
                  >
                    {sending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating Drafts...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Create Gmail Drafts ({selectedParents.length})
                      </>
                    )}
                  </Button>
                  {channel === 'email' && (
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      This will create Gmail drafts for you to review and send
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

export default function SendMessagePage() {
  return (
    <Suspense fallback={
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
      </AppLayout>
    }>
      <SendMessagePageContent />
    </Suspense>
  )
}
