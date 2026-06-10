import Anthropic from '@anthropic-ai/sdk';
import { getNoteById, updateNoteContent } from '../../../lib/store.js';
import { tryGetUserId } from '../../../lib/auth.js';
import { parseFilesFromRequest } from '../../../lib/parse-files.js';
import { yearLevelModifier } from '../../../lib/year-level.js';

export const config = { api: { bodyParser: false } };

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MERGE_PROMPT = `You are an expert study note editor. A student is adding new source material to an existing set of structured study notes.

You will be given:
1. The existing notes JSON
2. One or more new source documents (PDFs or images)

Your task is to produce a single MERGED notes JSON that combines the existing and new content.

Merge rules:
- INCLUDE all subject-matter knowledge from the new sources (facts, concepts, definitions, dates, processes)
- EXCLUDE exam technique advice, study tips, marking criteria, activity/exercise instructions, and source documents included as exercise inputs — same rules as when building notes from scratch
- If a section contains activity instructions but the underlying concept is real curriculum knowledge, extract the concept as a factual statement instead of copying the task steps (e.g. restate "Step 1: Record each transaction..." as "Each transaction is recorded with date, account name, type, DR/CR, and dollar amount")
- If the new material covers a topic that already exists: add new subtopics or bullet points under that topic — do NOT duplicate points already there
- If the new material covers a brand new topic: add it as a new topic at the end
- If new key terms appear: add them; do not duplicate existing ones
- Keep all existing content intact — never remove or rewrite existing points
- The title should remain the same unless the new material clearly belongs to a broader subject, in which case you may generalise it slightly
- Aim for 30–35% compression of new material (same standard as the original notes), with complete contextual sentences not bare labels

DIAGRAM DETECTION (new image sources only):
If any of the NEW source images contain a clearly identifiable visual element — such as a labelled scientific diagram, graph, chart, map, flowchart, or annotated figure — that provides meaningful information beyond what can be captured in text alone, you MAY include an optional "diagram" field on the most relevant new or updated subtopic.

Rules:
- At most ONE diagram per subtopic; only add to subtopics that contain content from the new images
- Reference images by their [Image N] labels (these refer to the new source images only)
- The bounding box values are fractions of the full image dimensions (0.0 = edge, 1.0 = opposite edge)
- The bounding box must be TIGHT around only the visual element itself — chart area, map border, graph axes, or diagram frame
- Do NOT extend the bounding box into adjacent paragraph text columns, even if they appear beside the diagram
- If the diagram has a visible border or box, crop just inside or along those borders
- You may include a short title directly above the diagram or a short caption directly below it, but exclude any flowing paragraph text to the left or right
- Do NOT include diagrams for plain text, simple tables, or decorative images
- Preserve any existing "diagram" fields already present on existing subtopics (copy them through unchanged)
- If no useful diagrams are present in the new material, omit all new "diagram" fields

Return ONLY valid JSON in this exact structure (no markdown fences):
{
  "title": "...",
  "topics": [
    {
      "name": "Topic Name",
      "subtopics": [
        {
          "name": "Subtopic Name",
          "points": ["point 1", "point 2"],
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
    { "term": "term", "definition": "definition" }
  ]
}

The "diagram" field is optional — omit it on subtopics that have no relevant diagram.`;

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
