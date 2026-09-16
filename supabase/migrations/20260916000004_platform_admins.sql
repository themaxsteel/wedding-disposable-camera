-- =========================================================
-- Peran platform: admin GuestPro vs anggota acara.
--
-- Sebelumnya siapa pun yang punya akun boleh membuat acara, dan
-- Supabase Auth menerima pendaftaran publik lewat publishable key.
-- Sekarang hanya admin platform yang boleh membuat acara; pengantin,
-- WO, dan fotografer hanya melihat acara tempat mereka diundang.
-- =========================================================

create table if not exists public.platform_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.platform_admins enable row level security;

drop policy if exists platform_admins_select_self on public.platform_admins;
create policy platform_admins_select_self on public.platform_admins
  for select to authenticated
  using (user_id = auth.uid());

-- ---------- helper ----------
create or replace function public.is_platform_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid());
$$;

/** Boleh melihat acara: admin platform atau anggota dengan peran apa pun. */
create or replace function public.can_view_event(p_event uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_platform_admin() or public.is_event_member(p_event);
$$;

/** Boleh mengubah pengaturan acara & menyembunyikan foto: admin platform, owner, editor. */
create or replace function public.can_manage_event(p_event uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_platform_admin() or exists (
    select 1 from public.event_members m
     where m.event_id = p_event
       and m.user_id  = auth.uid()
       and m.role in ('owner', 'editor')
  );
$$;

/** Boleh mengundang / mencabut anggota: admin platform atau owner. */
create or replace function public.can_manage_members(p_event uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_platform_admin() or exists (
    select 1 from public.event_members m
     where m.event_id = p_event
       and m.user_id  = auth.uid()
       and m.role = 'owner'
  );
$$;

-- ---------- events ----------
drop policy if exists events_select_member on public.events;
drop policy if exists events_insert_own    on public.events;
drop policy if exists events_update_member on public.events;

create policy events_select on public.events
  for select to authenticated
  using (public.can_view_event(id));

create policy events_insert on public.events
  for insert to authenticated
  with check (public.is_platform_admin());

create policy events_update on public.events
  for update to authenticated
  using (public.can_manage_event(id))
  with check (public.can_manage_event(id));

-- Admin platform tidak perlu jadi anggota acara yang dibuatnya.
drop trigger if exists events_attach_owner on public.events;
drop function if exists public.attach_event_owner();

-- Slug tercetak di QR: huruf kecil, angka, tanda hubung.
alter table public.events drop constraint if exists events_slug_format;
alter table public.events add constraint events_slug_format
  check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 60);

-- ---------- event_members ----------
-- Tulis hanya lewat route handler (service role) setelah can_manage_members dicek.
drop policy if exists members_select_self on public.event_members;
create policy members_select on public.event_members
  for select to authenticated
  using (user_id = auth.uid() or public.can_view_event(event_id));

-- ---------- guests ----------
drop policy if exists guests_select_member on public.guests;
create policy guests_select on public.guests
  for select to authenticated
  using (public.can_view_event(event_id));

-- ---------- photos ----------
drop policy if exists photos_select_member on public.photos;
drop policy if exists photos_update_member on public.photos;
drop policy if exists photos_delete_member on public.photos;

create policy photos_select on public.photos
  for select to authenticated
  using (public.can_view_event(event_id));

create policy photos_update on public.photos
  for update to authenticated
  using (public.can_manage_event(event_id))
  with check (public.can_manage_event(event_id));

create policy photos_delete on public.photos
  for delete to authenticated
  using (public.can_manage_event(event_id));
