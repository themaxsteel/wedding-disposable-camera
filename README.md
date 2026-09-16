# Kamera Digital Sekali Pakai — GuestPro

Web app kamera sekali pakai untuk tamu pernikahan. Tamu memindai QR di meja,
mengetik nama, lalu memotret lewat antarmuka bergaya kamera analog. Setiap
jepretan langsung terkirim ke cloud dengan tag nama tamu. Tamu **tidak bisa**
melihat galeri — seperti film yang baru dicuci setelah acara. Pengantin melihat,
memfilter per tamu, dan mengunduh semua foto lewat dashboard.

**Produksi:** https://wedding-disposable-camera-sepia.vercel.app

Stack: Next.js 16 (App Router) · React 19 · TailwindCSS 4 · Supabase (Postgres,
Storage, Auth) · Vercel.

## Fitur

**Tamu** — tanpa install aplikasi
- Masuk cukup dengan nama; kembali ke HP yang sama melanjutkan rol filmnya
- Kamera belakang default, putar ke kamera depan, flash (senter Android / layar putih iOS)
- Jatah foto per tamu (default 27) dan counter "exposure"
- Setiap jepretan menyimpan versi asli + versi film (grain, vignette, light leak, date stamp)
- Upload di latar belakang dengan antrean offline — foto tetap aman di HP selama sinyal
  putus dan terkirim otomatis saat sinyal kembali, selama kamera acara masih dibuka
- Caption opsional per foto; jalur cadangan kirim dari galeri bila kamera diblokir

**Pengantin / WO** — `/admin`
- Galeri dengan thumbnail, dikelompokkan per nama tamu, toggle Asli / Versi film
- Unduh ZIP per tamu atau semua (dipecah per 300 foto)
- Sembunyikan foto, ubah pengaturan acara, undang anggota lain

**Admin GuestPro**
- Buat acara, atur jadwal buka/tutup kamera, cetak QR per meja
- Undang pengantin lewat link sekali pakai (dikirim via WhatsApp)
- Hapus acara beserta seluruh fotonya

## Mulai cepat

```bash
npm install
cp .env.example .env.local   # isi dari Supabase → Project Settings → API Keys
npx supabase login
npm run db:link
npm run db:push              # semua migrasi + seed acara contoh "kevin-sarah"
npm run dev
```

Buka `http://localhost:3000/e/kevin-sarah` (tamu) dan `http://localhost:3000/admin`
(dashboard). Langkah lengkap — termasuk akun admin, pengaturan Auth yang wajib,
dan tes di HP — ada di [docs/SETUP.md](docs/SETUP.md).

## Dokumentasi

| Dokumen | Untuk siapa | Isi |
|---|---|---|
| [docs/SETUP.md](docs/SETUP.md) | Developer | Instalasi lokal, Supabase, Vercel, environment variable, tes di HP |
| [docs/ARSITEKTUR.md](docs/ARSITEKTUR.md) | Developer | Komponen, alur data, struktur folder, keputusan desain |
| [docs/DATABASE.md](docs/DATABASE.md) | Developer | Skema, fungsi SQL, RLS, layout storage, migrasi |
| [docs/API.md](docs/API.md) | Developer | Referensi semua endpoint dan kode error |
| [docs/KEAMANAN.md](docs/KEAMANAN.md) | Developer, admin | Model keamanan, pengelolaan kunci, respons insiden |
| [docs/PENGUJIAN.md](docs/PENGUJIAN.md) | Developer, QA | Checklist perangkat, skenario uji, verifikasi SQL |
| [docs/OPERASIONAL.md](docs/OPERASIONAL.md) | Admin GuestPro | Siklus acara, checklist hari H, troubleshooting, biaya |
| [docs/PANDUAN-PENGANTIN.md](docs/PANDUAN-PENGANTIN.md) | Pengantin | Cara masuk, melihat, dan mengunduh foto (bisa dikirim apa adanya) |
| [CHANGELOG.md](CHANGELOG.md) | Semua | Riwayat perubahan |

## Script

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server development di `localhost:3000` |
| `npm run dev:https` | Server development dengan HTTPS (untuk tes kamera di HP) |
| `npm run build` | Build produksi (butuh environment variable terisi) |
| `npm run lint` | ESLint, termasuk aturan React Compiler |
| `npm run db:link` | Hubungkan Supabase CLI ke project |
| `npm run db:push` | Terapkan migrasi baru + seed ke database remote |
