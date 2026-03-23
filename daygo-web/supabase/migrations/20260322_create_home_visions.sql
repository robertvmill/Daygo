-- Create home_visions table for editable roadmap/vision on the home page
create table home_visions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  title text not null default 'My Roadmap',
  subtitle text,
  pillars jsonb not null default '[]'::jsonb,
  rule_title text,
  rule_text text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Create index for faster queries by user
create index home_visions_user_idx on home_visions(user_id);

-- Enable Row Level Security
alter table home_visions enable row level security;

-- Policy: Users can only access their own home vision
create policy "Users can manage their own home vision"
  on home_visions for all using (auth.uid() = user_id);
