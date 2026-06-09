-- ── Schools lookup table ──────────────────────────────────────────────────────
-- Populated by scripts/import-schools.js using the ACARA school list CSV.
-- Read-only for app users; managed by admin import script.

CREATE TABLE IF NOT EXISTS schools (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  suburb     TEXT,
  state      TEXT,
  sector     TEXT,       -- 'Government' | 'Catholic' | 'Independent'
  school_type TEXT,      -- 'Primary' | 'Secondary' | 'Combined' | 'Special' etc.
  acara_id   TEXT UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_schools_name  ON schools USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_schools_state ON schools(state);

-- RLS: authenticated users can search schools (read-only)
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Schools viewable by authenticated users"
  ON schools FOR SELECT
  USING (auth.role() = 'authenticated');

-- ── User profiles ─────────────────────────────────────────────────────────────
-- One row per user. Created during onboarding (after first login).

CREATE TABLE IF NOT EXISTS profiles (
  id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id         INTEGER REFERENCES schools(id) ON DELETE SET NULL,
  school_name_custom TEXT,   -- free-text fallback if school not in the list
  year_level        TEXT,    -- 'year7-8' | 'year9-10' | 'year11-12' | 'university' | 'adult'
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: users can only read/write their own profile
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
