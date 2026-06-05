import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MARK_PROMPT = `You are a fair and encouraging exam marker for a student quiz.

You will be given:
- A short answer question (worth 2 marks)
- A model answer showing the key points expected
- The student's response

Your job is to award 0, 1, or 2 marks and give brief feedback.

Marking guidelines:
- 2 marks: Student demonstrates clear understanding of the key concepts. Doesn't need to match the model answer word-for-word — credit the MEANING and understanding shown.
- 1 mark: Student shows partial understanding — gets some key points but misses others, or is vague/incomplete.
- 0 marks: Response is incorrect, irrelevant, or shows no understanding of the concept.

Be FAIR and GENEROUS — if the student clearly understands the concept but expresses it differently, give full marks.
Do NOT penalise for spelling, grammar, or informal language.
DO penalise for factually wrong information.

Return ONLY valid JSON (no markdown):
{
  "score": 2,
  "feedback": "Great answer — you correctly identified X and Y. [Only add what was missing if score < 2]"
}`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { question, modelAnswer, studentAnswer } = req.body;
    if (!question || !modelAnswer || !studentAnswer) {
      return res.status(400).json({ error: 'question, modelAnswer, and studentAnswer are required' });
    }

    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 256,
      system: MARK_PROMPT,
      messages: [{
        role: 'user',
        content: `Question: ${question}\n\nModel answer: ${modelAnswer}\n\nStudent's answer: ${studentAnswer}`
      }]
    });

    const raw = response.content[0].text.trim();
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, raw];
    const result = JSON.parse(jsonMatch[1].trim());

    res.status(200).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
