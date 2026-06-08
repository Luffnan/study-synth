import Anthropic from '@anthropic-ai/sdk';
import { fetchTranscript } from '../lib/youtube-transcript.js';
import { saveNote } from '../../lib/store.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CREATE_FROM_VIDEO_PROMPT = `You are an expert study note generator. A student has shared a YouTube video transcript.

Your task is to return TWO things as a single JSON object:

1. "notes": Structured study notes extracted from the video — same format as notes built from documents.
   - INCLUDE: facts, concepts, definitions, processes, arguments, examples — anything a student needs to learn
   - EXCLUDE: exam technique advice, study tips, channel promos, subscribe reminders, off-topic tangents, filler
   - 30–35% compression — thorough coverage, complete contextual sentences, 4–8 bullet points per subtopic
   - Structure: title → topics → subtopics → points, plus keyTerms array

2. "videoNotes": Timestamped sections for the embedded video panel.
   - 8–15 sections covering meaningful topic shifts or key concepts
   - Each: { "timecode": <seconds>, "heading": "Section heading", "points": ["tight point", ...] }
   - Use transcript timestamps accurately

Return ONLY valid JSON, no markdown:
{
  "notes": {
    "title": "...",
    "topics": [{ "name": "...", "subtopics": [{ "name": "...", "points": ["..."] }] }],
    "keyTerms": [{ "term": "...", "definition": "..." }]
  },
  "videoNotes": [
    { "timecode": 0, "heading": "...", "points": ["..."] }
  ]
}`;

function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
    /^([A-Za-z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function formatTranscript(segments) {
  const lines = [];
  let chunkStart = 0;
  let chunkText = [];
  for (const seg of segments) {
    const actualSec = seg.offset !== undefined ? Math.floor(seg.offset / 1000) : Math.floor(seg.start ?? 0);
    if (chunkText.length === 0) chunkStart = actualSec;
    chunkText.push(seg.text.replace(/\n/g, ' '));
    if (actualSec - chunkStart >= 30 || chunkText.length >= 15) {
      const mm = String(Math.floor(chunkStart / 60)).padStart(2, '0');
      const ss = String(chunkStart % 60).padStart(2, '0');
      lines.push(`[${mm}:${ss}] ${chunkText.join(' ')}`);
      chunkText = [];
      chunkStart = actualSec;
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
    const data = await res.json();
    return data.title || null;
  } catch { return null; }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'YouTube URL required' });

    const videoId = extractVideoId(url.trim());
    if (!videoId) return res.status(400).json({ error: 'Could not extract video ID from URL' });

    let segments, videoTitle;
    try {
      [segments, videoTitle] = await Promise.all([
        fetchTranscript(videoId),
        getVideoTitle(videoId),
      ]);
    } catch (err) {
      return res.status(422).json({ error: err.message || 'Could not fetch transcript.' });
    }

    if (!segments?.length) {
      return res.status(422).json({ error: 'No transcript found for this video. It may not have captions enabled.' });
    }

    const transcript = formatTranscript(segments);

    const response = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 8192,
      system: CREATE_FROM_VIDEO_PROMPT,
      messages: [{
        role: 'user',
        content: `Video title: "${videoTitle || 'Unknown'}"\n\nTranscript:\n\n${transcript}`,
      }],
    });

    const raw = response.content[0].text;
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, raw];
    const result = JSON.parse(jsonMatch[1].trim());

    const { notes, videoNotes } = result;

    // Attach the video as a source within the notes
    notes.videoSources = [{
      videoId,
      title: videoTitle || 'YouTube Video',
      url: `https://www.youtube.com/watch?v=${videoId}`,
      notes: videoNotes || [],
      merged: false,
    }];

    const fileNames = [`youtube:${videoId}`];
    const record = await saveNote(notes, fileNames);

    res.status(200).json({ notes, id: record.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
