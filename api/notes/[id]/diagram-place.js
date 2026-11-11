import Anthropic from '@anthropic-ai/sdk';
import { tryGetUserId } from '../../../lib/auth.js';
import { getNoteById } from '../../../lib/store.js';

export const config = { api: { bodyParser: { sizeLimit: '8mb' } } };

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, err } = await tryGetUserId(req);
  if (err) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.query;

  try {
    const { cropImage } = req.body;
    if (!cropImage) return res.status(400).json({ error: 'cropImage required' });

    const record = await getNoteById(id, userId);
    const topicNames = (record.notes.topics || []).map(t => t.name);
    if (!topicNames.length) return res.status(400).json({ error: 'No topics found' });

    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 150,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/png', data: cropImage } },
          {
            type: 'text',
            text: `These are the topics in the student's notes:\n${topicNames.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\nWhich topic does this diagram belong to? Also write a short caption (5–10 words) describing what it shows.\n\nReturn ONLY valid JSON (no markdown): {"topic": "...", "caption": "..."}`,
          },
        ],
      }],
    });

    const raw = response.content[0].text.trim();
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, raw];
    const result = JSON.parse(jsonMatch[1].trim());

    // Ensure topic is valid — fall back to first topic if not recognised
    if (!topicNames.includes(result.topic)) result.topic = topicNames[0];

    res.status(200).json({ topic: result.topic, caption: result.caption || '' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
