-- Source files table: tracks uploaded files stored for 7-day retention
create table if not exists source_files (
  id          uuid primary key default gen_random_uuid(),
  record_id   uuid not null references notes(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  file_name   text not null,
  file_size   bigint,
  mime_type   text,
  storage_path text not null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default (now() + interval '7 days')
);

-- RLS
alter table source_files enable row level security;

create policy "Users see own source files"
  on source_files for select
  using (auth.uid() = user_id);

create policy "Users insert own source files"
  on source_files for insert
  with check (auth.uid() = user_id);

create policy "Users delete own source files"
  on source_files for delete
  using (auth.uid() = user_id);

-- Index for fast lookup by record
create index if not exists source_files_record_id_idx on source_files(record_id);
create index if not exists source_files_user_id_idx on source_files(user_id);
