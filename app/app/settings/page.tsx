
'use client'

import { useEffect, useState } from 'react'
import { AppLayout } from '../../components/app-layout'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Textarea } from '../../components/ui/textarea'
import { AIInput } from '../../components/ui/ai-input'
import { AITextarea } from '../../components/ui/ai-textarea'
import { Switch } from '../../components/ui/switch'
import { 
  Save,
  Settings as SettingsIcon,
  CreditCard,
  Mail,
  Smartphone,
  Bell,
  Shield,
  Database
} from 'lucide-react'
import { useToast } from '../../hooks/use-toast'

interface SystemSettings {
  programName: string
  programFee: string
  emailFromAddress: string
  smsFromNumber: string
  reminderDays: string
  lateFeeAmount: string
  gracePeriodDays: string
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>({
    programName: '',
    programFee: '',
    emailFromAddress: '',
    smsFromNumber: '',
    reminderDays: '',
    lateFeeAmount: '',
    gracePeriodDays: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings')
        if (response.ok) {
          const data = await response.json()
          const settingsMap: Record<string, string> = {}
          data.forEach((setting: any) => {
            settingsMap[setting.key] = setting.value
          })
          
          setSettings({
            programName: settingsMap.program_name || 'Rise as One Yearly Program',
            programFee: settingsMap.program_fee || '1565',
            emailFromAddress: settingsMap.email_from_address || 'admin@riseasone.com',
            smsFromNumber: settingsMap.sms_from_number || '+1-555-0123',
            reminderDays: settingsMap.reminder_days || '7,1',
            lateFeeAmount: settingsMap.late_fee_amount || '25',
            gracePeriodDays: settingsMap.grace_period_days || '3'
          })
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSettings()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      })

      if (response.ok) {
        toast({
          title: "Settings saved",
          description: "Your settings have been updated successfully.",
        })
      } else {
        throw new Error('Failed to save settings')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
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
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">
              Configure your basketball program management system
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Program Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                Program Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="programName">Program Name</Label>
                <AIInput
                  id="programName"
                  value={settings.programName}
                  onChange={(e) => setSettings(prev => ({ ...prev, programName: e.target.value }))}
                  placeholder="Rise as One Yearly Program"
                  fieldType="settings_description"
                  context="Name of the basketball program for youth development"
                  tone="professional"
                  onAIGeneration={(text) => setSettings(prev => ({ ...prev, programName: text }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="programFee">Annual Program Fee ($)</Label>
                <Input
                  id="programFee"
                  type="number"
                  value={settings.programFee}
                  onChange={(e) => setSettings(prev => ({ ...prev, programFee: e.target.value }))}
                  placeholder="1565"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lateFeeAmount">Late Fee Amount ($)</Label>
                <Input
                  id="lateFeeAmount"
                  type="number"
                  value={settings.lateFeeAmount}
                  onChange={(e) => setSettings(prev => ({ ...prev, lateFeeAmount: e.target.value }))}
                  placeholder="25"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gracePeriodDays">Grace Period (Days)</Label>
                <Input
                  id="gracePeriodDays"
                  type="number"
                  value={settings.gracePeriodDays}
                  onChange={(e) => setSettings(prev => ({ ...prev, gracePeriodDays: e.target.value }))}
                  placeholder="3"
                />
              </div>
            </CardContent>
          </Card>

          {/* Communication Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Communication Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="emailFromAddress">From Email Address</Label>
                <Input
                  id="emailFromAddress"
                  type="email"
                  value={settings.emailFromAddress}
                  onChange={(e) => setSettings(prev => ({ ...prev, emailFromAddress: e.target.value }))}
                  placeholder="admin@riseasone.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smsFromNumber">SMS From Number</Label>
                <Input
                  id="smsFromNumber"
                  value={settings.smsFromNumber}
                  onChange={(e) => setSettings(prev => ({ ...prev, smsFromNumber: e.target.value }))}
                  placeholder="+1-555-0123"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reminderDays">Payment Reminder Days</Label>
                <Input
                  id="reminderDays"
                  value={settings.reminderDays}
                  onChange={(e) => setSettings(prev => ({ ...prev, reminderDays: e.target.value }))}
                  placeholder="7,1"
                />
                <p className="text-sm text-muted-foreground">
                  Comma-separated list of days before due date to send reminders
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Payment Integration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Integration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="stripePublishableKey">Stripe Publishable Key</Label>
                <Input
                  id="stripePublishableKey"
                  type="password"
                  placeholder="pk_test_..."
                  disabled
                />
                <p className="text-sm text-muted-foreground">
                  Contact support to configure Stripe integration
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="stripeSecretKey">Stripe Secret Key</Label>
                <Input
                  id="stripeSecretKey"
                  type="password"
                  placeholder="sk_test_..."
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stripeWebhookSecret">Webhook Secret</Label>
                <Input
                  id="stripeWebhookSecret"
                  type="password"
                  placeholder="whsec_..."
                  disabled
                />
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send email notifications for important events
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>SMS Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send SMS notifications for urgent matters
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Payment Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatic payment reminder notifications
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Overdue Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Alerts for overdue payments
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} size="lg">
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving Changes...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save All Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </AppLayout>
  )
}
