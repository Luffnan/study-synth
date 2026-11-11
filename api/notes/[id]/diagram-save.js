import { tryGetUserId } from '../../../lib/auth.js';
import { getNoteById, updateNoteContent } from '../../../lib/store.js';
import { supabaseAdmin } from '../../../lib/supabase.js';

export const config = { api: { bodyParser: { sizeLimit: '20mb' } } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, err } = await tryGetUserId(req);
  if (err) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.query;

  try {
    const { placements } = req.body;
    // placements: [{ base64: '...', topic: '...', caption: '...' }]
    if (!placements?.length) return res.status(400).json({ error: 'placements required' });

    const record = await getNoteById(id, userId);
    const notes = JSON.parse(JSON.stringify(record.notes)); // deep clone

    for (const { base64, topic, caption } of placements) {
      const buffer = Buffer.from(base64, 'base64');
      const path = `${userId}/diagrams/${id}-${Date.now()}-${Math.random().toString(36).slice(2)}.png`;

      const { error: uploadErr } = await supabaseAdmin.storage
        .from('source-files')
        .upload(path, buffer, { contentType: 'image/png', upsert: false });

      if (uploadErr) throw new Error(uploadErr.message);

      // Long-lived signed URL — 1 year
      const { data: urlData, error: urlErr } = await supabaseAdmin.storage
        .from('source-files')
        .createSignedUrl(path, 365 * 24 * 60 * 60);

      if (urlErr) throw new Error(urlErr.message);

      const topicObj = notes.topics?.find(t => t.name === topic);
      if (topicObj) {
        if (!topicObj.diagrams) topicObj.diagrams = [];
        topicObj.diagrams.push({ url: urlData.signedUrl, caption, storagePath: path });
      }
    }

    await updateNoteContent(id, { notes, fileNames: record.file_names }, userId);
    res.status(200).json({ notes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
