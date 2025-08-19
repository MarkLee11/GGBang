// === File: supabase/functions/_shared/aiCopy.ts ===
// 运行环境：Supabase Edge Functions (Deno)。不要在前端使用。
// 依赖：环境变量 OPENAI_API_KEY（Step 1 已配置）

type CopyType = 'request_created' | 'approved' | 'rejected'

export interface NoticeContext {
  eventTitle: string
  // 传原始 ISO 字符串或人类可读文本都行；我们只做轻量拼接，不强格式化
  eventDateTime?: string
  requesterName?: string // 申请者（接收通知的那位，或文案中提到的另一方）
  hostName?: string
  hostNote?: string // 主办方备注（仅拒绝/通过时可选）
}

export interface NoticeResult {
  success: boolean
  text: string
  subject: string
  // 便于上层记录：若 AI 失败，aiUsed = false
  aiUsed: boolean
  // debug 用
  error?: string
}

const SUBJECT_MAP: Record<CopyType, string> = {
  request_created: 'Your join request was submitted',
  approved: 'You’ve been approved to join the event',
  rejected: 'Your join request was updated',
}

function fallbackText(type: CopyType, ctx: NoticeContext): string {
  const title = ctx.eventTitle || 'the event'
  const time = ctx.eventDateTime ? ` (${ctx.eventDateTime})` : ''
  const host = ctx.hostName ? ` by ${ctx.hostName}` : ''
  const note = ctx.hostNote ? ` Note: ${ctx.hostNote}` : ''

  switch (type) {
    case 'request_created':
      return `Your request to join “${title}”${time} has been sent and is pending host review.${note}`
    case 'approved':
      return `You’re approved to join “${title}”${time}${host}. See you there!${note}`
    case 'rejected':
      return `Your request to join “${title}”${time}${host} was not approved.${note}`
  }
}

export async function genNotice(type: CopyType, ctx: NoticeContext): Promise<NoticeResult> {
  const subject = SUBJECT_MAP[type]
  const apiKey = Deno.env.get('OPENAI_API_KEY')

  // 若未配置 KEY，直接走兜底模板
  if (!apiKey) {
    return {
      success: true,
      text: fallbackText(type, ctx),
      subject,
      aiUsed: false,
    }
  }

  try {
    // 用最稳妥的 chat.completions 接口（Edge Functions 下原生 fetch）
    const prompt = buildPrompt(type, ctx)
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // 便宜快，1–2句生成很合适；如需换，可在此替换
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful notification copywriter. Write concise, friendly, safe, 1–2 sentence messages. Avoid emojis. No markdown.',
          },
          { role: 'user', content: prompt },
        ],
      }),
    })

    if (!resp.ok) {
      const err = await safeText(resp)
      return {
        success: true, // 文案仍可用（用兜底）
        text: fallbackText(type, ctx),
        subject,
        aiUsed: false,
        error: `openai_http_${resp.status}: ${err}`,
      }
    }

    const data = await resp.json()
    const text: string =
      data?.choices?.[0]?.message?.content?.trim() || fallbackText(type, ctx)

    // 额外保险：长度限制（避免超长）
    const finalText = text.length > 360 ? text.slice(0, 360) + '…' : text

    return {
      success: true,
      text: finalText,
      subject,
      aiUsed: true,
    }
  } catch (e) {
    return {
      success: true,
      text: fallbackText(type, ctx),
      subject,
      aiUsed: false,
      error: e instanceof Error ? e.message : String(e),
    }
  }
}

function buildPrompt(type: CopyType, ctx: NoticeContext): string {
  const lines: string[] = []
  lines.push(`Event title: ${ctx.eventTitle || 'N/A'}`)
  if (ctx.eventDateTime) lines.push(`Event time: ${ctx.eventDateTime}`)
  if (ctx.hostName) lines.push(`Host: ${ctx.hostName}`)
  if (ctx.requesterName) lines.push(`Requester: ${ctx.requesterName}`)
  if (ctx.hostNote) lines.push(`Host note: ${ctx.hostNote}`)

  lines.push('\nWrite a short (1–2 sentences) notification text, friendly and clear.')
  lines.push('Do not include markdown or emojis.')
  lines.push('If it’s a rejection, stay polite and encouraging.')

  switch (type) {
    case 'request_created':
      lines.push('\nContext: The requester just submitted a join request. Confirm submission and next steps.')
      break
    case 'approved':
      lines.push('\nContext: The host approved the requester. Confirm approval and what happens next.')
      break
    case 'rejected':
      lines.push('\nContext: The host rejected the request. Be polite; optionally reference the host note if present.')
      break
  }

  return lines.join('\n')
}

async function safeText(resp: Response): Promise<string> {
  try {
    return await resp.text()
  } catch {
    return '<no-body>'
  }
}
