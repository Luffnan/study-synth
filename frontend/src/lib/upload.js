/**
 * Smart file upload helper.
 *
 * Files ≤ 4 MB  → sent directly as FormData (existing path).
 * Files  > 4 MB → uploaded to Supabase Storage first, API receives signed URLs,
 *                  storage is cleaned up after the API call completes.
 *
 * Both paths return the raw fetch Response so callers handle .json() normally.
 */
import { supabase } from './supabase.js';
import { apiFetch } from './api.js';

const THRESHOLD = 4 * 1024 * 1024; // 4 MB — Vercel Hobby hard limit

// extraBody may include { yearLevel: 'year11-12', ... } — passed through to the API
export async function submitFiles(files, apiPath, extraBody = {}) {
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  // ── Small files: direct FormData upload ───────────────────────────────────
  if (totalSize <= THRESHOLD) {
    const form = new FormData();
    files.forEach(f => form.append('files', f));
    Object.entries(extraBody).forEach(([k, v]) => form.append(k, v));
    return apiFetch(apiPath, { method: 'POST', body: form });
  }

  // ── Large files: route via Supabase Storage ───────────────────────────────
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) throw new Error('Not authenticated');

  const storageFiles = [];
  const uploadedPaths = [];

  try {
    for (const file of files) {
      // Sanitise filename for storage path
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${userId}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('temp-uploads')
        .upload(path, file, { upsert: true });

      if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);
      uploadedPaths.push(path);

      // Signed URL valid for 10 minutes — enough for Claude processing
      const { data: signedData, error: urlError } = await supabase.storage
        .from('temp-uploads')
        .createSignedUrl(path, 600);

      if (urlError) throw new Error(`Could not create signed URL: ${urlError.message}`);
      storageFiles.push({ signedUrl: signedData.signedUrl, fileName: file.name, mimeType: file.type, tempPath: path, fileSize: file.size });
    }

    const res = await apiFetch(apiPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storageFiles, ...extraBody }),
    });

    return res;
  } finally {
    // Always clean up temp storage files, even on error
    if (uploadedPaths.length) {
      await supabase.storage.from('temp-uploads').remove(uploadedPaths).catch(() => {});
    }
  }
}
