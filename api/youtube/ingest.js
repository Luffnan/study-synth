import Anthropic from '@anthropic-ai/sdk';
import { YoutubeTranscript } from 'youtube-transcript';
import { getNoteById, updateNoteContent } from '../../lib/store.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const YOUTUBE_MERGE_PROMPT = `You are an expert study note editor. A student is adding content from a YouTube video to their study notes.

You will be given:
1. The existing notes JSON
2. A timestamped transcript of a YouTube video

Your task is to return TWO things as a single JSON object:

1. "mergedNotes": The full updated notes JSON, with new content from the video merged in.
   - Add new topics/subtopics/points from the video into the appropriate places
   - Do NOT duplicate content already in the existing notes
   - Exclude exam technique advice, study tips — only include subject-matter content
   - Keep the same 30–35% compression with complete contextual sentences
   - Keep all existing content intact

2. "videoNotes": An array of timestamped sections for the video-specific sidebar.
   - Each entry covers a coherent segment of the video (a new concept, topic change, or key explanation)
   - Pick 8–15 sections across the video — not too granular, not too sparse
   - Each entry: { "timecode": <seconds as integer>, "heading": "Brief section heading", "points": ["concise point 1", "point 2"] }
   - Use the transcript timestamps to pick accurate timecodes for where each section starts
   - Points should be tight revision notes (2–4 per section)

Return ONLY valid JSON, no markdown:
{
  "mergedNotes": { "title": "...", "topics": [...], "keyTerms": [...] },
  "videoNotes": [
    { "timecode": 0, "heading": "Introduction", "points": ["..."] },
    ...
  ]
}`;

function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
    /^([A-Za-z0-9_-]{11})$/, // bare ID
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function formatTranscript(segments) {
  // Group into ~30-second chunks for readability, label each with timestamp
  const lines = [];
  let chunkStart = 0;
  let chunkText = [];

  for (const seg of segments) {
    const offsetSec = Math.floor((seg.offset ?? seg.start ?? 0) / 1000);
    // youtube-transcript v1 uses `offset` in ms; some versions use `start` in seconds
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

    // Fetch transcript and metadata in parallel
    let segments, videoTitle;
    try {
      [segments, videoTitle] = await Promise.all([
        YoutubeTranscript.fetchTranscript(videoId),
        getVideoTitle(videoId),
      ]);
    } catch (err) {
      return res.status(422).json({ error: 'Could not fetch transcript — make sure the video has captions enabled.' });
    }

    if (!segments?.length) {
      return res.status(422).json({ error: 'No transcript found for this video. It may not have captions enabled.' });
    }

    const transcript = formatTranscript(segments);
    const record = await getNoteById(noteId);

    const response = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 8192,
      system: YOUTUBE_MERGE_PROMPT,
      messages: [{
        role: 'user',
        content: `Existing notes:\n${JSON.stringify(record.notes, null, 2)}\n\nYouTube video transcript (video title: "${videoTitle || 'Unknown'}"):\n\n${transcript}\n\nMerge the video content into the notes and return both mergedNotes and videoNotes as described.`,
      }],
    });

    const raw = response.content[0].text;
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, raw];
    const result = JSON.parse(jsonMatch[1].trim());

    const { mergedNotes, videoNotes } = result;

    // Append this video to the videoSources array
    const existingVideoSources = record.notes?.videoSources || [];
    const newVideoSource = {
      videoId,
      title: videoTitle || 'YouTube Video',
      url: `https://www.youtube.com/watch?v=${videoId}`,
      notes: videoNotes || [],
    };

    mergedNotes.videoSources = [
      ...existingVideoSources.filter(v => v.videoId !== videoId), // replace if re-adding same video
      newVideoSource,
    ];

    const allFileNames = [
      ...(record.file_names || []),
      `youtube:${videoId}`,
    ].filter((v, i, a) => a.indexOf(v) === i); // dedupe

    const updated = await updateNoteContent(noteId, { notes: mergedNotes, fileNames: allFileNames });

    res.status(200).json({
      notes: mergedNotes,
      record: updated,
      videoSource: newVideoSource,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
