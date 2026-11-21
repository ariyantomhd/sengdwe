// src/config/supabase.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

function createSupabaseClient(): SupabaseClient {
  const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
  const supabaseKey = (process.env.SUPABASE_SECRET_KEY || '').trim();

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      '[supabase]: SUPABASE_URL atau SUPABASE_SECRET_KEY belum tersedia di environment variables.',
    );
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

// Re-initializes cleanly if a previous attempt threw before env vars were ready
export function getSupabaseAdmin(): SupabaseClient {
  if (client) return client;
  try {
    client = createSupabaseClient();
    return client;
  } catch (error) {
    client = null;
    throw error;
  }
}

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const instance = getSupabaseAdmin();
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});

export const createAuthClient = (): SupabaseClient => createSupabaseClient();