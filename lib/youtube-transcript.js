/**
 * Fetch a YouTube transcript via Supadata's transcript API.
 * Supadata handles all of YouTube's bot-detection reliably.
 * Free tier: 1,000 requests/month — https://supadata.ai
 *
 * Required env var: SUPADATA_API_KEY
 */

export async function fetchTranscript(videoId) {
  const apiKey = process.env.SUPADATA_API_KEY;
  if (!apiKey) {
    throw new Error('SUPADATA_API_KEY environment variable is not set. Add it in your Vercel dashboard.');
  }

  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const res = await fetch(
    `https://api.supadata.ai/v1/youtube/transcript?url=${encodeURIComponent(url)}`,
    {
      headers: {
        'x-api-key': apiKey,
        'Accept': 'application/json',
      },
    }
  );

  if (res.status === 404) {
    throw new Error('No transcript found for this video. It may not have captions enabled.');
  }
  if (res.status === 401 || res.status === 403) {
    throw new Error('Invalid Supadata API key — check your SUPADATA_API_KEY environment variable.');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message || `Transcript service returned ${res.status}`);
  }

  const data = await res.json();

  // Supadata returns { content: [{ text, offset, duration, lang }], lang, availableLangs }
  // offset is in milliseconds
  const segments = (data.content || [])
    .filter(s => s.text?.trim())
    .map(s => ({
      text: s.text.replace(/\n/g, ' ').trim(),
      offset: s.offset ?? 0,
      duration: s.duration ?? 0,
    }));

  if (!segments.length) {
    throw new Error('Transcript appears to be empty for this video.');
  }

  return segments;
}
