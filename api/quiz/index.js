import Anthropic from '@anthropic-ai/sdk';
import { getNoteById } from '../../lib/store.js';
import { tryGetUserId } from '../../lib/auth.js';
import { yearLevelModifier } from '../../lib/year-level.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Generate ──────────────────────────────────────────────────────────────────

function getQuestionCounts(units) {
  if (units <= 1) return { mcq: 3, true_false: 2, fill_blank: 2, short_answer: 1 };
  if (units <= 3) return { mcq: 4, true_false: 3, fill_blank: 3, short_answer: 2 };
  if (units <= 5) return { mcq: 5, true_false: 3, fill_blank: 3, short_answer: 3 };
  return                { mcq: 5, true_false: 4, fill_blank: 4, short_answer: 4 };
}

function buildGeneratePrompt(counts) {
  const total = counts.mcq + counts.true_false + counts.fill_blank + counts.short_answer;
  return `You are a quiz generator for students. You have been given structured study notes.

Generate a quiz with EXACTLY this mix of question types (${total} questions total):
- ${counts.mcq} multiple choice questions (4 options each, one correct)
- ${counts.true_false} true/false questions
- ${counts.fill_blank} fill-in-the-blank questions (replace ONE key word/phrase with _____)
- ${counts.short_answer} short answer question${counts.short_answer !== 1 ? 's' : ''} (worth 2 marks each, require a sentence or two to answer)

Rules:
- Questions must test FACTUAL KNOWLEDGE from the notes — not exam technique or study tips
- Vary difficulty: some straightforward recall, some requiring understanding
- Short answer questions should require synthesis, not just one-word answers
- For fill-in-blank: the blank should replace a meaningful term, date, name, or concept — not a filler word. IMPORTANT: do not include words in the question stem that are already part of the answer. For example, if the answer is "Indian Premier League", the stem must NOT contain "India's" or "Indian" — write the stem so the full answer makes sense in the gap.
- For MCQ: make distractors plausible but clearly wrong to someone who knows the material
- Cover a broad range of topics from the notes, not just one section
- modelAnswer for short answer should be 2-3 sentences explaining a complete correct response

Return ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "questions": [
    {
      "type": "mcq",
      "question": "Question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "Option A",
      "explanation": "Brief explanation of why this is correct"
    },
    {
      "type": "true_false",
      "question": "Statement to evaluate.",
      "answer": true,
      "explanation": "Brief explanation"
    },
    {
      "type": "fill_blank",
      "question": "The _____ was signed in 1919 ending World War One.",
      "answer": "Treaty of Versailles",
      "explanation": "Brief explanation"
    },
    {
      "type": "short_answer",
      "question": "Question requiring a paragraph response?",
      "modelAnswer": "A complete 2-3 sentence model answer covering the key points a student should mention.",
      "marks": 2
    }
  ]
}`;
}

// ── Mark ──────────────────────────────────────────────────────────────────────

const MARK_PROMPT = `You are a fair and encouraging exam marker for a student quiz.

You will be given:
- A short answer question (worth 2 marks)
- A model answer showing the key points expected
- The student's response

Your job is to award 0, 1, or 2 marks and write feedback.

Marking guidelines:
- 2 marks: Student demonstrates clear understanding of the key concepts. Doesn't need to match the model answer word-for-word — credit the MEANING and understanding shown.
- 1 mark: Student shows partial understanding — gets some key points but misses others, or is vague/incomplete.
- 0 marks: Response is incorrect, irrelevant, or shows no understanding of the concept.

Be FAIR and GENEROUS — if the student clearly understands the concept but expresses it differently, give full marks.
Do NOT penalise for spelling, grammar, or informal language — award marks based on understanding only.
DO penalise for factually wrong information.

FEEDBACK RULES — very important:
- If score is 2: write a brief, positive confirmation (1 sentence). Example: "Correct — you've identified both the cause and the outcome clearly."
- If score is 0 or 1: Do NOT say things like "Your answer is too vague" or "This is incomplete". Instead, write 3–5 Socratic guiding questions drawn from what was missing in the model answer, followed by a one-line prompt to expand. Format exactly like this example:
  "Think about: How did soldiers move through the countryside? What formations did they use? What equipment helped them stay hidden? Please expand your answer with specific details."
  The guiding questions should be specific to the subject content that was missing — not generic study advice.

SPELLING RULE:
- If the student misspelled one or more words, set spellingNote to a short friendly message listing the correct spellings. Example: "Just a spelling note: it's 'photosynthesis', not 'fotosinthesis'."
- If spelling is fine, set spellingNote to null.
- Never let spelling affect the score.

Return ONLY valid JSON (no markdown):
{
  "score": 2,
  "feedback": "...",
  "spellingNote": null
}`;

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action } = req.query;

  try {
    if (action === 'generate') {
      const { userId, err: authErr } = await tryGetUserId(req);
      if (authErr) return res.status(401).json({ error: 'Unauthorized' });

      const { noteId, filteredNotes, yearLevel } = req.body;
      if (!noteId) return res.status(400).json({ error: 'noteId required' });

      const record = await getNoteById(noteId, userId);
      if (!record) return res.status(404).json({ error: 'Note not found' });

      const notes = filteredNotes || record.notes;
      const notesText = JSON.stringify(notes, null, 2);
      const topicCount = notes.topics?.length || 0;
      const videoCount = notes.videoSources?.length || 0;
      const counts = getQuestionCounts(topicCount + videoCount);

      const response = await client.messages.create({
        model: 'claude-opus-4-7',
        max_tokens: 4096,
        system: yearLevelModifier(yearLevel) + buildGeneratePrompt(counts),
        messages: [{ role: 'user', content: `Generate a quiz based on these study notes:\n\n${notesText}` }],
      });

      const raw = response.content[0].text.trim();
      const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, raw];
      const quiz = JSON.parse(jsonMatch[1].trim());

      return res.status(200).json({ quiz, title: record.notes.title, counts });
    }

    if (action === 'mark') {
      const { question, modelAnswer, studentAnswer, yearLevel } = req.body;
      if (!question || !modelAnswer || !studentAnswer) {
        return res.status(400).json({ error: 'question, modelAnswer, and studentAnswer are required' });
      }

      const response = await client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 256,
        system: yearLevelModifier(yearLevel) + MARK_PROMPT,
        messages: [{
          role: 'user',
          content: `Question: ${question}\n\nModel answer: ${modelAnswer}\n\nStudent's answer: ${studentAnswer}`,
        }],
      });

      const raw = response.content[0].text.trim();
      const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, raw];
      return res.status(200).json(JSON.parse(jsonMatch[1].trim()));
    }

    res.status(400).json({ error: 'action must be generate or mark' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
