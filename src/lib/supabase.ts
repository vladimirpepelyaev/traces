import { createClient } from '@supabase/supabase-js';

const getSupabaseConfig = () => {
  const url = (import.meta as any).env.VITE_SUPABASE_URL;
  const key = (import.meta as any).env.VITE_SUPABASE_KEY;

  // Ensure it is a valid HTTP/HTTPS URL and not a dummy placeholder
  const isValidUrl = url && (url.startsWith('http://') || url.startsWith('https://')) && !url.includes('YOUR_SUPABASE_URL');
  const isValidKey = key && key !== 'YOUR_SUPABASE_KEY' && key.length > 10;

  if (isValidUrl && isValidKey) {
    return {
      url,
      key,
      isPlaceholder: false
    };
  }

  return {
    url: 'https://placeholder-project.supabase.co',
    key: 'placeholder-anon-key-that-is-long-enough-for-validation-purposes-1234567890',
    isPlaceholder: true
  };
};

const config = getSupabaseConfig();

export const isSupabaseConfigured = !config.isPlaceholder;

export const supabase = createClient(config.url, config.key);
