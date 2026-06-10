import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, LevelFormat, BorderStyle, PageNumber,
  Footer, ImageRun,
} from 'docx';

/**
 * @param {object} notes
 * @param {object} [opts]
 * @param {boolean} [opts.includeDiagrams=true]
 */
export async function generateDocx(notes, opts = {}) {
  const { includeDiagrams = true } = opts;
  const children = [];

  // ── Title ──────────────────────────────────────────────────────────────────
  children.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      spacing: { after: 200 },
      children: [new TextRun({ text: notes.title || 'Study Notes', bold: true, size: 52, font: 'Inter' })],
    }),
    new Paragraph({
      spacing: { after: 400 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '0F172A', space: 4 } },
      children: [new TextRun({ text: `${notes.topics?.length || 0} topics · ${notes.keyTerms?.length || 0} key terms`, size: 20, color: '64748B', font: 'Inter' })],
    }),
  );

  // ── Topics ─────────────────────────────────────────────────────────────────
  for (const topic of notes.topics || []) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 160 },
        children: [new TextRun({ text: topic.name, bold: true, size: 32, font: 'Inter', color: '0F172A' })],
      }),
    );

    for (const sub of topic.subtopics || []) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 120 },
          children: [new TextRun({ text: sub.name, bold: true, size: 26, font: 'Inter', color: '4338CA' })],
        }),
      );

      for (const point of sub.points || []) {
        children.push(
          new Paragraph({
            numbering: { reference: 'bullets', level: 0 },
            spacing: { after: 80 },
            children: [new TextRun({ text: point, size: 22, font: 'Inter', color: '1E293B' })],
          }),
        );
      }

      // Embed diagram image below bullet points if present
      if (includeDiagrams && sub.diagram?.url) {
        try {
          const imgData = await fetchDiagramBuffer(sub.diagram.url);
          children.push(
            new Paragraph({
              spacing: { before: 120, after: 80 },
              children: [
                new ImageRun({
                  data: imgData.buffer,
                  transformation: { width: imgData.docxWidth, height: imgData.docxHeight },
                  type: 'jpg',
                }),
              ],
            }),
          );
          if (sub.diagram.description) {
            children.push(
              new Paragraph({
                spacing: { after: 120 },
                children: [new TextRun({ text: sub.diagram.description, size: 18, font: 'Inter', color: '94A3B8', italics: true })],
              }),
            );
          }
        } catch (err) {
          console.warn('[DocX] Could not embed diagram:', err.message);
        }
      }
    }
  }

  // ── Key Terms ──────────────────────────────────────────────────────────────
  if (notes.keyTerms?.length > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 480, after: 160 },
        children: [new TextRun({ text: 'Key Terms', bold: true, size: 32, font: 'Inter', color: '0F172A' })],
      }),
    );

    for (const { term, definition } of notes.keyTerms) {
      children.push(
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({ text: `${term}: `, bold: true, size: 22, font: 'Inter', color: '4338CA' }),
            new TextRun({ text: definition, size: 22, font: 'Inter', color: '1E293B' }),
          ],
        }),
      );
    }
  }

  // ── Footer ─────────────────────────────────────────────────────────────────
  const footer = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({ text: 'Brain Buffet  ·  Page ', size: 18, color: '94A3B8', font: 'Inter' }),
          new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '94A3B8', font: 'Inter' }),
        ],
      }),
    ],
  });

  const doc = new Document({
    numbering: {
      config: [{
        reference: 'bullets',
        levels: [{
          level: 0,
          format: LevelFormat.BULLET,
          text: '•',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 440, hanging: 220 } } },
        }],
      }],
    },
    styles: {
      default: {
        document: { run: { font: 'Inter', size: 22 } },
      },
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      footers: { default: footer },
      children,
    }],
  });

  return Packer.toBlob(doc);
}

// ── Diagram helper ─────────────────────────────────────────────────────────────

const MAX_DOCX_WIDTH = 450; // points — fits within A4 margins

async function fetchDiagramBuffer(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status} fetching diagram`);
  const arrayBuffer = await resp.arrayBuffer();

  // Get natural dimensions to calculate proportional height
  const blob = new Blob([arrayBuffer], { type: 'image/jpeg' });
  const objectUrl = URL.createObjectURL(blob);
  const { w, h } = await new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => { resolve({ w: img.naturalWidth, h: img.naturalHeight }); URL.revokeObjectURL(objectUrl); };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Could not load image for dimensions')); };
    img.src = objectUrl;
  });

  const ratio = h / w;
  const docxWidth = MAX_DOCX_WIDTH;
  const docxHeight = Math.round(docxWidth * ratio);

  return { buffer: arrayBuffer, docxWidth, docxHeight };
}
