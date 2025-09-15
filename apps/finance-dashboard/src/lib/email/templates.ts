// Email templates for AUSA Finance Dashboard

import { getRoleInfo } from '@/lib/auth/roles'
import { config } from '@/lib/env'
import type { UserRole } from '@/types'

export interface EmailTemplate {
  subject: string
  html: string
  text: string
}

export interface InvitationEmailData {
  recipientEmail: string
  recipientFirstName?: string
  recipientLastName?: string
  role: UserRole
  inviterName: string
  inviterRole: UserRole
  invitationUrl: string
  companyName: string
}

/**
 * Generate invitation email template
 */
export function generateInvitationEmail(
  data: InvitationEmailData
): EmailTemplate {
  const roleInfo = getRoleInfo(data.role)
  const recipientName = data.recipientFirstName
    ? `${data.recipientFirstName} ${data.recipientLastName || ''}`.trim()
    : 'Team Member'

  const subject = `Welcome to ${data.companyName} Finance Dashboard - ${roleInfo.label} Access`

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f9fafb;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      width: 60px;
      height: 60px;
      background-color: #0ea5e9;
      border-radius: 50%;
      margin: 0 auto 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 24px;
      font-weight: bold;
    }
    .title {
      color: #1f2937;
      font-size: 24px;
      font-weight: 600;
      margin: 0 0 8px 0;
    }
    .subtitle {
      color: #6b7280;
      font-size: 16px;
      margin: 0;
    }
    .role-badge {
      display: inline-block;
      background-color: #dbeafe;
      color: #1e40af;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 500;
      margin: 20px 0;
    }
    .content {
      margin: 30px 0;
    }
    .cta-button {
      display: inline-block;
      background-color: #0ea5e9;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
      margin: 20px 0;
      text-align: center;
    }
    .info-box {
      background-color: #f0f9ff;
      border: 1px solid #bae6fd;
      border-radius: 6px;
      padding: 16px;
      margin: 20px 0;
    }
    .info-title {
      font-weight: 600;
      color: #075985;
      margin-bottom: 8px;
    }
    .info-text {
      color: #0369a1;
      font-size: 14px;
      margin: 0;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 14px;
    }
    .security-notice {
      background-color: #fef3c7;
      border: 1px solid #fbbf24;
      border-radius: 6px;
      padding: 12px;
      margin: 20px 0;
      font-size: 14px;
      color: #92400e;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🏀</div>
      <h1 class="title">Welcome to ${data.companyName}</h1>
      <p class="subtitle">Financial Dashboard Access Invitation</p>
    </div>

    <div class="content">
      <p>Hello ${recipientName},</p>
      
      <p>You've been invited by <strong>${data.inviterName}</strong> to join the ${data.companyName} Finance Dashboard with <strong>${roleInfo.label}</strong> access.</p>
      
      <div class="role-badge">${roleInfo.label}</div>
      
      <div class="info-box">
        <div class="info-title">Your Role & Permissions</div>
        <p class="info-text">${roleInfo.description}</p>
        <p class="info-text">Default access: <strong>${roleInfo.defaultDashboard === '/' ? 'Executive Dashboard' : roleInfo.defaultDashboard.replace('/', '').replace('-', ' ')}</strong></p>
      </div>

      <p>To complete your account setup and access the financial dashboard, please click the button below:</p>

      <div style="text-align: center;">
        <a href="${data.invitationUrl}" class="cta-button">Complete Account Setup</a>
      </div>

      <div class="security-notice">
        <strong>Security Notice:</strong> This invitation link is valid for 24 hours and can only be used once. If you did not expect this invitation, please contact your administrator.
      </div>

      <div class="info-box">
        <div class="info-title">What's Next?</div>
        <p class="info-text">1. Click the setup link above</p>
        <p class="info-text">2. Create a secure password</p>
        <p class="info-text">3. Access your assigned dashboard</p>
        <p class="info-text">4. Explore Australian financial year reporting features</p>
      </div>
    </div>

    <div class="footer">
      <p><strong>${data.companyName}</strong></p>
      <p>Australian Financial Year Reporting & Analytics</p>
      <p>This is an automated message. Please do not reply to this email.</p>
      <p>Questions? Contact your system administrator.</p>
    </div>
  </div>
</body>
</html>`

  const text = `
Welcome to ${data.companyName} Finance Dashboard

Hello ${recipientName},

You've been invited by ${data.inviterName} to join the ${data.companyName} Finance Dashboard with ${roleInfo.label} access.

Your Role: ${roleInfo.label}
Description: ${roleInfo.description}
Default Access: ${roleInfo.defaultDashboard === '/' ? 'Executive Dashboard' : roleInfo.defaultDashboard.replace('/', '').replace('-', ' ')}

To complete your account setup, please visit:
${data.invitationUrl}

SECURITY NOTICE: This invitation link is valid for 24 hours and can only be used once.

What's Next:
1. Click the setup link above
2. Create a secure password  
3. Access your assigned dashboard
4. Explore Australian financial year reporting features

${data.companyName}
Australian Financial Year Reporting & Analytics

This is an automated message. Please do not reply to this email.
Questions? Contact your system administrator.
`

  return { subject, html, text }
}

/**
 * Generate password reset email template
 */
export function generatePasswordResetEmail(data: {
  recipientEmail: string
  recipientName?: string
  resetUrl: string
  companyName: string
}): EmailTemplate {
  const recipientName = data.recipientName || 'User'
  const subject = `Reset Your ${data.companyName} Dashboard Password`

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f9fafb;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      width: 60px;
      height: 60px;
      background-color: #ef4444;
      border-radius: 50%;
      margin: 0 auto 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 24px;
    }
    .title {
      color: #1f2937;
      font-size: 24px;
      font-weight: 600;
      margin: 0 0 8px 0;
    }
    .cta-button {
      display: inline-block;
      background-color: #ef4444;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
      margin: 20px 0;
    }
    .security-notice {
      background-color: #fef3c7;
      border: 1px solid #fbbf24;
      border-radius: 6px;
      padding: 12px;
      margin: 20px 0;
      font-size: 14px;
      color: #92400e;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🔒</div>
      <h1 class="title">Password Reset Request</h1>
    </div>

    <div class="content">
      <p>Hello ${recipientName},</p>
      
      <p>We received a request to reset your password for the ${data.companyName} Finance Dashboard.</p>

      <div style="text-align: center;">
        <a href="${data.resetUrl}" class="cta-button">Reset Password</a>
      </div>

      <div class="security-notice">
        <strong>Security Notice:</strong> This password reset link is valid for 1 hour. If you did not request this reset, please ignore this email and contact your administrator.
      </div>

      <p>If the button above doesn't work, copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #6b7280; font-size: 14px;">${data.resetUrl}</p>
    </div>

    <div class="footer">
      <p><strong>${data.companyName}</strong></p>
      <p>Australian Financial Year Reporting & Analytics</p>
      <p>This is an automated security message.</p>
    </div>
  </div>
</body>
</html>`

  const text = `
Password Reset Request - ${data.companyName}

Hello ${recipientName},

We received a request to reset your password for the ${data.companyName} Finance Dashboard.

To reset your password, please visit:
${data.resetUrl}

SECURITY NOTICE: This password reset link is valid for 1 hour. If you did not request this reset, please ignore this email and contact your administrator.

${data.companyName}
Australian Financial Year Reporting & Analytics
`

  return { subject, html, text }
}

/**
 * Generate account activation notification email
 */
export function generateAccountActivationEmail(data: {
  recipientEmail: string
  recipientName?: string
  activatedBy: string
  companyName: string
  dashboardUrl: string
}): EmailTemplate {
  const recipientName = data.recipientName || 'User'
  const subject = `Your ${data.companyName} Dashboard Account is Active`

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f9fafb;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      width: 60px;
      height: 60px;
      background-color: #22c55e;
      border-radius: 50%;
      margin: 0 auto 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 24px;
    }
    .title {
      color: #1f2937;
      font-size: 24px;
      font-weight: 600;
      margin: 0 0 8px 0;
    }
    .cta-button {
      display: inline-block;
      background-color: #22c55e;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
      margin: 20px 0;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">✅</div>
      <h1 class="title">Account Activated</h1>
    </div>

    <div class="content">
      <p>Hello ${recipientName},</p>
      
      <p>Great news! Your account for the ${data.companyName} Finance Dashboard has been activated by ${data.activatedBy}.</p>

      <p>You can now access the financial dashboard and begin exploring Australian financial year reporting features.</p>

      <div style="text-align: center;">
        <a href="${data.dashboardUrl}" class="cta-button">Access Dashboard</a>
      </div>

      <p>If you have any questions about using the dashboard, please contact your administrator or the finance team.</p>
    </div>

    <div class="footer">
      <p><strong>${data.companyName}</strong></p>
      <p>Australian Financial Year Reporting & Analytics</p>
    </div>
  </div>
</body>
</html>`

  const text = `
Account Activated - ${data.companyName}

Hello ${recipientName},

Great news! Your account for the ${data.companyName} Finance Dashboard has been activated by ${data.activatedBy}.

You can now access the financial dashboard at:
${data.dashboardUrl}

If you have any questions about using the dashboard, please contact your administrator or the finance team.

${data.companyName}
Australian Financial Year Reporting & Analytics
`

  return { subject, html, text }
}

/**
 * Get email template by type
 */
export function getEmailTemplate(
  type: 'invitation' | 'password_reset' | 'account_activation',
  data: any
): EmailTemplate {
  switch (type) {
    case 'invitation':
      return generateInvitationEmail(data)
    case 'password_reset':
      return generatePasswordResetEmail(data)
    case 'account_activation':
      return generateAccountActivationEmail(data)
    default:
      throw new Error(`Unknown email template type: ${type}`)
  }
}
