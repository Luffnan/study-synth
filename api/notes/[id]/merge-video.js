import Anthropic from '@anthropic-ai/sdk';
import { getNoteById, updateNoteContent } from '../../../lib/store.js';
import { tryGetUserId } from '../../../lib/auth.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MERGE_PROMPT = `You are an expert study note editor. A student wants to integrate content from a YouTube video into their existing study notes.

You will be given:
1. The existing notes JSON (topics → subtopics → points)
2. The video's structured notes (timecoded headings + bullet points)

Merge rules:
- Integrate the video's content into the existing topics/subtopics where it fits naturally
- If the video covers something not yet in the notes, add it as a new topic
- Do NOT duplicate points already present in the existing notes
- Exclude filler (greetings, promos, off-topic tangents) — only merge genuine subject-matter content
- Keep all existing content intact
- Maintain the same 30–35% compression with complete contextual sentences

Return ONLY valid JSON — the full merged notes in the standard structure (no markdown):
{
  "title": "...",
  "topics": [...],
  "keyTerms": [...],
  "videoSources": [...]
}`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.query;
  const { videoId, merged } = req.body;
  if (!videoId) return res.status(400).json({ error: 'videoId required' });
  if (typeof merged !== 'boolean') return res.status(400).json({ error: 'merged (boolean) required' });

  const { userId, err } = await tryGetUserId(req);
  if (err) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const record = await getNoteById(id, userId);
    const notes = record.notes || {};
    const videoSources = notes.videoSources || [];
    const videoSource = videoSources.find(v => v.videoId === videoId);
    if (!videoSource) return res.status(404).json({ error: 'Video source not found' });

    if (merged) {
      const videoNotesText = (videoSource.notes || [])
        .map(s => `## ${s.heading}\n${(s.points || []).map(p => `- ${p}`).join('\n')}`)
        .join('\n\n');

      const response = await client.messages.create({
        model: 'claude-opus-4-7',
        max_tokens: 8192,
        system: MERGE_PROMPT,
        messages: [{
          role: 'user',
          content: `Existing notes:\n${JSON.stringify(notes, null, 2)}\n\nVideo notes to integrate (from: "${videoSource.title}"):\n\n${videoNotesText}\n\nReturn the merged notes JSON. Preserve the full videoSources array.`,
        }],
      });

      const raw = response.content[0].text;
      const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, raw];
      const mergedNotes = JSON.parse(jsonMatch[1].trim());

      if (!mergedNotes.videoSources) mergedNotes.videoSources = videoSources;

      mergedNotes.videoSources = mergedNotes.videoSources.map(v =>
        v.videoId === videoId
          ? { ...v, merged: true, preMergeSnapshot: notes }
          : v
      );

      const updated = await updateNoteContent(id, {
        notes: mergedNotes,
        fileNames: record.file_names,
      }, userId);

      return res.status(200).json({ notes: mergedNotes, record: updated });

    } else {
      const snapshot = videoSource.preMergeSnapshot;

      if (snapshot) {
        const restoredNotes = {
          ...snapshot,
          videoSources: (snapshot.videoSources || videoSources).map(v =>
            v.videoId === videoId
              ? { ...v, merged: false, preMergeSnapshot: undefined }
              : v
          ),
        };
        await updateNoteContent(id, { notes: restoredNotes, fileNames: record.file_names }, userId);
        return res.status(200).json({ notes: restoredNotes });
      } else {
        const updatedSources = videoSources.map(v =>
          v.videoId === videoId ? { ...v, merged: false } : v
        );
        const updatedNotes = { ...notes, videoSources: updatedSources };
        await updateNoteContent(id, { notes: updatedNotes, fileNames: record.file_names }, userId);
        return res.status(200).json({ notes: updatedNotes });
      }
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
