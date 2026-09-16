-- =========================================================
-- Daftar semua file storage milik satu acara, untuk fitur hapus acara.
--
-- Dibaca lewat SQL (bukan storage.list per folder tamu) supaya acara dengan
-- ratusan tamu tidak butuh ratusan panggilan API. Penghapusan file tetap
-- lewat Storage API — menghapus baris storage.objects langsung dari SQL
-- tidak menghapus file fisiknya.
-- =========================================================
create or replace function public.event_storage_objects(p_event uuid)
returns setof text
language sql
security definer
stable
set search_path = ''
as $$
  select o.name
    from storage.objects o
   where o.bucket_id = 'photos'
     and o.name like p_event::text || '/%'
   order by o.name;
$$;

-- Hanya server (service role) yang boleh memanggil.
revoke execute on function public.event_storage_objects(uuid) from public, anon, authenticated;
grant execute on function public.event_storage_objects(uuid) to service_role;
