# Pengujian

Project ini **belum punya test otomatis** (unit/E2E) di repository. Kualitas saat
ini dijaga oleh pemeriksaan statis, uji API manual, simulasi RLS di database, dan
uji di perangkat nyata. Dokumen ini mencatat cara menjalankan semuanya supaya
bisa diulang setiap rilis.

## 1. Pemeriksaan wajib sebelum push

```bash
npx tsc --noEmit     # tipe
npm run lint         # ESLint + aturan React Compiler (react-hooks/*)
npm run build        # build produksi, butuh env terisi
```

Aturan lint yang paling sering muncul di project ini:

| Aturan | Artinya | Pola perbaikan yang dipakai |
|---|---|---|
| `react-hooks/set-state-in-effect` | `setState` sinkron di dalam `useEffect` | Pindahkan ke handler event, ke callback `.then()`, pakai `key` untuk reset, atau `useSyncExternalStore` untuk nilai khusus browser (`lib/util/useIsClient.ts`) |
| `react-hooks/refs` | Membaca ref saat render | Destrukturisasi ref dari objek hook; pakai *callback ref* |

## 2. Uji API alur tamu

Jalankan terhadap server lokal atau produksi. Setiap uji memakai **1 jatah film**
dan menambah 1 foto uji di acara `kevin-sarah`.

| # | Langkah | Harapan |
|---|---|---|
| 1 | `GET /e/kevin-sarah` | 200, nama pengantin tampil |
| 2 | `POST /api/session` dengan nama & deviceId | 200, cookie `dc_session` dengan `Secure; HttpOnly; SameSite=lax` |
| 3 | `GET /e/kevin-sarah` dengan cookie | 307 ke `/kamera` |
| 4 | `POST /api/photos/init` (clientPhotoId baru) | 200, `remaining` turun tepat 1 |
| 5 | Ulangi #4 dengan clientPhotoId **sama** | `photoId` sama, `remaining` **tidak** turun |
| 6 | `uploadToSignedUrl` untuk tiap token | Tanpa error |
| 7 | `POST /api/photos/commit` | 200 |
| 8 | Publishable key: `select` dari `photos`, `guests`, `guest_sessions` | 0 baris |
| 9 | Publishable key: `download` & `list` bucket `photos` | Ditolak / kosong |
| 10 | `POST /api/photos/init` tanpa cookie | 401 |

Contoh cepat dengan curl:

```bash
BASE=http://localhost:3000
curl -s -c jar.txt -X POST $BASE/api/session -H 'content-type: application/json' \
  -d '{"slug":"kevin-sarah","name":"Tes QA","deviceId":"qa-device-0001"}'
curl -s -b jar.txt -X POST $BASE/api/photos/init -H 'content-type: application/json' \
  -d "{\"clientPhotoId\":\"$(node -e 'console.log(crypto.randomUUID())')\"}"
```

Uji tanpa login untuk area admin:

| Permintaan | Harapan |
|---|---|
| `GET /admin`, `/admin/acara-baru`, `/admin/akun`, `/admin/<id>/pengaturan` | 307 ke `/admin/login?next=…` |
| `POST /api/admin/events` | 403 |
| `POST /api/admin/events/<id>/members` | 403 |
| `DELETE /api/admin/events/<id>` | 403 |
| `GET /auth/confirm?token_hash=x&type=invite` (UA WhatsApp) | **200** halaman tombol — token tidak disentuh |
| Submit tombol dengan token palsu | Redirect ke `/admin/login?link=kedaluwarsa` |

## 3. Simulasi RLS di database

Uji izin tanpa perlu login sebagai user tersebut. Semua dalam transaksi yang di-rollback.

```sql
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"<uuid user>","role":"authenticated"}', true);

select public.is_platform_admin()                         as admin_platform,
       (select count(*) from public.events)               as acara_terlihat,
       (select count(*) from public.photos)               as foto_terlihat,
       public.can_manage_event((select id from public.events where slug = 'kevin-sarah')) as boleh_kelola;

-- Coba buat acara (harus ditolak untuk non-admin)
insert into public.events (slug, couple_names) values ('uji-rls', 'Uji');
rollback;
```

| Simulasi | Hasil yang diharapkan |
|---|---|
| UUID admin platform | Melihat semua acara & foto, `boleh_kelola = true`, insert berhasil |
| UUID acak (`00000000-0000-4000-8000-00000000abcd`) | 0 acara, 0 foto, insert **ditolak** RLS |
| `set local role anon;` → `select * from public.event_storage_objects('<id>')` | `permission denied` |

Terakhir dijalankan: 16/09/2026 — semua sesuai harapan.

## 4. Menguji kamera tanpa HP

Tempel di DevTools pada halaman `/e/<slug>/kamera` **sebelum** menekan "Buka
kamera". Ini mengganti kamera dengan video buatan sehingga seluruh alur (preview,
jepret, filter, antrean, upload) bisa diuji di laptop mana pun.

```js
Object.defineProperty(navigator, "mediaDevices", {
  configurable: true,
  value: {
    enumerateDevices: async () => [],
    getUserMedia: async () => {
      const c = Object.assign(document.createElement("canvas"), { width: 1920, height: 1080 });
      const x = c.getContext("2d");
      let t = 0;
      setInterval(() => {
        x.fillStyle = `hsl(${t++ % 360},60%,50%)`;
        x.fillRect(0, 0, c.width, c.height);
        x.fillStyle = "#fff";
        x.font = "bold 120px sans-serif";
        x.fillText("KAMERA TIRUAN", 360, 580);
      }, 50);
      return c.captureStream(20);
    },
  },
});
```

Cek setelah "Buka kamera" dan jepret:

```js
const v = document.querySelector("video");
({ stream: !!v.srcObject, readyState: v.readyState, resolusi: `${v.videoWidth}x${v.videoHeight}` });
// harapan: stream true, readyState 4, resolusi 1920x1080

// jumlah job di antrean (harus kembali 0 setelah upload)
await new Promise((r) => { const q = indexedDB.open("dcam-queue"); q.onsuccess = () =>
  q.result.transaction("jobs").objectStore("jobs").count().onsuccess = (e) => r(e.target.result); });
```

Keterbatasan: tidak menguji izin kamera, torch, orientasi, atau perilaku iOS
saat app di-background. Itu wajib diuji di HP nyata.

## 5. Uji di perangkat nyata

### Matriks minimum sebelum acara sungguhan

| Perangkat | Browser | Wajib |
|---|---|---|
| iPhone (iOS terbaru) | Safari | ✅ |
| iPhone | Dibuka dari chat WhatsApp | ✅ |
| Android kelas menengah | Chrome | ✅ |
| Android kelas bawah / RAM kecil | Chrome | ✅ |
| Android | Dibuka dari DM Instagram | disarankan |
| iPad | Safari | opsional |

### Skenario

| # | Skenario | Harapan |
|---|---|---|
| D1 | Scan QR → nama → Buka kamera → izinkan | Prompt izin muncul setelah tombol ditekan, preview tidak fullscreen |
| D2 | Jepret 3× cepat | Suara & kilat putih, toast "Foto tersimpan!", counter turun 3, jeda 1,5 dtk antar jepretan |
| D3 | Tulis caption lalu Simpan | Caption muncul di lightbox dashboard |
| D4 | Putar ke kamera depan | Preview dicerminkan; hasil foto **tidak** tercermin |
| D5 | Flash ON di Android | Senter menyala sesaat saat jepret |
| D6 | Flash ON di iPhone kamera depan | Layar putih sesaat |
| D7 | Pindah ke WhatsApp 30 dtk, kembali | Preview hidup lagi tanpa reload |
| D8 | Kunci layar 1 menit, buka | Preview hidup lagi |
| D9 | Mode pesawat → jepret 2× → nonaktifkan **dalam 5 menit** | Foto masuk, tidak dobel |
| D10 | Tolak izin kamera | Pesan + petunjuk pengaturan sesuai platform, tombol "Kirim dari galeri" |
| D11 | Buka dari WhatsApp | Banner "Buka di Safari / Chrome" + tombol salin link |
| D12 | Habiskan jatah film (acara uji dengan jatah 3) | Pindah ke layar "Rol film habis", "Semua foto terkirim" |
| D13 | Scan ulang dari HP & nama yang sama | Rol film berlanjut, bukan reset |
| D14 | Buka saat kamera nonaktif | "Kamera tidak aktif" |

### Dashboard & undangan

| # | Skenario | Harapan |
|---|---|---|
| A1 | Buat acara, slug terisi otomatis dari nama | Diarahkan ke Pengaturan dengan pesan "Acara dibuat" |
| A2 | Undang email baru → kirim via WhatsApp → buka → **Masuk ke galeri** | Masuk, diminta membuat password |
| A3 | Buka link yang sama lagi | "Link masuk sudah kedaluwarsa…" |
| A4 | Login peran **Lihat saja** | Tidak ada tombol Pengaturan maupun Sembunyikan |
| A5 | Filter per tamu, toggle Asli/Film | Grid berganti, thumbnail cepat dimuat |
| A6 | Unduh ZIP semua & per tamu | File terbuka, folder per nama tamu |
| A7 | Sembunyikan foto | Hilang dari grid & ZIP |
| A8 | Hapus acara uji | Kembali ke daftar dengan pesan; SQL kesehatan data = 0 |

## 6. Setelah hapus acara

```sql
select
  (select count(*) from storage.objects o where o.bucket_id = 'photos'
     and not exists (select 1 from public.events e where o.name like e.id::text || '/%')) as file_yatim,
  (select count(*) from public.photos p
     where not exists (select 1 from public.events e where e.id = p.event_id)) as foto_yatim,
  (select count(*) from public.guests g
     where not exists (select 1 from public.events e where e.id = g.event_id)) as tamu_yatim;
-- semuanya harus 0
```

## 7. Smoke test setelah deploy

- [ ] `GET /` → 200, judul "Kamera Sekali Pakai"
- [ ] `GET /e/<slug aktif>` → 200
- [ ] `GET /admin` → 307 ke login
- [ ] Satu jepretan dari HP masuk ke galeri
- [ ] Vercel → Logs tanpa error baru

## Rencana test otomatis

Yang paling bernilai bila nanti ditambahkan, berurutan:

1. **Uji integrasi API tamu** (skenario bagian 2) sebagai script `node` yang bisa
   dijalankan terhadap preview deploy.
2. **Uji RLS** (bagian 3) sebagai file SQL dengan `pgTAP` atau script yang gagal bila hasil menyimpang.
3. **Unit test uploader** — terutama perilaku offline (lihat
   [keterbatasan](ARSITEKTUR.md#keterbatasan-yang-diketahui)).
4. **Playwright** dengan `--use-fake-device-for-media-stream` untuk alur kamera.
