drop policy if exists "users_own_messages" on messages;

create policy "messages_select" on messages
  for select using (auth.uid() = user_id);

create policy "messages_insert" on messages
  for insert with check (auth.uid() = user_id);

create policy "messages_update" on messages
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "messages_delete" on messages
  for delete using (auth.uid() = user_id);
