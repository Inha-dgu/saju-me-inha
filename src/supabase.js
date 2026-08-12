import { createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from 'virtual:env';

const url = (SUPABASE_URL || '').trim();
const anonKey = (SUPABASE_ANON_KEY || '').trim();

if (!url || !anonKey) {
  console.warn(
    '[supabase] SUPABASE_URL / SUPABASE_ANON_KEY가 없습니다. Vercel Environment Variables를 확인하세요.',
  );
}

export const supabase =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          detectSessionInUrl: true,
          persistSession: true,
          autoRefreshToken: true,
        },
      })
    : null;
