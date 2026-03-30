-- Daily Top 3: stores the user's top 3 priorities per day
create table if not exists daily_top3 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  items jsonb not null default '[{"text":""}, {"text":""}, {"text":""}]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, date)
);

-- RLS
alter table daily_top3 enable row level security;

create policy "Users can view own daily top3"
  on daily_top3 for select
  using (auth.uid() = user_id);

create policy "Users can insert own daily top3"
  on daily_top3 for insert
  with check (auth.uid() = user_id);

create policy "Users can update own daily top3"
  on daily_top3 for update
  using (auth.uid() = user_id);

create policy "Users can delete own daily top3"
  on daily_top3 for delete
  using (auth.uid() = user_id);
