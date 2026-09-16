-- Digital Disposable Camera — skema inti
create extension if not exists pgcrypto;

-- =========================================================
-- 1. events
-- =========================================================
create table if not exists public.events (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  couple_names  text not null,
  event_date    date,
  welcome_text  text,
  film_limit    int  not null default 27 check (film_limit between 1 and 500),
  film_preset   text not null default 'classic' check (film_preset in ('classic','warm','bw')),
  opens_at      timestamptz,
  closes_at     timestamptz,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- =========================================================
-- 2. event_members — couple / WO / fotografer
-- =========================================================
create table if not exists public.event_members (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id  uuid not null references auth.users(id) on delete cascade,
  role     text not null default 'owner' check (role in ('owner','editor','viewer')),
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
create index if not exists event_members_user_idx on public.event_members (user_id);

-- =========================================================
-- 3. guests
-- =========================================================
create table if not exists public.guests (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events(id) on delete cascade,
  display_name text not null,
  name_key     text not null,          -- lower(btrim(display_name)), kunci grouping di dashboard
  table_label  text,                   -- dari ?t=Meja 5 pada QR
  device_id    text not null,          -- uuid di localStorage; tamu balik lagi -> roll film lanjut
  shots_used   int  not null default 0,
  last_shot_at timestamptz,            -- untuk rate limit server-side
  created_at   timestamptz not null default now(),
  unique (event_id, name_key, device_id)
);
create index if not exists guests_event_name_idx on public.guests (event_id, name_key);

-- =========================================================
-- 4. guest_sessions — pengganti auth untuk tamu
-- =========================================================
create table if not exists public.guest_sessions (
  id         uuid primary key default gen_random_uuid(),
  guest_id   uuid not null references public.guests(id) on delete cascade,
  token_hash text not null,            -- sha256(token); token mentah hanya hidup di cookie httpOnly
  user_agent text,
  expires_at timestamptz not null default now() + interval '18 hours',
  created_at timestamptz not null default now()
);
create index if not exists guest_sessions_guest_idx on public.guest_sessions (guest_id);

-- =========================================================
-- 5. photos
-- =========================================================
create table if not exists public.photos (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references public.events(id) on delete cascade,
  guest_id        uuid not null references public.guests(id) on delete cascade,
  storage_path    text not null,                    -- {event_id}/{guest_id}/{photo_id}_orig.jpg
  filtered_path   text,                             -- {event_id}/{guest_id}/{photo_id}_film.jpg
  caption         text,
  width           int,
  height          int,
  bytes           int,
  facing          text check (facing in ('user','environment')),
  source          text not null default 'camera' check (source in ('camera','upload')),
  client_photo_id text not null,                    -- idempotency key dari antrean offline
  taken_at        timestamptz,
  status          text not null default 'pending' check (status in ('pending','ready','hidden')),
  created_at      timestamptz not null default now(),
  unique (guest_id, client_photo_id)
);
create index if not exists photos_event_created_idx on public.photos (event_id, created_at desc);
create index if not exists photos_guest_created_idx on public.photos (guest_id, created_at desc);
create index if not exists photos_event_status_idx  on public.photos (event_id, status);
