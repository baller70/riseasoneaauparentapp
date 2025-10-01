
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card'
import { Alert, AlertDescription } from '../../../components/ui/alert'
import { Loader2, ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resetLink, setResetLink] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to send reset link')
      } else {
        setSuccess(true)
        // Store reset link for display (in production, this would only be sent via email)
        if (data.resetUrl) {
          setResetLink(data.resetUrl)
        }
      }
    } catch (error) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mb-4">
            <span className="text-white font-bold text-lg">R1</span>
          </div>
          <CardTitle className="text-2xl font-bold">FORGOT PASSWORD</CardTitle>
          <CardDescription>
            Enter your email address and we'll send you a link to reset your password
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@riseasone.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                SEND RESET LINK
              </Button>

              <div className="text-center">
                <Link 
                  href="/auth/signin" 
                  className="text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="h-4 w-4" />
                  BACK TO SIGN IN
                </Link>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <Alert>
                <AlertDescription className="text-green-700">
                  If an account exists with that email, a password reset link has been sent.
                </AlertDescription>
              </Alert>

              {resetLink && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm font-medium text-blue-900 mb-2">
                    FOR DEMO PURPOSES - RESET LINK:
                  </p>
                  <a 
                    href={resetLink}
                    className="text-sm text-blue-600 hover:underline break-all"
                  >
                    {resetLink}
                  </a>
                  <p className="text-xs text-blue-700 mt-2">
                    (In production, this would be sent to your email)
                  </p>
                </div>
              )}

              <Button 
                onClick={() => router.push('/auth/signin')} 
                className="w-full"
              >
                RETURN TO SIGN IN
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
