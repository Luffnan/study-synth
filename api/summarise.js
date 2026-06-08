import { IncomingForm } from 'formidable';
import { readFileSync } from 'fs';
import Anthropic from '@anthropic-ai/sdk';
import { saveNote } from '../lib/store.js';

export const config = { api: { bodyParser: false } };

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SUMMARISE_PROMPT = `You are an expert study note generator. You have been given curriculum material from a student.

Your task is to extract ONLY the actual subject-matter knowledge a student needs to learn and remember.

INCLUDE:
- Facts, events, dates, people, places
- Concepts, theories, definitions, formulas, processes
- Cause and effect relationships
- Subject-specific terminology and what it means

EXCLUDE — do not summarise or include:
- Exam technique advice (e.g. "how to answer source questions", "structure your essay like...")
- Study tips or learning strategies
- Instructions about how to use the material
- Question types or marking criteria
- Anything that is about studying/exams rather than the actual subject content

If a section is purely exam technique or methodology with no subject content, skip it entirely.

Rules:
1. Identify the main topics and subtopics of the SUBJECT CONTENT only
2. Capture approximately 30–35% of the source — aim for thorough coverage of all significant facts, concepts, and relationships; do not be overly brief
3. Each subtopic should have 4–8 bullet points where the content warrants it; avoid single-point subtopics
4. Structure hierarchically: Topic → Subtopics → Key points
5. Write points as complete, informative sentences — include context, not just bare labels (e.g. "The Treaty of Versailles (1919) imposed heavy reparations on Germany, contributing to economic instability" rather than just "Treaty of Versailles")
6. Use clear, student-friendly language
7. Preserve definitions, formulas, dates, and named concepts exactly as they appear
8. Do NOT add information that isn't in the source material

Return your response as valid JSON in this exact format:
{
  "title": "inferred subject/topic title",
  "topics": [
    {
      "name": "Topic Name",
      "subtopics": [
        {
          "name": "Subtopic Name",
          "points": ["key point 1", "key point 2", ...]
        }
      ]
    }
  ],
  "keyTerms": [
    { "term": "term name", "definition": "brief definition" }
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

  try {
    const { files } = await parseForm(req);
    const uploaded = Array.isArray(files.files) ? files.files : [files.files].filter(Boolean);

    if (!uploaded.length) return res.status(400).json({ error: 'No files uploaded' });

    const contentBlocks = [];
    const fileNames = uploaded.map(f => f.originalFilename || f.newFilename);

    for (const file of uploaded) {
      const mime = file.mimetype || '';
      const buffer = readFileSync(file.filepath);
      const base64 = buffer.toString('base64');

      if (mime === 'application/pdf') {
        // Send PDF directly to Claude — works for both text-based and scanned PDFs
        contentBlocks.push({
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: base64 }
        });
        contentBlocks.push({ type: 'text', text: `(Above document: ${file.originalFilename})` });
      } else if (mime.startsWith('image/')) {
        contentBlocks.push({
          type: 'image',
          source: { type: 'base64', media_type: mime, data: base64 }
        });
        contentBlocks.push({ type: 'text', text: `(Above image: ${file.originalFilename})` });
      } else {
        return res.status(400).json({ error: `Unsupported file type: ${mime}` });
      }
    }

    contentBlocks.push({
      type: 'text',
      text: 'Please summarise the above study material into structured notes as instructed.'
    });

    const response = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 8192,
      system: SUMMARISE_PROMPT,
      messages: [{ role: 'user', content: contentBlocks }]
    });

    const raw = response.content[0].text;
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, raw];
    const notes = JSON.parse(jsonMatch[1].trim());

    const record = await saveNote(notes, fileNames);

    res.status(200).json({ notes, id: record.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
