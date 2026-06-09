-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 002: Add per-user ownership to notes and subjects
-- Run this in Supabase SQL editor (Dashboard → SQL editor → New query)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add user_id columns (nullable so existing rows aren't blocked)
ALTER TABLE notes    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Performance indexes
CREATE INDEX IF NOT EXISTS idx_notes_user_id    ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_subjects_user_id ON subjects(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. ONE-TIME: Assign existing data to your account
--    After you register and log in, find your user UUID in:
--    Supabase dashboard → Authentication → Users → click your email → copy UUID
--    Then replace YOUR_USER_UUID below and run this block:
-- ─────────────────────────────────────────────────────────────────────────────

-- UPDATE notes    SET user_id = 'YOUR_USER_UUID' WHERE user_id IS NULL;
-- UPDATE subjects SET user_id = 'YOUR_USER_UUID' WHERE user_id IS NULL;
