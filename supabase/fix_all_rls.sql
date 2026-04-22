-- topic_scores
drop policy if exists "users_own_topics" on topic_scores;
create policy "topics_select" on topic_scores
  for select using (auth.uid() = user_id);
create policy "topics_insert" on topic_scores
  for insert with check (auth.uid() = user_id);
create policy "topics_update" on topic_scores
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "topics_delete" on topic_scores
  for delete using (auth.uid() = user_id);

-- memory_summaries
drop policy if exists "users_own_memory" on memory_summaries;
create policy "memory_select" on memory_summaries
  for select using (auth.uid() = user_id);
create policy "memory_insert" on memory_summaries
  for insert with check (auth.uid() = user_id);
create policy "memory_update" on memory_summaries
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "memory_delete" on memory_summaries
  for delete using (auth.uid() = user_id);

-- profiles
drop policy if exists "users_own_profile" on profiles;
create policy "profiles_select" on profiles
  for select using (auth.uid() = id);
create policy "profiles_insert" on profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update" on profiles
  for update using (auth.uid() = id);
