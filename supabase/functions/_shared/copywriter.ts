// AI Copywriter for notification templates
// Integrates with OpenAI for AI-generated content with fallback to templates
// Supports i18n: en-US (default) and de-DE

import { QueueKind, Context, Copies, NotificationCopy } from './types.ts'

/**
 * Clean text by removing markdown symbols and emojis
 */
function cleanText(text: string): string {
  return text
    .replace(/[*`#\[\]()_~>]/g, '') // Remove markdown symbols
    .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '') // Remove emojis
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
}

/**
 * Host templates for different languages and queue kinds
 */
const hostTemplates = {
  'en-US': {
    request_created: (title: string, requesterName: string, timeStr: string) => ({
      subject: `New join request: ${title}`,
      text: `You received a new join request from ${requesterName} for "${title}"${timeStr}. Please review it in your host panel.`
    }),
    approved: (title: string, requesterName: string, timeStr: string) => ({
      subject: `Approved: ${requesterName} for "${title}"`,
      text: `You approved ${requesterName} to join "${title}"${timeStr}.`
    }),
    rejected: (title: string, requesterName: string, timeStr: string) => ({
      subject: `Rejected: ${requesterName} for "${title}"`,
      text: `You rejected ${requesterName}'s request for "${title}"${timeStr}.`
    }),
    location_unlocked: (title: string, timeStr: string) => ({
      subject: `Location unlocked: "${title}"`,
      text: `You revealed the exact location for "${title}"${timeStr}.`
    })
  },
  'de-DE': {
    request_created: (title: string, requesterName: string, timeStr: string) => ({
      subject: `Neue Beitrittsanfrage: ${title}`,
      text: `Du hast eine neue Beitrittsanfrage von ${requesterName} für „${title}""${timeStr} erhalten. Bitte prüfe sie im Host-Bereich.`
    }),
    approved: (title: string, requesterName: string, timeStr: string) => ({
      subject: `Genehmigt: ${requesterName} für „${title}""`,
      text: `Du hast ${requesterName} für „${title}""${timeStr} genehmigt.`
    }),
    rejected: (title: string, requesterName: string, timeStr: string) => ({
      subject: `Abgelehnt: ${requesterName} für „${title}""`,
      text: `Du hast die Anfrage von ${requesterName} für „${title}""${timeStr} abgelehnt.`
    }),
    location_unlocked: (title: string, timeStr: string) => ({
      subject: `Ort freigeschaltet: „${title}""`,
      text: `Du hast den genauen Ort für „${title}""${timeStr} freigegeben.`
    })
  }
}

/**
 * Fallback templates for different languages and queue kinds
 */
const fallbackTemplates = {
  'en-US': {
    request_created: (title: string, timeStr: string) => ({
      subject: `Your join request was submitted`,
      text: `Your request to join "${title}"${timeStr} has been sent and is pending host review.`
    }),
    approved: (title: string, timeStr: string) => ({
      subject: `You're approved to join the event`,
      text: `You're approved to join "${title}"${timeStr}. See you there!`
    }),
    rejected: (title: string, timeStr: string) => ({
      subject: `Your join request was updated`,
      text: `Your request to join "${title}"${timeStr} was not approved.`
    }),
    location_unlocked: (title: string, timeStr: string) => ({
      subject: `Location revealed: "${title}"`,
      text: `The exact location for "${title}"${timeStr} is now available. Please check the event details in the app.`
    })
  },
  'de-DE': {
    request_created: (title: string, timeStr: string) => ({
      subject: `Deine Beitrittsanfrage wurde gesendet`,
      text: `Deine Anfrage, „${title}""${timeStr} beizutreten, wurde gesendet und wartet auf die Prüfung des Hosts.`
    }),
    approved: (title: string, timeStr: string) => ({
      subject: `Du wurdest für das Event zugelassen`,
      text: `Deine Teilnahme an „${title}""${timeStr} wurde genehmigt. Bis bald!`
    }),
    rejected: (title: string, timeStr: string) => ({
      subject: `Deine Beitrittsanfrage wurde aktualisiert`,
      text: `Deine Anfrage, „${title}""${timeStr} beizutreten, wurde nicht genehmigt.`
    }),
    location_unlocked: (title: string, timeStr: string) => ({
      subject: `Ort freigegeben: „${title}""`,
      text: `Der genaue Ort für „${title}""${timeStr} ist jetzt verfügbar. Bitte sieh dir die Eventdetails in der App an.`
    })
  }
}

/**
 * Generate AI notice text with OpenAI
 * Falls back to template if AI fails
 */
async function aiNotice(
  kind: 'request_created' | 'approved' | 'rejected',
  ctx: { 
    eventTitle: string; 
    eventDateTime?: string; 
    requesterName?: string; 
    hostName?: string; 
    hostNote?: string 
  },
  extraHint?: string,
  locale: 'en-US' | 'de-DE' = 'en-US'
): Promise<{ text: string; aiUsed: boolean }> {
  const apiKey = Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) {
    const fallback = fallbackTemplates[locale][kind](ctx.eventTitle, ctx.eventDateTime ? ` (${ctx.eventDateTime})` : '')
    return { text: fallback.text, aiUsed: false }
  }

  const prompt = buildPrompt(kind, ctx, extraHint, locale)
  
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 6000)

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 100,
          temperature: 0.7
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      if (!data.choices?.[0]?.message?.content) {
        throw new Error('Invalid response format')
      }

      const content = data.choices[0].message.content
      if (!content.trim()) {
        throw new Error('Empty content')
      }

      return { 
        text: cleanText(content), 
        aiUsed: true 
      }

    } catch (error) {
      if (attempt === 2) {
        // Final attempt failed, return template
        const fallback = fallbackTemplates[locale][kind](ctx.eventTitle, ctx.eventDateTime ? ` (${ctx.eventDateTime})` : '')
        return { text: fallback.text, aiUsed: false }
      }
      
      // Wait before retry with exponential backoff
      const delay = 400 * Math.pow(2, attempt)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  const fallback = fallbackTemplates[locale][kind](ctx.eventTitle, ctx.eventDateTime ? ` (${ctx.eventDateTime})` : '')
  return { text: fallback.text, aiUsed: false }
}

/**
 * Build prompt for OpenAI
 */
function buildPrompt(
  kind: 'request_created' | 'approved' | 'rejected',
  ctx: { 
    eventTitle: string; 
    eventDateTime?: string; 
    requesterName?: string; 
    hostName?: string; 
    hostNote?: string 
  },
  extraHint?: string,
  locale: 'en-US' | 'de-DE' = 'en-US'
): string {
  const basePrompt = `Generate a friendly, concise notification message (1-2 sentences, max 360 characters) for a ${kind} event notification. Event: "${ctx.eventTitle}"${ctx.eventDateTime ? ` on ${ctx.eventDateTime}` : ''}.`

  let prompt = basePrompt

  switch (kind) {
    case 'request_created':
      prompt += ` Someone wants to join your event. Keep it welcoming and informative.`
      break
    case 'approved':
      prompt += ` The request has been approved. Make it positive and encouraging.`
      break
    case 'rejected':
      prompt += ` The request was not approved. Be polite and professional.`
      break
  }

  if (extraHint) {
    prompt += ` Note: ${extraHint}`
  }

  // Add language instruction for German
  if (locale === 'de-DE') {
    prompt += ` Antwort bitte auf Deutsch.`
  }

  return prompt
}

/**
 * Build notification copies based on queue kind and context
 * Uses AI for requester/attendee messages, templates for host messages
 * Falls back to templates if AI fails
 * Supports i18n: en-US (default) and de-DE
 */
export async function buildCopies(kind: QueueKind, ctx: Context): Promise<Copies> {
  // Select language (default to en-US)
  const locale = (ctx.locale === 'de-DE') ? 'de-DE' : 'en-US'
  const timeStr = ctx.event.startsAt ? ` (${ctx.event.startsAt})` : ''
  const requesterName = ctx.requester?.name || 'the requester'
  const hostName = ctx.host?.name || 'the host'

  const copies: Copies = {}

  switch (kind) {
    case 'request_created':
      copies.toHost = {
        subject: hostTemplates[locale].request_created(ctx.event.title, requesterName, timeStr).subject,
        text: hostTemplates[locale].request_created(ctx.event.title, requesterName, timeStr).text,
        aiUsed: false
      }
      copies.toRequester = await aiNotice('request_created', {
        eventTitle: ctx.event.title,
        eventDateTime: ctx.event.startsAt,
        requesterName: ctx.requester?.name,
        hostName: ctx.host?.name
      }, undefined, locale)
      break

    case 'approved':
      copies.toRequester = await aiNotice('approved', {
        eventTitle: ctx.event.title,
        eventDateTime: ctx.event.startsAt,
        requesterName: ctx.requester?.name,
        hostName: ctx.host?.name
      }, undefined, locale)
      copies.toHost = {
        subject: hostTemplates[locale].approved(ctx.event.title, requesterName, timeStr).subject,
        text: hostTemplates[locale].approved(ctx.event.title, requesterName, timeStr).text,
        aiUsed: false
      }
      break

    case 'rejected':
      copies.toRequester = await aiNotice('rejected', {
        eventTitle: ctx.event.title,
        eventDateTime: ctx.event.startsAt,
        requesterName: ctx.requester?.name,
        hostName: ctx.host?.name,
        hostNote: ctx.hostNote
      }, undefined, locale)
      copies.toHost = {
        subject: hostTemplates[locale].rejected(ctx.event.title, requesterName, timeStr).subject,
        text: hostTemplates[locale].rejected(ctx.event.title, requesterName, timeStr).text,
        aiUsed: false
      }
      break

    case 'location_unlocked':
      // Generate one AI message for all attendees
      const attendeeMessage = await aiNotice('request_created', {
        eventTitle: ctx.event.title,
        eventDateTime: ctx.event.startsAt,
        extraHint: 'Context: The host revealed the exact location. Tell attendees where to find details in the app.'
      }, undefined, locale)
      
      copies.toAttendees = {
        subject: fallbackTemplates[locale].location_unlocked(ctx.event.title, timeStr).subject,
        text: attendeeMessage.text,
        aiUsed: attendeeMessage.aiUsed
      }
      copies.toHost = {
        subject: hostTemplates[locale].location_unlocked(ctx.event.title, timeStr).subject,
        text: hostTemplates[locale].location_unlocked(ctx.event.title, timeStr).text,
        aiUsed: false
      }
      break
  }

  return copies
}
