/**
 * Profile helpers — read/write the `profiles` table directly via Supabase client.
 * No API endpoint needed; RLS ensures users can only access their own row.
 */
import { supabase } from './supabase.js';

export const YEAR_LEVELS = [
  { value: 'year7-8',    label: 'Year 7 – 8',          detail: 'Ages 12–14' },
  { value: 'year9-10',   label: 'Year 9 – 10',         detail: 'Ages 14–16' },
  { value: 'year11-12',  label: 'Year 11 – 12',        detail: 'Senior secondary / HSC / VCE' },
  { value: 'university', label: 'University / TAFE',   detail: 'Tertiary education' },
  { value: 'adult',      label: 'Adult / Professional', detail: 'Self-directed learning' },
];

/** Fetch the current user's profile. Returns null if not found. */
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, school_id, school_name_custom, year_level, schools(id, name, suburb, state)')
    .eq('id', userId)
    .single();
  if (error?.code === 'PGRST116') return null; // row not found
  if (error) throw error;
  return data;
}

/** Create or fully replace the current user's profile. */
export async function saveProfile(userId, { schoolId, schoolNameCustom, yearLevel }) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      school_id: schoolId ?? null,
      school_name_custom: schoolNameCustom ?? null,
      year_level: yearLevel,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Search schools by name, optionally filtered by state. */
export async function searchSchools(query, state = null) {
  if (!query || query.trim().length < 2) return [];
  let q = supabase
    .from('schools')
    .select('id, name, suburb, state, sector')
    .ilike('name', `%${query.trim()}%`)
    .order('name')
    .limit(8);
  if (state) q = q.eq('state', state);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

/** Human-readable label for a year_level value. */
export function yearLevelLabel(value) {
  return YEAR_LEVELS.find(y => y.value === value)?.label ?? value ?? 'Not set';
}
