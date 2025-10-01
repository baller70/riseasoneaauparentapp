
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/db'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    })

    // Always return success to avoid email enumeration attacks
    if (!user) {
      return NextResponse.json({
        message: 'If an account exists with that email, a password reset link has been sent.'
      })
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex')

    // Set token expiry to 1 hour from now
    const resetTokenExpiry = new Date(Date.now() + 3600000)

    // Save hashed token to database
    await prisma.user.update({
      where: { email },
      data: {
        resetToken: hashedToken,
        resetTokenExpiry
      }
    })

    // In production, send email with reset link
    // For now, return the token (in production, this should be sent via email)
    const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`
    
    console.log('Password Reset Link:', resetUrl)
    console.log('Token will expire at:', resetTokenExpiry)

    return NextResponse.json({
      message: 'If an account exists with that email, a password reset link has been sent.',
      // Remove these in production - they should only be sent via email
      resetUrl,
      token: resetToken
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'An error occurred while processing your request' },
      { status: 500 }
    )
  }
}
