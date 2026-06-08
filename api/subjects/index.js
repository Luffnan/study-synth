import { getAllSubjects, createSubject } from '../../lib/store.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const subjects = await getAllSubjects();
      res.status(200).json(subjects);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else if (req.method === 'POST') {
    try {
      const { title, color } = req.body;
      if (!title?.trim()) return res.status(400).json({ error: 'title required' });
      const subject = await createSubject({ title: title.trim(), color: color || 'indigo' });
      res.status(201).json(subject);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
