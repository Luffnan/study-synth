/**
 * Fetch a YouTube transcript without the youtube-transcript npm package.
 * Makes direct requests with browser-like headers to avoid bot detection.
 */

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
};

export async function fetchTranscript(videoId) {
  // Fetch the YouTube watch page
  const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=en`, {
    headers: BROWSER_HEADERS,
  });

  if (!pageRes.ok) throw new Error(`YouTube returned ${pageRes.status}`);

  const html = await pageRes.text();

  // Extract ytInitialPlayerResponse JSON blob
  const playerMatch = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\})\s*;[\s\n]*(?:var|const|let|window|<\/script>)/s);
  if (!playerMatch) {
    // Fallback: broader match
    const fallback = html.match(/ytInitialPlayerResponse\s*=\s*(\{[\s\S]+?\});/);
    if (!fallback) throw new Error('Could not parse YouTube player data — the video may be age-restricted or unavailable.');
    playerMatch && (playerMatch[1] = fallback[1]);
    if (!playerMatch) {
      const m2 = fallback;
      return await fetchFromPlayerData(m2[1], videoId);
    }
  }

  return await fetchFromPlayerData(playerMatch[1], videoId);
}

async function fetchFromPlayerData(jsonStr, videoId) {
  let playerResponse;
  try {
    playerResponse = JSON.parse(jsonStr);
  } catch {
    throw new Error('Could not parse YouTube player data.');
  }

  const captionTracks =
    playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

  if (!captionTracks?.length) {
    throw new Error('No captions found for this video. Make sure it has auto-generated or manual captions enabled.');
  }

  // Prefer English; fall back to first available
  const track =
    captionTracks.find(t => t.languageCode === 'en') ||
    captionTracks.find(t => t.languageCode?.startsWith('en')) ||
    captionTracks[0];

  const captionUrl = `${track.baseUrl}&fmt=json3`;

  const captionRes = await fetch(captionUrl, { headers: BROWSER_HEADERS });
  if (!captionRes.ok) throw new Error(`Failed to fetch captions: ${captionRes.status}`);

  const captionData = await captionRes.json();

  // json3 format: { events: [{ tStartMs, dDurationMs, segs: [{ utf8 }] }] }
  const segments = (captionData.events || [])
    .filter(e => e.segs?.length)
    .map(e => ({
      text: e.segs.map(s => s.utf8 ?? '').join('').replace(/\n/g, ' ').trim(),
      offset: e.tStartMs ?? 0,       // milliseconds
      duration: e.dDurationMs ?? 0,
    }))
    .filter(s => s.text);

  if (!segments.length) throw new Error('Transcript appears to be empty.');

  return segments;
}
