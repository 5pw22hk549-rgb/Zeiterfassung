-- In Supabase ausführen unter: Projekt > SQL Editor > "New query" > diesen Code einfügen > Run

create table if not exists public.user_data (
  user_id uuid references auth.users(id) on delete cascade primary key,
  entries jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_data enable row level security;

-- Jede Person darf nur ihre eigene Zeile sehen ...
create policy "Nutzer sehen nur eigene Daten"
  on public.user_data
  for select
  using (auth.uid() = user_id);

-- ... nur ihre eigene Zeile anlegen ...
create policy "Nutzer legen nur eigene Daten an"
  on public.user_data
  for insert
  with check (auth.uid() = user_id);

-- ... und nur ihre eigene Zeile ändern.
create policy "Nutzer ändern nur eigene Daten"
  on public.user_data
  for update
  using (auth.uid() = user_id);
