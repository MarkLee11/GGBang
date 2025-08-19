// Mailer module for Edge Functions
// Integrates with Resend for email delivery

/**
 * Truncate string to specified length
 */
function short(s: string, n = 300): string {
  return s.length > n ? s.slice(0, n) + '…' : s
}

/**
 * Validate email address format
 */
function isValidEmail(email: string): boolean {
  return email.includes('@') && email.length > 3
}

/**
 * Send email via Resend
 * Returns success status with provider info and message ID
 */
export async function sendMail(params: { 
  to: string; 
  subject: string; 
  text: string; 
  from?: string 
}): Promise<{ 
  ok: boolean; 
  provider?: 'resend'; 
  id?: string; 
  error?: string 
}> {
  // Validate required environment variables
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) {
    return { ok: false, error: 'missing_RESEND_API_KEY' }
  }

  // Determine from address
  const from = params.from || Deno.env.get('MAIL_FROM')
  if (!from) {
    return { ok: false, error: 'missing_MAIL_FROM' }
  }

  // Validate recipient email
  if (!isValidEmail(params.to)) {
    return { ok: false, error: 'invalid_to' }
  }

  // Truncate subject and text to reasonable limits
  const subject = short(params.subject, 200)
  const text = short(params.text, 10000)

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: from,
        to: [params.to],
        subject: subject,
        text: text
      }),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (response.ok) {
      try {
        const data = await response.json()
        const id = data.id
        return { 
          ok: true, 
          provider: 'resend', 
          id: id 
        }
      } catch (parseError) {
        // JSON parse failed, but request was successful
        return { 
          ok: true, 
          provider: 'resend', 
          id: undefined 
        }
      }
    } else {
      // Non-2xx response
      let errorText = ''
      try {
        const errorData = await response.json()
        errorText = errorData.message || errorData.error || 'Unknown error'
      } catch {
        // Fallback to text response
        try {
          errorText = await response.text()
        } catch {
          errorText = 'Unable to read error response'
        }
      }
      
      const shortError = short(errorText, 300)
      return { 
        ok: false, 
        error: `resend_${response.status}:${shortError}` 
      }
    }

  } catch (error) {
    if (error.name === 'AbortError') {
      return { ok: false, error: 'resend_timeout' }
    }
    
    if (error instanceof TypeError) {
      return { ok: false, error: 'resend_network_error' }
    }
    
    return { ok: false, error: 'resend_parse_error' }
  }
}
  