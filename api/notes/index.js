import { getAllNotes } from '../../lib/store.js';
import { tryGetUserId } from '../../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, err } = await tryGetUserId(req);
  if (err) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const records = await getAllNotes(userId);
    res.status(200).json(records);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
