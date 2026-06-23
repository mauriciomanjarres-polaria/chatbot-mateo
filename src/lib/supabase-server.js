import { createClient } from '@supabase/supabase-js';

let adminClient = null;

function normalizeSupabaseUrl(rawUrl) {
  const trimmed = rawUrl?.trim();
  if (!trimmed) return '';

  try {
    const url = new URL(trimmed);
    url.pathname = '';
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return trimmed.replace(/\/rest\/v1\/?$/i, '').replace(/\/$/, '');
  }
}

export function isSupabaseConfigured() {
  return Boolean(
    normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

export function getSupabaseAdmin() {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase no está configurado.');
  }

  if (!adminClient) {
    adminClient = createClient(
      normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL),
      process.env.SUPABASE_SERVICE_ROLE_KEY.trim(),
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );
  }

  return adminClient;
}
