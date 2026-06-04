import { IncomingForm } from 'formidable';
import { readFileSync } from 'fs';
import Anthropic from '@anthropic-ai/sdk';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { saveNote } from '../lib/store.js';

export const config = { api: { bodyParser: false } };

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SUMMARISE_PROMPT = `You are an expert study note generator. You have been given study material from a student.

Your task:
1. Identify the main topics and subtopics in the material
2. Create concise, accurate study notes that capture approximately 20% of the source content — keeping only what matters most for learning and revision
3. Structure the notes hierarchically: Topic → Subtopics → Key points
4. Use clear, student-friendly language
5. Preserve important definitions, formulas, dates, names, and concepts exactly as they appear
6. Do NOT add information that isn't in the source material

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
    const textChunks = [];
    const fileNames = uploaded.map(f => f.originalFilename || f.newFilename);

    for (const file of uploaded) {
      const mime = file.mimetype || '';
      const buffer = readFileSync(file.filepath);

      if (mime === 'application/pdf') {
        const data = await pdfParse(buffer);
        textChunks.push(`--- FILE: ${file.originalFilename} ---\n${data.text}`);
      } else if (mime.startsWith('image/')) {
        contentBlocks.push({
          type: 'image',
          source: { type: 'base64', media_type: mime, data: buffer.toString('base64') }
        });
        contentBlocks.push({ type: 'text', text: `(Above image: ${file.originalFilename})` });
      } else {
        return res.status(400).json({ error: `Unsupported file type: ${mime}` });
      }
    }

    if (textChunks.length > 0) {
      contentBlocks.unshift({ type: 'text', text: textChunks.join('\n\n') });
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
