/// <reference types="vite/client" />

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || '').trim()
const supabaseKey = String(import.meta.env.VITE_SUPABASE_KEY || '').trim()

if (!supabaseUrl.startsWith('https://')) {
  throw new Error(
    `Invalid VITE_SUPABASE_URL: ${supabaseUrl}`
  )
}

if (!supabaseKey) {
  throw new Error('Missing VITE_SUPABASE_KEY')
}

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
)

export const isSupabaseConfigured = true
