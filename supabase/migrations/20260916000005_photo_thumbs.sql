-- Thumbnail galeri (±480px) diunggah HP tamu bersama foto utama.
-- Path diturunkan dari path utama: {photo_id}_orig.jpg -> {photo_id}_orig_thumb.jpg
-- Foto lama (has_thumb = false) tetap tampil memakai file ukuran penuh.
alter table public.photos
  add column if not exists has_thumb boolean not null default false;
