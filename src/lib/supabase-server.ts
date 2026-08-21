import 'server-only'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const serverAuthOptions = {
  auth: { autoRefreshToken: false, persistSession: false },
}

// Server-side Supabase client
// Use this in Server Components, API Routes, and Server Actions
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please check your .env.local file.'
    )
  }

  return createSupabaseClient(supabaseUrl, supabaseAnonKey, serverAuthOptions)
}

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing server-side Supabase environment variables.')
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, serverAuthOptions)
}
