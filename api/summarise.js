import Anthropic from '@anthropic-ai/sdk';
import { saveNote, saveSourceFiles } from '../lib/store.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { tryGetUserId } from '../lib/auth.js';
import { parseFilesFromRequest } from '../lib/parse-files.js';
import { yearLevelModifier } from '../lib/year-level.js';

export const config = { api: { bodyParser: false } };

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SUMMARISE_PROMPT = `You are a study note generator. You have been given curriculum material from a student.

Your task is to extract and structure the subject-matter knowledge from this source material.

CORE PRINCIPLE — source first, context second:
Your notes should be anchored entirely in what is written in the source. Where the source states something clearly, transcribe and condense it faithfully. Where the source mentions a concept without enough explanation for a student to understand it, you may add a brief clarifying sentence — but only to bridge comprehension gaps, never to expand or elaborate beyond what the topic requires.

The distinction:
- ANCHORED IN SOURCE: condensing, rephrasing for clarity, restructuring for logical flow, grouping related points
- FILLING A GAP: adding a one-sentence explanation for a term the source names but does not define
- OUT OF SCOPE: adding facts, examples, history, or detail that goes beyond what the source covers

When in doubt, stay closer to the source. A note that is slightly too brief is better than one that invents detail.

INCLUDE:
- Facts, events, dates, people, places as stated in the source
- Concepts, theories, definitions, formulas, processes as stated in the source
- Cause and effect relationships that are explicitly described
- Subject-specific terminology with definitions from the source; if a term is named but not defined, add only a minimal clarifying definition
- Diagram and model content — extract labels, relationships, and descriptions shown in diagrams as note points

EXCLUDE — do not summarise or include:
- Chapter introductions, overviews, or scene-setting paragraphs that don't contain curriculum knowledge
- Learning objectives, content focus boxes, or "on completion you will have..." sections
- Exam technique advice, study tips, or learning strategies
- Instructions about how to use the material or references to external resources (videos, worksheets, digital documents)
- Activity and exercise instructions framed as student tasks
- Worked examples or practice problems the student must complete
- Source documents included purely as exercise inputs
- Narrative or story-based worked examples (e.g. "Vanessa was struggling to understand...") — extract only the underlying concept being illustrated, not the story itself

IMPORTANT DISTINCTION — activities vs knowledge:
If a section contains activity instructions but the underlying concept is real curriculum knowledge, extract the concept as a factual statement. Do not copy the task instructions.

Rules:
1. Identify the main topics and subtopics from the source structure
2. Aim for thorough coverage of all concepts in the source — coverage over compression
3. Each subtopic should have 4–8 bullet points where the content warrants it
4. Structure hierarchically: Topic → Subtopics → Key points
5. Write points as clear, complete sentences using the source's own language where possible — rephrase for clarity but do not add meaning
6. Preserve definitions, formulas, dates, and named concepts exactly as they appear in the source
7. Do not add information, examples, or context that is not present or directly implied in the source

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
}

Key terms rules:
- Include every term that is explicitly defined or highlighted as key vocabulary in the source
- Include every formula or equation that appears in the source — "term" = formula name, "definition" = the equation
- If a term appears in the source but is not defined there, add only a minimal one-line definition to aid comprehension
- Do not add terms that do not appear in the source material`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Auth check before starting SSE so errors can still return plain JSON
  const { userId, err: authErr } = await tryGetUserId(req);
  if (authErr) return res.status(401).json({ error: 'Unauthorized' });

  // Open SSE stream immediately — Vercel sees TTFB and won't 504 mid-generation
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();

  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  try {
    const { contentBlocks, fileNames, yearLevel, sourceFileMeta, rawFileBuffers } = await parseFilesFromRequest(req, { userId });

    contentBlocks.push({ type: 'text', text: 'Please summarise the above study material into structured notes as instructed.' });

    const stream = client.messages.stream({
      model: 'claude-opus-4-7',
      max_tokens: 16000,
      system: yearLevelModifier(yearLevel) + SUMMARISE_PROMPT,
      messages: [{ role: 'user', content: contentBlocks }]
    });

    // Forward chunks to client so the connection stays warm during long generations
    stream.on('text', (text) => send({ chunk: text }));

    const response = await stream.finalMessage();

    if (response.stop_reason === 'max_tokens') {
      send({ error: 'This document is too large to process in one pass. Try splitting it into smaller sections.' });
      return res.end();
    }

    const raw = response.content[0].text;
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, raw];
    const notes = JSON.parse(jsonMatch[1].trim());

    const record = await saveNote(notes, fileNames, userId);

    // Large-file path: metadata already prepared by parse-files
    if (sourceFileMeta?.length) {
      await saveSourceFiles(record.id, sourceFileMeta, userId).catch(e => console.error('[source-files] saveSourceFiles error:', e.message));
    }

    // Small-file path: upload buffers now that we have a record ID
    if (rawFileBuffers?.length) {
      const smallFileMeta = [];
      for (const { fileName, buffer, mimeType, fileSize } of rawFileBuffers) {
        const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
        const destPath = `${userId}/${Date.now()}-${safeName}`;
        const blob = new Blob([buffer], { type: mimeType });
        const { error } = await supabaseAdmin.storage
          .from('source-files')
          .upload(destPath, blob, { contentType: mimeType, upsert: false });
        if (!error) smallFileMeta.push({ fileName, fileSize, mimeType, storagePath: destPath });
      }
      if (smallFileMeta.length) await saveSourceFiles(record.id, smallFileMeta, userId).catch(e => console.error('[source-files] saveSourceFiles error:', e.message));
    }

    send({ done: true, notes, id: record.id });
    res.end();
  } catch (err) {
    console.error(err);
    send({ error: err.message });
    res.end();
  }
}
