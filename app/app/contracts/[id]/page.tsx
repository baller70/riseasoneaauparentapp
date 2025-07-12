
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AppLayout } from '../../../components/app-layout'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Badge } from '../../../components/ui/badge'
import { Separator } from '../../../components/ui/separator'
import { 
  ArrowLeft, 
  Download, 
  Edit, 
  Trash2,
  FileText,
  Calendar,
  User,
  CheckCircle,
  Clock,
  AlertTriangle,
  Eye
} from 'lucide-react'
import Link from 'next/link'
import { ContractWithRelations } from '../../../lib/types'

export default function ContractDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [contract, setContract] = useState<ContractWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    const fetchContract = async () => {
      try {
        const response = await fetch(`/api/contracts/${params.id}`)
        if (response.ok) {
          const data = await response.json()
          setContract(data)
        } else {
          router.push('/contracts')
        }
      } catch (error) {
        console.error('Failed to fetch contract:', error)
        router.push('/contracts')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchContract()
    }
  }, [params.id, router])

  const updateContractStatus = async (newStatus: string) => {
    if (!contract) return

    setUpdating(true)
    try {
      const response = await fetch(`/api/contracts/${contract.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: newStatus,
          signedAt: newStatus === 'signed' ? new Date().toISOString() : null
        })
      })

      if (response.ok) {
        const updatedContract = await response.json()
        setContract(updatedContract)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update contract')
      }
    } catch (error) {
      console.error('Failed to update contract:', error)
      alert('Failed to update contract')
    } finally {
      setUpdating(false)
    }
  }

  const deleteContract = async () => {
    if (!contract || !confirm('Are you sure you want to delete this contract? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/contracts/${contract.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        router.push('/contracts')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete contract')
      }
    } catch (error) {
      console.error('Failed to delete contract:', error)
      alert('Failed to delete contract')
    }
  }

  const downloadContract = () => {
    if (!contract?.fileUrl) return

    // Create a temporary link and trigger download
    const link = document.createElement('a')
    link.href = contract.fileUrl
    link.download = contract.originalName || contract.fileName || 'contract.pdf'
    link.click()
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'signed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'pending':
        return <Clock className="h-4 w-4 text-orange-600" />
      case 'expired':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      case 'rejected':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'signed':
        return 'default'
      case 'pending':
        return 'secondary'
      case 'expired':
      case 'rejected':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
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

  if (!contract) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold mb-2">Contract not found</h3>
          <p className="text-muted-foreground mb-4">
            The contract you're looking for doesn't exist or has been deleted.
          </p>
          <Button asChild>
            <Link href="/contracts">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Contracts
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
              <Link href="/contracts">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Contract Details</h1>
              <p className="text-muted-foreground">
                View and manage contract information
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={downloadContract}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            <Button variant="destructive" onClick={deleteContract}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            {/* Contract Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Contract Document</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg p-6 text-center bg-muted/50">
                  <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg mb-2">{contract.originalName}</h3>
                  <p className="text-muted-foreground mb-4">{formatFileSize(contract.fileSize)}</p>
                  <div className="flex items-center justify-center space-x-2">
                    <Button variant="outline" onClick={downloadContract}>
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                    <Button variant="outline">
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Status Management */}
            <Card>
              <CardHeader>
                <CardTitle>Status Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Current Status</span>
                    <Badge variant={getStatusVariant(contract.status)} className="flex items-center space-x-1">
                      {getStatusIcon(contract.status)}
                      <span className="capitalize">{contract.status}</span>
                    </Badge>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Update Status</h4>
                    <div className="flex flex-wrap gap-2">
                      {contract.status !== 'pending' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => updateContractStatus('pending')}
                          disabled={updating}
                        >
                          Mark as Pending
                        </Button>
                      )}
                      {contract.status !== 'signed' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => updateContractStatus('signed')}
                          disabled={updating}
                        >
                          Mark as Signed
                        </Button>
                      )}
                      {contract.status !== 'expired' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => updateContractStatus('expired')}
                          disabled={updating}
                        >
                          Mark as Expired
                        </Button>
                      )}
                      {contract.status !== 'rejected' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => updateContractStatus('rejected')}
                          disabled={updating}
                        >
                          Mark as Rejected
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            {contract.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{contract.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Parent Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Parent Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Name</label>
                  <p className="font-medium">{contract.parent.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="text-sm">{contract.parent.email}</p>
                </div>
                <Button variant="outline" size="sm" asChild className="w-full">
                  <Link href={`/parents/${contract.parent.id}`}>
                    View Parent Profile
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Contract Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Contract Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Template Type</span>
                  <span className="text-sm font-medium capitalize">
                    {contract.templateType || 'Not specified'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Version</span>
                  <span className="text-sm font-medium">{contract.version}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">File Size</span>
                  <span className="text-sm font-medium">{formatFileSize(contract.fileSize)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">File Type</span>
                  <span className="text-sm font-medium">{contract.mimeType}</span>
                </div>
              </CardContent>
            </Card>

            {/* Important Dates */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>Important Dates</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Uploaded</span>
                  <span className="text-sm">{new Date(contract.uploadedAt).toLocaleDateString()}</span>
                </div>
                {contract.signedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Signed</span>
                    <span className="text-sm">{new Date(contract.signedAt).toLocaleDateString()}</span>
                  </div>
                )}
                {contract.expiresAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Expires</span>
                    <span className="text-sm">{new Date(contract.expiresAt).toLocaleDateString()}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Last Updated</span>
                  <span className="text-sm">{new Date(contract.updatedAt).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
