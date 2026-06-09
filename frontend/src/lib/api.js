/**
 * Authenticated fetch wrapper.
 * Automatically attaches the current Supabase session JWT as Authorization header.
 * Drop-in replacement for window.fetch — same signature.
 */
import { supabase } from './supabase.js';

export async function apiFetch(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  // Don't set Content-Type for FormData — browser sets it with boundary automatically
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  return fetch(path, { ...options, headers });
}
