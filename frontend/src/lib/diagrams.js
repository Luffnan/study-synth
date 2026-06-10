import { supabase } from './supabase.js';

/**
 * Walk the notes JSON looking for subtopics with a diagram.boundingBox.
 * For each one, crop the referenced source image using canvas, upload the crop
 * to Supabase Storage (`diagrams` bucket), and replace boundingBox with url.
 *
 * @param {object} notes      - Notes JSON returned by the API (may contain diagram.boundingBox fields)
 * @param {File[]} imageFiles - Image File objects in [Image N] order (PDFs excluded)
 * @param {string} noteId     - Note ID — used as the storage folder prefix
 * @returns {object}          - Updated notes (may be the same reference if nothing changed)
 */
export async function processDiagrams(notes, imageFiles, noteId) {
  if (!imageFiles?.length || !notes) return notes;

  // Collect all subtopics that have diagram metadata to extract
  const pending = [];
  for (const topic of notes.topics || []) {
    for (const sub of topic.subtopics || []) {
      if (sub.diagram?.boundingBox && sub.diagram.sourceImageIndex != null) {
        pending.push(sub);
      }
    }
  }
  if (!pending.length) return notes;

  // Deep-clone so we don't mutate the original object
  const processed = JSON.parse(JSON.stringify(notes));
  let anyExtracted = false;

  await Promise.all(
    processed.topics.flatMap(topic =>
      (topic.subtopics || []).map(async sub => {
        if (!sub.diagram?.boundingBox || sub.diagram.sourceImageIndex == null) return;

        const file = imageFiles[sub.diagram.sourceImageIndex];
        if (!file) {
          delete sub.diagram;
          return;
        }

        try {
          const url = await cropAndUpload(file, sub.diagram.boundingBox, noteId);
          sub.diagram = { url, description: sub.diagram.description };
          anyExtracted = true;
        } catch (err) {
          console.warn(`[Diagrams] Could not extract diagram for "${sub.name}":`, err.message);
          delete sub.diagram; // non-fatal — notes still work without it
        }
      })
    )
  );

  return anyExtracted ? processed : notes;
}

/**
 * Returns true if the given notes JSON contains at least one rendered diagram URL.
 */
export function hasDiagrams(notes) {
  return (notes?.topics || []).some(t =>
    (t.subtopics || []).some(s => s.diagram?.url)
  );
}

// ── Internal ──────────────────────────────────────────────────────────────────

async function cropAndUpload(file, boundingBox, noteId) {
  const { top, left, width, height } = boundingBox;

  // createImageBitmap is not supported for HEIC in most browsers — will throw
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(`Browser cannot decode ${file.type} for canvas cropping`);
  }

  const imgW = bitmap.width;
  const imgH = bitmap.height;

  const cropX = Math.round(left * imgW);
  const cropY = Math.round(top * imgH);
  const cropW = Math.max(1, Math.round(width * imgW));
  const cropH = Math.max(1, Math.round(height * imgH));

  const canvas = document.createElement('canvas');
  canvas.width = cropW;
  canvas.height = cropH;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.88));
  if (!blob) throw new Error('canvas.toBlob returned null');

  const path = `${noteId}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage
    .from('diagrams')
    .upload(path, blob, { contentType: 'image/jpeg' });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from('diagrams').getPublicUrl(path);
  return data.publicUrl;
}
