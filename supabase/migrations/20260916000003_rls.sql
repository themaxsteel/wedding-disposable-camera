-- =========================================================
-- RLS: default deny. Kunci produk ini adalah tamu TIDAK BOLEH
-- membaca foto siapapun — jadi anon key sengaja tidak diberi
-- satu pun policy SELECT. Semua tulis dari tamu lewat route
-- handler Next.js dengan service role yang memvalidasi cookie sesi.
-- =========================================================
alter table public.events         enable row level security;
alter table public.event_members  enable row level security;
alter table public.guests         enable row level security;
alter table public.guest_sessions enable row level security;
alter table public.photos         enable row level security;

-- ---------- events ----------
drop policy if exists events_select_member on public.events;
create policy events_select_member on public.events
  for select to authenticated
  using (public.is_event_member(id));

drop policy if exists events_insert_own on public.events;
create policy events_insert_own on public.events
  for insert to authenticated
  with check (true);

drop policy if exists events_update_member on public.events;
create policy events_update_member on public.events
  for update to authenticated
  using (public.is_event_member(id))
  with check (public.is_event_member(id));

-- pembuat event otomatis jadi owner
create or replace function public.attach_event_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    insert into public.event_members (event_id, user_id, role)
    values (new.id, auth.uid(), 'owner')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists events_attach_owner on public.events;
create trigger events_attach_owner
  after insert on public.events
  for each row execute function public.attach_event_owner();

-- ---------- event_members ----------
drop policy if exists members_select_self on public.event_members;
create policy members_select_self on public.event_members
  for select to authenticated
  using (user_id = auth.uid() or public.is_event_member(event_id));

-- ---------- guests ----------
drop policy if exists guests_select_member on public.guests;
create policy guests_select_member on public.guests
  for select to authenticated
  using (public.is_event_member(event_id));

-- ---------- photos ----------
drop policy if exists photos_select_member on public.photos;
create policy photos_select_member on public.photos
  for select to authenticated
  using (public.is_event_member(event_id));

drop policy if exists photos_update_member on public.photos;
create policy photos_update_member on public.photos
  for update to authenticated
  using (public.is_event_member(event_id))
  with check (public.is_event_member(event_id));

drop policy if exists photos_delete_member on public.photos;
create policy photos_delete_member on public.photos
  for delete to authenticated
  using (public.is_event_member(event_id));

-- guest_sessions: TANPA policy sama sekali (hanya service role yang menyentuh).

-- =========================================================
-- Storage: bucket privat, tanpa policy publik.
-- Tamu upload lewat signed upload URL (token, bukan policy).
-- Admin membaca lewat signed URL yang dibuat server.
-- =========================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 8388608, array['image/jpeg'])
on conflict (id) do update
  set public = false,
      file_size_limit = 8388608,
      allowed_mime_types = array['image/jpeg'];
