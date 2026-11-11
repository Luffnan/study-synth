import { getSourceFiles, deleteSourceFile } from '../../../lib/store.js';
import { tryGetUserId } from '../../../lib/auth.js';
import { supabaseAdmin } from '../../../lib/supabase.js';

export default async function handler(req, res) {
  const { id } = req.query;
  const { userId, err } = await tryGetUserId(req);
  if (err) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    try {
      const files = await getSourceFiles(id, userId);
      res.status(200).json({ files });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }

  } else if (req.method === 'DELETE') {
    try {
      const { fileId } = req.body;
      if (!fileId) return res.status(400).json({ error: 'fileId required' });

      const { storage_path } = await deleteSourceFile(fileId, userId);
      await supabaseAdmin.storage.from('source-files').remove([storage_path]);

      res.status(200).json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }

  } else if (req.method === 'POST' && req.query.action === 'signed-url') {
    try {
      const { storagePath } = req.body;
      if (!storagePath) return res.status(400).json({ error: 'storagePath required' });

      // Verify file belongs to this user/note before issuing URL
      const files = await getSourceFiles(id, userId);
      const match = files.find(f => f.storage_path === storagePath);
      if (!match) return res.status(403).json({ error: 'Not found' });

      const { data, error } = await supabaseAdmin.storage
        .from('source-files')
        .createSignedUrl(storagePath, 300); // 5 minute URL

      if (error) throw new Error(error.message);
      res.status(200).json({ url: data.signedUrl });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }

  } else if (req.method === 'GET' && req.query.action === 'proxy') {
    try {
      const { path: storagePath } = req.query;
      if (!storagePath) return res.status(400).json({ error: 'path required' });

      // Verify the file belongs to this user/note
      const files = await getSourceFiles(id, userId);
      const match = files.find(f => f.storage_path === storagePath);
      if (!match) return res.status(403).json({ error: 'Not found' });

      const { data, error } = await supabaseAdmin.storage
        .from('source-files')
        .createSignedUrl(storagePath, 300);

      if (error) throw new Error(error.message);

      const upstream = await fetch(data.signedUrl);
      if (!upstream.ok) throw new Error('Upstream fetch failed');

      res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/octet-stream');
      res.setHeader('Cache-Control', 'private, max-age=300');

      const buffer = await upstream.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }

  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
