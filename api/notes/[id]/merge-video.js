import Anthropic from '@anthropic-ai/sdk';
import { getNoteById, updateNoteContent } from '../../../lib/store.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MERGE_PROMPT = `You are an expert study note editor. A student wants to merge content from a YouTube video into their existing study notes.

You will be given:
1. The existing notes JSON
2. The video's structured notes (headings + bullet points)

Merge rules:
- Integrate the video's content into the existing topics/subtopics where it fits naturally
- If the video covers a topic not yet in the notes, add it as a new topic
- Do NOT duplicate points already present in the existing notes
- Exclude any filler (greetings, channel promos, off-topic tangents) — only merge genuine subject-matter content
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
  const { videoId } = req.body;
  if (!videoId) return res.status(400).json({ error: 'videoId required' });

  try {
    const record = await getNoteById(id);
    const videoSource = record.notes?.videoSources?.find(v => v.videoId === videoId);
    if (!videoSource) return res.status(404).json({ error: 'Video source not found' });

    // Format the video notes compactly for the prompt
    const videoNotesText = videoSource.notes.map(s =>
      `## ${s.heading}\n${s.points.map(p => `- ${p}`).join('\n')}`
    ).join('\n\n');

    const response = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 8192,
      system: MERGE_PROMPT,
      messages: [{
        role: 'user',
        content: `Existing notes:\n${JSON.stringify(record.notes, null, 2)}\n\nVideo notes to merge (from: "${videoSource.title}"):\n\n${videoNotesText}\n\nReturn the merged notes JSON. Make sure to preserve the full videoSources array in the output (mark the merged video's "merged": true).`,
      }],
    });

    const raw = response.content[0].text;
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, raw];
    const mergedNotes = JSON.parse(jsonMatch[1].trim());

    // Ensure videoSources is preserved and mark this video as merged
    if (!mergedNotes.videoSources) mergedNotes.videoSources = record.notes.videoSources || [];
    mergedNotes.videoSources = mergedNotes.videoSources.map(v =>
      v.videoId === videoId ? { ...v, merged: true } : v
    );
    // Fallback: if Claude dropped videoSources entirely, restore from original
    if (!mergedNotes.videoSources.find(v => v.videoId === videoId)) {
      mergedNotes.videoSources = [
        ...(record.notes.videoSources || []).map(v =>
          v.videoId === videoId ? { ...v, merged: true } : v
        ),
      ];
    }

    const updated = await updateNoteContent(id, {
      notes: mergedNotes,
      fileNames: record.file_names,
    });

    res.status(200).json({ notes: mergedNotes, record: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
