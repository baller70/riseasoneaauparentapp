
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { AppLayout } from '../../../components/app-layout'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Badge } from '../../../components/ui/badge'
import { 
  ArrowLeft, 
  Edit, 
  Mail, 
  Phone, 
  MapPin, 
  FileText,
  CreditCard,
  MessageSquare,
  Calendar,
  DollarSign
} from 'lucide-react'
import Link from 'next/link'
import { ParentWithRelations } from '../../../lib/types'

export default function ParentProfilePage() {
  const params = useParams()
  const parentId = params?.id as string
  const [parent, setParent] = useState<ParentWithRelations | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchParent = async () => {
      try {
        const response = await fetch(`/api/parents/${parentId}`)
        if (response.ok) {
          const data = await response.json()
          setParent(data)
        }
      } catch (error) {
        console.error('Failed to fetch parent:', error)
      } finally {
        setLoading(false)
      }
    }

    if (parentId) {
      fetchParent()
    }
  }, [parentId])

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
      </AppLayout>
    )
  }

  if (!parent) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Parent Not Found</h1>
          <p className="text-muted-foreground mb-4">The parent you're looking for doesn't exist.</p>
          <Button asChild>
            <Link href="/parents">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Parents
            </Link>
          </Button>
        </div>
      </AppLayout>
    )
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default'
      case 'inactive': return 'secondary'
      case 'suspended': return 'destructive'
      default: return 'outline'
    }
  }

  const getContractStatusVariant = (status: string) => {
    switch (status) {
      case 'signed': return 'default'
      case 'pending': return 'secondary'
      case 'expired': return 'destructive'
      default: return 'outline'
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button asChild variant="outline" size="sm">
              <Link href="/parents">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Parents
              </Link>
            </Button>
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                <span className="text-white font-bold text-2xl">
                  {parent.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{parent.name}</h1>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant={getStatusVariant(parent.status)}>
                    {parent.status}
                  </Badge>
                  <Badge variant={getContractStatusVariant(parent.contractStatus)}>
                    Contract: {parent.contractStatus}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline">
              <MessageSquare className="mr-2 h-4 w-4" />
              Send Message
            </Button>
            <Button asChild>
              <Link href={`/parents/${parent.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Parent
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{parent.email}</p>
                </div>
              </div>
              {parent.phone && (
                <div className="flex items-center space-x-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Phone</p>
                    <p className="text-sm text-muted-foreground">{parent.phone}</p>
                  </div>
                </div>
              )}
              {parent.address && (
                <div className="flex items-center space-x-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Address</p>
                    <p className="text-sm text-muted-foreground">{parent.address}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card>
            <CardHeader>
              <CardTitle>Emergency Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {parent.emergencyContact && (
                <div>
                  <p className="text-sm font-medium">Contact Person</p>
                  <p className="text-sm text-muted-foreground">{parent.emergencyContact}</p>
                </div>
              )}
              {parent.emergencyPhone && (
                <div className="flex items-center space-x-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Emergency Phone</p>
                    <p className="text-sm text-muted-foreground">{parent.emergencyPhone}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contract Status */}
          <Card>
            <CardHeader>
              <CardTitle>Contract Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <Badge variant={getContractStatusVariant(parent.contractStatus)}>
                    {parent.contractStatus}
                  </Badge>
                </div>
              </div>
              {parent.contractUploadedAt && (
                <div>
                  <p className="text-sm font-medium">Uploaded</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(parent.contractUploadedAt).toLocaleDateString()}
                  </p>
                </div>
              )}
              {parent.contractExpiresAt && (
                <div>
                  <p className="text-sm font-medium">Expires</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(parent.contractExpiresAt).toLocaleDateString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Payment Plans */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Plans
            </CardTitle>
          </CardHeader>
          <CardContent>
            {parent.paymentPlans && parent.paymentPlans.length > 0 ? (
              <div className="space-y-4">
                {parent.paymentPlans.map((plan) => (
                  <div key={plan.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{plan.type} Payment Plan</p>
                        <p className="text-sm text-muted-foreground">{plan.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">${Number(plan.totalAmount).toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">
                          ${Number(plan.installmentAmount).toLocaleString()} x {plan.installments}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No payment plans found</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Recent Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {parent.payments && parent.payments.length > 0 ? (
              <div className="space-y-3">
                {parent.payments.slice(0, 5).map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium">${Number(payment.amount).toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">
                        Due: {new Date(payment.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={payment.status === 'paid' ? 'default' : payment.status === 'overdue' ? 'destructive' : 'secondary'}>
                      {payment.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No payment records found</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        {parent.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{parent.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}
