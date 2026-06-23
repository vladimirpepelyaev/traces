/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase env");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export const isSupabaseConfigured = true;

export async function ensureProfileExists(): Promise<void> {
  if (!isSupabaseConfigured) return;

  const { data, error: userError } = await supabase.auth.getUser();
  const user = data?.user;
  if (userError || !user) {
    return;
  }

  const existing = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single();

  const profileExists = !!(existing && existing.data);

  console.log(
    'PROFILE CHECK',
    {
      authId: user.id,
      profileExists
    }
  );

  if (!profileExists) {
    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        username:
          user.user_metadata?.username ??
          user.email?.split('@')[0] ??
          'user',

        display_name:
          user.user_metadata?.display_name ??
          user.email ??
          'User',

        role: 'user',

        onboarding_completed: false,

        blocked: false,

        created_at:
          new Date().toISOString()
      });
    if (upsertError) {
      console.error('[ensureProfileExists] Error upserting profile:', upsertError);
    }
  }
}

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


