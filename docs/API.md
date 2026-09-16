# Referensi API

Semua endpoint adalah Route Handler Next.js dengan runtime `nodejs`.

## Format respons

Sukses:
```json
{ "ok": true, "...": "data" }
```

Gagal:
```json
{ "ok": false, "code": "FILM_HABIS", "message": "Rol film kamu sudah habis." }
```

`message` berbahasa Indonesia dan aman ditampilkan ke pengguna. Logika client
bercabang berdasarkan `code`:

| `code` | Arti | Perilaku client tamu |
|---|---|---|
| `FILM_HABIS` | Jatah film tamu habis | Job dibuang, pindah ke layar selesai |
| `TERLALU_CEPAT` | Klaim film < 400 ms dari sebelumnya | Coba ulang 700 ms, tidak dihitung gagal |
| `SESI_TIDAK_VALID` | Cookie tamu tidak ada/kedaluwarsa, atau user admin tidak punya izin | Tamu: job dibuang, kembali ke form nama |
| `EVENT_TUTUP` | Acara nonaktif atau di luar jam buka | Job dibuang, kembali ke halaman acara |
| `INPUT_TIDAK_VALID` | Validasi gagal / data tidak ditemukan | Tampilkan pesan |
| `GAGAL` | Error server / database | Tamu: coba ulang dengan backoff |

## Autentikasi

| Jenis | Mekanisme | Dipakai di |
|---|---|---|
| Sesi tamu | Cookie `dc_session` (httpOnly, Secure, SameSite=Lax, 18 jam) dari `POST /api/session` | `/api/photos/*` |
| Sesi admin | Cookie Supabase Auth (`@supabase/ssr`), di-refresh oleh `proxy.ts` | `/api/admin/*`, halaman `/admin/*` |

Izin admin selalu dicek lewat `getEventAccess()` yang membaca acara dengan client
ber-RLS; endpoint lalu memeriksa flag `canManage`, `canManageMembers`, atau
`isPlatformAdmin`.

---

## Tamu

### `POST /api/session`
Masuk sebagai tamu. Membuat/memakai ulang baris `guests` dan menerbitkan cookie sesi.

```json
{ "slug": "kevin-sarah", "name": "Dinda", "tableLabel": "Meja 5", "deviceId": "uuid-dari-localStorage" }
```

| Field | Aturan |
|---|---|
| `slug` | wajib, ≤ 80 |
| `name` | 2–40 karakter setelah dirapikan |
| `tableLabel` | opsional, ≤ 40 |
| `deviceId` | 8–64 karakter |

**200** + `Set-Cookie: dc_session=…`
```json
{ "ok": true, "session": { "guestId": "…", "displayName": "Dinda", "tableLabel": "Meja 5",
  "shotsUsed": 3, "filmLimit": 27, "remaining": 24, "filmPreset": "classic",
  "eventSlug": "kevin-sarah", "coupleNames": "Kevin & Sarah" } }
```
Error: 400 `INPUT_TIDAK_VALID` · 404 acara tidak ditemukan · 403 `EVENT_TUTUP` ·
503 database bermasalah · 500 `GAGAL`.

### `POST /api/photos/init`
Klaim satu jatah film dan minta URL upload. **Idempoten** per `clientPhotoId`:
memanggil ulang dengan id yang sama mengembalikan foto yang sama tanpa memotong jatah.

```json
{ "clientPhotoId": "uuid-v4", "takenAt": "2026-09-16T12:00:00.000Z",
  "facing": "environment", "source": "camera", "withFiltered": true, "withThumbs": true }
```

| Field | Default | Keterangan |
|---|---|---|
| `clientPhotoId` | — | UUID dari client, kunci idempotensi |
| `takenAt` | waktu server | ISO datetime |
| `facing` | null | `user` / `environment` |
| `source` | `camera` | `camera` / `upload` (fallback galeri) |
| `withFiltered` | `true` | minta URL untuk versi film |
| `withThumbs` | `false` | minta URL untuk thumbnail |

**200**
```json
{ "ok": true, "photoId": "…", "remaining": 23, "rollLimit": 27,
  "orig":      { "path": "{event}/{guest}/{photo}_orig.jpg", "token": "…" },
  "film":      { "path": "…_film.jpg", "token": "…" },
  "origThumb": { "path": "…_orig_thumb.jpg", "token": "…" },
  "filmThumb": { "path": "…_film_thumb.jpg", "token": "…" } }
```
`film`, `origThumb`, `filmThumb` bernilai `null` bila tidak diminta atau gagal dibuat.
Upload file memakai `supabase.storage.from("photos").uploadToSignedUrl(path, token, blob)`.

Error: 401 `SESI_TIDAK_VALID` · 403 `EVENT_TUTUP` · 400 · 409 `FILM_HABIS` ·
429 `TERLALU_CEPAT` · 500 `GAGAL`.

### `POST /api/photos/commit`
Tandai foto siap tampil setelah file terunggah.

```json
{ "photoId": "…", "caption": "Selamat!", "width": 1920, "height": 1080,
  "bytes": 412345, "filteredUploaded": true, "thumbsUploaded": true }
```

- Hanya bisa meng-commit foto milik tamu pada sesi itu.
- `filteredUploaded: false` → `filtered_path` dikosongkan.
- `thumbsUploaded: true` → `has_thumb = true`. Kirim `true` hanya bila setiap
  varian yang tersimpan punya thumbnail.
- `caption` ≤ 200 karakter, string kosong disimpan sebagai `null`.

**200** `{ "ok": true, "photoId": "…" }` · Error: 401 · 400 · 500.

---

## Admin

Semua endpoint di bawah membutuhkan sesi Supabase Auth.

### `POST /api/admin/events` — buat acara
Izin: **admin GuestPro**.

```json
{ "coupleNames": "Kevin & Sarah", "slug": "kevin-sarah", "eventDate": "2026-10-10",
  "welcomeText": "…", "filmLimit": 27, "filmPreset": "classic",
  "opensAt": "2026-10-10T10:00:00.000Z", "closesAt": "2026-10-10T16:00:00.000Z", "isActive": true }
```

| Field | Aturan |
|---|---|
| `coupleNames` | 2–80 |
| `slug` | 3–60, `^[a-z0-9]+(-[a-z0-9]+)*$` |
| `eventDate` | `YYYY-MM-DD` atau null |
| `welcomeText` | ≤ 300 atau null |
| `filmLimit` | bilangan bulat 1–500 |
| `filmPreset` | `classic` / `warm` / `bw` |
| `opensAt`, `closesAt` | ISO datetime dengan offset, atau null; `closesAt` harus setelah `opensAt` |
| `isActive` | default `true` |

**201** `{ "ok": true, "eventId": "…", "slug": "kevin-sarah" }` ·
Error: 403 · 400 (pesan validasi pertama) · 409 slug sudah dipakai · 500.

### `PATCH /api/admin/events/[eventId]` — ubah pengaturan
Izin: admin GuestPro, `owner`, `editor`. Body sama dengan buat acara.
**200** `{ "ok": true, "eventId": "…", "slug": "…" }` · Error: 403 · 400 · 409 · 500.

### `DELETE /api/admin/events/[eventId]` — hapus acara permanen
Izin: **admin GuestPro**. `maxDuration` 300 detik.

```json
{ "confirmSlug": "kevin-sarah" }
```

Urutan: `is_active = false` → hapus file Storage per 1000 → hapus baris acara
(cascade). Aman diulang bila terputus.

**200** `{ "ok": true, "eventId": "…", "removedFiles": 124 }` ·
Error: 403 · 400 slug konfirmasi salah · 500 (pesan menyebut berapa file sudah terhapus).

### `GET /api/admin/events/[eventId]/photos` — halaman galeri
Izin: siapa pun yang bisa melihat acara.

| Query | Keterangan |
|---|---|
| `variant` | `orig` (default) / `film` |
| `guest` | filter `name_key` |
| `cursor` | `created_at` terakhir dari halaman sebelumnya |
| `hidden=1` | sertakan foto tersembunyi |

**200**
```json
{ "ok": true, "nextCursor": "2026-09-16T08:00:00Z",
  "items": [ { "id": "…", "guestName": "Dinda", "tableLabel": "Meja 5", "caption": null,
    "takenAt": "…", "createdAt": "…", "status": "ready",
    "url": "signed URL ukuran penuh", "thumbUrl": "signed URL thumbnail", "hasFilm": true } ] }
```
48 item per halaman; `nextCursor` null bila habis. Signed URL berlaku 1 jam.

### `PATCH /api/admin/events/[eventId]/photos` — sembunyikan / tampilkan
Izin: admin GuestPro, `owner`, `editor`.
```json
{ "photoId": "…", "status": "hidden" }
```
`status`: `hidden` atau `ready`. **200** `{ "ok": true, "photoId": "…", "status": "hidden" }`.

### `GET /api/admin/events/[eventId]/download` — ZIP
Izin: siapa pun yang bisa melihat acara. `maxDuration` 300 detik.

| Query | Keterangan |
|---|---|
| `variant` | `orig` / `film` |
| `guest` | filter `name_key` (opsional) |
| `part` | bagian ke-N mulai 0; 300 foto per bagian |

Respons `application/zip` (stream), nama file
`{slug}-{tamu|semua}-{variant}-bagian{N}.zip`, isi `NamaTamu/YYYY-MM-DD-HH-MM_xxxxxxxx.jpg`
(waktu dalam UTC, dari `taken_at`).
Hanya foto `ready`. Error: 403 · 404 bagian kosong · 500.

### `GET /api/admin/events/[eventId]/members` — daftar anggota
Izin: admin GuestPro, `owner`.
```json
{ "ok": true, "members": [ { "userId": "…", "email": "a@b.com", "role": "owner",
  "pending": true, "isSelf": false } ] }
```
`pending` = belum pernah login.

### `POST /api/admin/events/[eventId]/members` — undang / link baru
Izin: admin GuestPro, `owner`.
```json
{ "email": "pengantin@gmail.com", "role": "owner" }
```
Email baru → akun dibuat (`invite`). Email terdaftar → link masuk (`magiclink`).
Keanggotaan di-upsert dengan peran yang dikirim. **Tidak mengirim email.**

**200** `{ "ok": true, "link": "https://…/auth/confirm?token_hash=…&type=invite&next=…", "kind": "invite", "email": "…" }`

Membuat link baru untuk email yang sama menghanguskan link sebelumnya.

### `DELETE /api/admin/events/[eventId]/members?userId=…` — cabut akses
Izin: admin GuestPro, `owner`. Tidak bisa mencabut diri sendiri.
**200** `{ "ok": true, "userId": "…" }` · Error: 403 · 400 · 500.

---

## Halaman dengan efek samping

### `/auth/confirm` (Server Action `confirmAccess`)
- `GET /auth/confirm?token_hash&type&next` — **hanya** menampilkan tombol "Masuk
  ke galeri". Tidak menyentuh token, aman dibuka bot preview.
- Submit form (POST Server Action) — `verifyOtp` → cookie sesi → redirect ke
  `next` (hanya path `/admin…`). Token tidak valid → `/admin/login?link=kedaluwarsa`;
  bila token sudah terpakai tapi browser sudah punya sesi → `/admin`.

`type` yang diterima: `invite`, `magiclink`, `recovery`.
