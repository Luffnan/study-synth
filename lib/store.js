import { supabase } from './supabase.js';

// ── Notes ─────────────────────────────────────────────────────────────────────

export async function saveNote(notes, fileNames, userId) {
  const { data, error } = await supabase
    .from('notes')
    .insert({
      file_names: fileNames,
      title: notes.title || 'Untitled',
      topic_count: notes.topics?.length || 0,
      key_term_count: notes.keyTerms?.length || 0,
      notes,
      user_id: userId,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getAllNotes(userId) {
  const { data, error } = await supabase
    .from('notes')
    .select('id, created_at, file_names, title, description, topic_count, key_term_count, latest_quiz_pct, latest_quiz_at, subject_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function getNoteById(id, userId) {
  const query = supabase.from('notes').select('*').eq('id', id);
  // If userId provided, scope to that user (security check)
  if (userId) query.eq('user_id', userId);
  const { data, error } = await query.single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteNote(id, userId) {
  const query = supabase.from('notes').delete().eq('id', id);
  if (userId) query.eq('user_id', userId);
  const { error } = await query;
  if (error) throw new Error(error.message);
}

export async function updateNote(id, { title, description, subject_id }, userId) {
  const fields = {};
  if (title !== undefined) fields.title = title;
  if (description !== undefined) fields.description = description;
  if (subject_id !== undefined) fields.subject_id = subject_id;

  const query = supabase
    .from('notes')
    .update(fields)
    .eq('id', id);
  if (userId) query.eq('user_id', userId);

  const { data, error } = await query
    .select('id, title, description, subject_id')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ── Subjects ──────────────────────────────────────────────────────────────────

export async function getAllSubjects(userId) {
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

export async function createSubject({ title, color }, userId) {
  const { data, error } = await supabase
    .from('subjects')
    .insert({ title, color, user_id: userId })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateSubject(id, { title, color }, userId) {
  const fields = {};
  if (title !== undefined) fields.title = title;
  if (color !== undefined) fields.color = color;

  const query = supabase.from('subjects').update(fields).eq('id', id);
  if (userId) query.eq('user_id', userId);

  const { data, error } = await query.select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteSubject(id, userId) {
  const query = supabase.from('subjects').delete().eq('id', id);
  if (userId) query.eq('user_id', userId);
  const { error } = await query;
  if (error) throw new Error(error.message);
}

// ── Video sources ─────────────────────────────────────────────────────────────

export async function addVideoSource(id, videoSource, userId) {
  const current = await getNoteById(id, userId);
  const existingVideoSources = current.notes?.videoSources || [];
  const updatedNotes = {
    ...current.notes,
    videoSources: [
      ...existingVideoSources.filter(v => v.videoId !== videoSource.videoId),
      videoSource,
    ],
  };
  const allFileNames = [
    ...(current.file_names || []),
    `youtube:${videoSource.videoId}`,
  ].filter((v, i, a) => a.indexOf(v) === i);

  const query = supabase
    .from('notes')
    .update({ notes: updatedNotes, file_names: allFileNames })
    .eq('id', id);
  if (userId) query.eq('user_id', userId);

  const { data, error } = await query
    .select('id, file_names, title, topic_count, key_term_count')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateNoteContent(id, { notes, fileNames }, userId) {
  const query = supabase
    .from('notes')
    .update({
      notes,
      file_names: fileNames,
      title: notes.title || 'Untitled',
      topic_count: notes.topics?.length || 0,
      key_term_count: notes.keyTerms?.length || 0,
      concise_notes: null,
    })
    .eq('id', id);
  if (userId) query.eq('user_id', userId);

  const { data, error } = await query
    .select('id, file_names, title, topic_count, key_term_count')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function saveConciseNotes(id, conciseNotes, userId) {
  const query = supabase.from('notes').update({ concise_notes: conciseNotes }).eq('id', id);
  if (userId) query.eq('user_id', userId);
  const { error } = await query;
  if (error) throw new Error(error.message);
}

// ── Source files ──────────────────────────────────────────────────────────────

export async function saveSourceFiles(recordId, files, userId) {
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
  const rows = files.map(f => ({
    record_id: recordId,
    user_id: userId,
    file_name: f.fileName,
    file_size: f.fileSize,
    mime_type: f.mimeType,
    storage_path: f.storagePath,
    expires_at: new Date(Date.now() + SEVEN_DAYS).toISOString(),
  }));

  const { error } = await supabase.from('source_files').insert(rows);
  if (error) throw new Error(error.message);
}

export async function getSourceFiles(recordId, userId) {
  const { data, error } = await supabase
    .from('source_files')
    .select('id, file_name, file_size, mime_type, storage_path, created_at, expires_at')
    .eq('record_id', recordId)
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteSourceFile(id, userId) {
  const { data, error } = await supabase
    .from('source_files')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
    .select('storage_path')
    .single();

  if (error) throw new Error(error.message);
  return data; // caller deletes from storage
}

export async function getStorageUsage(userId) {
  const { data, error } = await supabase
    .from('source_files')
    .select('file_size')
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
  return data.reduce((sum, f) => sum + (f.file_size || 0), 0);
}

export async function saveQuizScore(id, pct, userId) {
  const query = supabase
    .from('notes')
    .update({ latest_quiz_pct: pct, latest_quiz_at: new Date().toISOString() })
    .eq('id', id);
  if (userId) query.eq('user_id', userId);
  const { error } = await query;
  if (error) throw new Error(error.message);
}
