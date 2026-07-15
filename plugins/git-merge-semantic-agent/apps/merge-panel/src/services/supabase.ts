import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

let client: SupabaseClient | null | undefined;

/**
 * Returns the browser-safe Supabase client when the panel has been configured.
 * A missing configuration intentionally keeps the panel in its demo/local mode.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (client !== undefined) return client;

  if (!url || !publishableKey) {
    client = null;
    return client;
  }

  try {
    new URL(url);
    client = createClient(url, publishableKey);
  } catch {
    client = null;
  }

  return client;
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseClient() !== null;
}
