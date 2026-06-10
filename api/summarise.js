import Anthropic from '@anthropic-ai/sdk';
import { saveNote } from '../lib/store.js';
import { tryGetUserId } from '../lib/auth.js';
import { parseFilesFromRequest } from './lib/parse-files.js';
import { yearLevelModifier } from './lib/year-level.js';

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
- Activity and exercise instructions — any content framed as a student task (e.g. "Step 1: Record each transaction...", "Complete the following table...", "Fill in the worksheet...", "Use the source below to answer...")
- Worked examples or practice problems presented as things the student must do
- Source documents, extracts, or reference materials included purely as exercise inputs (e.g. newspaper articles, financial statements, case studies provided for the student to analyse) — these are practice resources, not curriculum knowledge
- Any section whose primary purpose is to give the student something to practise rather than something to learn

IMPORTANT DISTINCTION — activities vs knowledge:
If a section contains activity instructions BUT the underlying concept is real curriculum knowledge, extract the concept as a factual statement instead. Do NOT copy the task instructions.
- BAD: "Step 1: Record each transaction in a table showing the date, account name, type, DR/CR..."
- GOOD: "Each transaction is recorded with the date, account name, account type, DR/CR classification, and dollar amount."
The test: would a student need to memorise this, or just follow it during a task? If they just follow it, skip it or restate it as the underlying concept.

If a section is purely activity/exercise content with no extractable subject-matter knowledge, skip it entirely.

Rules:
1. Identify the main topics and subtopics of the SUBJECT CONTENT only
2. Capture approximately 30–35% of the source — aim for thorough coverage of all significant facts, concepts, and relationships; do not be overly brief
3. Each subtopic should have 4–8 bullet points where the content warrants it; avoid single-point subtopics
4. Structure hierarchically: Topic → Subtopics → Key points
5. Write points as complete, informative sentences — include context, not just bare labels (e.g. "The Treaty of Versailles (1919) imposed heavy reparations on Germany, contributing to economic instability" rather than just "Treaty of Versailles")
6. Use clear, student-friendly language
7. Preserve definitions, formulas, dates, and named concepts exactly as they appear
8. Do NOT add information that isn't in the source material

DIAGRAM DETECTION (image inputs only):
If any input image contains a clearly identifiable visual element — such as a labelled scientific diagram, graph, chart, map, flowchart, or annotated figure — that provides meaningful information beyond what can be captured in text alone, you MAY include an optional "diagram" field on the most relevant subtopic.

Rules:
- At most ONE diagram per subtopic
- Only include diagrams when the visual genuinely adds value that text cannot replicate
- Reference images by their [Image N] labels from the input
- The bounding box values are fractions of the full image dimensions (0.0 = top/left edge, 1.0 = bottom/right edge)
- Include the full diagram area: labels, axes, captions, and any surrounding annotation
- Do NOT include diagrams for plain text content, simple text tables, or decorative images
- If no useful diagrams are present, omit all "diagram" fields entirely

Return your response as valid JSON in this exact format:
{
  "title": "inferred subject/topic title",
  "topics": [
    {
      "name": "Topic Name",
      "subtopics": [
        {
          "name": "Subtopic Name",
          "points": ["key point 1", "key point 2"],
          "diagram": {
            "description": "concise description of what the diagram shows",
            "sourceImageIndex": 0,
            "boundingBox": { "top": 0.10, "left": 0.05, "width": 0.90, "height": 0.40 }
          }
        }
      ]
    }
  ],
  "keyTerms": [
    { "term": "term name", "definition": "brief definition" }
  ]
}

The "diagram" field is optional — omit it on subtopics that have no relevant diagram.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Auth check on headers before body is parsed
  const { userId, err: authErr } = await tryGetUserId(req);
  if (authErr) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { contentBlocks, fileNames, yearLevel } = await parseFilesFromRequest(req);

    contentBlocks.push({ type: 'text', text: 'Please summarise the above study material into structured notes as instructed.' });

    const stream = client.messages.stream({
      model: 'claude-opus-4-7',
      max_tokens: 32000,
      system: yearLevelModifier(yearLevel) + SUMMARISE_PROMPT,
      messages: [{ role: 'user', content: contentBlocks }]
    });

    const response = await stream.finalMessage();

    if (response.stop_reason === 'max_tokens') {
      return res.status(422).json({ error: 'This document is too large to process in one pass. Try splitting it into smaller sections.' });
    }

    const raw = response.content[0].text;
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, raw];
    const notes = JSON.parse(jsonMatch[1].trim());

    const record = await saveNote(notes, fileNames, userId);

    res.status(200).json({ notes, id: record.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
