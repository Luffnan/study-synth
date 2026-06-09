import { supabase } from './supabase.js';

/**
 * Extracts the Supabase JWT from the Authorization header and returns the
 * authenticated user's UUID. Throws a 401 error if missing or invalid.
 */
export async function getUserId(req) {
  const auth = req.headers?.authorization;
  if (!auth?.startsWith('Bearer ')) {
    const err = new Error('Unauthorized');
    err.status = 401;
    throw err;
  }

  const token = auth.slice(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    const err = new Error('Unauthorized');
    err.status = 401;
    throw err;
  }

  return user.id;
}

/**
 * Convenience wrapper: returns { userId, err: null } or { userId: null, err }
 * so handlers can respond with a clean 401 without nested try/catch.
 */
export async function tryGetUserId(req) {
  try {
    const userId = await getUserId(req);
    return { userId, err: null };
  } catch (err) {
    return { userId: null, err };
  }
}
