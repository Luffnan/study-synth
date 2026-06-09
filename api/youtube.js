/**
 * Unified YouTube endpoint.
 * POST { url }              → create new note from video
 * POST { url, noteId }     → ingest video into existing note
 */
import Anthropic from '@anthropic-ai/sdk';
import { fetchTranscript } from './lib/youtube-transcript.js';
import { saveNote, getNoteById, addVideoSource } from '../lib/store.js';
import { tryGetUserId } from '../lib/auth.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CREATE_PROMPT = `You are an expert study note generator. A student has shared a YouTube video transcript.

Return TWO things as a single JSON object:

1. "notes": Structured study notes extracted from the video.
   - INCLUDE: facts, concepts, definitions, processes, arguments, examples
   - EXCLUDE: exam tips, channel promos, subscribe reminders, off-topic tangents
   - 30–35% compression — thorough coverage, complete contextual sentences, 4–8 bullets per subtopic
   - Structure: title → topics → subtopics → points, plus keyTerms array

2. "videoNotes": Timestamped sections for the embedded video panel.
   - 8–15 sections covering meaningful topic shifts
   - Each: { "timecode": <seconds>, "heading": "...", "points": ["..."] }

Return ONLY valid JSON, no markdown:
{
  "notes": { "title": "...", "topics": [...], "keyTerms": [...] },
  "videoNotes": [{ "timecode": 0, "heading": "...", "points": ["..."] }]
}`;

const INGEST_PROMPT = `You are an expert study note editor. A student has shared a YouTube video transcript.

Produce timestamped study notes for this video — 8–15 sections marking meaningful topic shifts.
Exclude filler: intros, outros, self-promotion, irrelevant tangents.
Each section: clear heading + 2–4 concise bullet points + accurate timecode in seconds.

Return ONLY valid JSON array, no markdown:
[{ "timecode": 0, "heading": "...", "points": ["..."] }]`;

function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
    /^([A-Za-z0-9_-]{11})$/,
  ];
  for (const p of patterns) { const m = url.match(p); if (m) return m[1]; }
  return null;
}

function formatTranscript(segments) {
  const lines = []; let chunkStart = 0; let chunkText = [];
  for (const seg of segments) {
    const s = seg.offset !== undefined ? Math.floor(seg.offset / 1000) : Math.floor(seg.start ?? 0);
    if (!chunkText.length) chunkStart = s;
    chunkText.push(seg.text.replace(/\n/g, ' '));
    if (s - chunkStart >= 30 || chunkText.length >= 15) {
      const mm = String(Math.floor(chunkStart / 60)).padStart(2, '0');
      const ss = String(chunkStart % 60).padStart(2, '0');
      lines.push(`[${mm}:${ss}] ${chunkText.join(' ')}`);
      chunkText = []; chunkStart = s;
    }
  }
  if (chunkText.length) {
    const mm = String(Math.floor(chunkStart / 60)).padStart(2, '0');
    const ss = String(chunkStart % 60).padStart(2, '0');
    lines.push(`[${mm}:${ss}] ${chunkText.join(' ')}`);
  }
  return lines.join('\n');
}

async function getVideoTitle(videoId) {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    if (!res.ok) return null;
    return (await res.json()).title || null;
  } catch { return null; }
}

function parseJson(raw) {
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, raw];
  return JSON.parse(match[1].trim());
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, err: authErr } = await tryGetUserId(req);
  if (authErr) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { url, noteId } = req.body;
    if (!url) return res.status(400).json({ error: 'YouTube URL required' });

    const videoId = extractVideoId(url.trim());
    if (!videoId) return res.status(400).json({ error: 'Could not extract video ID from URL' });

    let segments, videoTitle;
    try {
      [segments, videoTitle] = await Promise.all([fetchTranscript(videoId), getVideoTitle(videoId)]);
    } catch (err) {
      return res.status(422).json({ error: err.message || 'Could not fetch transcript.' });
    }
    if (!segments?.length) return res.status(422).json({ error: 'No transcript found for this video.' });

    const transcript = formatTranscript(segments);

    if (noteId) {
      const response = await client.messages.create({
        model: 'claude-opus-4-7', max_tokens: 4096, system: INGEST_PROMPT,
        messages: [{ role: 'user', content: `Video: "${videoTitle || 'Unknown'}"\n\n${transcript}\n\nReturn the timestamped JSON array.` }],
      });
      const videoNotes = parseJson(response.content[0].text);
      const newSource = { videoId, title: videoTitle || 'YouTube Video', url: `https://www.youtube.com/watch?v=${videoId}`, notes: videoNotes || [], merged: false };
      const record = await addVideoSource(noteId, newSource, userId);
      return res.status(200).json({ videoSource: newSource, record });
    } else {
      const response = await client.messages.create({
        model: 'claude-opus-4-7', max_tokens: 8192, system: CREATE_PROMPT,
        messages: [{ role: 'user', content: `Video: "${videoTitle || 'Unknown'}"\n\n${transcript}` }],
      });
      const { notes, videoNotes } = parseJson(response.content[0].text);
      notes.videoSources = [{ videoId, title: videoTitle || 'YouTube Video', url: `https://www.youtube.com/watch?v=${videoId}`, notes: videoNotes || [], merged: false }];
      const record = await saveNote(notes, [`youtube:${videoId}`], userId);
      return res.status(200).json({ notes, id: record.id });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
