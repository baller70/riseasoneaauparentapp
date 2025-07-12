
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

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const parentId = searchParams.get('parentId')

    if (parentId) {
      // Get specific customer
      const stripeCustomer = await prisma.stripeCustomer.findUnique({
        where: { parentId },
        include: {
          parent: true,
          paymentMethods: true,
          subscriptions: true,
          invoices: true
        }
      })

      return NextResponse.json(stripeCustomer)
    }

    // Get all customers
    const stripeCustomers = await prisma.stripeCustomer.findMany({
      include: {
        parent: true,
        paymentMethods: true,
        subscriptions: true,
        invoices: { take: 5, orderBy: { createdAt: 'desc' } }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(stripeCustomers)
  } catch (error) {
    console.error('Stripe customers fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Stripe customers' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { parentId, email, name, phone, address, metadata } = body

    if (!parentId || !email) {
      return NextResponse.json({ error: 'Parent ID and email are required' }, { status: 400 })
    }

    // Check if parent exists
    const parent = await prisma.parent.findUnique({
      where: { id: parentId }
    })

    if (!parent) {
      return NextResponse.json({ error: 'Parent not found' }, { status: 404 })
    }

    // Check if customer already exists
    const existingCustomer = await prisma.stripeCustomer.findUnique({
      where: { parentId }
    })

    if (existingCustomer) {
      return NextResponse.json({ error: 'Stripe customer already exists for this parent' }, { status: 400 })
    }

    // Create Stripe customer
    const stripe = getStripe()
    const stripeCustomer = await stripe.customers.create({
      email,
      name: name || parent.name,
      phone: phone || parent.phone || undefined,
      address: address || undefined,
      metadata: {
        parentId,
        ...metadata
      }
    })

    // Save to database
    const customer = await prisma.stripeCustomer.create({
      data: {
        parentId,
        stripeCustomerId: stripeCustomer.id,
        email: stripeCustomer.email!,
        name: stripeCustomer.name,
        phone: stripeCustomer.phone,
        address: stripeCustomer.address ? JSON.parse(JSON.stringify(stripeCustomer.address)) : null,
        metadata: metadata || null
      },
      include: {
        parent: true
      }
    })

    // Update parent with Stripe customer ID
    await prisma.parent.update({
      where: { id: parentId },
      data: { stripeCustomerId: stripeCustomer.id }
    })

    return NextResponse.json(customer)
  } catch (error) {
    console.error('Stripe customer creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create Stripe customer' },
      { status: 500 }
    )
  }
}
