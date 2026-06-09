import { IncomingForm } from 'formidable';
import { readFileSync } from 'fs';
import Anthropic from '@anthropic-ai/sdk';
import { getNoteById, updateNoteContent } from '../../../lib/store.js';
import { tryGetUserId } from '../../../lib/auth.js';

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

function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({ multiples: true, maxFileSize: 50 * 1024 * 1024 });
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Note id required' });

  // Auth check happens on headers before body is parsed
  const { userId, err: authErr } = await tryGetUserId(req);
  if (authErr) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const [record, { files }] = await Promise.all([
      getNoteById(id, userId),
      parseForm(req),
    ]);

    const uploaded = Array.isArray(files.files) ? files.files : [files.files].filter(Boolean);
    if (!uploaded.length) return res.status(400).json({ error: 'No files uploaded' });

    const newFileNames = uploaded.map(f => f.originalFilename || f.newFilename);

    const contentBlocks = [
      {
        type: 'text',
        text: `Here are the existing study notes:\n\n${JSON.stringify(record.notes, null, 2)}\n\nNow here are the new source documents to merge in:`,
      },
    ];

    for (const file of uploaded) {
      const mime = file.mimetype || '';
      const buffer = readFileSync(file.filepath);
      const base64 = buffer.toString('base64');

      if (mime === 'application/pdf') {
        contentBlocks.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } });
        contentBlocks.push({ type: 'text', text: `(Above document: ${file.originalFilename})` });
      } else if (mime.startsWith('image/')) {
        contentBlocks.push({ type: 'image', source: { type: 'base64', media_type: mime, data: base64 } });
        contentBlocks.push({ type: 'text', text: `(Above image: ${file.originalFilename})` });
      } else {
        return res.status(400).json({ error: `Unsupported file type: ${mime}` });
      }
    }

    contentBlocks.push({ type: 'text', text: 'Please merge the new source material into the existing notes as instructed. Return only the merged JSON.' });

    const response = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 8192,
      system: MERGE_PROMPT,
      messages: [{ role: 'user', content: contentBlocks }],
    });

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
