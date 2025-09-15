// Email service for AUSA Finance Dashboard

import type { EmailTemplate } from './templates'

// Import config conditionally to avoid build-time issues
let config: any
try {
  config = require('@/lib/env').config
} catch {
  config = {
    email: {
      provider: 'development',
      apiKey: 'dummy',
      fromAddress: 'noreply@example.com',
      fromName: 'AUSA Finance Dashboard',
    },
  }
}

export interface EmailOptions {
  to: string
  subject: string
  html: string
  text: string
  from?: string
  replyTo?: string
}

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Send email using configured email provider
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  try {
    const provider = config.email.provider

    switch (provider) {
      case 'resend':
        return await sendWithResend(options)
      case 'sendgrid':
        return await sendWithSendGrid(options)
      case 'ses':
        return await sendWithSES(options)
      default:
        // For development, log email instead of sending
        return await logEmailForDevelopment(options)
    }
  } catch (error) {
    console.error('Error sending email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Email sending failed',
    }
  }
}

/**
 * Send email using Resend
 */
async function sendWithResend(options: EmailOptions): Promise<EmailResult> {
  if (!config.email.apiKey) {
    return { success: false, error: 'Resend API key not configured' }
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.email.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: options.from || config.email.fromAddress || 'noreply@ausa.com.au',
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        reply_to: options.replyTo,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: result.message || 'Email sending failed',
      }
    }

    return {
      success: true,
      messageId: result.id,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Resend API error',
    }
  }
}

/**
 * Send email using SendGrid (placeholder)
 */
async function sendWithSendGrid(options: EmailOptions): Promise<EmailResult> {
  // Placeholder for SendGrid integration
  console.log('SendGrid email sending not implemented yet')
  return logEmailForDevelopment(options)
}

/**
 * Send email using AWS SES (placeholder)
 */
async function sendWithSES(options: EmailOptions): Promise<EmailResult> {
  // Placeholder for AWS SES integration
  console.log('AWS SES email sending not implemented yet')
  return logEmailForDevelopment(options)
}

/**
 * Log email for development (instead of sending)
 */
async function logEmailForDevelopment(
  options: EmailOptions
): Promise<EmailResult> {
  console.log('📧 EMAIL (Development Mode)')
  console.log('To:', options.to)
  console.log(
    'From:',
    options.from || config.email.fromAddress || 'noreply@ausa.com.au'
  )
  console.log('Subject:', options.subject)
  console.log('Text:', options.text)
  console.log('HTML length:', options.html.length, 'characters')
  console.log('---')

  return {
    success: true,
    messageId: `dev-${Date.now()}`,
  }
}

/**
 * Send invitation email with template
 */
export async function sendInvitationEmail(
  recipientEmail: string,
  template: EmailTemplate
): Promise<EmailResult> {
  return sendEmail({
    to: recipientEmail,
    subject: template.subject,
    html: template.html,
    text: template.text,
    from: config.email.fromAddress || 'noreply@ausa.com.au',
  })
}

/**
 * Send password reset email with template
 */
export async function sendPasswordResetEmail(
  recipientEmail: string,
  template: EmailTemplate
): Promise<EmailResult> {
  return sendEmail({
    to: recipientEmail,
    subject: template.subject,
    html: template.html,
    text: template.text,
    from: config.email.fromAddress || 'noreply@ausa.com.au',
  })
}

/**
 * Send account activation notification
 */
export async function sendActivationNotificationEmail(
  recipientEmail: string,
  template: EmailTemplate
): Promise<EmailResult> {
  return sendEmail({
    to: recipientEmail,
    subject: template.subject,
    html: template.html,
    text: template.text,
    from: config.email.fromAddress || 'noreply@ausa.com.au',
  })
}

/**
 * Validate email address format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Check if email domain is allowed (optional security feature)
 */
export function isAllowedEmailDomain(
  email: string,
  allowedDomains?: string[]
): boolean {
  if (!allowedDomains || allowedDomains.length === 0) {
    return true // No domain restrictions
  }

  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain) return false

  return allowedDomains.some(
    allowedDomain =>
      domain === allowedDomain.toLowerCase() ||
      domain.endsWith(`.${allowedDomain.toLowerCase()}`)
  )
}
