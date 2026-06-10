import { updateNotesJson } from '../../../lib/store.js';
import { tryGetUserId } from '../../../lib/auth.js';

/**
 * PATCH /api/notes/[id]/diagrams
 * Body: { notes: <full notes JSON with diagram.url fields populated> }
 *
 * Called by the client after it has cropped source images and uploaded them to
 * Supabase Storage. Only patches the notes JSON — does not touch file_names,
 * concise_notes, or metadata columns.
 */
export default async function handler(req, res) {
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.query;
  const { userId, err } = await tryGetUserId(req);
  if (err) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { notes } = req.body || {};
    if (!notes) return res.status(400).json({ error: 'notes required' });

    await updateNotesJson(id, notes, userId);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
