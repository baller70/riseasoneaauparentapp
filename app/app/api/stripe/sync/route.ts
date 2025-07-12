
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import { prisma } from '../../../../lib/db'
import Stripe from 'stripe'

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set')
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY!)
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { syncType = 'all', parentId } = body

    const results = {
      customers: 0,
      subscriptions: 0,
      invoices: 0,
      paymentMethods: 0,
      errors: [] as string[]
    }

    try {
      if (syncType === 'all' || syncType === 'customers') {
        results.customers = await syncCustomers(parentId)
      }

      if (syncType === 'all' || syncType === 'subscriptions') {
        results.subscriptions = await syncSubscriptions(parentId)
      }

      if (syncType === 'all' || syncType === 'invoices') {
        results.invoices = await syncInvoices(parentId)
      }

      if (syncType === 'all' || syncType === 'paymentMethods') {
        results.paymentMethods = await syncPaymentMethods(parentId)
      }

    } catch (error) {
      results.errors.push(error instanceof Error ? error.message : 'Unknown error')
    }

    return NextResponse.json({
      success: true,
      message: 'Stripe sync completed',
      results
    })

  } catch (error) {
    console.error('Stripe sync error:', error)
    return NextResponse.json(
      { error: 'Failed to sync with Stripe' },
      { status: 500 }
    )
  }
}

async function syncCustomers(parentId?: string) {
  let synced = 0

  if (parentId) {
    // Sync specific parent
    const parent = await prisma.parent.findUnique({
      where: { id: parentId },
      include: { stripeCustomer: true }
    })

    if (parent?.stripeCustomerId) {
      await syncSingleCustomer(parent.stripeCustomerId)
      synced = 1
    }
  } else {
    // Sync all customers
    const stripeCustomers = await prisma.stripeCustomer.findMany({
      select: { stripeCustomerId: true }
    })

    for (const customer of stripeCustomers) {
      try {
        await syncSingleCustomer(customer.stripeCustomerId)
        synced++
      } catch (error) {
        console.error(`Failed to sync customer ${customer.stripeCustomerId}:`, error)
      }
    }
  }

  return synced
}

async function syncSingleCustomer(stripeCustomerId: string) {
  const stripe = getStripe()
  const stripeCustomer = await stripe.customers.retrieve(stripeCustomerId)
  
  if ('deleted' in stripeCustomer && stripeCustomer.deleted) {
    // Handle deleted customer
    await prisma.stripeCustomer.deleteMany({
      where: { stripeCustomerId }
    })
    return
  }

  await prisma.stripeCustomer.updateMany({
    where: { stripeCustomerId },
    data: {
      email: stripeCustomer.email!,
      name: stripeCustomer.name || null,
      phone: stripeCustomer.phone || null,
      address: stripeCustomer.address ? JSON.parse(JSON.stringify(stripeCustomer.address)) : null,
      delinquent: stripeCustomer.delinquent || false,
      balance: stripeCustomer.balance || 0,
      defaultPaymentMethod: (stripeCustomer as any).default_source as string || null,
      metadata: stripeCustomer.metadata ? JSON.parse(JSON.stringify(stripeCustomer.metadata)) : null
    }
  })
}

async function syncSubscriptions(parentId?: string) {
  let synced = 0

  const whereClause = parentId ? {
    parent: { id: parentId }
  } : {}

  const stripeCustomers = await prisma.stripeCustomer.findMany({
    where: whereClause,
    select: { id: true, stripeCustomerId: true }
  })

  for (const customer of stripeCustomers) {
    try {
      const stripe = getStripe()
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.stripeCustomerId,
        limit: 100
      })

      for (const subscription of subscriptions.data) {
        await prisma.stripeSubscription.upsert({
          where: { stripeSubscriptionId: subscription.id },
          create: {
            stripeCustomerId: customer.id,
            stripeSubscriptionId: subscription.id,
            status: subscription.status,
            currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
            currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
            cancelAt: (subscription as any).cancel_at ? new Date((subscription as any).cancel_at * 1000) : null,
            canceledAt: (subscription as any).canceled_at ? new Date((subscription as any).canceled_at * 1000) : null,
            trialStart: (subscription as any).trial_start ? new Date((subscription as any).trial_start * 1000) : null,
            trialEnd: (subscription as any).trial_end ? new Date((subscription as any).trial_end * 1000) : null,
            priceId: subscription.items.data[0]?.price.id || null,
            quantity: subscription.items.data[0]?.quantity || 1,
            metadata: subscription.metadata ? JSON.parse(JSON.stringify(subscription.metadata)) : null
          },
          update: {
            status: subscription.status,
            currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
            currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
            cancelAt: (subscription as any).cancel_at ? new Date((subscription as any).cancel_at * 1000) : null,
            canceledAt: (subscription as any).canceled_at ? new Date((subscription as any).canceled_at * 1000) : null,
            trialStart: (subscription as any).trial_start ? new Date((subscription as any).trial_start * 1000) : null,
            trialEnd: (subscription as any).trial_end ? new Date((subscription as any).trial_end * 1000) : null,
            priceId: subscription.items.data[0]?.price.id || null,
            quantity: subscription.items.data[0]?.quantity || 1,
            metadata: subscription.metadata ? JSON.parse(JSON.stringify(subscription.metadata)) : null
          }
        })
        synced++
      }
    } catch (error) {
      console.error(`Failed to sync subscriptions for customer ${customer.stripeCustomerId}:`, error)
    }
  }

  return synced
}

async function syncInvoices(parentId?: string) {
  let synced = 0

  const whereClause = parentId ? {
    parent: { id: parentId }
  } : {}

  const stripeCustomers = await prisma.stripeCustomer.findMany({
    where: whereClause,
    select: { id: true, stripeCustomerId: true }
  })

  for (const customer of stripeCustomers) {
    try {
      const stripe = getStripe()
      const invoices = await stripe.invoices.list({
        customer: customer.stripeCustomerId,
        limit: 100
      })

      for (const invoice of invoices.data) {
        await prisma.stripeInvoice.upsert({
          where: { stripeInvoiceId: invoice.id },
          create: {
            stripeCustomerId: customer.id,
            stripeInvoiceId: invoice.id!,
            subscriptionId: (invoice as any).subscription as string || null,
            status: (invoice.status as string) || 'draft',
            amountDue: invoice.amount_due,
            amountPaid: invoice.amount_paid,
            amountRemaining: invoice.amount_remaining,
            currency: invoice.currency,
            dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
            paidAt: (invoice as any).status_transitions?.paid_at ? new Date((invoice as any).status_transitions.paid_at * 1000) : null,
            paymentIntentId: (invoice as any).payment_intent as string || null,
            hostedInvoiceUrl: invoice.hosted_invoice_url || null,
            invoicePdf: invoice.invoice_pdf || null,
            attemptCount: invoice.attempt_count,
            nextPaymentAttempt: invoice.next_payment_attempt ? new Date(invoice.next_payment_attempt * 1000) : null,
            metadata: invoice.metadata ? JSON.parse(JSON.stringify(invoice.metadata)) : null
          },
          update: {
            status: (invoice.status as string) || 'draft',
            amountDue: invoice.amount_due,
            amountPaid: invoice.amount_paid,
            amountRemaining: invoice.amount_remaining,
            dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
            paidAt: (invoice as any).status_transitions?.paid_at ? new Date((invoice as any).status_transitions.paid_at * 1000) : null,
            paymentIntentId: (invoice as any).payment_intent as string || null,
            hostedInvoiceUrl: invoice.hosted_invoice_url || null,
            invoicePdf: invoice.invoice_pdf || null,
            attemptCount: invoice.attempt_count,
            nextPaymentAttempt: invoice.next_payment_attempt ? new Date(invoice.next_payment_attempt * 1000) : null,
            metadata: invoice.metadata ? JSON.parse(JSON.stringify(invoice.metadata)) : null
          }
        })
        synced++
      }
    } catch (error) {
      console.error(`Failed to sync invoices for customer ${customer.stripeCustomerId}:`, error)
    }
  }

  return synced
}

async function syncPaymentMethods(parentId?: string) {
  let synced = 0

  const whereClause = parentId ? {
    parent: { id: parentId }
  } : {}

  const stripeCustomers = await prisma.stripeCustomer.findMany({
    where: whereClause,
    select: { id: true, stripeCustomerId: true }
  })

  for (const customer of stripeCustomers) {
    try {
      const stripe = getStripe()
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customer.stripeCustomerId,
        limit: 100
      })

      for (const paymentMethod of paymentMethods.data) {
        await prisma.stripePaymentMethod.upsert({
          where: { stripePaymentMethodId: paymentMethod.id },
          create: {
            stripeCustomerId: customer.id,
            stripePaymentMethodId: paymentMethod.id,
            type: paymentMethod.type,
            card: paymentMethod.card ? JSON.parse(JSON.stringify(paymentMethod.card)) : null,
            bankAccount: paymentMethod.us_bank_account ? JSON.parse(JSON.stringify(paymentMethod.us_bank_account)) : null,
            metadata: paymentMethod.metadata ? JSON.parse(JSON.stringify(paymentMethod.metadata)) : null
          },
          update: {
            type: paymentMethod.type,
            card: paymentMethod.card ? JSON.parse(JSON.stringify(paymentMethod.card)) : null,
            bankAccount: paymentMethod.us_bank_account ? JSON.parse(JSON.stringify(paymentMethod.us_bank_account)) : null,
            metadata: paymentMethod.metadata ? JSON.parse(JSON.stringify(paymentMethod.metadata)) : null
          }
        })
        synced++
      }
    } catch (error) {
      console.error(`Failed to sync payment methods for customer ${customer.stripeCustomerId}:`, error)
    }
  }

  return synced
}
