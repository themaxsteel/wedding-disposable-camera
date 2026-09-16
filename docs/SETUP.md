# Setup: lokal, Supabase, dan Vercel

Panduan dari nol sampai aplikasi berjalan di produksi. Kalau hanya ingin
menjalankan project yang Supabase-nya sudah ada, cukup bagian 1, 2, dan 4.

## Prasyarat

- Node.js 22+ dan npm 10+
- Akun [Supabase](https://supabase.com) dan [Vercel](https://vercel.com)
- Supabase CLI sudah terpasang sebagai dev dependency (`npx supabase`), tidak perlu instal global

## 1. Instal dependensi

```bash
npm install
```

## 2. Environment variable

```bash
cp .env.example .env.local
```

| Variabel | Sumber | Catatan |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API | `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API Keys → **Publishable** (`sb_publishable_…`) atau anon key lama | Aman terkirim ke browser — tidak punya hak baca apa pun (lihat [KEAMANAN.md](KEAMANAN.md)) |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API Keys → **Secret** (`sb_secret_…`) atau service_role lama | **Rahasia.** Mem-bypass RLS. Jangan pernah diberi prefix `NEXT_PUBLIC_`, jangan di-commit, jangan ditempel di chat |
| `NEXT_PUBLIC_SITE_URL` | Domain produksi | Dipakai untuk link di QR meja. Kosong → diambil dari header host |

`lib/env.ts` sengaja menghentikan build/server dengan pesan jelas bila variabel
wajib kosong — lebih baik gagal di awal daripada kamera gagal di hari H.

## 3. Database Supabase

### Project baru

1. Buat project, pilih region **Southeast Asia (Singapore)**.
2. Hubungkan CLI dan terapkan skema:

```bash
npx supabase login        # membuka browser untuk otorisasi
npm run db:link           # mungkin menanyakan password database
npm run db:push           # semua migrasi + supabase/seed.sql
```

Tanpa CLI: jalankan isi `supabase/migrations/*.sql` **berurutan** di SQL Editor,
lalu `supabase/seed.sql`.

### Menambah migrasi di kemudian hari

```bash
npx supabase migration new nama_perubahan   # buat file di supabase/migrations/
npm run db:push                              # terapkan ke remote
npx supabase migration list                  # cek lokal vs remote
```

Jangan mengubah file migrasi yang sudah pernah di-push; buat migrasi baru.

### Admin GuestPro pertama

1. Authentication → Users → **Add user** → isi email & password, centang *Auto Confirm User*.
2. SQL Editor:

```sql
insert into public.platform_admins (user_id)
select id from auth.users where email = 'admin@guestpro.id';
```

Admin berikutnya ditambahkan dengan cara yang sama. Pengantin dan WO **tidak**
dibuat manual — mereka diundang dari dashboard.

### Pengaturan Auth yang wajib

| Lokasi di Dashboard | Nilai | Alasan |
|---|---|---|
| Authentication → Sign In / Providers → *Allow new users to sign up* | **Off** | Tanpa ini siapa pun bisa membuat akun lewat publishable key. Akun itu tidak bisa melihat apa pun, tapi tetap sampah. |
| Authentication → Providers → Email → *Email OTP Expiration* | `86400` (24 jam) | Masa berlaku link undangan. Bawaan 1 jam terlalu pendek untuk pengantin yang baru membuka WhatsApp beberapa jam kemudian. |

Setelah setup selesai, **reset password database** (Project Settings → Database)
kalau password itu pernah dibagikan. Aplikasi tidak memakainya.

## 4. Menjalankan lokal

```bash
npm run dev
```

- Tamu: `http://localhost:3000/e/kevin-sarah`
- Dashboard: `http://localhost:3000/admin`

Webcam laptop bisa dipakai karena `localhost` dianggap *secure context*.

### Tes kamera di HP

`getUserMedia` hanya hidup di HTTPS. Alamat seperti `http://192.168.x.x:3000`
**tidak akan** bisa membuka kamera. Pilihan, dari yang paling mudah:

1. **Deploy preview Vercel** — push ke branch, buka URL preview di HP.
2. **Tunnel** — `cloudflared tunnel --url http://localhost:3000` atau `ngrok http 3000`.
3. `npm run dev:https` — sertifikat self-signed harus dipercaya manual di HP (repot di iPhone).

## 5. Deploy ke Vercel

1. Import repository GitHub ke Vercel (framework terdeteksi otomatis).
2. Isi **keempat** environment variable di atas **sebelum** deploy pertama —
   build sengaja gagal bila ada yang kosong.
3. Settings → Domains → tambahkan domain produksi. Domain produksi publik;
   URL `*-<team>.vercel.app` terkunci oleh Vercel Deployment Protection.
4. Set `NEXT_PUBLIC_SITE_URL` ke domain produksi, lalu **Redeploy**.

Setiap push ke `main` otomatis di-deploy. Migrasi database **tidak** ikut
otomatis — jalankan `npm run db:push` sebelum push kode yang bergantung padanya.

### Paket yang dibutuhkan untuk acara sungguhan

| Layanan | Paket | Alasan |
|---|---|---|
| Supabase | Pro | Free = 1 GB storage (satu acara bisa ±6,5 GB) dan project di-pause setelah seminggu tidak aktif |
| Vercel | Pro | Hobby hanya untuk non-komersial dan membatasi fungsi 60 detik (ZIP & hapus acara butuh sampai 300 detik) |

## Masalah umum saat setup

| Gejala | Penyebab | Solusi |
|---|---|---|
| Build: `Environment variable … belum diisi` | Env kosong di Vercel/lokal | Isi variabel, redeploy |
| Build: `Failed to fetch Geist from Google Fonts` | Kode lama / font Google ditambahkan lagi | Project memakai font sistem; jangan tambahkan `next/font/google` |
| `tsc`: `Cannot find module '../../app/…/route.js'` | Tipe hasil build lama di `.next/types` | `rm -rf .next/types` lalu ulangi |
| Halaman tamu 500, log `Gagal memuat acara` | URL/secret key salah atau Supabase down | Cek env & status Supabase |
| `/admin` menampilkan "Belum ada acara yang terhubung" | Akun belum admin platform / belum diundang | Tambah ke `platform_admins` atau undang dari dashboard |
| Buka domain Vercel muncul halaman login Vercel | Deployment Protection | Pakai domain produksi (bagian 5 langkah 3) |
