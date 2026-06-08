import { getNoteById, updateNoteContent } from '../../../lib/store.js';

/**
 * POST /api/notes/[id]/merge-video
 * Body: { videoId: string, merged: boolean }
 *
 * Toggles the `merged` flag on a videoSource entry — no Claude call needed.
 * The frontend renders merged videos' notes inline as sidebar topics when merged=true.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.query;
  const { videoId, merged } = req.body;
  if (!videoId) return res.status(400).json({ error: 'videoId required' });
  if (typeof merged !== 'boolean') return res.status(400).json({ error: 'merged (boolean) required' });

  try {
    const record = await getNoteById(id);
    const notes = record.notes || {};
    const videoSources = notes.videoSources || [];

    const updated = videoSources.map(v =>
      v.videoId === videoId ? { ...v, merged } : v
    );

    const updatedNotes = { ...notes, videoSources: updated };
    await updateNoteContent(id, { notes: updatedNotes, fileNames: record.file_names });

    res.status(200).json({ ok: true, videoId, merged });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
