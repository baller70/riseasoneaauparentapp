
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
