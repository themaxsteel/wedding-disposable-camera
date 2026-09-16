@AGENTS.md

# Kamera Sekali Pakai — aturan kerja project

Dokumentasi rinci ada di `docs/`. Baca `docs/ARSITEKTUR.md` sebelum mengubah alur
upload, akses, atau undangan.

## Bahasa
- Teks UI, pesan error API, komentar kode, dan dokumentasi: **Bahasa Indonesia**.
- Pesan commit: bahasa Inggris.

## Invarian yang tidak boleh dilanggar
- **Role `anon` tidak boleh punya policy baca apa pun.** Tamu menulis hanya lewat
  route handler yang memvalidasi cookie `dc_session`, lalu memakai service role.
- **`claim_shot()` satu-satunya tempat jatah film berubah.** `/api/photos/init`
  harus tetap idempoten per `(guest_id, client_photo_id)`.
- **Token sekali pakai tidak boleh ditukar pada GET.** Bot preview membuka link
  lebih dulu (lihat `app/auth/confirm/actions.ts`).
- Client service role (`lib/supabase/admin.ts`) hanya diimpor dari modul yang
  berisi `import "server-only"`.
- Izin admin dicek lewat `getEventAccess()` / `getAdminContext()`, yang membaca
  dengan client ber-RLS. Jangan mengganti pengecekan itu dengan query service role.
- Menjepret tidak boleh menunggu jaringan: foto masuk antrean IndexedDB dulu.
- **Foto hanya boleh keluar dari antrean karena berhasil terkirim atau kode fatal**
  (`FILM_HABIS`, `SESI_TIDAK_VALID`, `EVENT_TUTUP`). Error jaringan dan error server
  hanya mengatur jeda (lihat `lib/upload/uploader.ts`).

## Database
- Perubahan skema = migrasi baru di `supabase/migrations/` lalu `npm run db:push`.
  Jangan mengubah migrasi yang sudah di-push.
- File storage dihapus lewat Storage API, bukan `delete from storage.objects`.
- Jalankan query remote dengan `npx supabase db query --linked "…"`.

## Next.js 16 di project ini
- `proxy.ts`, bukan `middleware.ts`.
- `params`, `searchParams`, dan `cookies()` bersifat async.
- Font sistem, jangan menambah `next/font/google` (build gagal tanpa akses Google Fonts).

## React Compiler lint
- Jangan `setState` sinkron di `useEffect`: pindahkan ke handler, callback
  `.then()`, `key` untuk reset, atau `useIsClient()` / `useSyncExternalStore`.
- Destrukturisasi ref dari objek hook sebelum dipakai di JSX.

## Sebelum menyatakan selesai
```bash
npx tsc --noEmit && npm run lint && npm run build
```
Perubahan pada kamera, upload, atau akses juga diuji sesuai `docs/PENGUJIAN.md`
(kamera tiruan di browser, simulasi RLS, dan uji API).

## Rahasia
- Jangan pernah menulis, mencetak, atau meng-commit `SUPABASE_SERVICE_ROLE_KEY`
  atau password database. `.env.local` tidak masuk git.
- Sebelum commit: `git diff --cached | grep -E "sb_secret_[A-Za-z0-9_-]{10,}"` harus kosong.
