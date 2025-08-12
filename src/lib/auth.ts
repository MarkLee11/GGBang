import { supabase, isSupabaseConfigured } from './supabase'

export interface AuthUser {
  id: string
  email: string
  name?: string
}

export interface SignUpData {
  name: string
  email: string
  password: string
}

export interface SignInData {
  email: string
  password: string
}

export const authService = {
  // Sign up a new user
  async signUp({ name, email, password }: SignUpData) {
    if (!isSupabaseConfigured) {
      return { 
        user: null, 
        error: new Error('Supabase is not configured. Please check your environment variables.') 
      }
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name
          },
          emailRedirectTo: `${window.location.origin}/profile`
        }
      })

      if (error) {
        throw error
      }

      return { user: data.user, error: null }
    } catch (error) {
      console.error('Sign up error:', error)
      return { user: null, error: error as Error }
    }
  },

  // Sign in an existing user
  async signIn({ email, password }: SignInData) {
    if (!isSupabaseConfigured) {
      return { 
        user: null, 
        error: new Error('Supabase is not configured. Please check your environment variables.') 
      }
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        throw error
      }

      // 移除自动重定向，让用户登录后停留在当前页面
      // if (data.user) {
      //   setTimeout(() => {
      //     window.location.href = '/profile'
      //   }, 100)
      // }

      return { user: data.user, error: null }
    } catch (error) {
      console.error('Sign in error:', error)
      return { user: null, error: error as Error }
    }
  },

  // Sign out the current user
  async signOut() {
    if (!isSupabaseConfigured) {
      return { error: new Error('Supabase is not configured.') }
    }

    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        throw error
      }
      return { error: null }
    } catch (error) {
      console.error('Sign out error:', error)
      return { error: error as Error }
    }
  },

  // Get the current user
  async getCurrentUser() {
    if (!isSupabaseConfigured) {
      console.warn('Supabase not configured - user authentication disabled')
      return { user: null, error: null }
    }

    try {
      // 首先检查是否有活跃的会话
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.warn('Session error:', sessionError.message)
        return { user: null, error: null }
      }
      
      if (!session) {
        console.log('No active session found')
        return { user: null, error: null }
      }
      
      // 如果有会话，获取用户信息
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        console.warn('User error:', userError.message)
        return { user: null, error: null }
      }
      
      if (!user) {
        console.log('No user found in session')
        return { user: null, error: null }
      }
      
      console.log('User authenticated successfully:', user.email)
      return { user, error: null }
      
    } catch (error) {
      // Handle network errors gracefully - don't throw
      console.warn('Network error in getCurrentUser:', error)
      return { user: null, error: null }
    }
  },

  // Listen to auth state changes
  onAuthStateChange(callback: (user: any) => void) {
    if (!isSupabaseConfigured) {
      // Return a mock subscription that does nothing
      return {
        data: {
          subscription: {
            unsubscribe: () => {}
          }
        }
      }
    }

    return supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user || null)
    })
  }
}