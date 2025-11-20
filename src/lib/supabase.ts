import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Client-side Supabase client
// Use this in Client Components ('use client')
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please check your .env.local file.'
    )
  }

  return createSupabaseClient(supabaseUrl, supabaseAnonKey)
}

