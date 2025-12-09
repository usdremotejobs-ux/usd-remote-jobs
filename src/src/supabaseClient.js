import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    // In a real scenario, we might want to handle this gracefully, but for now we'll log it.
    console.warn('Missing Supabase credentials in .env file')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
