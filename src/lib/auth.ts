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

      // Redirect to profile page after successful sign in
      if (data.user) {
        setTimeout(() => {
          window.location.href = '/profile'
        }, 100)
      }

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
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error) {
        // Handle all auth errors gracefully - don't throw
        console.warn('Auth error (handled gracefully):', error.message)
        return { user: null, error: null }
      }
      
      return { user, error: null }
    } catch (error) {
      // Handle network errors gracefully - don't throw
      console.warn('Network error (handled gracefully):', error)
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