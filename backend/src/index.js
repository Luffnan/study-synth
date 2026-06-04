import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '../.env'), override: true });

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import Anthropic from '@anthropic-ai/sdk';
import { processPDF } from './fileProcessor.js';
import { saveNote, getAllNotes, getNoteById, deleteNote } from './store.js';

// Ensure data dir exists
mkdirSync(join(__dirname, '../data'), { recursive: true });

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.use(cors());
app.use(express.json());

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

app.post('/api/summarise', upload.array('files', 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const contentBlocks = [];
    const textChunks = [];
    const fileNames = req.files.map(f => f.originalname);

    for (const file of req.files) {
      const mime = file.mimetype;
      if (mime === 'application/pdf') {
        const text = await processPDF(file.buffer);
        textChunks.push(`--- FILE: ${file.originalname} ---\n${text}`);
      } else if (mime.startsWith('image/')) {
        const base64 = file.buffer.toString('base64');
        contentBlocks.push({
          type: 'image',
          source: { type: 'base64', media_type: mime, data: base64 }
        });
        contentBlocks.push({
          type: 'text',
          text: `(Above image is file: ${file.originalname})`
        });
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
    const jsonStr = jsonMatch[1].trim();
    const notes = JSON.parse(jsonStr);

    const record = saveNote(notes, fileNames);

    res.json({ notes, id: record.id, usage: response.usage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// History endpoints
app.get('/api/notes', (_, res) => {
  const records = getAllNotes().map(r => ({
    id: r.id,
    createdAt: r.createdAt,
    fileNames: r.fileNames,
    title: r.notes.title,
    topicCount: r.notes.topics?.length || 0,
    keyTermCount: r.notes.keyTerms?.length || 0,
  }));
  res.json(records);
});

app.get('/api/notes/:id', (req, res) => {
  const record = getNoteById(req.params.id);
  if (!record) return res.status(404).json({ error: 'Not found' });
  res.json(record);
});

app.delete('/api/notes/:id', (req, res) => {
  deleteNote(req.params.id);
  res.json({ ok: true });
});

app.get('/api/health', (_, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`StudySynth backend running on :${PORT}`));
