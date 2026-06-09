import Anthropic from '@anthropic-ai/sdk';
import { getNoteById, updateNoteContent } from '../../../lib/store.js';
import { tryGetUserId } from '../../../lib/auth.js';
import { parseFilesFromRequest } from '../../lib/parse-files.js';
import { yearLevelModifier } from '../../lib/year-level.js';

export const config = { api: { bodyParser: false } };

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MERGE_PROMPT = `You are an expert study note editor. A student is adding new source material to an existing set of structured study notes.

You will be given:
1. The existing notes JSON
2. One or more new source documents (PDFs or images)

Your task is to produce a single MERGED notes JSON that combines the existing and new content.

Merge rules:
- INCLUDE all subject-matter knowledge from the new sources (facts, concepts, definitions, dates, processes)
- EXCLUDE exam technique advice, study tips, marking criteria — same rules as when building notes from scratch
- If the new material covers a topic that already exists: add new subtopics or bullet points under that topic — do NOT duplicate points already there
- If the new material covers a brand new topic: add it as a new topic at the end
- If new key terms appear: add them; do not duplicate existing ones
- Keep all existing content intact — never remove or rewrite existing points
- The title should remain the same unless the new material clearly belongs to a broader subject, in which case you may generalise it slightly
- Aim for 30–35% compression of new material (same standard as the original notes), with complete contextual sentences not bare labels

Return ONLY valid JSON in this exact structure (no markdown fences):
{
  "title": "...",
  "topics": [
    {
      "name": "Topic Name",
      "subtopics": [
        { "name": "Subtopic Name", "points": ["point 1", "point 2"] }
      ]
    }
  ],
  "keyTerms": [
    { "term": "term", "definition": "definition" }
  ]
}`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Note id required' });

  // Auth check happens on headers before body is parsed
  const { userId, err: authErr } = await tryGetUserId(req);
  if (authErr) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const [record, { contentBlocks: fileBlocks, fileNames: newFileNames, yearLevel }] = await Promise.all([
      getNoteById(id, userId),
      parseFilesFromRequest(req),
    ]);

    const contentBlocks = [
      {
        type: 'text',
        text: `Here are the existing study notes:\n\n${JSON.stringify(record.notes, null, 2)}\n\nNow here are the new source documents to merge in:`,
      },
      ...fileBlocks,
    ];

    contentBlocks.push({ type: 'text', text: 'Please merge the new source material into the existing notes as instructed. Return only the merged JSON.' });

    const stream = client.messages.stream({
      model: 'claude-opus-4-7',
      max_tokens: 32000,
      system: yearLevelModifier(yearLevel) + MERGE_PROMPT,
      messages: [{ role: 'user', content: contentBlocks }],
    });

    const response = await stream.finalMessage();

    if (response.stop_reason === 'max_tokens') {
      return res.status(422).json({ error: 'This document is too large to merge in one pass. Try splitting it into smaller sections.' });
    }

    const raw = response.content[0].text;
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, raw];
    const mergedNotes = JSON.parse(jsonMatch[1].trim());

    const allFileNames = [...(record.file_names || []), ...newFileNames];
    const updated = await updateNoteContent(id, { notes: mergedNotes, fileNames: allFileNames }, userId);

    res.status(200).json({ notes: mergedNotes, record: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
