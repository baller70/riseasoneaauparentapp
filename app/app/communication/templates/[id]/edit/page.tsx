
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AppLayout } from '../../../../../components/app-layout'
import { Button } from '../../../../../components/ui/button'
import { Input } from '../../../../../components/ui/input'
import { Textarea } from '../../../../../components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/card'
import { Badge } from '../../../../../components/ui/badge'
import { Switch } from '../../../../../components/ui/switch'
import { 
  ArrowLeft, 
  Save, 
  Eye,
  Mail,
  Smartphone,
  MessageSquare
} from 'lucide-react'
import Link from 'next/link'
import { TemplateWithRelations } from '../../../../../lib/types'

export default function EditTemplatePage() {
  const params = useParams()
  const router = useRouter()
  const [template, setTemplate] = useState<TemplateWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Form fields
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState('general')
  const [channel, setChannel] = useState('email')
  const [isActive, setIsActive] = useState(true)
  const [detectedVariables, setDetectedVariables] = useState<string[]>([])

  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const response = await fetch(`/api/templates/${params.id}`)
        if (response.ok) {
          const data = await response.json()
          setTemplate(data)
          
          // Populate form fields
          setName(data.name)
          setSubject(data.subject)
          setBody(data.body)
          setCategory(data.category)
          setChannel(data.channel)
          setIsActive(data.isActive)
        } else {
          router.push('/communication')
        }
      } catch (error) {
        console.error('Failed to fetch template:', error)
        router.push('/communication')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchTemplate()
    }
  }, [params.id, router])

  // Detect variables in subject and body
  useEffect(() => {
    const variableRegex = /{([a-zA-Z_][a-zA-Z0-9_]*)}/g
    const allText = `${subject} ${body}`
    const matches = allText.match(variableRegex) || []
    const variables = [...new Set(matches.map(match => match.slice(1, -1)))]
    setDetectedVariables(variables)
  }, [subject, body])

  const handleSave = async () => {
    if (!name.trim() || !body.trim()) {
      alert('Name and body are required')
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/templates/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: name.trim(),
          subject: subject.trim(),
          body: body.trim(),
          category,
          channel,
          isActive,
          variables: detectedVariables
        })
      })

      if (response.ok) {
        router.push(`/communication/templates/${params.id}`)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update template')
      }
    } catch (error) {
      console.error('Failed to update template:', error)
      alert('Failed to update template')
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

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
      </AppLayout>
    )
  }

  if (!template) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold mb-2">Template not found</h3>
          <Button asChild>
            <Link href="/communication">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Communication
            </Link>
          </Button>
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
              <Link href={`/communication/templates/${params.id}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Edit Template</h1>
              <p className="text-muted-foreground">
                Update template content and settings
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button asChild variant="outline">
              <Link href={`/communication/templates/${params.id}`}>
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </Link>
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Save Changes'}
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
                  <label className="text-sm font-medium mb-2 block">Template Name</label>
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
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Enter subject line..."
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Message Body</label>
                  <Textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
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

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Active</label>
                    <p className="text-xs text-muted-foreground">
                      Inactive templates won't appear in template selection
                    </p>
                  </div>
                  <Switch
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Template Usage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Times Used</span>
                  <span className="font-medium">{template.usageCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Messages Sent</span>
                  <span className="font-medium">{template.messageLogs.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Created</span>
                  <span className="text-sm">{new Date(template.createdAt).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Available Variables</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-2 text-xs">
                  <div className="p-2 bg-muted rounded">
                    <strong>{'{parentName}'}</strong> - Parent's full name
                  </div>
                  <div className="p-2 bg-muted rounded">
                    <strong>{'{parentEmail}'}</strong> - Parent's email
                  </div>
                  <div className="p-2 bg-muted rounded">
                    <strong>{'{programName}'}</strong> - Program name
                  </div>
                  <div className="p-2 bg-muted rounded">
                    <strong>{'{amount}'}</strong> - Payment amount
                  </div>
                  <div className="p-2 bg-muted rounded">
                    <strong>{'{dueDate}'}</strong> - Payment due date
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
