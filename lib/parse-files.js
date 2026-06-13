/**
 * Unified file parsing for both upload routes:
 *
 * Small files  → multipart/form-data parsed by formidable
 * Large files  → JSON body with { storageFiles: [{ signedUrl, fileName, mimeType }] }
 *               Files are fetched from Supabase signed URLs
 *
 * Returns: { contentBlocks, fileNames, yearLevel }
 * yearLevel is extracted from the form field or JSON body (may be null).
 */
import { IncomingForm } from 'formidable';
import { readFileSync } from 'fs';
import sharp from 'sharp';
import { supabase } from './supabase.js';

// Claude's hard limit for base64 image payloads
const MAX_IMAGE_BYTES = 9 * 1024 * 1024; // 9 MB — leave 1 MB headroom below 10 MB

/**
 * Resizes + compresses an image buffer so it stays under MAX_IMAGE_BYTES.
 * Progressively halves max dimension and lowers quality until it fits.
 * Returns { buffer, mimeType } — always outputs JPEG for photos.
 */
async function compressImage(inputBuffer, originalMime) {
  // HEIC needs converting; everything else → JPEG for consistent size control
  let img = sharp(inputBuffer);
  const meta = await img.metadata();

  let maxDim = Math.max(meta.width || 2000, meta.height || 2000);
  let quality = 85;

  while (true) {
    const resized = await sharp(inputBuffer)
      .resize({ width: maxDim, height: maxDim, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality })
      .toBuffer();

    if (resized.length <= MAX_IMAGE_BYTES) {
      return { buffer: resized, mimeType: 'image/jpeg' };
    }

    // Still too big — reduce
    if (quality > 60) {
      quality -= 15;
    } else {
      maxDim = Math.round(maxDim * 0.75);
      quality = 80;
    }
  }
}

export async function parseFilesFromRequest(req, { userId } = {}) {
  const contentType = req.headers['content-type'] || '';

  if (contentType.includes('multipart/form-data')) {
    return parseFormData(req);
  } else {
    return parseStorageFiles(req, userId);
  }
}

// ── FormData path (files ≤ 4 MB) ─────────────────────────────────────────────

function parseFormData(req) {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({ multiples: true, maxFileSize: 50 * 1024 * 1024 });
    form.parse(req, async (err, fields, files) => {
      if (err) return reject(err);
      try {
        const uploaded = Array.isArray(files.files) ? files.files : [files.files].filter(Boolean);
        if (!uploaded.length) return reject(new Error('No files uploaded'));

        const yearLevel = (Array.isArray(fields.yearLevel) ? fields.yearLevel[0] : fields.yearLevel) || null;
        const fileNames = uploaded.map(f => f.originalFilename || f.newFilename);
        const contentBlocks = [];

        for (const file of uploaded) {
          const mime = file.mimetype || '';

          if (mime === 'application/pdf') {
            const base64 = readFileSync(file.filepath).toString('base64');
            contentBlocks.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } });
            contentBlocks.push({ type: 'text', text: `(Above document: ${file.originalFilename})` });
          } else if (mime.startsWith('image/')) {
            const rawBuffer = readFileSync(file.filepath);
            const { buffer: compressed, mimeType: outMime } = await compressImage(rawBuffer, mime);
            const imgBase64 = compressed.toString('base64');
            contentBlocks.push({ type: 'image', source: { type: 'base64', media_type: outMime, data: imgBase64 } });
            contentBlocks.push({ type: 'text', text: `(Above image: ${file.originalFilename})` });
          } else {
            return reject(new Error(`Unsupported file type: ${mime}`));
          }
        }

        resolve({ contentBlocks, fileNames, yearLevel });
      } catch (e) { reject(e); }
    });
  });
}

// ── Storage URL path (files > 4 MB) ──────────────────────────────────────────

async function parseStorageFiles(req, userId = null) {
  // Manually read JSON body (bodyParser is disabled for this route)
  const body = await new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk.toString(); });
    req.on('end', () => { try { resolve(JSON.parse(raw)); } catch (e) { reject(new Error('Invalid JSON')); } });
    req.on('error', reject);
  });

  const { storageFiles, yearLevel = null, userId = null } = body;
  if (!storageFiles?.length) throw new Error('No storage files provided');

  const fileNames = storageFiles.map(f => f.fileName);
  const contentBlocks = [];
  const sourceFileMeta = [];

  for (const { signedUrl, fileName, mimeType, tempPath, fileSize } of storageFiles) {
    const res = await fetch(signedUrl);
    if (!res.ok) throw new Error(`Failed to download ${fileName} from storage`);

    const buffer = Buffer.from(await res.arrayBuffer());
    const base64 = buffer.toString('base64');

    if (mimeType === 'application/pdf') {
      contentBlocks.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } });
      contentBlocks.push({ type: 'text', text: `(Above document: ${fileName})` });
    } else if (mimeType.startsWith('image/')) {
      const { buffer: compressed, mimeType: outMime } = await compressImage(buffer, mimeType);
      const imgBase64 = compressed.toString('base64');
      contentBlocks.push({ type: 'image', source: { type: 'base64', media_type: outMime, data: imgBase64 } });
      contentBlocks.push({ type: 'text', text: `(Above image: ${fileName})` });
    } else {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }

    // Upload to permanent source-files bucket (buffer already in memory)
    if (tempPath && userId) {
      const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const destPath = `${userId}/${Date.now()}-${safeName}`;
      const { error: uploadErr } = await supabase.storage
        .from('source-files')
        .upload(destPath, buffer, { contentType: mimeType, upsert: false });

      if (!uploadErr) {
        sourceFileMeta.push({
          fileName,
          fileSize: fileSize || buffer.length,
          mimeType,
          storagePath: destPath,
        });
      }
    }
  }

  return { contentBlocks, fileNames, yearLevel, sourceFileMeta };
}
