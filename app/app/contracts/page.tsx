
'use client'

import { useEffect, useState } from 'react'
import { AppLayout } from '../../components/app-layout'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Checkbox } from '../../components/ui/checkbox'
import { 
  Plus, 
  Search, 
  Filter, 
  FileText,
  Download,
  Upload,
  Eye,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Trash2,
  Mail,
  MoreHorizontal
} from 'lucide-react'
import Link from 'next/link'

interface ContractData {
  id: string
  parentId: string
  parentName: string
  parentEmail: string
  contractStatus: string
  contractUploadedAt: Date | null
  contractExpiresAt: Date | null
  contractUrl: string | null
  fileName?: string | null
  originalName?: string | null
  templateType?: string | null
  notes?: string | null
  signedAt?: Date | null
  isNewContract: boolean
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<ContractData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [templateFilter, setTemplateFilter] = useState('all')
  const [selectedContracts, setSelectedContracts] = useState<string[]>([])
  const [bulkOperating, setBulkOperating] = useState(false)

  useEffect(() => {
    fetchContracts()
  }, [statusFilter, templateFilter])

  const fetchContracts = async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (templateFilter !== 'all') params.append('templateType', templateFilter)

      const response = await fetch(`/api/contracts?${params}`)
      if (response.ok) {
        const data = await response.json()
        setContracts(data)
      }
    } catch (error) {
      console.error('Failed to fetch contracts:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = contract.parentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contract.parentEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (contract.originalName && contract.originalName.toLowerCase().includes(searchTerm.toLowerCase()))
    return matchesSearch
  })

  const handleContractSelection = (contractId: string, selected: boolean) => {
    if (selected) {
      setSelectedContracts(prev => [...prev, contractId])
    } else {
      setSelectedContracts(prev => prev.filter(id => id !== contractId))
    }
  }

  const selectAllContracts = () => {
    setSelectedContracts(filteredContracts.map(c => c.id))
  }

  const clearSelection = () => {
    setSelectedContracts([])
  }

  const performBulkOperation = async (action: string, data?: any) => {
    if (selectedContracts.length === 0) {
      alert('Please select contracts first')
      return
    }

    const confirmationMessages = {
      updateStatus: `Update status for ${selectedContracts.length} contracts?`,
      delete: `Delete ${selectedContracts.length} contracts? This action cannot be undone.`,
      sendReminder: `Send reminders for ${selectedContracts.length} contracts?`
    }

    if (!confirm(confirmationMessages[action as keyof typeof confirmationMessages])) {
      return
    }

    setBulkOperating(true)
    try {
      const response = await fetch('/api/contracts/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contractIds: selectedContracts,
          action,
          data
        })
      })

      if (response.ok) {
        await fetchContracts()
        setSelectedContracts([])
        alert(`Successfully ${action === 'delete' ? 'deleted' : 'updated'} ${selectedContracts.length} contracts`)
      } else {
        const error = await response.json()
        alert(error.error || 'Operation failed')
      }
    } catch (error) {
      console.error('Bulk operation failed:', error)
      alert('Operation failed')
    } finally {
      setBulkOperating(false)
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'signed':
        return <CheckCircle className="h-4 w-4" />
      case 'pending':
        return <Clock className="h-4 w-4" />
      case 'expired':
      case 'rejected':
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const calculateSummary = () => {
    const total = contracts.length
    const signed = contracts.filter(c => c.contractStatus === 'signed').length
    const pending = contracts.filter(c => c.contractStatus === 'pending').length
    const expired = contracts.filter(c => c.contractStatus === 'expired').length
    const expiringSoon = contracts.filter(c => {
      if (!c.contractExpiresAt || c.contractStatus !== 'signed') return false
      const expiryDate = new Date(c.contractExpiresAt)
      const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      return expiryDate <= thirtyDaysFromNow && expiryDate > new Date()
    }).length

    return { total, signed, pending, expired, expiringSoon }
  }

  const summary = calculateSummary()

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
            <h1 className="text-3xl font-bold tracking-tight">Contracts</h1>
            <p className="text-muted-foreground">
              Manage parent contracts and documentation
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button asChild>
              <Link href="/contracts/upload">
                <Plus className="mr-2 h-4 w-4" />
                Upload Contract
              </Link>
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Contracts</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Signed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{summary.signed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{summary.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expired</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{summary.expired}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
              <Calendar className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{summary.expiringSoon}</div>
            </CardContent>
          </Card>
        </div>

        {/* Bulk Operations */}
        {selectedContracts.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium">
                    {selectedContracts.length} contract{selectedContracts.length !== 1 ? 's' : ''} selected
                  </span>
                  <Button variant="outline" size="sm" onClick={clearSelection}>
                    Clear Selection
                  </Button>
                </div>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => performBulkOperation('updateStatus', { status: 'signed' })}
                    disabled={bulkOperating}
                  >
                    Mark as Signed
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => performBulkOperation('sendReminder')}
                    disabled={bulkOperating}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Send Reminders
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => performBulkOperation('delete')}
                    disabled={bulkOperating}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Button size="sm" variant="outline" onClick={selectAllContracts}>
                  Select All
                </Button>
                <Button size="sm" variant="outline" onClick={clearSelection}>
                  Clear
                </Button>
              </div>
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search by parent name, email, or file name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-input rounded-md bg-background"
              >
                <option value="all">All Status</option>
                <option value="signed">Signed</option>
                <option value="pending">Pending</option>
                <option value="expired">Expired</option>
                <option value="rejected">Rejected</option>
              </select>
              <select
                value={templateFilter}
                onChange={(e) => setTemplateFilter(e.target.value)}
                className="px-3 py-2 border border-input rounded-md bg-background"
              >
                <option value="all">All Types</option>
                <option value="seasonal">Seasonal</option>
                <option value="annual">Annual</option>
                <option value="tournament">Tournament</option>
                <option value="camp">Camp</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Contracts List */}
        <Card>
          <CardHeader>
            <CardTitle>Contract Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredContracts.length > 0 ? (
                filteredContracts.map((contract) => (
                  <div key={contract.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <Checkbox
                        checked={selectedContracts.includes(contract.id)}
                        onCheckedChange={(checked) => handleContractSelection(contract.id, checked as boolean)}
                      />
                      <div className="flex items-center space-x-2">
                        <Badge variant={getStatusVariant(contract.contractStatus)} className="flex items-center space-x-1">
                          {getStatusIcon(contract.contractStatus)}
                          <span>{contract.contractStatus}</span>
                        </Badge>
                        {contract.templateType && (
                          <Badge variant="outline" className="capitalize">
                            {contract.templateType}
                          </Badge>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{contract.parentName}</p>
                        <p className="text-sm text-muted-foreground">{contract.parentEmail}</p>
                        {contract.originalName && (
                          <p className="text-xs text-muted-foreground">{contract.originalName}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right space-y-1">
                      {contract.contractUploadedAt && (
                        <p className="text-sm text-muted-foreground">
                          Uploaded: {new Date(contract.contractUploadedAt).toLocaleDateString()}
                        </p>
                      )}
                      {contract.signedAt && (
                        <p className="text-sm text-green-600">
                          Signed: {new Date(contract.signedAt).toLocaleDateString()}
                        </p>
                      )}
                      {contract.contractExpiresAt && (
                        <p className="text-sm text-muted-foreground">
                          Expires: {new Date(contract.contractExpiresAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {contract.isNewContract ? (
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/contracts/${contract.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </Link>
                        </Button>
                      ) : (
                        <>
                          {contract.contractUrl && (
                            <Button variant="outline" size="sm">
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </Button>
                          )}
                          {!contract.contractUrl && (
                            <Button asChild size="sm">
                              <Link href={`/contracts/upload?parentId=${contract.parentId}`}>
                                <Upload className="mr-2 h-4 w-4" />
                                Upload
                              </Link>
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No contracts found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm || statusFilter !== 'all' || templateFilter !== 'all'
                      ? 'Try adjusting your search criteria'
                      : 'Contract records will appear here once you start managing contracts'
                    }
                  </p>
                  <Button asChild>
                    <Link href="/contracts/upload">
                      <Plus className="mr-2 h-4 w-4" />
                      Upload Your First Contract
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
