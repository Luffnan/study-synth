import Anthropic from '@anthropic-ai/sdk';
import { fetchTranscript } from '../lib/youtube-transcript.js';
import { getNoteById, addVideoSource } from '../../lib/store.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const VIDEO_NOTES_PROMPT = `You are an expert study note editor. A student has shared a YouTube video transcript.

Your task is to produce timestamped study notes for this video — a structured set of sections the student can use to navigate and review the video's content.

Rules:
- Pick 8–15 sections that each mark a meaningful topic shift or key concept in the video
- Exclude filler content: intros, outros, self-promotion, subscribe reminders, irrelevant tangents
- Only include actual subject-matter content (facts, concepts, explanations, examples)
- Each section: a clear heading + 2–4 concise bullet points capturing the key idea
- Use the transcript timestamps to assign an accurate timecode (in seconds) for where each section starts

Return ONLY valid JSON, no markdown:
[
  { "timecode": 0, "heading": "Section heading", "points": ["concise point", "another point"] },
  ...
]`;

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
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { noteId, url } = req.body;
    if (!url) return res.status(400).json({ error: 'YouTube URL required' });
    if (!noteId) return res.status(400).json({ error: 'noteId required' });

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
      max_tokens: 4096,
      system: VIDEO_NOTES_PROMPT,
      messages: [{
        role: 'user',
        content: `Video title: "${videoTitle || 'Unknown'}"\n\nTranscript:\n\n${transcript}\n\nReturn the timestamped video notes JSON array.`,
      }],
    });

    const raw = response.content[0].text;
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, raw];
    const videoNotes = JSON.parse(jsonMatch[1].trim());

    const newVideoSource = {
      videoId,
      title: videoTitle || 'YouTube Video',
      url: `https://www.youtube.com/watch?v=${videoId}`,
      notes: videoNotes || [],
      merged: false, // not yet merged into main notes
    };

    const record = await addVideoSource(noteId, newVideoSource);

    res.status(200).json({ videoSource: newVideoSource, record });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
