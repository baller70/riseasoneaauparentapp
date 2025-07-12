
import { Parent, PaymentPlan, Payment, Template, MessageLog, User } from '@prisma/client'

export type ParentWithRelations = Parent & {
  paymentPlans: PaymentPlan[]
  payments: Payment[]
  messageLogs: MessageLog[]
}

export type PaymentPlanWithRelations = PaymentPlan & {
  parent: Parent
  payments: Payment[]
}

export type PaymentWithRelations = Payment & {
  parent: Parent
  paymentPlan?: PaymentPlan
}

export type TemplateWithRelations = Template & {
  messageLogs: MessageLog[]
}

export type MessageLogWithRelations = MessageLog & {
  parent: Parent
  template?: Template
}

export interface DashboardStats {
  totalParents: number
  totalRevenue: number
  overduePayments: number
  upcomingDues: number
  activePaymentPlans: number
  messagesSentThisMonth: number
}

export interface PaymentTrend {
  month: string
  revenue: number
  payments: number
}

export interface RecentActivity {
  id: string
  type: 'payment' | 'message' | 'parent' | 'contract'
  description: string
  timestamp: Date
  parentName?: string
}

// Bulk upload types
export interface BulkUploadParent {
  name: string
  email: string
  phone?: string
  address?: string
  emergencyContact?: string
  emergencyPhone?: string
  notes?: string
}

export interface ValidationError {
  row: number
  field: string
  message: string
  value?: string
}

export interface BulkUploadValidation {
  data: BulkUploadParent[]
  errors: ValidationError[]
  duplicates: {
    email: string
    rows: number[]
    existsInDb: boolean
  }[]
  stats: {
    totalRows: number
    validRows: number
    errorRows: number
    duplicateRows: number
  }
}

export interface BulkImportResult {
  success: boolean
  created: number
  failed: number
  errors: {
    row: number
    email: string
    message: string
  }[]
  successfulParents: {
    id: string
    name: string
    email: string
  }[]
}
