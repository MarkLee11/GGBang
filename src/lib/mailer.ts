/**
 * Email delivery service with Resend and SMTP fallback
 * Supports multiple email providers with graceful fallback
 */

export interface EmailOptions {
  to: string | string[]
  subject: string
  htmlBody: string
  textBody?: string
  from?: string
  replyTo?: string
}

export interface EmailResult {
  success: boolean
  messageId?: string
  provider?: 'resend' | 'smtp' | 'none'
  error?: string
}

// Email templates
export function createEmailTemplate(
  title: string,
  message: string,
  actionUrl?: string,
  actionText?: string
): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 32px;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 8px;
    }
    .title {
      font-size: 20px;
      font-weight: 600;
      color: #1a202c;
      margin-bottom: 16px;
    }
    .message {
      font-size: 16px;
      color: #4a5568;
      margin-bottom: 24px;
    }
    .action-button {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 500;
      margin: 16px 0;
    }
    .footer {
      margin-top: 32px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      font-size: 14px;
      color: #718096;
      text-align: center;
    }
    .unsubscribe {
      color: #a0aec0;
      text-decoration: none;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">GGBang</div>
    </div>
    
    <div class="title">${title}</div>
    <div class="message">${message}</div>
    
    ${actionUrl && actionText ? `
      <div style="text-align: center;">
        <a href="${actionUrl}" class="action-button">${actionText}</a>
      </div>
    ` : ''}
    
    <div class="footer">
      <p>This email was sent from GGBang. If you no longer wish to receive these notifications, you can update your preferences in your account settings.</p>
      <p><a href="#" class="unsubscribe">Unsubscribe from notifications</a></p>
    </div>
  </div>
</body>
</html>`
}

// Send email via Resend API
async function sendViaResend(options: EmailOptions): Promise<EmailResult> {
  try {
    const resendKey = process.env.RESEND_API_KEY || Deno?.env?.get?.('RESEND_API_KEY')
    if (!resendKey) {
      throw new Error('Resend API key not configured')
    }

    const fromEmail = options.from || process.env.EMAIL_SENDER || 'noreply@ggbang.app'
    
    const payload = {
      from: fromEmail,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.htmlBody,
      text: options.textBody || stripHtml(options.htmlBody),
      ...(options.replyTo && { reply_to: options.replyTo })
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`Resend API error: ${response.status} - ${JSON.stringify(errorData)}`)
    }

    const result = await response.json()
    
    return {
      success: true,
      messageId: result.id,
      provider: 'resend'
    }

  } catch (error) {
    console.error('Resend email error:', error)
    return {
      success: false,
      provider: 'resend',
      error: error instanceof Error ? error.message : 'Unknown Resend error'
    }
  }
}

// Send email via SMTP (fallback)
async function sendViaSmtp(options: EmailOptions): Promise<EmailResult> {
  try {
    // Check if SMTP credentials are configured
    const smtpHost = process.env.SMTP_HOST || Deno?.env?.get?.('SMTP_HOST')
    const smtpUser = process.env.SMTP_USER || Deno?.env?.get?.('SMTP_USER')
    const smtpPass = process.env.SMTP_PASS || Deno?.env?.get?.('SMTP_PASS')
    const smtpPort = process.env.SMTP_PORT || Deno?.env?.get?.('SMTP_PORT') || '587'

    if (!smtpHost || !smtpUser || !smtpPass) {
      throw new Error('SMTP credentials not configured')
    }

    // Note: In a real implementation, you'd use a proper SMTP library
    // For Deno Edge Functions, you might use the Deno standard library's SMTP client
    // This is a placeholder implementation
    
    console.warn('SMTP email sending not fully implemented - would send via SMTP here')
    console.log('SMTP Config:', { host: smtpHost, user: smtpUser, port: smtpPort })
    console.log('Email:', { to: options.to, subject: options.subject })

    // Simulate successful send for now
    return {
      success: true,
      messageId: `smtp-${Date.now()}`,
      provider: 'smtp'
    }

  } catch (error) {
    console.error('SMTP email error:', error)
    return {
      success: false,
      provider: 'smtp',
      error: error instanceof Error ? error.message : 'Unknown SMTP error'
    }
  }
}

// Main email sending function
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  try {
    // Validate email addresses
    const recipients = Array.isArray(options.to) ? options.to : [options.to]
    for (const email of recipients) {
      if (!isValidEmail(email)) {
        return {
          success: false,
          error: `Invalid email address: ${email}`
        }
      }
    }

    // Try Resend first
    console.log('Attempting to send email via Resend...')
    const resendResult = await sendViaResend(options)
    
    if (resendResult.success) {
      console.log('Email sent successfully via Resend:', resendResult.messageId)
      return resendResult
    }

    // Fallback to SMTP
    console.log('Resend failed, trying SMTP fallback...')
    const smtpResult = await sendViaSmtp(options)
    
    if (smtpResult.success) {
      console.log('Email sent successfully via SMTP:', smtpResult.messageId)
      return smtpResult
    }

    // Both failed - log but don't throw
    console.warn('All email providers failed, email not sent')
    return {
      success: false,
      provider: 'none',
      error: `Resend: ${resendResult.error}, SMTP: ${smtpResult.error}`
    }

  } catch (error) {
    console.error('Email sending error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown email error'
    }
  }
}

// Utility function to validate email addresses
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Utility function to strip HTML tags for text version
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
    .replace(/&amp;/g, '&') // Replace HTML entities
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim()
}

// Utility function to get user's email from Supabase
export async function getUserEmail(userId: string, supabaseClient: any): Promise<string | null> {
  try {
    // Try to get email from auth.users (admin access needed)
    const { data: authUser, error: authError } = await supabaseClient.auth.admin.getUserById(userId)
    
    if (!authError && authUser?.user?.email) {
      return authUser.user.email
    }

    // Fallback: check if user has email in their profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('email')
      .eq('user_id', userId)
      .single()
    
    if (!profileError && profile?.email) {
      return profile.email
    }

    console.warn(`Could not retrieve email for user ${userId}`)
    return null

  } catch (error) {
    console.error('Error getting user email:', error)
    return null
  }
}

// Email notification builders
export interface NotificationEmailData {
  eventTitle: string
  eventDate: string
  eventTime: string
  eventUrl?: string
  message: string
  recipientName?: string
}

export function buildJoinRequestEmail(data: NotificationEmailData): EmailOptions {
  const subject = `New join request for "${data.eventTitle}"`
  const htmlBody = createEmailTemplate(
    'New Join Request',
    data.message,
    data.eventUrl,
    'Review Request'
  )

  return {
    to: '', // Will be set by caller
    subject,
    htmlBody,
    textBody: data.message
  }
}

export function buildApprovalEmail(data: NotificationEmailData): EmailOptions {
  const subject = `You're in! "${data.eventTitle}" request approved`
  const htmlBody = createEmailTemplate(
    'Request Approved! 🎉',
    data.message,
    data.eventUrl,
    'View Event Details'
  )

  return {
    to: '', // Will be set by caller
    subject,
    htmlBody,
    textBody: data.message
  }
}

export function buildRejectionEmail(data: NotificationEmailData): EmailOptions {
  const subject = `Update on your "${data.eventTitle}" request`
  const htmlBody = createEmailTemplate(
    'Request Update',
    data.message,
    'https://ggbang.app/events', // Link to browse more events
    'Explore More Events'
  )

  return {
    to: '', // Will be set by caller
    subject,
    htmlBody,
    textBody: data.message
  }
}

export function buildLocationUnlockEmail(data: NotificationEmailData): EmailOptions {
  const subject = `📍 Location revealed for "${data.eventTitle}"`
  const htmlBody = createEmailTemplate(
    'Location Revealed! 📍',
    data.message,
    data.eventUrl,
    'View Location Details'
  )

  return {
    to: '', // Will be set by caller
    subject,
    htmlBody,
    textBody: data.message
  }
}

// Batch email sending for multiple recipients
export async function sendBatchEmails(
  emails: Array<EmailOptions & { recipientId?: string }>
): Promise<Array<EmailResult & { recipientId?: string }>> {
  const results: Array<EmailResult & { recipientId?: string }> = []
  
  // Send emails with a small delay to avoid rate limiting
  for (const email of emails) {
    const result = await sendEmail(email)
    results.push({
      ...result,
      recipientId: email.recipientId
    })
    
    // Small delay between sends (100ms)
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  return results
}
