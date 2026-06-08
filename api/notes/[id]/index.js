import { getNoteById, deleteNote, updateNote, saveQuizScore } from '../../../lib/store.js';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const record = await getNoteById(id);
      res.status(200).json(record);
    } catch (err) {
      res.status(404).json({ error: err.message });
    }
  } else if (req.method === 'PATCH') {
    try {
      const { title, description, subject_id, latest_quiz_pct } = req.body;
      // Quiz score shortcut — just save the score, skip full update
      if (latest_quiz_pct != null && title == null && description == null && subject_id == null) {
        await saveQuizScore(id, latest_quiz_pct);
        return res.status(200).json({ ok: true });
      }
      const record = await updateNote(id, { title, description, subject_id });
      res.status(200).json(record);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else if (req.method === 'DELETE') {
    try {
      await deleteNote(id);
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
