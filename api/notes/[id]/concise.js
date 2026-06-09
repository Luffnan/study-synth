import Anthropic from '@anthropic-ai/sdk';
import { getNoteById, saveConciseNotes } from '../../../lib/store.js';
import { tryGetUserId } from '../../../lib/auth.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CONCISE_PROMPT = `You are an expert study note editor. You will be given a set of structured study notes in JSON format.

Your task is to produce a CONCISE version of those notes — a highly compressed revision aid that keeps only the most essential facts.

Rules:
1. Keep the same JSON structure (title, topics, subtopics, keyTerms)
2. Reduce to approximately 40–50% of the source points — keep only the most testable, high-value facts
3. Each bullet point should be a tight, memorable phrase or sentence — strip explanatory padding while keeping the core fact (e.g. "Treaty of Versailles (1919) — punishing reparations on Germany" rather than a full sentence)
4. Merge related minor points into a single concise point where possible
5. Keep ALL key terms — just tighten the definitions to one crisp sentence each
6. Do NOT add any information that isn't already in the source notes
7. Keep all topic and subtopic names unchanged

Return valid JSON in exactly the same structure as the input.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Note id required' });

  const { userId, err } = await tryGetUserId(req);
  if (err) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const record = await getNoteById(id, userId);

    if (record.concise_notes) {
      return res.status(200).json({ conciseNotes: record.concise_notes });
    }

    const response = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 4096,
      system: CONCISE_PROMPT,
      messages: [{
        role: 'user',
        content: `Here are the standard study notes to compress into concise format:\n\n${JSON.stringify(record.notes, null, 2)}\n\nReturn only the JSON — no other text.`
      }]
    });

    const raw = response.content[0].text;
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, raw];
    const conciseNotes = JSON.parse(jsonMatch[1].trim());

    await saveConciseNotes(id, conciseNotes, userId);

    res.status(200).json({ conciseNotes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
