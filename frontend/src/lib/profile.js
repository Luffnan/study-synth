/**
 * Profile helpers — read/write the `profiles` table directly via Supabase client.
 * No API endpoint needed; RLS ensures users can only access their own row.
 */
import { supabase } from './supabase.js';

export const YEAR_LEVELS = [
  { value: 'year7',      label: 'Year 7',               detail: 'Age ~12' },
  { value: 'year8',      label: 'Year 8',               detail: 'Age ~13' },
  { value: 'year9',      label: 'Year 9',               detail: 'Age ~14' },
  { value: 'year10',     label: 'Year 10',              detail: 'Age ~15' },
  { value: 'year11',     label: 'Year 11',              detail: 'Senior secondary' },
  { value: 'year12',     label: 'Year 12',              detail: 'Final year / HSC / VCE' },
  { value: 'university', label: 'University / TAFE',    detail: 'Tertiary education' },
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

// Legacy values stored before the individual-year migration
const LEGACY_LABELS = {
  'year7-8':  'Year 7 – 8',
  'year9-10': 'Year 9 – 10',
  'year11-12':'Year 11 – 12',
};

/** Human-readable label for a year_level value (handles old and new formats). */
export function yearLevelLabel(value) {
  return YEAR_LEVELS.find(y => y.value === value)?.label
    ?? LEGACY_LABELS[value]
    ?? null;
}
