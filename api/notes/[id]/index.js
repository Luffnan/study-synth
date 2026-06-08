import { getNoteById, deleteNote, updateNote } from '../../../lib/store.js';

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
      const { title, description } = req.body;
      const record = await updateNote(id, { title, description });
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
