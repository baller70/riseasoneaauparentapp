
'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AppLayout } from '../../../components/app-layout'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Textarea } from '../../../components/ui/textarea'
import { AIInput } from '../../../components/ui/ai-input'
import { AITextarea } from '../../../components/ui/ai-textarea'
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
  Clock,
  Brain,
  Wand2,
  Sparkles,
  Target,
  TrendingUp
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
  
  // AI-related state
  const [aiGenerating, setAiGenerating] = useState(false)
  const [selectedTone, setSelectedTone] = useState<'friendly' | 'professional' | 'urgent' | 'formal'>('friendly')
  const [messageType, setMessageType] = useState<'general' | 'reminder' | 'welcome' | 'follow_up' | 'overdue'>('general')
  const [personalizationLevel, setPersonalizationLevel] = useState(3)
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([])
  const [showAiOptions, setShowAiOptions] = useState(false)

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

  // AI Functions
  const generateAIMessage = async () => {
    if (selectedParents.length === 0) {
      alert('Please select at least one recipient to generate personalized content')
      return
    }

    setAiGenerating(true)
    try {
      const response = await fetch('/api/ai/generate-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          context: {
            parentId: selectedParents[0], // Use first selected parent for context
            messageType,
            tone: selectedTone,
            urgencyLevel: messageType === 'overdue' ? 5 : messageType === 'reminder' ? 3 : 2
          },
          customInstructions: `Generate a ${messageType} message with ${selectedTone} tone. Personalization level: ${personalizationLevel}/5`,
          includePersonalization: personalizationLevel > 2,
          templateId: selectedTemplateId || undefined
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.message) {
          setSubject(data.message.subject || subject)
          setBody(data.message.body || body)
          setAiSuggestions(data.message.suggestions || [])
        }
      } else {
        alert('Failed to generate AI message')
      }
    } catch (error) {
      console.error('AI generation error:', error)
      alert('Failed to generate AI message')
    } finally {
      setAiGenerating(false)
    }
  }

  const optimizeSubjectLine = async () => {
    if (!subject.trim()) {
      alert('Please enter a subject line first')
      return
    }

    setAiGenerating(true)
    try {
      const response = await fetch('/api/ai/stream-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: `Optimize this email subject line for better open rates: "${subject}". Provide 3 alternative subject lines that are more engaging and relevant to parent communication in an educational program.`,
          context: { currentSubject: subject, tone: selectedTone, messageType },
          type: 'recommendation'
        })
      })

      if (response.ok) {
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        
        while (reader) {
          const { done, value } = await reader.read()
          if (done) break
          
          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') {
                // Parse suggestions from buffer
                const suggestions = buffer.split('\n').filter(line => line.trim().startsWith('-') || line.trim().startsWith('1.')).slice(0, 3)
                setAiSuggestions(suggestions)
                return
              }
              try {
                const parsed = JSON.parse(data)
                buffer += parsed.content
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Subject optimization error:', error)
      alert('Failed to optimize subject line')
    } finally {
      setAiGenerating(false)
    }
  }

  const enhanceWithPersonalization = async () => {
    if (!body.trim() || selectedParents.length === 0) {
      alert('Please enter a message body and select recipients first')
      return
    }

    setAiGenerating(true)
    try {
      const response = await fetch('/api/ai/bulk-operations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          operation: 'generate_personalized_messages',
          parentIds: selectedParents.slice(0, 3), // Limit to first 3 for preview
          parameters: {
            messageType,
            tone: selectedTone,
            includeDetails: personalizationLevel > 3,
            baseContent: body
          }
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.results.messages?.length > 0) {
          // Show personalization suggestions
          const suggestions = data.results.messages.map((m: any) => 
            `For ${m.parentName}: "${m.message?.body?.substring(0, 100)}..."`
          )
          setAiSuggestions(suggestions)
        }
      }
    } catch (error) {
      console.error('Personalization error:', error)
      alert('Failed to enhance with personalization')
    } finally {
      setAiGenerating(false)
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
              <h1 className="text-3xl font-bold tracking-tight">AI-Powered Message Composer</h1>
              <p className="text-muted-foreground">
                Let AI help you craft personalized messages to parents
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-1">
              <Brain className="mr-1 h-3 w-3" />
              AI Enhanced
            </Badge>
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

            {/* AI-Powered Message Content */}
            <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold flex items-center text-purple-800">
                      <Brain className="mr-2 h-6 w-6 text-purple-600" />
                      AI Message Composer
                    </CardTitle>
                    <p className="text-sm text-purple-600 mt-1">Let AI craft your perfect message</p>
                  </div>
                  <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                    <Sparkles className="mr-1 h-3 w-3" />
                    AI Powered
                  </Badge>
                </div>
                
                {/* Primary AI Action Buttons */}
                <div className="flex items-center space-x-3 mt-4">
                  <Button
                    onClick={generateAIMessage}
                    disabled={aiGenerating || selectedParents.length === 0}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg"
                    size="lg"
                  >
                    {aiGenerating ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                    ) : (
                      <Wand2 className="mr-2 h-5 w-5" />
                    )}
                    {aiGenerating ? 'AI Generating...' : 'Generate AI Message'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowAiOptions(!showAiOptions)}
                    className="border-purple-300 text-purple-700 hover:bg-purple-50"
                  >
                    <Brain className="mr-2 h-4 w-4" />
                    AI Settings
                  </Button>
                  <Button
                    variant="outline"
                    onClick={optimizeSubjectLine}
                    disabled={aiGenerating || !subject.trim()}
                    className="border-purple-300 text-purple-700 hover:bg-purple-50"
                  >
                    <Target className="mr-2 h-4 w-4" />
                    Optimize Subject
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                
                {/* AI Options Panel */}
                {showAiOptions && (
                  <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center">
                        <Sparkles className="mr-2 h-4 w-4 text-purple-600" />
                        AI Configuration
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-medium mb-1 block">Message Type</label>
                          <select
                            value={messageType}
                            onChange={(e) => setMessageType(e.target.value as any)}
                            className="w-full px-2 py-1 text-sm border border-input rounded bg-background"
                          >
                            <option value="general">General</option>
                            <option value="reminder">Payment Reminder</option>
                            <option value="welcome">Welcome Message</option>
                            <option value="follow_up">Follow Up</option>
                            <option value="overdue">Overdue Notice</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="text-xs font-medium mb-1 block">Tone</label>
                          <select
                            value={selectedTone}
                            onChange={(e) => setSelectedTone(e.target.value as any)}
                            className="w-full px-2 py-1 text-sm border border-input rounded bg-background"
                          >
                            <option value="friendly">Friendly</option>
                            <option value="professional">Professional</option>
                            <option value="urgent">Urgent</option>
                            <option value="formal">Formal</option>
                          </select>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-xs font-medium mb-1 block">
                          Personalization Level: {personalizationLevel}/5
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="5"
                          value={personalizationLevel}
                          onChange={(e) => setPersonalizationLevel(parseInt(e.target.value))}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>Basic</span>
                          <span>Highly Personalized</span>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={optimizeSubjectLine}
                          disabled={aiGenerating || !subject.trim()}
                          className="flex-1"
                        >
                          <Target className="mr-1 h-3 w-3" />
                          Optimize Subject
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={enhanceWithPersonalization}
                          disabled={aiGenerating || selectedParents.length === 0}
                          className="flex-1"
                        >
                          <TrendingUp className="mr-1 h-3 w-3" />
                          Personalize
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* AI Suggestions */}
                {aiSuggestions.length > 0 && (
                  <Card className="border-green-200 bg-green-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center text-green-700">
                        <Sparkles className="mr-2 h-4 w-4" />
                        AI Suggestions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {aiSuggestions.map((suggestion, index) => (
                          <div key={index} className="text-sm p-2 bg-white border border-green-200 rounded">
                            {suggestion}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
                <div>
                  <label className="text-sm font-medium mb-2 block">Subject</label>
                  <AIInput
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Enter subject line..."
                    fieldType="email_subject"
                    context={`Email subject for ${selectedParents.length} parent(s) in the Rise as One program`}
                    tone={selectedTone}
                    parentData={selectedParents.length > 0 ? parents.find(p => p.id === selectedParents[0]) : null}
                    onAIGeneration={(text) => setSubject(text)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Message Body</label>
                  <AITextarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Enter your message here..."
                    rows={8}
                    fieldType="message_body"
                    context={`${messageType} message for ${selectedParents.length} parent(s) in the Rise as One basketball program`}
                    tone={selectedTone}
                    parentData={selectedParents.length > 0 ? parents.find(p => p.id === selectedParents[0]) : null}
                    onAIGeneration={(text) => setBody(text)}
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
                          <AIInput
                            placeholder={`Enter value for ${variable}`}
                            value={variables[variable] || ''}
                            onChange={(e) => setVariables(prev => ({
                              ...prev,
                              [variable]: e.target.value
                            }))}
                            fieldType="form_field"
                            context={`Template variable "${variable}" for parent communication messages`}
                            tone="professional"
                            onAIGeneration={(text) => setVariables(prev => ({
                              ...prev,
                              [variable]: text
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
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 z-10" />
                  <AIInput
                    placeholder="Search parents..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    fieldType="search_query"
                    context="Search for parents in the Rise as One program by name, email, or other details"
                    tone="casual"
                    onAIGeneration={(text) => setSearchTerm(text)}
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
