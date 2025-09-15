// API route for sending emails

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Skip during build process
    if (process.env.VERCEL_ENV || process.env.CI) {
      return NextResponse.json({ error: 'Service not available during build' }, { status: 503 })
    }

    // Dynamic imports to avoid build-time issues
    const { getCurrentUser } = await import('@/lib/auth/auth')
    const { sendEmail } = await import('@/lib/email/service')
    const { getEmailTemplate } = await import('@/lib/email/templates')
    const { checkInviteRateLimit } = await import('@/lib/auth/rate-limit')

    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user has permission to send emails
    if (!['owner', 'finance'].includes(currentUser.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { type, templateData, recipientEmail } = body

    if (!type || !templateData || !recipientEmail) {
      return NextResponse.json(
        {
          error: 'Missing required fields: type, templateData, recipientEmail',
        },
        { status: 400 }
      )
    }

    // Rate limiting for email sending
    const rateLimitResult = checkInviteRateLimit(currentUser.id)
    if (!rateLimitResult.isAllowed) {
      return NextResponse.json(
        {
          error: 'Email rate limit exceeded. Please try again later.',
          resetTime: rateLimitResult.resetTime,
        },
        { status: 429 }
      )
    }

    // Generate email template
    const template = getEmailTemplate(type, templateData)

    // Send email
    const result = await sendEmail({
      to: recipientEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Email sending failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      message: 'Email sent successfully',
    })
  } catch (error) {
    console.error('Error in email API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Only allow POST requests
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
