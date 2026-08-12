import { useEffect, useState } from 'react';
import { supabase } from './supabase.js';

/**
 * @returns {Promise<import('@supabase/supabase-js').Session | null>}
 */
export async function getSession() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

/**
 * @param {(session: import('@supabase/supabase-js').Session | null) => void} callback
 */
export function onAuthStateChange(callback) {
  if (!supabase) return () => {};

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });

  return () => subscription.unsubscribe();
}

export async function signInWithGoogle() {
  if (!supabase) {
    throw new Error(
      'Supabase가 설정되지 않았습니다. Vercel에 SUPABASE_URL / SUPABASE_ANON_KEY를 넣고 Redeploy 하세요.',
    );
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}${window.location.pathname}`,
    },
  });

  if (error) throw error;
}

export async function signOut() {
  if (!supabase) return;

  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getSession()
      .then((session) => {
        if (!cancelled) setUser(session?.user ?? null);
      })
      .catch((err) => {
        console.error('[auth]', err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const unsubscribe = onAuthStateChange((session) => {
      if (!cancelled) setUser(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return { user, loading };
}

/**
 * @param {import('@supabase/supabase-js').User | null | undefined} user
 */
export function getUserLabel(user) {
  if (!user) return '';
  return user.user_metadata?.full_name || user.user_metadata?.name || user.email || '사용자';
}
