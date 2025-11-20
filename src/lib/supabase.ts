import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'

// Singleton pattern for client-side Supabase client
// This prevents multiple GoTrueClient instances
let supabaseClient: SupabaseClient | null = null

// Client-side Supabase client
// Use this in Client Components ('use client')
export function createClient() {
  // Return existing client if already created
  if (supabaseClient) {
    return supabaseClient
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please check your .env.local file.'
    )
  }

  supabaseClient = createSupabaseClient(supabaseUrl, supabaseAnonKey)
  return supabaseClient
}

