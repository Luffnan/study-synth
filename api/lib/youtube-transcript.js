/**
 * Fetch a YouTube transcript via the InnerTube API.
 * YouTube's internal API used by their Android app — returns full player
 * data including captions and is not subject to the same bot-detection
 * that blocks page-scraping from server IPs.
 */

const INNERTUBE_API_KEY = 'AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w';
const ANDROID_CLIENT = {
  clientName: 'ANDROID',
  clientVersion: '19.09.37',
  androidSdkVersion: 30,
  userAgent: 'com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip',
  hl: 'en',
  gl: 'US',
};

export async function fetchTranscript(videoId) {
  // 1. Call InnerTube /player to get caption track URLs
  const playerRes = await fetch(
    `https://www.youtube.com/youtubei/v1/player?key=${INNERTUBE_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': ANDROID_CLIENT.userAgent,
        'X-Youtube-Client-Name': '3',
        'X-Youtube-Client-Version': ANDROID_CLIENT.clientVersion,
        'Accept-Language': 'en-US,en;q=0.9',
        Origin: 'https://www.youtube.com',
        Referer: 'https://www.youtube.com/',
      },
      body: JSON.stringify({
        context: { client: ANDROID_CLIENT },
        videoId,
        params: 'CgIQBg==', // request captions
      }),
    }
  );

  if (!playerRes.ok) throw new Error(`InnerTube player API returned ${playerRes.status}`);

  const player = await playerRes.json();

  // Check for playability issues (private, age-restricted, etc.)
  const status = player?.playabilityStatus?.status;
  if (status && status !== 'OK') {
    const reason = player?.playabilityStatus?.reason || status;
    throw new Error(`Video unavailable: ${reason}`);
  }

  const captionTracks =
    player?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

  if (!captionTracks?.length) {
    throw new Error(
      'No captions found for this video. It may not have auto-generated or manual captions enabled — try a different video.'
    );
  }

  // Prefer English; fall back to first available
  const track =
    captionTracks.find(t => t.languageCode === 'en') ||
    captionTracks.find(t => t.languageCode?.startsWith('en')) ||
    captionTracks[0];

  // 2. Fetch the actual caption data (json3 format)
  const captionUrl = `${track.baseUrl}&fmt=json3`;
  const captionRes = await fetch(captionUrl);
  if (!captionRes.ok) throw new Error(`Failed to fetch captions: ${captionRes.status}`);

  const captionData = await captionRes.json();

  // json3 format: { events: [{ tStartMs, dDurationMs, segs: [{ utf8 }] }] }
  const segments = (captionData.events || [])
    .filter(e => e.segs?.length)
    .map(e => ({
      text: e.segs.map(s => s.utf8 ?? '').join('').replace(/\n/g, ' ').trim(),
      offset: e.tStartMs ?? 0,    // milliseconds
      duration: e.dDurationMs ?? 0,
    }))
    .filter(s => s.text);

  if (!segments.length) throw new Error('Transcript appears to be empty.');

  return segments;
}
