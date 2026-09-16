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

Buat akun admin di Supabase → Authentication → Users, lalu daftarkan sebagai
owner acara (lihat blok komentar di `supabase/seed.sql`).

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
/admin/[id]/qr     QR per meja, siap cetak
```

## Keputusan yang perlu diingat

| Hal | Keputusan |
|---|---|
| Anon key | Tidak punya satu pun policy SELECT. Tamu tidak bisa membaca foto siapa pun, bahkan lewat API langsung. |
| Jatah film | Dipotong hanya oleh `claim_shot()` di Postgres, dengan baris tamu terkunci. |
| Idempotensi | `unique (guest_id, client_photo_id)` — retry dari antrean offline tidak menggandakan foto atau membakar 2 jatah. |
| Ukuran | Sisi panjang 1920px, JPEG q0.82 (~400 KB), dua versi per jepretan. |
| Versi film | Grain + vignette + light leak + date stamp, dibuat di canvas sebelum upload. |
| Font | Font sistem, bukan Google Fonts — satu permintaan jaringan lebih sedikit di gedung resepsi, dan build tidak bergantung pada fonts.googleapis.com. |
| ZIP | `archiver` store (tanpa kompresi ulang) (JPEG tidak perlu dikompres ulang), dipecah per 300 foto agar tidak menabrak batas waktu serverless. |

## Catatan operasional

- **Storage**: 300 tamu × 27 shot × 2 versi × 400 KB ≈ 6,5 GB per acara.
  Supabase free = 1 GB, Pro = 100 GB.
- **Galeri admin** memuat file ukuran penuh. Kalau satu acara menembus ribuan foto,
  aktifkan Supabase Image Transformation atau tambahkan upload thumbnail 400px
  (lihat `lib/camera/capture.ts`).
- **Vercel Hobby** membatasi route 60 detik; `maxDuration` di route download
  disetel 300 detik untuk Pro.
