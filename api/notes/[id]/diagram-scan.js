import Anthropic from '@anthropic-ai/sdk';
import { tryGetUserId } from '../../../lib/auth.js';

export const config = { api: { bodyParser: { sizeLimit: '8mb' } } };

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, err } = await tryGetUserId(req);
  if (err) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { pageImage } = req.body;
    if (!pageImage) return res.status(400).json({ error: 'pageImage required' });

    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 10,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/png', data: pageImage } },
          { type: 'text', text: 'Does this page contain a diagram, chart, labelled figure, or scientific illustration that would be valuable to include in study notes? Answer only "yes" or "no".' },
        ],
      }],
    });

    const answer = response.content[0].text.trim().toLowerCase();
    res.status(200).json({ hasDiagram: answer.startsWith('yes') });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
