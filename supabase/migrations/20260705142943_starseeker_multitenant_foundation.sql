-- StarSeeker Reading Command: multi-tenant foundation, isolated in its own
-- schema (this Supabase project is shared with another app in `public`).
-- Guardians are Supabase Auth users; children are PIN-based profiles under a
-- family. All tables carry RLS scoped to the guardian's family. The app
-- server (service role) bypasses RLS; these policies protect any future
-- client-direct access.

create schema if not exists starseeker;

create table starseeker.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table starseeker.guardians (
  user_id uuid primary key references auth.users(id) on delete cascade,
  family_id uuid not null references starseeker.families(id) on delete cascade,
  role text not null default 'guardian' check (role in ('owner','guardian')),
  created_at timestamptz not null default now()
);
create index guardians_family_idx on starseeker.guardians(family_id);

create table starseeker.child_profiles (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references starseeker.families(id) on delete cascade,
  display_name text not null,
  username text not null,
  pin_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (family_id, username)
);
create index child_profiles_family_idx on starseeker.child_profiles(family_id);

-- Per-child game state (port of the v2 SQLite schema, keyed by child_id)
create table starseeker.player_state (
  child_id uuid primary key references starseeker.child_profiles(id) on delete cascade,
  star_dust integer not null default 0,
  rank integer not null default 0,
  streak integer not null default 0,
  streak_shields integer not null default 1,
  last_played date,
  world_seed bigint,
  updated_at timestamptz not null default now()
);

create table starseeker.skill_state (
  child_id uuid not null references starseeker.child_profiles(id) on delete cascade,
  skill_id text not null,
  mastery real not null default 0,
  speech_mastery real not null default 0,
  reps integer not null default 0,
  last_seen timestamptz,
  primary key (child_id, skill_id)
);

create table starseeker.word_state (
  child_id uuid not null references starseeker.child_profiles(id) on delete cascade,
  word_id text not null,
  exposures integer not null default 0,
  read_mastery real not null default 0,
  speech_mastery real not null default 0,
  last_seen timestamptz,
  primary key (child_id, word_id)
);

create table starseeker.attempts (
  id bigint generated always as identity primary key,
  child_id uuid not null references starseeker.child_profiles(id) on delete cascade,
  ts timestamptz not null default now(),
  kind text not null check (kind in ('tap','speech')),
  target_type text not null check (target_type in ('skill','word','sentence','passage_page')),
  target_id text not null,
  target_text text not null,
  correct boolean,
  closeness real,
  band text,
  heard text,
  substitutions jsonb not null default '[]'::jsonb,
  hints integer not null default 0,
  audio_path text,
  mission_id text,
  session_id bigint
);
create index attempts_child_ts_idx on starseeker.attempts(child_id, ts);

create table starseeker.speech_profile (
  child_id uuid not null references starseeker.child_profiles(id) on delete cascade,
  phoneme text not null,
  substitution text not null,
  count integer not null default 0,
  last_seen timestamptz not null default now(),
  primary key (child_id, phoneme, substitution)
);

create table starseeker.sessions (
  id bigint generated always as identity primary key,
  child_id uuid not null references starseeker.child_profiles(id) on delete cascade,
  started timestamptz not null default now(),
  ended timestamptz,
  missions integer not null default 0,
  spoken_reps integer not null default 0,
  star_dust integer not null default 0
);
create index sessions_child_started_idx on starseeker.sessions(child_id, started);

create table starseeker.progress (
  child_id uuid not null references starseeker.child_profiles(id) on delete cascade,
  stage_id integer not null,
  status text not null default 'locked' check (status in ('locked','active','complete')),
  completed_missions jsonb not null default '[]'::jsonb,
  primary key (child_id, stage_id)
);

create table starseeker.inventory (
  child_id uuid not null references starseeker.child_profiles(id) on delete cascade,
  item_id text not null,
  acquired_at timestamptz not null default now(),
  primary key (child_id, item_id)
);

create table starseeker.station (
  child_id uuid not null references starseeker.child_profiles(id) on delete cascade,
  bay text not null,
  slot integer not null,
  item_id text not null,
  primary key (child_id, bay, slot)
);

create table starseeker.user_blocks (
  child_id uuid not null references starseeker.child_profiles(id) on delete cascade,
  block_type text not null,
  count integer not null default 0,
  primary key (child_id, block_type)
);

create table starseeker.world_blocks (
  child_id uuid not null references starseeker.child_profiles(id) on delete cascade,
  x integer not null,
  y integer not null,
  z integer not null,
  block_type text,
  primary key (child_id, x, y, z)
);

create table starseeker.user_powerups (
  child_id uuid not null references starseeker.child_profiles(id) on delete cascade,
  powerup_id text not null,
  count integer not null default 0,
  primary key (child_id, powerup_id)
);

create table starseeker.child_settings (
  child_id uuid not null references starseeker.child_profiles(id) on delete cascade,
  key text not null,
  value text not null,
  primary key (child_id, key)
);

-- RLS -------------------------------------------------------------------
create or replace function starseeker.my_family()
returns uuid
language sql stable security definer
set search_path = starseeker, public
as $$ select family_id from starseeker.guardians where user_id = auth.uid() $$;

alter table starseeker.families enable row level security;
alter table starseeker.guardians enable row level security;
alter table starseeker.child_profiles enable row level security;
alter table starseeker.player_state enable row level security;
alter table starseeker.skill_state enable row level security;
alter table starseeker.word_state enable row level security;
alter table starseeker.attempts enable row level security;
alter table starseeker.speech_profile enable row level security;
alter table starseeker.sessions enable row level security;
alter table starseeker.progress enable row level security;
alter table starseeker.inventory enable row level security;
alter table starseeker.station enable row level security;
alter table starseeker.user_blocks enable row level security;
alter table starseeker.world_blocks enable row level security;
alter table starseeker.user_powerups enable row level security;
alter table starseeker.child_settings enable row level security;

create policy families_own on starseeker.families
  for all using (id = starseeker.my_family() or owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

create policy guardians_own_family on starseeker.guardians
  for all using (family_id = starseeker.my_family() or user_id = auth.uid())
  with check (family_id = starseeker.my_family());

create policy child_profiles_family on starseeker.child_profiles
  for all using (family_id = starseeker.my_family())
  with check (family_id = starseeker.my_family());

-- One template applied to every per-child table
do $$
declare t text;
begin
  foreach t in array array[
    'player_state','skill_state','word_state','attempts','speech_profile',
    'sessions','progress','inventory','station','user_blocks','world_blocks',
    'user_powerups','child_settings'
  ] loop
    execute format(
      'create policy %I_family on starseeker.%I for all using (
         child_id in (select id from starseeker.child_profiles where family_id = starseeker.my_family())
       ) with check (
         child_id in (select id from starseeker.child_profiles where family_id = starseeker.my_family())
       )', t, t);
  end loop;
end $$;;
