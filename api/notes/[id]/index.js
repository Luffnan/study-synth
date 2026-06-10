import { getNoteById, deleteNote, updateNote, saveQuizScore } from '../../../lib/store.js';
import { tryGetUserId } from '../../../lib/auth.js';

export default async function handler(req, res) {
  const { id } = req.query;
  const { userId, err } = await tryGetUserId(req);
  if (err) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    try {
      const record = await getNoteById(id, userId);
      res.status(200).json(record);
    } catch (err) {
      res.status(404).json({ error: err.message });
    }
  } else if (req.method === 'PATCH') {
    try {
      const { title, description, subject_id, latest_quiz_pct } = req.body;
      if (latest_quiz_pct != null && title == null && description == null && subject_id == null) {
        await saveQuizScore(id, latest_quiz_pct, userId);
        return res.status(200).json({ ok: true });
      }
      const record = await updateNote(id, { title, description, subject_id }, userId);
      res.status(200).json(record);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else if (req.method === 'DELETE') {
    try {
      await deleteNote(id, userId);
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
