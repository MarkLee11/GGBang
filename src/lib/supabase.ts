// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 检查 Supabase 是否配置
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Profile type definition based on the actual database schema
export type Profile = {
  user_id: string;
  created_at: string;
  updated_at: string;
  display_name?: string;
  profile_images?: string[];
  bio?: string;
  age?: number;
  city?: string;
  country?: string;
  interests?: string[];
  preferences?: string[];
  height_cm?: number;
  weight_kg?: number;
  body_type?: 'slim' | 'average' | 'athletic' | 'muscular' | 'bear' | 'chubby' | 'stocky' | 'other';
  relationship_status?: 'single' | 'taken' | 'married' | 'open' | 'complicated' | 'not_specified';
  is_verified?: boolean;
  last_seen?: string;
  hiv_status?: 'negative' | 'positive' | 'unknown' | 'not_disclosed';
  prep_usage?: 'on_prep' | 'not_on_prep' | 'considering' | 'not_disclosed';
  social_links?: Record<string, any>;
};

// 从 events 表获取所有活动
export async function getEvents() {
  const { data, error } = await supabase.from('events').select('*');
  if (error) throw error;
  return data;
}

export type Event = {
  id: number;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  country: string;
  organizer: string;
  category: string;
  image: string | null;
  user_id: string;
  created_at: string;
  updated_at?: string;
  capacity?: number | null;
  place_hint?: string | null;
  place_exact?: string | null;
  place_exact_visible?: boolean;
};
// === append to: src/lib/supabase.ts ===
export async function getCurrentUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) return null
  return data.user.id
}

// 方便调试，把 supabase 挂到 window
// @ts-ignore
window.supabase = supabase;
