import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').replace(/['"]/g, '');
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').replace(/['"]/g, '');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Critical Error: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing in environment variables.\n" +
    "Please configure them in your Vercel Project Settings > Environment Variables."
  );
}

// Fallback placeholders to prevent top-level runtime crashes during module import
const safeUrl = supabaseUrl && supabaseUrl.startsWith('http') ? supabaseUrl : 'https://placeholder.supabase.co';
const safeKey = supabaseAnonKey || 'placeholder-anon-key';

export const supabase = createClient(safeUrl, safeKey);

