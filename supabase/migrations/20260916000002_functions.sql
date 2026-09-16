-- =========================================================
-- claim_shot: satu-satunya tempat jatah film dipotong.
-- Counter di client tidak bisa dipercaya, jadi limit + rate limit
-- dievaluasi di dalam transaksi dengan baris guests terkunci.
-- =========================================================
create or replace function public.claim_shot(
  p_guest uuid,
  p_min_interval_ms int default 1000
)
returns table (remaining int, roll_limit int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit int;
  v_used  int;
  v_last  timestamptz;
begin
  select e.film_limit, g.shots_used, g.last_shot_at
    into v_limit, v_used, v_last
    from public.guests g
    join public.events e on e.id = g.event_id
   where g.id = p_guest
     for update of g;

  if not found then
    raise exception 'TAMU_TIDAK_DITEMUKAN';
  end if;

  if v_last is not null
     and now() - v_last < make_interval(secs => p_min_interval_ms / 1000.0) then
    raise exception 'TERLALU_CEPAT';
  end if;

  if v_used >= v_limit then
    raise exception 'FILM_HABIS';
  end if;

  update public.guests g
     set shots_used = g.shots_used + 1,
         last_shot_at = now()
   where g.id = p_guest;

  remaining  := v_limit - (v_used + 1);
  roll_limit := v_limit;
  return next;
end;
$$;

-- =========================================================
-- is_event_member: dipakai policy RLS. SECURITY DEFINER supaya
-- policy di event_members sendiri tidak rekursif.
-- =========================================================
create or replace function public.is_event_member(p_event uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.event_members m
     where m.event_id = p_event
       and m.user_id  = auth.uid()
  );
$$;

-- =========================================================
-- event_guest_summary: sidebar dashboard — daftar nama tamu + jumlah foto.
-- SECURITY INVOKER (default) supaya RLS tetap berlaku untuk pemanggil.
-- Digabung per name_key: satu nama yang memotret dari 2 device tetap 1 grup.
-- =========================================================
create or replace function public.event_guest_summary(p_event uuid)
returns table (
  name_key      text,
  display_name  text,
  guest_ids     uuid[],
  table_labels  text[],
  photo_count   bigint,
  last_photo_at timestamptz
)
language sql
stable
set search_path = public
as $$
  select
    g.name_key,
    min(g.display_name)                                        as display_name,
    array_agg(distinct g.id)                                   as guest_ids,
    array_remove(array_agg(distinct g.table_label), null)      as table_labels,
    count(p.id)                                                as photo_count,
    max(p.created_at)                                          as last_photo_at
  from public.guests g
  left join public.photos p
         on p.guest_id = g.id and p.status = 'ready'
  where g.event_id = p_event
  group by g.name_key
  having count(p.id) > 0
  order by max(p.created_at) desc nulls last;
$$;
