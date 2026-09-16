-- Event contoh untuk development.
-- Jalankan setelah migrasi, lalu buka http://localhost:3000/e/kevin-sarah
insert into public.events (slug, couple_names, event_date, welcome_text, film_limit, film_preset)
values (
  'kevin-sarah',
  'Kevin & Sarah',
  current_date,
  'Terima kasih sudah datang. Ambil beberapa foto untuk kami — hasilnya baru kami cuci setelah acara.',
  27,
  'classic'
)
on conflict (slug) do nothing;

-- Daftarkan akunmu sebagai owner (ganti emailnya lebih dulu):
-- insert into public.event_members (event_id, user_id, role)
-- select e.id, u.id, 'owner'
--   from public.events e, auth.users u
--  where e.slug = 'kevin-sarah' and u.email = 'kamu@email.com'
-- on conflict do nothing;
