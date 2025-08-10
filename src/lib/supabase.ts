// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 检查 Supabase 是否配置
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// 从 events 表获取所有活动
export async function getEvents() {
  const { data, error } = await supabase.from('events').select('*');
  if (error) throw error;
  return data;
}

export type Event = {
  id: number;
  name: string;
  description: string;
  date: string;
  location: string;
};
// === append to: src/lib/supabase.ts ===
export async function getCurrentUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) return null
  return data.user.id
}

