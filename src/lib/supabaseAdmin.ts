import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Admin Supabase client using service role key
// NEVER expose this to the client - only use in server-side API routes
// This client bypasses RLS and has full access to the database
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing Supabase admin environment variables. Please check your .env.local file for SUPABASE_SERVICE_KEY.'
    )
  }

  return createSupabaseClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

