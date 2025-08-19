// Notification Mailer for Edge Functions
// Currently implements mock mailer, ready for Resend integration

export interface MailParams {
  to: string
  subject: string
  text: string
  from?: string
}

export interface MailResult {
  ok: boolean
  provider?: 'resend'
  id?: string
  error?: string
}

/**
 * Send notification email
 * Currently returns mock response (mailer_not_configured)
 * Future: Will integrate with Resend or other email providers
 */
export async function sendMail(params: MailParams): Promise<MailResult> {
  // Mock implementation - email not actually sent
  // This will be replaced with real email provider integration
  
  console.log('Mock mailer called:', {
    to: params.to,
    subject: params.subject,
    text: params.text.substring(0, 100) + '...',
    from: params.from
  })

  return {
    ok: false,
    error: 'mailer_not_configured'
  }
}

/**
 * Future: Resend integration
 * export async function sendMailResend(params: MailParams): Promise<MailResult>
 * 
 * Future: SMTP integration  
 * export async function sendMailSMTP(params: MailParams): Promise<MailResult>
 * 
 * Future: Generic provider selection
 * export async function sendMail(params: MailParams, provider?: 'resend' | 'smtp'): Promise<MailResult>
 */
