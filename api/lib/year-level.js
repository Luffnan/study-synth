/**
 * Returns a system-prompt modifier tailored to the student's year level.
 * Prepend this to any AI system prompt to calibrate language, depth, and marking.
 *
 * Returns an empty string if yearLevel is null/unknown (no change to prompt).
 */
export function yearLevelModifier(yearLevel) {
  switch (yearLevel) {
    case 'year7-8':
      return `STUDENT LEVEL: Year 7–8 (approximately 12–14 years old).
- Use simple, clear, everyday language. Short sentences. Avoid jargon — define any subject-specific terms when you first use them.
- Use concrete examples and relatable analogies where helpful.
- Notes: focus on key facts and ideas; broad overview; avoid dense technical detail.
- Quiz questions: mostly recall-based; short answer questions only require 1–2 simple sentences.
- Marking: be generous — credit the correct idea even if expressed simply or informally. Do not penalise imprecise wording if the concept is clearly understood.
- Feedback tone: warm, encouraging, and specific. Highlight what they got right before addressing any gaps.

`;

    case 'year9-10':
      return `STUDENT LEVEL: Year 9–10 (approximately 14–16 years old).
- Use clear language with moderate complexity. Introduce subject-specific terminology naturally, with brief explanation of new terms.
- Notes: cover key concepts and cause-effect relationships with moderate depth.
- Quiz questions: mix of recall and application questions. Short answers require a couple of clear sentences.
- Marking: credit clear understanding; allow some imprecision in wording as long as the key idea is present.
- Feedback: constructive, encouraging, and specific.

`;

    case 'year11-12':
      return `STUDENT LEVEL: Year 11–12 (senior secondary, preparing for HSC / VCE / ATAR exams).
- Use precise subject-specific terminology throughout. Write at exam-ready level.
- Notes: thorough depth — include analysis, evaluation, nuanced relationships, not just bare facts. Cover all significant content needed for exams.
- Quiz questions: include higher-order questions requiring analysis and evaluation. Short answer questions should be substantive and exam-style.
- Marking: apply senior exam standards — expect correct use of terminology and complete, structured responses. Be fair but precise.
- Feedback: direct and exam-focused. Clearly identify what was missing and why it matters for marks.

`;

    case 'university':
      return `STUDENT LEVEL: University / TAFE.
- Use full academic and technical language appropriate to the discipline. Assume foundational subject knowledge.
- Notes: specialist depth — include nuance, disciplinary conventions, and critical perspectives where relevant.
- Quiz questions: require synthesis, critical analysis, and integration of concepts across the material.
- Marking: rigorous — expect precision, appropriate use of discipline-specific language, and well-structured arguments.
- Feedback: concise and academic. Point to the specific gap in reasoning or knowledge.

`;

    case 'adult':
      return `STUDENT LEVEL: Adult / Professional learner.
- Use clear, professional language. Focus on practical understanding and real-world application.
- Notes: cover key concepts clearly and efficiently without being condescending.
- Quiz questions: focus on comprehension and application.
- Marking: fair and pragmatic — focus on whether the key concept is understood.
- Feedback: direct and efficient.

`;

    default:
      return '';
  }
}
