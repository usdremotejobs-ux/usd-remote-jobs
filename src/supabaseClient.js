import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase credentials in .env file')
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,      // 🔒 keep user logged in
      autoRefreshToken: true,    // 🔄 refresh tokens silently
      detectSessionInUrl: true,  // ✉️ magic link support
    },
  }
)
