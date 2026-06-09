import { updateSubject, deleteSubject } from '../../lib/store.js';
import { tryGetUserId } from '../../lib/auth.js';

export default async function handler(req, res) {
  const { id } = req.query;
  const { userId, err } = await tryGetUserId(req);
  if (err) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'PATCH') {
    try {
      const { title, color } = req.body;
      const subject = await updateSubject(id, { title, color }, userId);
      res.status(200).json(subject);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else if (req.method === 'DELETE') {
    try {
      await deleteSubject(id, userId);
      res.status(204).end();
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
