# Keamanan

Foto pernikahan adalah data pribadi tamu. Tujuan utamanya: **hanya orang yang
diundang yang bisa melihat foto sebuah acara**, dan tamu tidak bisa melihat
foto siapa pun — termasuk fotonya sendiri.

## Model keamanan

| Aset | Siapa yang boleh | Ditegakkan oleh |
|---|---|---|
| Foto & file storage | Admin GuestPro + anggota acara | Bucket privat, signed URL dibuat server setelah `getEventAccess()`, RLS `can_view_event` |
| Data tamu & sesi tamu | Admin GuestPro + anggota (tamu); sesi tamu tidak untuk siapa pun | RLS; `guest_sessions` tanpa policy |
| Jatah film | Hanya `claim_shot()` | Fungsi SQL dengan baris terkunci |
| Pengaturan acara | Admin GuestPro, `owner`, `editor` | RLS `can_manage_event` + cek API |
| Anggota acara | Admin GuestPro, `owner` | Cek `can_manage_members` di API; tulis via service role |
| Buat & hapus acara | Admin GuestPro | RLS `events_insert` + cek API |

### Apa yang bisa dilakukan penyerang dengan…

| Yang dimiliki | Bisa | Tidak bisa |
|---|---|---|
| **Publishable key** (ada di setiap browser) | Mendaftar akun bila signup belum dimatikan; memakai signed upload URL yang sudah ia pegang | Membaca tabel mana pun (0 policy untuk `anon`), membaca/daftar file storage, memanggil `event_storage_objects` |
| **Cookie sesi tamu** (HP tamu) | Mengunggah foto atas nama tamu itu sampai jatahnya habis; memberi caption | Melihat foto apa pun, melihat tamu lain, memakai jatah tamu lain |
| **Akun tanpa undangan** | Login | Melihat acara apa pun (RLS mengembalikan 0 baris) |
| **Akun `viewer`** | Melihat & mengunduh foto acaranya | Menyembunyikan foto, mengubah pengaturan, mengundang |
| **Link undangan** | Masuk sebagai orang yang diundang (sekali, sebelum kedaluwarsa) | Dipakai ulang; dihabiskan bot preview (token hanya ditukar lewat POST) |
| **Secret key** | **Segalanya** — bypass RLS, baca & hapus semua foto | — Perlakukan sebagai insiden, lihat di bawah |

Baris **publishable key** dan **akun tanpa undangan** sudah diuji langsung
terhadap database produksi; baris lain ditegakkan kode dan RLS tapi belum punya
uji otomatis (lihat [PENGUJIAN.md](PENGUJIAN.md)).

## Keputusan desain yang terkait keamanan

- **Token sesi tamu di-hash.** Database hanya menyimpan `sha256(token)`; kebocoran
  isi tabel tidak memberi akses.
- **`server-only`** di `lib/supabase/admin.ts`, `lib/supabase/server.ts`,
  `lib/guest-session.ts`, `lib/admin/access.ts`, dan `lib/admin/accessLink.ts` —
  build gagal bila modul yang memegang secret key terimpor ke kode browser.
- **Fungsi `security definer`** memakai `search_path` tetap; `event_storage_objects`
  hanya bisa dieksekusi `service_role`.
- **Link undangan tidak memakai token pada GET**, dan halamannya memasang
  `<meta name="referrer" content="no-referrer">`, supaya token tidak bocor ke bot
  atau situs lain.
- **`?next=` pada konfirmasi dibatasi ke `/admin…`** — tidak bisa dipakai untuk
  open redirect.
- **Hapus acara** hanya admin GuestPro dan membutuhkan pengetikan ulang slug.
- **Validasi input** dengan Zod di setiap endpoint; ukuran file dibatasi bucket
  (8 MB, hanya `image/jpeg`).

## Pengelolaan kunci & rahasia

| Rahasia | Lokasi yang sah | Tidak boleh |
|---|---|---|
| Secret key (`sb_secret_…`) | `.env.local` (lokal), Environment Variables Vercel | Di-commit, diberi prefix `NEXT_PUBLIC_`, ditempel di chat/tiket/screenshot |
| Password database | Tidak dibutuhkan aplikasi | Disimpan di mana pun setelah setup |
| Token login Supabase CLI | Keychain OS milik developer | Dibagikan |

`.gitignore` mengabaikan `.env*` kecuali `.env.example`. Sebelum commit, pastikan
tidak ada rahasia yang ikut:

```bash
git diff --cached | grep -E "sb_secret_[A-Za-z0-9_-]{10,}" && echo "BATALKAN COMMIT"
```

### Rotasi secret key

Lakukan bila kunci pernah terlihat oleh orang lain, ditempel di tempat yang tidak
semestinya, atau ada anggota tim yang keluar.

1. Supabase → Project Settings → API Keys → Secret keys → **New secret key**.
2. Ganti `SUPABASE_SERVICE_ROLE_KEY` di Vercel → **Redeploy**.
3. Ganti di `.env.local` semua developer.
4. Setelah produksi terbukti jalan dengan kunci baru → **hapus kunci lama**.

Urutan ini tanpa downtime karena dua kunci aktif bersamaan selama transisi.

## Respons insiden

### Secret key bocor
1. Rotasi kunci segera (di atas), hapus kunci lama **tanpa menunggu**.
2. Periksa perubahan tak wajar:
   ```sql
   select slug, created_at from public.events order by created_at desc limit 20;
   select count(*), max(created_at) from public.photos;
   select pg_size_pretty(sum((metadata->>'size')::bigint)) from storage.objects where bucket_id = 'photos';
   ```
3. Periksa Supabase → Logs untuk aktivitas API dari IP tak dikenal.

### Akun admin/pengantin disalahgunakan
1. Cabut dari acara (dashboard → Pengaturan → Cabut) atau hapus dari `platform_admins`.
2. Putuskan semua sesi login akun itu:
   ```sql
   delete from auth.sessions where user_id = (select id from auth.users where email = 'x@y.com');
   ```
   Refresh token ikut terhapus (foreign key `on delete cascade`, sudah dicek di
   database), sehingga cookie yang dicuri tidak bisa diperbarui.
3. Minta pemilik akun mengganti password lewat link baru.

### Link undangan terkirim ke orang yang salah
1. Dashboard → Pengaturan → **Cabut** anggota tersebut.
2. Bila orang itu sudah masuk, putuskan sesinya (query di atas).
3. Buat link baru untuk orang yang benar.

### Tamu mengunggah foto tidak pantas
Dashboard → buka foto → **Sembunyikan**. File tetap tersimpan sebagai bukti;
tidak muncul di galeri maupun ZIP.

## Checklist keamanan per lingkungan

- [ ] *Allow new users to sign up* **dimatikan** di Supabase Auth
- [ ] Password database sudah di-reset setelah setup
- [ ] Secret key hanya ada di Vercel dan `.env.local`
- [ ] Domain produksi memakai HTTPS (otomatis di Vercel)
- [ ] Vercel Deployment Protection aktif untuk preview (bawaan)
- [ ] Hanya staf GuestPro yang ada di `platform_admins`:
  ```sql
  select u.email from public.platform_admins p join auth.users u on u.id = p.user_id;
  ```

## Hal yang belum ada

- Rate limit pembuatan sesi tamu per IP (saat ini dibatasi jatah film per tamu,
  tapi nama baru di device baru = tamu baru).
- Audit log aksi admin (siapa menyembunyikan/menghapus apa).
- Pemindaian konten foto otomatis.
