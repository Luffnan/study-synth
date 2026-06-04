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
    .select('id, created_at, file_names, title, topic_count, key_term_count')
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
