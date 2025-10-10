-- 1) Sessions table (anonymous-friendly)
create table if not exists public.kenzie_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid null
);

-- 2) Messages table
create table if not exists public.kenzie_messages (
  id bigserial primary key,
  session_id uuid not null references public.kenzie_sessions(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  created_at timestamptz not null default now()
);

-- Helpful indexes
create index if not exists kenzie_messages_session_idx on public.kenzie_messages(session_id, created_at);

-- Row Level Security
alter table public.kenzie_sessions enable row level security;
alter table public.kenzie_messages enable row level security;

-- Sessions policies - allow anyone to create and read their own sessions
create policy "Anyone can create chat session"
on public.kenzie_sessions
for insert
to anon, authenticated
with check (true);

create policy "Anyone can select their sessions"
on public.kenzie_sessions
for select
to anon, authenticated
using (true);

-- Messages policies - allow anyone to insert and select messages
create policy "Anyone can insert messages"
on public.kenzie_messages
for insert
to anon, authenticated
with check (true);

create policy "Anyone can select messages"
on public.kenzie_messages
for select
to anon, authenticated
using (true);