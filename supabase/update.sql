-- Add topic column to sessions for dynamic titles
alter table sessions add column topic text default 'New Engineering Chat';

-- Update policy to allow updates for topic renaming
create policy "allow_update_topics" on sessions for update using (true) with check (true);

-- Ensure session increment RPC exists (re-run to be safe)
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
