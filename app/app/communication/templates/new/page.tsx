
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '../../../../components/app-layout'
import { Button } from '../../../../components/ui/button'
import { Input } from '../../../../components/ui/input'
import { Textarea } from '../../../../components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card'
import { Badge } from '../../../../components/ui/badge'
import { 
  ArrowLeft, 
  Save, 
  Eye,
  Mail,
  Smartphone,
  MessageSquare
} from 'lucide-react'
import Link from 'next/link'

export default function NewTemplatePage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  
  // Form fields
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState('general')
  const [channel, setChannel] = useState('email')
  const [detectedVariables, setDetectedVariables] = useState<string[]>([])

  // Detect variables in subject and body
  const detectVariables = (text: string) => {
    const variableRegex = /{([a-zA-Z_][a-zA-Z0-9_]*)}/g
    const matches = text.match(variableRegex) || []
    return [...new Set(matches.map(match => match.slice(1, -1)))]
  }

  const handleContentChange = () => {
    const allText = `${subject} ${body}`
    const variables = detectVariables(allText)
    setDetectedVariables(variables)
  }

  const handleSubjectChange = (value: string) => {
    setSubject(value)
    setTimeout(handleContentChange, 0)
  }

  const handleBodyChange = (value: string) => {
    setBody(value)
    setTimeout(handleContentChange, 0)
  }

  const handleSave = async () => {
    if (!name.trim() || !body.trim()) {
      alert('Name and body are required')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: name.trim(),
          subject: subject.trim(),
          body: body.trim(),
          category,
          channel,
          variables: detectedVariables
        })
      })

      if (response.ok) {
        const template = await response.json()
        router.push(`/communication/templates/${template.id}`)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create template')
      }
    } catch (error) {
      console.error('Failed to create template:', error)
      alert('Failed to create template')
    } finally {
      setSaving(false)
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
              <h1 className="text-3xl font-bold tracking-tight">Create New Template</h1>
              <p className="text-muted-foreground">
                Create a reusable message template
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={handleSave} disabled={saving || !name.trim() || !body.trim()}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Creating...' : 'Create Template'}
            </Button>
          </div>
        </div>

        {/* Form */}
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Template Content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Template Name *</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter template name..."
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Subject Line</label>
                  <Input
                    value={subject}
                    onChange={(e) => handleSubjectChange(e.target.value)}
                    placeholder="Enter subject line..."
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Message Body *</label>
                  <Textarea
                    value={body}
                    onChange={(e) => handleBodyChange(e.target.value)}
                    placeholder="Enter your message here... Use {variableName} for dynamic content."
                    rows={12}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Use curly braces for variables: {'{parentName}'}, {'{amount}'}, {'{dueDate}'}, etc.
                  </p>
                </div>

                {detectedVariables.length > 0 && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Detected Variables</label>
                    <div className="flex flex-wrap gap-2">
                      {detectedVariables.map((variable) => (
                        <Badge key={variable} variant="outline">
                          {`{${variable}}`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Template Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background"
                  >
                    <option value="general">General</option>
                    <option value="welcome">Welcome</option>
                    <option value="reminder">Reminder</option>
                    <option value="overdue">Overdue</option>
                    <option value="confirmation">Confirmation</option>
                    <option value="payment">Payment</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Channel</label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background"
                  >
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                    <option value="both">Both</option>
                  </select>
                  <div className="flex items-center space-x-2 mt-2">
                    {getChannelIcon(channel)}
                    <span className="text-sm text-muted-foreground capitalize">{channel}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Available Variables</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-2 text-xs">
                  <div className="p-2 bg-muted rounded cursor-pointer hover:bg-muted/80" 
                       onClick={() => setBody(body + '{parentName}')}>
                    <strong>{'{parentName}'}</strong> - Parent's full name
                  </div>
                  <div className="p-2 bg-muted rounded cursor-pointer hover:bg-muted/80"
                       onClick={() => setBody(body + '{parentEmail}')}>
                    <strong>{'{parentEmail}'}</strong> - Parent's email
                  </div>
                  <div className="p-2 bg-muted rounded cursor-pointer hover:bg-muted/80"
                       onClick={() => setBody(body + '{programName}')}>
                    <strong>{'{programName}'}</strong> - Program name
                  </div>
                  <div className="p-2 bg-muted rounded cursor-pointer hover:bg-muted/80"
                       onClick={() => setBody(body + '{amount}')}>
                    <strong>{'{amount}'}</strong> - Payment amount
                  </div>
                  <div className="p-2 bg-muted rounded cursor-pointer hover:bg-muted/80"
                       onClick={() => setBody(body + '{dueDate}')}>
                    <strong>{'{dueDate}'}</strong> - Payment due date
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Click on variables to add them to your message
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {subject && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Subject</label>
                      <p className="text-sm font-medium">{subject}</p>
                    </div>
                  )}
                  {body && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Message</label>
                      <div className="text-sm p-3 bg-muted rounded-lg">
                        <pre className="whitespace-pre-wrap font-sans">{body}</pre>
                      </div>
                    </div>
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
