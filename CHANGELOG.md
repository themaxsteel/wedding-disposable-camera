# Changelog

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id-ID/1.1.0/).
Semua perubahan di-deploy otomatis ke produksi saat masuk `main`.

## [Belum dirilis]

### Ditambahkan
- Dokumentasi lengkap di `docs/`: setup, arsitektur, database, API, keamanan,
  pengujian, runbook operasional, dan panduan pengantin.
- Aturan kerja project untuk agen AI di `CLAUDE.md`.
- Indikator "offline · N tersimpan di HP" di layar kamera dan pesan serupa di
  layar selesai.

### Diperbaiki
- **Foto tamu hilang setelah ±7–9 menit offline.** Uploader menghitung kegagalan
  jaringan sebagai percobaan gagal dan membuang foto pada kegagalan ke-12. Kini
  kegagalan jaringan tidak dihitung, foto hanya keluar dari antrean bila terkirim
  atau ditolak permanen (film habis, sesi mati, acara tutup), uploader tidak
  mencoba saat HP offline, dan koneksi yang putus di tengah upload versi film
  mengulang seluruh foto alih-alih menyimpan tanpa versi film.

## [0.1.0] — 2026-09-16

### Ditambahkan
- **Kamera tamu** (`3a8dfe0`): masuk dengan nama lewat QR, kamera bergaya analog,
  jatah film per tamu, versi asli + versi film per jepretan, caption, flash,
  kamera depan, fallback kirim dari galeri, antrean upload offline di IndexedDB.
- **Dashboard** (`3a8dfe0`): galeri per nama tamu, toggle asli/film, sembunyikan
  foto, ZIP streaming per 300 foto, QR per meja siap cetak.
- **Keamanan dasar** (`3a8dfe0`): RLS default deny, bucket privat, sesi tamu
  dengan token ter-hash, `claim_shot()` atomik, upload idempoten.
- **Buat acara & undangan** (`627dc4d`): peran admin GuestPro / pengantin / WO /
  lihat saja, form acara dengan jadwal buka-tutup, undangan berupa link
  sekali pakai yang dikirim lewat WhatsApp, halaman buat password.
- **Thumbnail galeri** (`a680c86`): HP tamu mengunggah versi 480px; grid memakai
  thumbnail, lightbox & ZIP tetap ukuran penuh.
- **Hapus acara** (`714fa21`): khusus admin GuestPro, konfirmasi ketik slug,
  menghapus seluruh file storage lalu data acara; aman diulang bila terputus.

### Diperbaiki
- **Viewfinder hitam di semua HP** (`f48261a`): stream kamera dipasang sebelum
  elemen `<video>` ada di halaman. Kini dipasang lewat callback ref; putar kamera
  tidak lagi kembali ke layar izin.
- **Link undangan "kedaluwarsa" sebelum dibuka** (`7b09eb8`): preview link
  WhatsApp menghabiskan token sekali pakai karena token ditukar saat halaman
  dibuka (GET). Kini token hanya ditukar saat tombol "Masuk ke galeri" ditekan.
- Counter film sempat naik kembali setiap satu upload selesai (`3a8dfe0`).
- Upload paralel saling tertahan oleh rate limit server sendiri (`3a8dfe0`).

### Keamanan
- Hanya admin GuestPro yang bisa membuat acara; sebelumnya akun mana pun bisa
  (`627dc4d`).
- Menyembunyikan foto kini membutuhkan izin kelola, bukan sekadar izin lihat
  (`627dc4d`).
- Dua sesi login yang tercipta dari token yang dihabiskan bot preview telah
  dicabut dari database (16/09/2026).
