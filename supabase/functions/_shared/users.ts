// === File: supabase/functions/_shared/users.ts ===
// 运行环境：Supabase Edge Functions (Deno)
// 依赖：_shared/utils.ts 中的 createAdminClient（你仓库中已有）
// 作用：根据 userId 获取邮箱、显示名（从 profiles 表）；统一给通知使用。

import { createAdminClient } from './utils.ts'

/**
 * 按 userId 取邮箱（优先从 auth.users）
 * - 需要 SERVICE ROLE，Edge Functions 已具备
 */
export async function getUserEmail(userId: string): Promise<string | null> {
  const admin = createAdminClient()

  try {
    const { data, error } = await admin.auth.admin.getUserById(userId)
    if (error) return null
    const email = data?.user?.email
    return email || null
  } catch {
    return null
  }
}

/**
 * 按 userId 取展示名（profiles.display_name）
 * - 若表/字段不存在或无值，返回匿名占位
 */
export async function getDisplayName(userId: string): Promise<string> {
  const admin = createAdminClient()

  try {
    const { data, error } = await admin
      .from('profiles')
      .select('display_name')
      .eq('id', userId)
      .single()

    if (error) return 'the user'
    return (data?.display_name || '').trim() || 'the user'
  } catch {
    return 'the user'
  }
}

/**
 * 工具：从 events 行里尽量取到 hostId & 标题 & 开始时间字段
 * - 兼容不同字段命名（user_id / creator_id / owner_id）
 */
export function extractEventBasics(eventRow: Record<string, any>): {
  hostId: string | null
  title: string
  startsAt?: string
} {
  const hostId =
    eventRow?.user_id ||
    eventRow?.creator_id ||
    eventRow?.owner_id ||
    null

  return {
    hostId,
    title: (eventRow?.title || 'the event').toString(),
    startsAt: eventRow?.starts_at || eventRow?.start_time || undefined,
  }
}
