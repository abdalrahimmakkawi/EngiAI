-- Sessions table
create table sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  last_active timestamptz default now(),
  message_count int default 0
);

-- Messages table  
create table messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  role text check (role in ('user', 'assistant')),
  content text not null,
  topic_tags text[] default '{}',
  has_attachments boolean default false,
  feedback text check (feedback in ('helpful', 'unhelpful', null)),
  feedback_reason text,
  created_at timestamptz default now()
);

-- Topic scores table
create table topic_scores (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  topic text not null,
  attempts int default 0,
  struggles int default 0,
  score float default 1.0,
  updated_at timestamptz default now(),
  unique(session_id, topic)
);

-- Enable RLS
alter table sessions enable row level security;
alter table messages enable row level security;
alter table topic_scores enable row level security;

-- Public access policies (no auth needed for student tool)
create policy "public_sessions" on sessions for all using (true);
create policy "public_messages" on messages for all using (true);
create policy "public_topics" on topic_scores for all using (true);

-- RPC for atomic session updates
create or replace function increment_session_messages(session_id_param uuid)
returns void as $$
begin
  update sessions
  set 
    message_count = message_count + 1,
    last_active = now()
  where id = session_id_param;
end;
$$ language plpgsql security definer;

-- Indexes for fast queries
create index idx_messages_session on messages(session_id);
create index idx_messages_created on messages(created_at);
create index idx_topics_session on topic_scores(session_id);
