import { updateSubject, deleteSubject } from '../../lib/store.js';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'PATCH') {
    try {
      const { title, color } = req.body;
      const subject = await updateSubject(id, { title, color });
      res.status(200).json(subject);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else if (req.method === 'DELETE') {
    try {
      await deleteSubject(id);
      res.status(204).end();
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
