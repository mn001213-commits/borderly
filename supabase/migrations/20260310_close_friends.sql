-- Close friends table
create table if not exists close_friends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, friend_id)
);

-- Index for fast lookups
create index if not exists idx_close_friends_user on close_friends(user_id);
create index if not exists idx_close_friends_friend on close_friends(friend_id);

-- RLS
alter table close_friends enable row level security;

create policy "Users can view own close friends"
  on close_friends for select
  using (auth.uid() = user_id);

create policy "Users can add close friends"
  on close_friends for insert
  with check (auth.uid() = user_id);

create policy "Users can remove close friends"
  on close_friends for delete
  using (auth.uid() = user_id);
