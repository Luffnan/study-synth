import { supabase } from './supabase.js';

export async function saveNote(notes, fileNames) {
  const { data, error } = await supabase
    .from('notes')
    .insert({
      file_names: fileNames,
      title: notes.title || 'Untitled',
      topic_count: notes.topics?.length || 0,
      key_term_count: notes.keyTerms?.length || 0,
      notes,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getAllNotes() {
  const { data, error } = await supabase
    .from('notes')
    .select('id, created_at, file_names, title, description, topic_count, key_term_count, latest_quiz_pct, latest_quiz_at')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function getNoteById(id) {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteNote(id) {
  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}

export async function updateNote(id, { title, description }) {
  const fields = {};
  if (title !== undefined) fields.title = title;
  if (description !== undefined) fields.description = description;

  const { data, error } = await supabase
    .from('notes')
    .update(fields)
    .eq('id', id)
    .select('id, title, description')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateNoteContent(id, { notes, fileNames }) {
  const { data, error } = await supabase
    .from('notes')
    .update({
      notes,
      file_names: fileNames,
      title: notes.title || 'Untitled',
      topic_count: notes.topics?.length || 0,
      key_term_count: notes.keyTerms?.length || 0,
      concise_notes: null, // invalidate cached concise so it regenerates fresh
    })
    .eq('id', id)
    .select('id, file_names, title, topic_count, key_term_count')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function saveConciseNotes(id, conciseNotes) {
  const { error } = await supabase
    .from('notes')
    .update({ concise_notes: conciseNotes })
    .eq('id', id);

  if (error) throw new Error(error.message);
}

export async function saveQuizScore(id, pct) {
  const { error } = await supabase
    .from('notes')
    .update({ latest_quiz_pct: pct, latest_quiz_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(error.message);
}
