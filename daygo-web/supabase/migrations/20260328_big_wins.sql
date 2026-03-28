-- Add big_wins column to daily_notes for "3 Big Wins" feature
alter table daily_notes add column if not exists big_wins jsonb default '[]'::jsonb;
