import { saveQuizScore } from '../../lib/store.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { noteId, pct } = req.body;
    if (!noteId || pct == null) return res.status(400).json({ error: 'noteId and pct required' });

    await saveQuizScore(noteId, pct);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
