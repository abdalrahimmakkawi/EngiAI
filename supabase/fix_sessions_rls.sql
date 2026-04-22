-- Drop broad policy
drop policy if exists "allow_update_topics" on sessions;
drop policy if exists "users_own_sessions" on sessions;

-- Recreate all session policies scoped to user
create policy "sessions_select" on sessions
  for select using (auth.uid() = user_id);

create policy "sessions_insert" on sessions
  for insert with check (auth.uid() = user_id);

create policy "sessions_update" on sessions
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "sessions_delete" on sessions
  for delete using (auth.uid() = user_id);
