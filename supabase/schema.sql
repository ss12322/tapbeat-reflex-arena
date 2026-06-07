-- TapBeat — esquema Supabase
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- Proyecto: https://supabase.com/dashboard/project/njaesbocsnfbfouogfpo

-- Perfiles de jugador (vinculados a auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  email text not null,
  created_at timestamptz default now() not null
);

-- Mejor score por jugador (leaderboard global)
create table if not exists public.scores (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  username text not null,
  score integer not null default 0,
  avg_clicks numeric(6, 2),
  played_at timestamptz default now() not null
);

create index if not exists scores_score_desc_idx on public.scores (score desc);

alter table public.profiles enable row level security;
alter table public.scores enable row level security;

-- Perfiles: lectura pública, escritura solo del dueño
drop policy if exists "Profiles are viewable by everyone" on public.profiles;
create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Scores: lectura pública, escritura solo del dueño
drop policy if exists "Scores are viewable by everyone" on public.scores;
create policy "Scores are viewable by everyone"
  on public.scores for select using (true);

drop policy if exists "Users can insert own score" on public.scores;
create policy "Users can insert own score"
  on public.scores for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own score" on public.scores;
create policy "Users can update own score"
  on public.scores for update using (auth.uid() = user_id);

-- Crear perfil automáticamente al registrarse (username en metadata de signUp)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.email, '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
