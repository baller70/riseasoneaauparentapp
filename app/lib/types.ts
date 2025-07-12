
import { 
  Parent, 
  PaymentPlan, 
  Payment, 
  Template, 
  MessageLog, 
  User, 
  Contract, 
  ScheduledMessage, 
  PaymentReminder 
} from '@prisma/client'

export type ParentWithRelations = Parent & {
  paymentPlans: PaymentPlan[]
  payments: Payment[]
  messageLogs: MessageLog[]
  contracts: Contract[]
}

export type PaymentPlanWithRelations = PaymentPlan & {
  parent: Parent
  payments: Payment[]
}

export type PaymentWithRelations = Payment & {
  parent: Parent
  paymentPlan?: PaymentPlan
  reminders: PaymentReminder[]
}

export type TemplateWithRelations = Template & {
  messageLogs: MessageLog[]
  scheduledMessages: ScheduledMessage[]
  paymentReminders: PaymentReminder[]
}

export type MessageLogWithRelations = MessageLog & {
  parent: Parent
  template?: Template
}

export type ContractWithRelations = Contract & {
  parent: Parent
}

export type ScheduledMessageWithRelations = ScheduledMessage & {
  template?: Template
}

export type PaymentReminderWithRelations = PaymentReminder & {
  payment: PaymentWithRelations
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

// Communication types
export interface MessageComposition {
  templateId?: string
  subject: string
  body: string
  channel: string
  recipients: string[] // Parent IDs
  scheduledFor?: Date
  variables?: Record<string, string>
}

export interface MessagePreview {
  subject: string
  body: string
  recipientCount: number
  estimatedDelivery?: Date
}

export interface SendMessageResult {
  success: boolean
  sent: number
  failed: number
  errors: string[]
  messageLogIds: string[]
}

// Contract types
export interface ContractUpload {
  file: File
  parentId: string
  templateType?: string
  expiresAt?: Date
  notes?: string
}

export interface ContractStats {
  total: number
  signed: number
  pending: number
  expired: number
  expiringSoon: number
}

export interface BulkContractOperation {
  contractIds: string[]
  action: 'updateStatus' | 'delete' | 'sendReminder'
  data?: any
}

// Payment types
export interface PaymentPlanCreation {
  parentId: string
  type: string
  totalAmount: number
  installmentAmount: number
  installments: number
  startDate: Date
  description?: string
}

export interface PaymentStats {
  totalRevenue: number
  totalPaid: number
  totalPending: number
  totalOverdue: number
  averagePaymentTime: number
  paymentSuccessRate: number
}

export interface OverduePayment {
  id: string
  parentName: string
  parentEmail: string
  amount: number
  dueDate: Date
  daysPastDue: number
  remindersSent: number
  lastReminderSent?: Date
}

export interface PaymentAnalytics {
  stats: PaymentStats
  monthlyRevenue: { month: string; revenue: number; payments: number }[]
  paymentMethodBreakdown: { method: string; count: number; amount: number }[]
  overdueAnalysis: {
    totalOverdue: number
    averageDaysOverdue: number
    recoveryRate: number
  }
}

export interface ReminderSettings {
  enabled: boolean
  firstReminderDays: number
  secondReminderDays: number
  finalNoticeDays: number
  escalationDays: number
}
