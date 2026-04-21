-- Users are handled by Supabase Auth automatically
-- Extend with profiles table
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz default now(),
  last_active timestamptz default now(),
  total_questions int default 0
);

-- Sessions linked to authenticated users
create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  last_active timestamptz default now(),
  message_count int default 0
);

-- Messages with full memory support
create table messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text check (role in ('user', 'assistant')),
  content text not null,
  topic_tags text[] default '{}',
  has_attachments boolean default false,
  feedback text check (feedback in ('helpful', 'unhelpful', null)),
  feedback_reason text,
  created_at timestamptz default now()
);

-- Topic scores per user (not per session — persists across sessions)
create table topic_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  topic text not null,
  attempts int default 0,
  struggles int default 0,
  score float default 1.0,
  updated_at timestamptz default now(),
  unique(user_id, topic)
);

-- Memory summaries per user
create table memory_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  summary text not null,
  message_count_at_summary int default 0,
  created_at timestamptz default now()
);

-- RLS Policies — users can only access their own data
alter table profiles enable row level security;
alter table sessions enable row level security;
alter table messages enable row level security;
alter table topic_scores enable row level security;
alter table memory_summaries enable row level security;

-- Drop old policy
drop policy if exists "users_own_profile" on profiles;

-- Recreate split by operation
create policy "profiles_select" on profiles
  for select using (auth.uid() = id);

create policy "profiles_insert" on profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update" on profiles
  for update using (auth.uid() = id);

-- Allow the trigger function to insert freely
-- (it runs as security definer so this is fine)

create policy "users_own_sessions" on sessions
  for all using (auth.uid() = user_id);

create policy "users_own_messages" on messages
  for all using (auth.uid() = user_id);

create policy "users_own_topics" on topic_scores
  for all using (auth.uid() = user_id);

create policy "users_own_memory" on memory_summaries
  for all using (auth.uid() = user_id);

-- Drop existing trigger and function
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists handle_new_user();

-- Recreate with better error handling
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
exception when others then
  -- Never block signup even if profile insert fails
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Indexes
create index idx_messages_user on messages(user_id);
create index idx_messages_session on messages(session_id);
create index idx_topics_user on topic_scores(user_id);
create index idx_memory_user on memory_summaries(user_id);
