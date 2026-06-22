/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase env");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export const isSupabaseConfigured = true;

/**
 * Handles Supabase errors by parsing the message, code and logging it.
 * Explicitly supports PGRST204, 400 Bad Request, 406 Not Acceptable and standard error objects.
 */
export function handleSupabaseError(error: any, context?: string): void {
  if (!error) return;
  const message = error.message || '';
  const code = error.code || '';
  const details = error.details || '';
  const hint = error.hint || '';
  const status = error.status || (error as any).statusCode || '';

  console.error(`[Supabase Error] Context: "${context || 'Unknown'}". Status: ${status}. Code: "${code}". Message: "${message}". Details: ${details}. Hint: ${hint}`);

  // Normalize mapping of errors for developer review / logging or throwing
  if (code === 'PGRST204' || status === 204) {
    console.warn(`[PGRST204 (No Content)]: ${message}`);
  } else if (status === 400 || code === '42703' || code === '22P02') {
    console.warn(`[400 Bad Request]: ${message} (details: ${details})`);
  } else if (status === 406 || code === 'PGRST106') {
    console.warn(`[406 Not Acceptable]: ${message}`);
  }
}


