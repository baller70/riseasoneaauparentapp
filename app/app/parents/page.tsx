
'use client'

import { useEffect, useState } from 'react'
import { AppLayout } from '../../components/app-layout'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Eye, 
  Edit, 
  MessageSquare,
  CreditCard,
  Users,
  Brain,
  AlertTriangle,
  TrendingUp,
  Wand2,
  Target,
  Shield,
  Zap
} from 'lucide-react'
import Link from 'next/link'
import { ParentWithRelations } from '../../lib/types'

export default function ParentsPage() {
  const [parents, setParents] = useState<ParentWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedParents, setSelectedParents] = useState<string[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [showAiActions, setShowAiActions] = useState(false)
  const [riskAssessments, setRiskAssessments] = useState<Record<string, any>>({})

  useEffect(() => {
    const fetchParents = async () => {
      try {
        const response = await fetch('/api/parents')
        if (response.ok) {
          const data = await response.json()
          setParents(data)
        }
      } catch (error) {
        console.error('Failed to fetch parents:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchParents()
  }, [])

  const filteredParents = parents.filter(parent => {
    const matchesSearch = parent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         parent.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || parent.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default'
      case 'inactive':
        return 'secondary'
      case 'suspended':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const getContractStatusVariant = (status: string) => {
    switch (status) {
      case 'signed':
        return 'default'
      case 'pending':
        return 'secondary'
      case 'expired':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  // AI Functions
  const performBulkAIAnalysis = async () => {
    if (selectedParents.length === 0) {
      alert('Please select parents for AI analysis')
      return
    }

    setAiLoading(true)
    try {
      const response = await fetch('/api/ai/bulk-operations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          operation: 'assess_parent_risks',
          parentIds: selectedParents
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.results.assessments) {
          const assessmentMap = data.results.assessments.reduce((acc: any, assessment: any) => {
            acc[assessment.parentId] = assessment
            return acc
          }, {})
          setRiskAssessments(prev => ({ ...prev, ...assessmentMap }))
        }
      }
    } catch (error) {
      console.error('Bulk AI analysis error:', error)
      alert('Failed to perform AI analysis')
    } finally {
      setAiLoading(false)
    }
  }

  const generateBulkMessages = async () => {
    if (selectedParents.length === 0) {
      alert('Please select parents for message generation')
      return
    }

    setAiLoading(true)
    try {
      const response = await fetch('/api/ai/bulk-operations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          operation: 'generate_personalized_messages',
          parentIds: selectedParents,
          parameters: {
            messageType: 'general',
            tone: 'friendly',
            includeDetails: true
          }
        })
      })

      if (response.ok) {
        const data = await response.json()
        alert(`Generated ${data.results.successfullyGenerated} personalized messages`)
      }
    } catch (error) {
      console.error('Bulk message generation error:', error)
      alert('Failed to generate messages')
    } finally {
      setAiLoading(false)
    }
  }

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

  const getRiskLevel = (parentId: string) => {
    const assessment = riskAssessments[parentId]
    if (!assessment) return null
    return assessment.riskLevel
  }

  const getRiskScore = (parentId: string) => {
    const assessment = riskAssessments[parentId]
    if (!assessment) return null
    return assessment.riskScore
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
            <h1 className="text-3xl font-bold tracking-tight">Parents</h1>
            <p className="text-muted-foreground">
              Manage parent profiles and information
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {selectedParents.length > 0 && (
              <>
                <Button
                  variant="outline"
                  onClick={performBulkAIAnalysis}
                  disabled={aiLoading}
                  size="sm"
                >
                  {aiLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                  ) : (
                    <Brain className="mr-2 h-4 w-4" />
                  )}
                  AI Analysis ({selectedParents.length})
                </Button>
                <Button
                  variant="outline"
                  onClick={generateBulkMessages}
                  disabled={aiLoading}
                  size="sm"
                >
                  <Wand2 className="mr-2 h-4 w-4" />
                  Generate Messages
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowAiActions(!showAiActions)}
                  size="sm"
                >
                  <Zap className="mr-2 h-4 w-4" />
                  More AI Actions
                </Button>
              </>
            )}
            <Button asChild variant="outline">
              <Link href="/parents/import">
                <Users className="mr-2 h-4 w-4" />
                Import Parents
              </Link>
            </Button>
            <Button asChild>
              <Link href="/parents/new">
                <Plus className="mr-2 h-4 w-4" />
                Add Parent
              </Link>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search parents by name or email..."
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
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
                <Button variant="outline">
                  <Filter className="mr-2 h-4 w-4" />
                  More Filters
                </Button>
              </div>
              
              {/* Bulk Selection Controls */}
              {filteredParents.length > 0 && (
                <div className="flex items-center justify-between border-t pt-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedParents.length === filteredParents.length}
                        onChange={(e) => e.target.checked ? selectAllParents() : clearSelection()}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <span className="text-sm font-medium">
                        Select All ({filteredParents.length})
                      </span>
                    </div>
                    {selectedParents.length > 0 && (
                      <Badge variant="secondary">
                        {selectedParents.length} selected
                      </Badge>
                    )}
                  </div>
                  
                  {selectedParents.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={clearSelection}
                      >
                        Clear Selection
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAiActions(!showAiActions)}
                      >
                        <Brain className="mr-2 h-4 w-4" />
                        AI Actions
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* AI Actions Panel */}
        {showAiActions && selectedParents.length > 0 && (
          <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
            <CardHeader>
              <CardTitle className="text-sm flex items-center">
                <Brain className="mr-2 h-4 w-4 text-purple-600" />
                AI Actions for {selectedParents.length} Selected Parents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={performBulkAIAnalysis}
                  disabled={aiLoading}
                  className="flex-col h-auto py-3"
                >
                  <Shield className="h-5 w-5 mb-1" />
                  <span className="text-xs">Risk Assessment</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateBulkMessages}
                  disabled={aiLoading}
                  className="flex-col h-auto py-3"
                >
                  <MessageSquare className="h-5 w-5 mb-1" />
                  <span className="text-xs">Generate Messages</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={aiLoading}
                  className="flex-col h-auto py-3"
                >
                  <TrendingUp className="h-5 w-5 mb-1" />
                  <span className="text-xs">Payment Prediction</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={aiLoading}
                  className="flex-col h-auto py-3"
                >
                  <Target className="h-5 w-5 mb-1" />
                  <span className="text-xs">Engagement Analysis</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Parents List */}
        <div className="grid gap-4">
          {filteredParents.length > 0 ? (
            filteredParents.map((parent) => (
              <Card key={parent.id} className={`hover:shadow-md transition-shadow ${selectedParents.includes(parent.id) ? 'ring-2 ring-purple-200 bg-purple-50' : ''}`}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedParents.includes(parent.id)}
                          onChange={(e) => handleParentSelection(parent.id, e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <div className="relative">
                          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                            <span className="text-white font-semibold text-lg">
                              {parent.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          {getRiskLevel(parent.id) && (
                            <div className={`absolute -top-1 -right-1 h-4 w-4 rounded-full flex items-center justify-center ${
                              getRiskLevel(parent.id) === 'high' ? 'bg-red-500' : 
                              getRiskLevel(parent.id) === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                            }`}>
                              <AlertTriangle className="h-2 w-2 text-white" />
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-lg">{parent.name}</h3>
                          {getRiskLevel(parent.id) && (
                            <Badge
                              variant={
                                getRiskLevel(parent.id) === 'high' ? 'destructive' : 
                                getRiskLevel(parent.id) === 'medium' ? 'secondary' : 'default'
                              }
                              className="text-xs"
                            >
                              {getRiskLevel(parent.id)?.toUpperCase()} RISK
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground">{parent.email}</p>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>{parent.phone}</span>
                          {getRiskScore(parent.id) && (
                            <span className="flex items-center space-x-1">
                              <Brain className="h-3 w-3" />
                              <span>Risk: {getRiskScore(parent.id)}/100</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="flex items-center space-x-2 mb-1">
                          <Badge variant={getStatusVariant(parent.status)}>
                            {parent.status}
                          </Badge>
                          <Badge variant={getContractStatusVariant(parent.contractStatus)}>
                            Contract: {parent.contractStatus}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {parent.paymentPlans?.length || 0} payment plans
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/parents/${parent.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/parents/${parent.id}/edit`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm">
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <CreditCard className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No parents found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm || statusFilter !== 'all' 
                      ? 'Try adjusting your search criteria'
                      : 'Get started by adding your first parent'
                    }
                  </p>
                  <Button asChild>
                    <Link href="/parents/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Parent
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
