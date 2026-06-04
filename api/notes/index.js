import { getAllNotes } from '../../lib/store.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const records = await getAllNotes();
    res.status(200).json(records);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
