
/**
 * Shared notification utilities for Edge Functions
 * Handles AI copy generation and email sending
 */


import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Re-export types and functions from the client-side utilities
// Note: In a real Edge Function, you'd reimplement these server-side

export type CopyType = 'request_created' | 'approved' | 'rejected' | 'location_unlocked' | 'event_reminder'

export interface NotificationContext {
  eventTitle: string
  eventDate: string
  eventTime: string
  requesterName?: string
  hostName?: string
  hostNote?: string
  locationHint?: string
  exactLocation?: string
  attendeeCount?: number
  capacity?: number
}

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

// Fallback messages for when AI is not available
const FALLBACK_MESSAGES: Record<CopyType, (ctx: NotificationContext) => string> = {
  request_created: (ctx) => 
    `${ctx.requesterName} has requested to join "${ctx.eventTitle}" on ${ctx.eventDate}. Review their request in your event dashboard.`,
  
  approved: (ctx) => 
    `Great news! Your request to join "${ctx.eventTitle}" on ${ctx.eventDate} has been approved. Get ready for an amazing time!`,
  
  rejected: (ctx) => 
    `Your request to join "${ctx.eventTitle}" wasn't approved this time. Don't worry - there are plenty more events to explore!`,
  
  location_unlocked: (ctx) => 
    `The exact location for "${ctx.eventTitle}" has been revealed! Check your event details for the address.`,
  
  event_reminder: (ctx) => 
    `Reminder: "${ctx.eventTitle}" starts soon on ${ctx.eventDate} at ${ctx.eventTime}. See you there!`
}

const PROMPTS: Record<CopyType, string> = {
  request_created: `
You are generating a friendly notification for an event host. Someone has requested to join their event.
Create a warm, professional message (1-2 sentences) that:
- Mentions the requester's name and event title
- Encourages the host to review the request
- Maintains an upbeat, community-focused tone
- Is concise but personable
Keep it under 150 characters for mobile notifications.
`,

  approved: `
You are generating a congratulatory notification for someone whose event join request was approved.
Create an enthusiastic, welcoming message (1-2 sentences) that:
- Celebrates their approval
- Mentions the event title and date
- Builds excitement for the event
- Uses warm, inclusive language
Keep it under 150 characters for mobile notifications.
`,

  rejected: `
You are generating a gentle, encouraging notification for someone whose event join request was declined.
Create a supportive message (1-2 sentences) that:
- Acknowledges the outcome kindly
- Encourages them to keep exploring events
- Maintains a positive, hopeful tone
- Doesn't make assumptions about why they were declined
Keep it under 150 characters for mobile notifications.
`,

  location_unlocked: `
You are generating an exciting notification about event location being revealed.
Create an engaging message (1-2 sentences) that:
- Announces the location reveal
- Builds anticipation for the event
- Encourages checking the updated details
- Uses energetic, positive language
Keep it under 150 characters for mobile notifications.
`,

  event_reminder: `
You are generating a friendly reminder notification for an upcoming event.
Create a helpful reminder message (1-2 sentences) that:
- Reminds about the event timing
- Builds excitement for attendance
- Uses warm, anticipatory language
- Encourages punctuality without being pushy
Keep it under 150 characters for mobile notifications.
`
}

// Generate AI-powered notification copy
export async function genNotice(copyType: CopyType, context: NotificationContext): Promise<string> {
  try {
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) {
      console.warn('OpenAI API key not configured, using fallback message')
      return FALLBACK_MESSAGES[copyType](context)
    }

    const contextString = formatContextForAI(context)
    const systemPrompt = PROMPTS[copyType]
    const userPrompt = `Context: ${contextString}\n\nGenerate the notification message:`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 100,
        temperature: 0.7,
        frequency_penalty: 0.3,
        presence_penalty: 0.2
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json() as any
    const generatedText = data.choices[0]?.message?.content?.trim()

    if (!generatedText) {
      throw new Error('No content generated by AI')
    }

    const cleanedText = cleanGeneratedText(generatedText)
    
    if (cleanedText.length > 200) {
      console.warn('AI generated text too long, using fallback')
      return FALLBACK_MESSAGES[copyType](context)
    }

    return cleanedText

  } catch (error) {
    console.error('Error generating AI copy:', error)
    return FALLBACK_MESSAGES[copyType](context)
  }
}

// Send email with Resend/SMTP fallback
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  try {
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
    const resendResult = await sendViaResend(options)
    if (resendResult.success) {
      return resendResult
    }

    // Log failure but don't crash
    console.warn('Email sending failed:', resendResult.error)
    return {
      success: false,
      provider: 'none',
      error: resendResult.error
    }

  } catch (error) {
    console.error('Email sending error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown email error'
    }
  }
}

// Get user email from auth
export async function getUserEmail(userId: string, adminClient: any): Promise<string | null> {
  try {
    const { data: authUser, error } = await adminClient.auth.admin.getUserById(userId)
    
    if (!error && authUser?.user?.email) {
      return authUser.user.email
    }

    console.warn(`Could not retrieve email for user ${userId}`)
    return null

  } catch (error) {
    console.error('Error getting user email:', error)
    return null
  }
}

// Create event notification
export async function createEventNotification(
  copyType: CopyType,
  eventData: any,
  requesterData?: any,
  hostData?: any,
  hostNote?: string
): Promise<{
  message: string
  subject: string
  emailHtml: string
}> {
  // Format context for AI
  const context: NotificationContext = {
    eventTitle: eventData.title,
    eventDate: formatDateForHuman(eventData.date),
    eventTime: formatTimeForHuman(eventData.time),
    requesterName: requesterData?.display_name || 'Someone',
    hostName: hostData?.display_name || 'Event Host',
    hostNote: hostNote || undefined,
    locationHint: eventData.place_hint,
    exactLocation: eventData.place_exact,
    attendeeCount: eventData.attendee_count,
    capacity: eventData.capacity
  }

  // Generate AI copy
  const message = await genNotice(copyType, context)
  
  // Generate subject
  const subject = generateSubject(copyType, context)
  
  // Create email HTML
  const emailHtml = createEmailTemplate(
    getEmailTitle(copyType),
    message,
    getEventUrl(eventData.id),
    getActionText(copyType)
  )

  return { message, subject, emailHtml }
}

// Send notification to user
export async function sendNotificationToUser(
  userId: string,
  copyType: CopyType,
  eventData: any,
  adminClient: any,
  requesterData?: any,
  hostData?: any,
  hostNote?: string
): Promise<{ emailSent: boolean; message: string }> {
  try {
    // Get user email
    const userEmail = await getUserEmail(userId, adminClient)
    if (!userEmail) {
      console.warn(`No email found for user ${userId}, skipping email notification`)
      return { emailSent: false, message: 'No email available' }
    }

    // Generate notification content
    const { message, subject, emailHtml } = await createEventNotification(
      copyType,
      eventData,
      requesterData,
      hostData,
      hostNote
    )

    // Send email
    const emailResult = await sendEmail({
      to: userEmail,
      subject,
      htmlBody: emailHtml,
      textBody: message
    })

    console.log(`Email notification result for ${userId}:`, emailResult)

    return {
      emailSent: emailResult.success,
      message
    }

  } catch (error) {
    console.error('Error sending notification:', error)
    return {
      emailSent: false,
      message: 'Error sending notification'
    }
  }
}

// Helper functions
function formatContextForAI(context: NotificationContext): string {
  const parts: string[] = []
  
  parts.push(`Event: "${context.eventTitle}"`)
  parts.push(`Date: ${context.eventDate}`)
  parts.push(`Time: ${context.eventTime}`)
  
  if (context.requesterName) {
    parts.push(`Requester: ${context.requesterName}`)
  }
  
  if (context.hostName) {
    parts.push(`Host: ${context.hostName}`)
  }
  
  if (context.hostNote) {
    parts.push(`Host note: "${context.hostNote}"`)
  }
  
  if (context.locationHint) {
    parts.push(`Location: ${context.locationHint}`)
  }
  
  if (context.attendeeCount && context.capacity) {
    parts.push(`Attendees: ${context.attendeeCount}/${context.capacity}`)
  }
  
  return parts.join(', ')
}

function cleanGeneratedText(text: string): string {
  return text
    .replace(/^["']|["']$/g, '')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function formatDateForHuman(dateString: string): string {
  try {
    const date = new Date(dateString)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    if (date.toDateString() === today.toDateString()) {
      return 'today'
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'tomorrow'
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric' 
      })
    }
  } catch {
    return dateString
  }
}

function formatTimeForHuman(timeString: string): string {
  try {
    const [hours, minutes] = timeString.split(':').map(Number)
    const date = new Date()
    date.setHours(hours, minutes)
    
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
  } catch {
    return timeString
  }
}

function generateSubject(copyType: CopyType, context: NotificationContext): string {
  switch (copyType) {
    case 'request_created':
      return `New join request for "${context.eventTitle}"`
    case 'approved':
      return `You're in! "${context.eventTitle}" request approved`
    case 'rejected':
      return `Update on your "${context.eventTitle}" request`
    case 'location_unlocked':
      return `📍 Location revealed for "${context.eventTitle}"`
    case 'event_reminder':
      return `⏰ "${context.eventTitle}" starts soon!`
    default:
      return `Update about "${context.eventTitle}"`
  }
}

function getEmailTitle(copyType: CopyType): string {
  switch (copyType) {
    case 'request_created':
      return 'New Join Request'
    case 'approved':
      return 'Request Approved! 🎉'
    case 'rejected':
      return 'Request Update'
    case 'location_unlocked':
      return 'Location Revealed! 📍'
    case 'event_reminder':
      return 'Event Reminder ⏰'
    default:
      return 'Event Update'
  }
}

function getEventUrl(eventId: number): string {
  return `https://ggbang.app/event/${eventId}`
}

function getActionText(copyType: CopyType): string {
  switch (copyType) {
    case 'request_created':
      return 'Review Request'
    case 'approved':
      return 'View Event Details'
    case 'rejected':
      return 'Explore More Events'
    case 'location_unlocked':
      return 'View Location Details'
    case 'event_reminder':
      return 'View Event'
    default:
      return 'View Event'
  }
}

// Send email via Resend API
async function sendViaResend(options: EmailOptions): Promise<EmailResult> {
  try {
    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) {
      throw new Error('Resend API key not configured')
    }

    const fromEmail = options.from || Deno.env.get('EMAIL_SENDER') || 'noreply@ggbang.app'
    
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

    const result = await response.json() as any
    
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

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function createEmailTemplate(
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
    </div>
  </div>
</body>
</html>`
}
