/**
 * Standalone prompt comparison script.
 * Runs the same PDF through the existing prompt and the proposed new prompt,
 * saves both outputs to /tmp for side-by-side review.
 * Does NOT touch the app codebase.
 *
 * Usage: node compare-prompts.mjs
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync } from 'fs';
import { config } from 'dotenv';

config(); // load .env

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PDF_PATH = '/Users/evieloughnan/Documents/GitHub/OLD/docs/test-docs/Textbook chapter diagram test.pdf';

// ── Prompts ───────────────────────────────────────────────────────────────────

const PROMPT_EXISTING = `You are an expert study note generator. You have been given curriculum material from a student.

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
- Include ALL named concepts, subject-specific vocabulary, and technical terms with their definitions
- ALWAYS include every formula or equation that appears in the material — use the format: "term" = the formula name (e.g. "Net Profit"), "definition" = the full equation (e.g. "Net Profit = Gross Profit − Expenses")
- Do not omit formulas even if they also appear in the notes body`;

const PROMPT_NEW = `You are a study note generator. You have been given curriculum material from a student.

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
- Exam technique advice, study tips, or learning strategies
- Instructions about how to use the material
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatAsMarkdown(notes, label) {
  let md = `# ${label}\n\n`;
  md += `## ${notes.title}\n\n`;

  for (const topic of notes.topics) {
    md += `### ${topic.name}\n\n`;
    for (const sub of topic.subtopics) {
      md += `#### ${sub.name}\n\n`;
      for (const point of sub.points) {
        md += `- ${point}\n`;
      }
      md += '\n';
    }
  }

  md += `---\n\n## Key Terms\n\n`;
  for (const { term, definition } of notes.keyTerms) {
    md += `**${term}** — ${definition}\n\n`;
  }

  return md;
}

async function runPrompt(label, systemPrompt, pdfBase64) {
  console.log(`\nRunning: ${label}...`);

  const response = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 8000,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 } },
        { type: 'text', text: 'Please summarise the above study material into structured notes as instructed.' },
      ]
    }]
  });

  const raw = response.content[0].text;
  const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, raw];
  return JSON.parse(jsonMatch[1].trim());
}

// ── Main ──────────────────────────────────────────────────────────────────────

const pdfBuffer = readFileSync(PDF_PATH);
const pdfBase64 = pdfBuffer.toString('base64');

console.log(`PDF loaded: ${(pdfBuffer.length / 1024).toFixed(0)} KB`);

const [existingNotes, newNotes] = await Promise.all([
  runPrompt('EXISTING PROMPT', PROMPT_EXISTING, pdfBase64),
  runPrompt('NEW PROMPT', PROMPT_NEW, pdfBase64),
]);

const outDir = '/tmp/brain-buffet-comparison';
import { mkdirSync } from 'fs';
try { mkdirSync(outDir); } catch {}

writeFileSync(`${outDir}/existing-prompt.json`, JSON.stringify(existingNotes, null, 2));
writeFileSync(`${outDir}/new-prompt.json`, JSON.stringify(newNotes, null, 2));
writeFileSync(`${outDir}/existing-prompt.md`, formatAsMarkdown(existingNotes, 'EXISTING PROMPT — Notes Output'));
writeFileSync(`${outDir}/new-prompt.md`, formatAsMarkdown(newNotes, 'NEW PROMPT — Notes Output'));

console.log(`\nDone. Files saved to ${outDir}/`);
console.log('  existing-prompt.md');
console.log('  new-prompt.md');
console.log('  existing-prompt.json');
console.log('  new-prompt.json');
