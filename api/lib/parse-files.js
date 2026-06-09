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

export async function parseFilesFromRequest(req) {
  const contentType = req.headers['content-type'] || '';

  if (contentType.includes('multipart/form-data')) {
    return parseFormData(req);
  } else {
    return parseStorageFiles(req);
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
          const base64 = readFileSync(file.filepath).toString('base64');

          if (mime === 'application/pdf') {
            contentBlocks.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } });
            contentBlocks.push({ type: 'text', text: `(Above document: ${file.originalFilename})` });
          } else if (mime.startsWith('image/')) {
            contentBlocks.push({ type: 'image', source: { type: 'base64', media_type: mime, data: base64 } });
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

async function parseStorageFiles(req) {
  // Manually read JSON body (bodyParser is disabled for this route)
  const body = await new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk.toString(); });
    req.on('end', () => { try { resolve(JSON.parse(raw)); } catch (e) { reject(new Error('Invalid JSON')); } });
    req.on('error', reject);
  });

  const { storageFiles, yearLevel = null } = body;
  if (!storageFiles?.length) throw new Error('No storage files provided');

  const fileNames = storageFiles.map(f => f.fileName);
  const contentBlocks = [];

  for (const { signedUrl, fileName, mimeType } of storageFiles) {
    const res = await fetch(signedUrl);
    if (!res.ok) throw new Error(`Failed to download ${fileName} from storage`);

    const buffer = Buffer.from(await res.arrayBuffer());
    const base64 = buffer.toString('base64');

    if (mimeType === 'application/pdf') {
      contentBlocks.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } });
      contentBlocks.push({ type: 'text', text: `(Above document: ${fileName})` });
    } else if (mimeType.startsWith('image/')) {
      contentBlocks.push({ type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } });
      contentBlocks.push({ type: 'text', text: `(Above image: ${fileName})` });
    } else {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }
  }

  return { contentBlocks, fileNames, yearLevel };
}
