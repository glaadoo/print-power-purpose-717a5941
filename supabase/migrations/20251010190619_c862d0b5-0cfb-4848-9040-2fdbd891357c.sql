-- Needed for gen_random_uuid()
create extension if not exists pgcrypto;

-- Helper: read custom header set by your client on every request
create or replace function public.ppp_session_id()
returns uuid
language sql stable
as $$
  select nullif(current_setting('request.header.x-ppp-session-id', true), '')::uuid;
$$;

-- Optional guard: fail if header missing (avoids accidental full-table reads)
create or replace function public.require_ppp_session_id()
returns boolean
language sql stable
as $$
  select public.ppp_session_id() is not null;
$$;

-- Clean up old permissive policies
drop policy if exists "Anyone can create chat session"   on public.kenzie_sessions;
drop policy if exists "Anyone can select their sessions" on public.kenzie_sessions;
drop policy if exists "Anyone can insert messages"       on public.kenzie_messages;
drop policy if exists "Anyone can select messages"       on public.kenzie_messages;

-- Sessions: anyone can create; only the caller's session (by header) is visible/deletable
create policy "create own chat session"
on public.kenzie_sessions
for insert
to anon, authenticated
with check (true);

create policy "select own chat session"
on public.kenzie_sessions
for select
to anon, authenticated
using ( public.require_ppp_session_id() and id = public.ppp_session_id() );

-- Optional: allow deleting your own session (will cascade delete messages)
create policy "delete own chat session"
on public.kenzie_sessions
for delete
to anon, authenticated
using ( public.require_ppp_session_id() and id = public.ppp_session_id() );

-- Messages: insert/select only within your session
create policy "insert messages for own session"
on public.kenzie_messages
for insert
to anon, authenticated
with check ( public.require_ppp_session_id() and session_id = public.ppp_session_id() );

create policy "select messages for own session"
on public.kenzie_messages
for select
to anon, authenticated
using ( public.require_ppp_session_id() and session_id = public.ppp_session_id() );