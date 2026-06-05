import Anthropic from '@anthropic-ai/sdk';
import { getNoteById } from '../../lib/store.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const QUIZ_PROMPT = `You are a quiz generator for students. You have been given structured study notes.

Generate a quiz with EXACTLY this mix of question types:
- 5 multiple choice questions (4 options each, one correct)
- 4 true/false questions
- 4 fill-in-the-blank questions (replace ONE key word/phrase with _____)
- 4 short answer questions (worth 2 marks each, require a sentence or two to answer)

Rules:
- Questions must test FACTUAL KNOWLEDGE from the notes — not exam technique or study tips
- Vary difficulty: some straightforward recall, some requiring understanding
- Short answer questions should require synthesis, not just one-word answers
- For fill-in-blank: the blank should be a meaningful term, date, name, or concept — not a filler word
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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { noteId } = req.body;
    if (!noteId) return res.status(400).json({ error: 'noteId required' });

    const record = await getNoteById(noteId);
    if (!record) return res.status(404).json({ error: 'Note not found' });

    const notesText = JSON.stringify(record.notes, null, 2);

    const response = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 4096,
      system: QUIZ_PROMPT,
      messages: [{
        role: 'user',
        content: `Generate a quiz based on these study notes:\n\n${notesText}`
      }]
    });

    const raw = response.content[0].text.trim();
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, raw];
    const quiz = JSON.parse(jsonMatch[1].trim());

    res.status(200).json({ quiz, title: record.notes.title });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
