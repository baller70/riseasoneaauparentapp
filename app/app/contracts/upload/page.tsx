
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '../../../components/app-layout'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Textarea } from '../../../components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { 
  ArrowLeft, 
  Upload, 
  FileText,
  AlertTriangle,
  CheckCircle,
  X
} from 'lucide-react'
import Link from 'next/link'
import { ParentWithRelations } from '../../../lib/types'

export default function ContractUploadPage() {
  const router = useRouter()
  const [parents, setParents] = useState<ParentWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  // Form fields
  const [selectedParentId, setSelectedParentId] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [templateType, setTemplateType] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    const fetchParents = async () => {
      try {
        const response = await fetch('/api/parents')
        if (response.ok) {
          const data = await response.json()
          setParents(data.filter((p: ParentWithRelations) => p.status === 'active'))
        }
      } catch (error) {
        console.error('Failed to fetch parents:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchParents()
  }, [])

  const handleFileSelect = (file: File) => {
    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
    if (!allowedTypes.includes(file.type)) {
      alert('Invalid file type. Only PDF and image files are allowed.')
      return
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size too large. Maximum size is 10MB.')
      return
    }

    setSelectedFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const removeFile = () => {
    setSelectedFile(null)
  }

  const handleUpload = async () => {
    if (!selectedFile || !selectedParentId) {
      alert('Please select a file and parent')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('parentId', selectedParentId)
      formData.append('templateType', templateType)
      formData.append('expiresAt', expiresAt)
      formData.append('notes', notes)

      const response = await fetch('/api/contracts/upload', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const contract = await response.json()
        router.push(`/contracts/${contract.id}`)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to upload contract')
      }
    } catch (error) {
      console.error('Failed to upload contract:', error)
      alert('Failed to upload contract')
    } finally {
      setUploading(false)
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
              <h1 className="text-3xl font-bold tracking-tight">Upload Contract</h1>
              <p className="text-muted-foreground">
                Upload a contract document for a parent
              </p>
            </div>
          </div>
          <Button 
            onClick={handleUpload} 
            disabled={uploading || !selectedFile || !selectedParentId}
          >
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? 'Uploading...' : 'Upload Contract'}
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* File Upload */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Upload File</CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedFile ? (
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      dragActive 
                        ? 'border-orange-500 bg-orange-50' 
                        : 'border-muted-foreground/25 hover:border-orange-500 hover:bg-orange-50'
                    }`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                  >
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Drop your contract here</h3>
                    <p className="text-muted-foreground mb-4">
                      Or click to browse and select a file
                    </p>
                    <Button variant="outline" onClick={() => document.getElementById('file-input')?.click()}>
                      <Upload className="mr-2 h-4 w-4" />
                      Choose File
                    </Button>
                    <input
                      id="file-input"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileInput}
                      className="hidden"
                    />
                    <p className="text-xs text-muted-foreground mt-4">
                      Accepted formats: PDF, JPG, PNG (Max 10MB)
                    </p>
                  </div>
                ) : (
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-8 w-8 text-blue-600" />
                        <div>
                          <p className="font-medium">{selectedFile.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatFileSize(selectedFile.size)}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={removeFile}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mt-3 flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-600">File ready for upload</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* File Requirements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <span>Upload Requirements</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-2">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>PDF files for signed contracts</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Image files (JPG, PNG) for photos/scans</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Maximum file size: 10MB</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Clear, readable documents only</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contract Details */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Contract Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Parent *</label>
                  <select
                    value={selectedParentId}
                    onChange={(e) => setSelectedParentId(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background"
                  >
                    <option value="">Select a parent</option>
                    {parents.map((parent) => (
                      <option key={parent.id} value={parent.id}>
                        {parent.name} ({parent.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Template Type</label>
                  <select
                    value={templateType}
                    onChange={(e) => setTemplateType(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background"
                  >
                    <option value="">Select template type</option>
                    <option value="seasonal">Seasonal Program</option>
                    <option value="annual">Annual Program</option>
                    <option value="tournament">Tournament</option>
                    <option value="camp">Basketball Camp</option>
                    <option value="custom">Custom Agreement</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Expiration Date</label>
                  <Input
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    When this contract expires (optional)
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Notes</label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional notes about this contract..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Next Steps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-2">
                  <div className="flex items-start space-x-2">
                    <span className="flex-shrink-0 w-5 h-5 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xs font-medium">1</span>
                    <span>Contract will be uploaded with "Pending" status</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="flex-shrink-0 w-5 h-5 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xs font-medium">2</span>
                    <span>Review the contract details and content</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="flex-shrink-0 w-5 h-5 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xs font-medium">3</span>
                    <span>Update status to "Signed" when completed</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="flex-shrink-0 w-5 h-5 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xs font-medium">4</span>
                    <span>Set up reminders for contract renewal</span>
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
