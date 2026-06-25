import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const key = process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY || '';

console.log('ENV KEYS:', Object.keys(process.env).filter(k => k.includes('SUPABASE') || k.includes('VITE')));
console.log('URL:', url ? 'exists' : 'missing');
console.log('KEY:', key ? 'exists' : 'missing');

const supabase = createClient(url, key);

async function run() {
  if (!url || !key) {
    console.error('Missing credentials');
    return;
  }
  const { data: expData, error: expErr } = await supabase.from('testpool_experiments').select('*').limit(1);
  if (expErr) {
    console.error('testpool_experiments error:', expErr);
  } else {
    console.log('testpool_experiments columns:', expData && expData[0] ? Object.keys(expData[0]) : 'empty or no columns');
  }

  const { data: assData, error: assErr } = await supabase.from('testpool_assignments').select('*').limit(1);
  if (assErr) {
    console.error('testpool_assignments error:', assErr);
  } else {
    console.log('testpool_assignments columns:', assData && assData[0] ? Object.keys(assData[0]) : 'empty or no columns');
  }
}

run();
