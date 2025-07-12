
import { 
  Parent, 
  PaymentPlan, 
  Payment, 
  Template, 
  MessageLog, 
  User, 
  Contract, 
  ScheduledMessage, 
  PaymentReminder,
  RecurringMessage,
  RecurringInstance,
  RecurringRecipient,
  RecurringMessageLog,
  StripeCustomer,
  StripePaymentMethod,
  StripeSubscription,
  StripeInvoice,
  StripeWebhookEvent,
  TemplateVersion,
  TemplateImprovement,
  TemplateAnalytics,
  AIRecommendation,
  AIRecommendationAction,
  AIInsight as PrismaAIInsight,
  BackgroundJob,
  JobLog
} from '@prisma/client'

export type ParentWithRelations = Parent & {
  paymentPlans: PaymentPlan[]
  payments: Payment[]
  messageLogs: MessageLog[]
  contracts: Contract[]
  stripeCustomer?: StripeCustomer
  recurringRecipients?: RecurringRecipient[]
  recurringMessageLogs?: RecurringMessageLog[]
}

export type PaymentPlanWithRelations = PaymentPlan & {
  parent: Parent
  payments: Payment[]
  stripeSubscription?: StripeSubscription
}

export type PaymentWithRelations = Payment & {
  parent: Parent
  paymentPlan?: PaymentPlan
  reminders: PaymentReminder[]
  stripeInvoice?: StripeInvoice
}

export type TemplateWithRelations = Template & {
  messageLogs: MessageLog[]
  scheduledMessages: ScheduledMessage[]
  paymentReminders: PaymentReminder[]
  recurringMessages?: RecurringMessage[]
  versions?: TemplateVersion[]
  analytics?: TemplateAnalytics[]
}

export type MessageLogWithRelations = MessageLog & {
  parent: Parent
  template?: Template
  recurringLog?: RecurringMessageLog
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

// New Enhanced Relations
export type RecurringMessageWithRelations = RecurringMessage & {
  template?: Template
  instances: RecurringInstance[]
  recipients: RecurringRecipient[]
}

export type RecurringInstanceWithRelations = RecurringInstance & {
  recurringMessage: RecurringMessage
  logs: RecurringMessageLog[]
}

export type RecurringRecipientWithRelations = RecurringRecipient & {
  recurringMessage: RecurringMessage
  parent: Parent
}

export type StripeCustomerWithRelations = StripeCustomer & {
  parent: Parent
  paymentMethods: StripePaymentMethod[]
  subscriptions: StripeSubscription[]
  invoices: StripeInvoice[]
}

export type StripeSubscriptionWithRelations = StripeSubscription & {
  customer: StripeCustomer
  paymentPlan?: PaymentPlan
}

export type StripeInvoiceWithRelations = StripeInvoice & {
  customer: StripeCustomer
  payment?: Payment
}

export type TemplateVersionWithRelations = TemplateVersion & {
  template: Template
  improvements: TemplateImprovement[]
  analytics: TemplateAnalytics[]
}

export type AIRecommendationWithRelations = AIRecommendation & {
  actions: AIRecommendationAction[]
}

export type BackgroundJobWithRelations = BackgroundJob & {
  parentJob?: BackgroundJob
  childJobs: BackgroundJob[]
  logs: JobLog[]
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

// AI Integration Types
export interface AIGeneratedContent {
  content: string
  confidence: number
  suggestions?: string[]
  reasoning?: string
}

export interface PersonalizedMessage {
  subject: string
  body: string
  tone: 'friendly' | 'professional' | 'urgent' | 'formal'
  personalizationLevel: number
  context: string[]
}

export interface AIInsight {
  id: string
  type: 'risk_assessment' | 'payment_prediction' | 'engagement_score' | 'retention_risk' | 'contract_analysis'
  title: string
  description: string
  score: number
  confidence: number
  recommendations: string[]
  data: any
  generatedAt: Date
}

export interface ParentRiskAssessment {
  parentId: string
  riskScore: number
  paymentReliability: number
  communicationResponsiveness: number
  contractCompliance: number
  retentionRisk: number
  factors: {
    positive: string[]
    negative: string[]
    neutral: string[]
  }
  recommendations: string[]
  lastUpdated: Date
}

export interface AIWorkflowTrigger {
  id: string
  name: string
  description: string
  condition: string
  action: 'send_message' | 'create_reminder' | 'update_status' | 'escalate' | 'notify_admin'
  enabled: boolean
  aiGenerated: boolean
  parameters: any
}

export interface ContractAnalysis {
  contractId: string
  summary: string
  keyTerms: string[]
  expirationRisk: number
  complianceScore: number
  renewalRecommendation: string
  suggestedActions: string[]
  analysisDate: Date
}

export interface PaymentPrediction {
  parentId: string
  paymentId?: string
  likelihood: number
  predictedDate?: Date
  riskFactors: string[]
  confidence: number
  recommendedActions: string[]
}

export interface AIMessageRequest {
  context: {
    parentId?: string
    paymentId?: string
    contractId?: string
    messageType: 'reminder' | 'welcome' | 'follow_up' | 'overdue' | 'renewal' | 'general'
    tone: 'friendly' | 'professional' | 'urgent' | 'formal'
    urgencyLevel: 1 | 2 | 3 | 4 | 5
  }
  customInstructions?: string
  includePersonalization: boolean
  templateId?: string
}

export interface AIAnalyticsInsight {
  metric: string
  trend: 'increasing' | 'decreasing' | 'stable'
  significance: 'high' | 'medium' | 'low'
  insight: string
  recommendation: string
  data: any[]
}

export interface AIConfigSettings {
  enabled: boolean
  autoPersonalization: boolean
  riskAssessmentFrequency: 'daily' | 'weekly' | 'monthly'
  insightGenerationLevel: 'basic' | 'detailed' | 'comprehensive'
  workflowAutomation: boolean
  approvalRequired: boolean
  maxSuggestions: number
}

export interface AIStreamResponse {
  id: string
  type: 'content' | 'insight' | 'analysis' | 'recommendation'
  status: 'streaming' | 'complete' | 'error'
  content: string
  metadata?: any
}

// Enhanced Recurring Messages Types
export interface RecurringMessageCreation {
  name: string
  templateId?: string
  subject?: string
  body: string
  channel: 'email' | 'sms' | 'both'
  interval: 'daily' | 'weekly' | 'monthly' | 'custom'
  intervalValue: number
  customSchedule?: string
  targetAudience: 'all' | 'overdue_payments' | 'specific_parents' | 'payment_plan_type'
  audienceFilter?: any
  startDate: Date
  endDate?: Date
  stopConditions: string[]
  maxMessages?: number
  escalationRules?: any
  variables: string[]
}

export interface RecurringMessageStats {
  totalMessages: number
  activeRecipients: number
  messagesSent: number
  responsesReceived: number
  paymentsCompleted: number
  averageResponseTime: number
  conversionRate: number
  stopReasons: {
    user_response: number
    payment_completion: number
    manual_stop: number
    max_reached: number
  }
}

export interface RecurringSchedule {
  nextRun: Date
  upcomingRuns: Date[]
  estimatedRecipients: number
  status: 'active' | 'paused' | 'stopped'
}

// Enhanced Stripe Integration Types
export interface StripeCustomerCreation {
  parentId: string
  email: string
  name?: string
  phone?: string
  address?: any
  metadata?: any
}

export interface StripeSubscriptionCreation {
  customerId: string
  paymentPlanId?: string
  priceId: string
  quantity?: number
  trialPeriodDays?: number
  metadata?: any
}

export interface StripeWebhookProcessing {
  eventId: string
  eventType: string
  processed: boolean
  retryCount: number
  errorMessage?: string
  data: any
}

export interface StripePaymentStats {
  totalRevenue: number
  monthlyRecurring: number
  successfulPayments: number
  failedPayments: number
  churnRate: number
  averageRevenuePerUser: number
  paymentMethodBreakdown: {
    card: number
    bank_account: number
    other: number
  }
}

// AI Template Enhancement Types
export interface TemplateEnhancementRequest {
  templateId: string
  improvementType: 'tone_adjustment' | 'clarity_enhancement' | 'personalization' | 'effectiveness'
  targetAudience?: string
  desiredTone?: 'friendly' | 'professional' | 'urgent' | 'formal'
  specificInstructions?: string
}

export interface TemplatePerformanceAnalysis {
  templateId: string
  version?: string
  metrics: {
    openRate: number
    responseRate: number
    conversionRate: number
    satisfactionScore: number
  }
  period: {
    start: Date
    end: Date
  }
  sampleSize: number
  insights: string[]
  recommendations: string[]
}

export interface TemplateVersionComparison {
  originalVersion: TemplateVersion
  improvedVersion: TemplateVersion
  improvements: TemplateImprovement[]
  performanceDiff: {
    openRateChange: number
    responseRateChange: number
    conversionRateChange: number
  }
  recommendedAction: 'accept' | 'reject' | 'modify'
}

// AI Recommendation Engine Types
export interface AIRecommendationCreation {
  type: string
  category: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  confidence: number
  expectedImpact: 'low' | 'medium' | 'high'
  targetEntityType: string
  targetEntityId?: string
  context: any
  actions: AIRecommendationActionCreation[]
  autoExecutable?: boolean
  expiresAt?: Date
}

export interface AIRecommendationActionCreation {
  actionType: string
  title: string
  description: string
  parameters: any
  order: number
  isRequired: boolean
}

export interface AIRecommendationExecution {
  recommendationId: string
  executedActions: string[]
  results: {
    actionId: string
    success: boolean
    result?: any
    errorMessage?: string
  }[]
  overallSuccess: boolean
  feedback?: string
  rating?: number
}

export interface AIInsightGeneration {
  type: 'risk_assessment' | 'payment_prediction' | 'engagement_score' | 'churn_risk'
  entityType: string
  entityId?: string
  title: string
  summary: string
  score?: number
  confidence: number
  impact: 'low' | 'medium' | 'high'
  factors: any
  trends?: any
  predictions?: any
  recommendations?: any
  alertThreshold?: number
  validUntil?: Date
}

// Background Job System Types
export interface BackgroundJobCreation {
  type: string
  name: string
  priority: number
  scheduledFor: Date
  parameters?: any
  parentJobId?: string
  maxRetries?: number
}

export interface BackgroundJobExecution {
  jobId: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: number
  totalSteps?: number
  currentStep: number
  result?: any
  errorMessage?: string
}

export interface JobSystemStats {
  totalJobs: number
  pendingJobs: number
  runningJobs: number
  completedJobs: number
  failedJobs: number
  averageExecutionTime: number
  successRate: number
}

// Enhanced Communication Types
export interface RecurringMessagePreview {
  messageContent: {
    subject: string
    body: string
  }
  schedule: {
    nextSend: Date
    frequency: string
    estimatedTotal: number
  }
  audience: {
    totalRecipients: number
    eligibleRecipients: number
    excludedCount: number
  }
  stopConditions: string[]
}

export interface CommunicationAnalytics {
  totalMessages: number
  recurringMessages: number
  oneTimeMessages: number
  deliveryRate: number
  responseRate: number
  engagementScore: number
  topPerformingTemplates: {
    templateId: string
    name: string
    score: number
  }[]
  channelBreakdown: {
    email: number
    sms: number
  }
}

// Enhanced Payment Analytics
export interface PaymentForecast {
  period: 'week' | 'month' | 'quarter'
  projectedRevenue: number
  projectedPayments: number
  riskFactors: string[]
  confidence: number
  breakdown: {
    recurring: number
    oneTime: number
    overdue: number
  }
}

export interface ParentPaymentBehavior {
  parentId: string
  paymentReliability: number
  averagePaymentDelay: number
  preferredPaymentMethod: string
  riskScore: number
  patterns: string[]
  recommendations: string[]
}

// System Configuration Types
export interface AutomationSettings {
  recurringMessages: {
    enabled: boolean
    maxConcurrent: number
    retryAttempts: number
    pauseOnErrors: boolean
  }
  aiRecommendations: {
    enabled: boolean
    autoExecute: boolean
    confidenceThreshold: number
    approvalRequired: boolean
  }
  stripeIntegration: {
    webhooksEnabled: boolean
    autoCreateCustomers: boolean
    autoSyncPayments: boolean
    retryFailedPayments: boolean
  }
  notifications: {
    adminAlerts: boolean
    parentNotifications: boolean
    urgentAlertsOnly: boolean
  }
}
