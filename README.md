# Kamera Digital Sekali Pakai (GuestPro)

Web app kamera sekali pakai untuk tamu pernikahan. Tamu memindai QR di meja,
mengetik nama, lalu memotret. Foto langsung terkirim ke cloud dengan tag nama
tamu. Tamu **tidak bisa** melihat galeri — hanya pengantin yang melihat semuanya
lewat dashboard.

Stack: Next.js 16 (App Router) · TailwindCSS 4 · Supabase (Postgres, Storage, Auth).

## Menjalankan

1. `cp .env.example .env.local` lalu isi dari Supabase Dashboard.
2. `npx supabase login`, `npm run db:link` (minta password database), lalu
   `npm run db:push` — menjalankan semua migrasi + `supabase/seed.sql`.
   Alternatif tanpa CLI: tempel isi `supabase/migrations/*.sql` berurutan lalu
   `supabase/seed.sql` di SQL Editor.
3. `npm run dev` untuk desktop.
4. Untuk tes di HP: `npm run dev:https` — `getUserMedia` mati di HTTP kecuali
   `localhost`, jadi HP wajib mengakses lewat HTTPS (atau tunnel ngrok/Cloudflare).

### Peran & akun

| Peran | Bisa apa | Cara mendapatkannya |
|---|---|---|
| Admin GuestPro | Membuat acara, melihat & mengelola semua acara | Baris di tabel `platform_admins` (lihat SQL di bawah) |
| Pengantin (`owner`) | Lihat & unduh foto, ubah pengaturan, undang orang | Diundang dari *Pengaturan & undangan* |
| Pengelola / WO (`editor`) | Lihat & unduh foto, ubah pengaturan | Diundang |
| Lihat saja (`viewer`) | Lihat & unduh foto | Diundang |

Undangan berupa **link sekali pakai** yang disalin admin lalu dikirim lewat
WhatsApp — bukan email, karena layanan email bawaan Supabase hanya mengirim ke
anggota tim project. Link kedaluwarsa mengikuti *Email OTP Expiration* di
Supabase (bawaan 1 jam; bisa dinaikkan sampai 24 jam di Authentication → Providers → Email).

Menambah admin GuestPro (buat usernya dulu di Authentication → Users):

```sql
insert into public.platform_admins (user_id)
select id from auth.users where email = 'admin@guestpro.id';
```

**Matikan pendaftaran publik** di Authentication → Sign In / Providers →
*Allow new users to sign up*. Akun hanya perlu dibuat lewat undangan.

## Alur

```
/e/[slug]          form nama  → POST /api/session → cookie httpOnly sesi tamu
/e/[slug]/kamera   getUserMedia → canvas → 2 blob (asli + versi film)
                   → antrean IndexedDB → uploader background
                        1. POST /api/photos/init   (claim_shot + signed upload URL)
                        2. PUT  langsung ke Supabase Storage
                        3. POST /api/photos/commit
/e/[slug]/selesai  layar penutup saat rol film habis
/admin             daftar acara  → /admin/[eventId] galeri + filter nama + ZIP
/admin/acara-baru  buat acara (khusus admin GuestPro)
/admin/[id]/pengaturan   ubah detail acara + undang pengantin/WO
/admin/[id]/qr     QR per meja, siap cetak
/admin/akun        buat / ganti password
/auth/confirm      tujuan link undangan → sesi login
```

## Keputusan yang perlu diingat

| Hal | Keputusan |
|---|---|
| Anon key | Tidak punya satu pun policy SELECT. Tamu tidak bisa membaca foto siapa pun, bahkan lewat API langsung. |
| Jatah film | Dipotong hanya oleh `claim_shot()` di Postgres, dengan baris tamu terkunci. |
| Idempotensi | `unique (guest_id, client_photo_id)` — retry dari antrean offline tidak menggandakan foto atau membakar 2 jatah. |
| Ukuran | Sisi panjang 1920px, JPEG q0.82 (~400 KB), dua versi per jepretan, masing-masing dengan thumbnail 480px. |
| Versi film | Grain + vignette + light leak + date stamp, dibuat di canvas sebelum upload. |
| Font | Font sistem, bukan Google Fonts — satu permintaan jaringan lebih sedikit di gedung resepsi, dan build tidak bergantung pada fonts.googleapis.com. |
| ZIP | `archiver` store (tanpa kompresi ulang) (JPEG tidak perlu dikompres ulang), dipecah per 300 foto agar tidak menabrak batas waktu serverless. |

## Catatan operasional

- **Storage**: 300 tamu × 27 shot × 2 versi × 400 KB ≈ 6,5 GB per acara.
  Supabase free = 1 GB, Pro = 100 GB.
- **Galeri admin** memakai thumbnail ±480px (±30 KB) yang dibuat HP tamu saat
  menjepret; lightbox dan ZIP tetap memakai file penuh. Foto dari sebelum fitur
  ini (`has_thumb = false`) tampil memakai file penuh.
- **Vercel Hobby** membatasi route 60 detik; `maxDuration` di route download
  disetel 300 detik untuk Pro.
