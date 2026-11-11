import Anthropic from '@anthropic-ai/sdk';
import { tryGetUserId } from '../../../lib/auth.js';
import { getNoteById, updateNoteContent } from '../../../lib/store.js';
import { supabaseAdmin } from '../../../lib/supabase.js';

export const config = { api: { bodyParser: { sizeLimit: '20mb' } } };

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, err } = await tryGetUserId(req);
  if (err) return res.status(401).json({ error: 'Unauthorized' });

  const { id, action } = req.query;

  try {
    if (action === 'scan') {
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
      return res.status(200).json({ hasDiagram: answer.startsWith('yes') });
    }

    if (action === 'place') {
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

      if (!topicNames.includes(result.topic)) result.topic = topicNames[0];

      return res.status(200).json({ topic: result.topic, caption: result.caption || '' });
    }

    if (action === 'save') {
      const { placements } = req.body;
      if (!placements?.length) return res.status(400).json({ error: 'placements required' });

      const record = await getNoteById(id, userId);
      const notes = JSON.parse(JSON.stringify(record.notes));

      for (const { base64, topic, caption } of placements) {
        const buffer = Buffer.from(base64, 'base64');
        const path = `${userId}/diagrams/${id}-${Date.now()}-${Math.random().toString(36).slice(2)}.png`;

        const { error: uploadErr } = await supabaseAdmin.storage
          .from('source-files')
          .upload(path, buffer, { contentType: 'image/png', upsert: false });

        if (uploadErr) throw new Error(uploadErr.message);

        const { data: urlData, error: urlErr } = await supabaseAdmin.storage
          .from('source-files')
          .createSignedUrl(path, 365 * 24 * 60 * 60);

        if (urlErr) throw new Error(urlErr.message);

        const topicObj = notes.topics?.find(t => t.name === topic);
        if (topicObj) {
          if (!topicObj.diagrams) topicObj.diagrams = [];
          topicObj.diagrams.push({ url: urlData.signedUrl, caption, storagePath: path });
        }
      }

      await updateNoteContent(id, { notes, fileNames: record.file_names }, userId);
      return res.status(200).json({ notes });
    }

    res.status(400).json({ error: 'action must be scan, place, or save' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
