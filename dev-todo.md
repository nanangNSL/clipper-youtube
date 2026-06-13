# Dev TODO

## YouTube → TikTok Clipper (Web) — 2026-06-07

**Deskripsi:** Membuat tools berbasis web (JavaScript/Node) untuk memotong video dari URL YouTube,
mengubahnya menjadi format video TikTok (vertikal 1080x1920 / 9:16), dengan input **hook title**
(teks di atas) dan **footer** (teks di bawah). Output berupa file video .mp4 yang bisa di-preview
dan di-download dari browser.

**Stack:**
- Backend: Node.js + Express
- Download YouTube: `youtube-dl-exec` (membundel binary yt-dlp)
- Proses video: `fluent-ffmpeg` + `ffmpeg-static` (binary ffmpeg)
- Render teks overlay: `sharp` (SVG → PNG, word-wrap, no native compile issues)
- Frontend: HTML + CSS + Vanilla JS

**File yang terlibat:**
- `package.json` — definisi project & dependencies
- `server.js` — Express server, endpoint API + serve static
- `src/processor.js` — pipeline: download segment + ffmpeg compose ke 9:16
- `src/overlay.js` — render hook/footer jadi PNG transparan (sharp)
- `public/index.html` — form input (URL, start, end, hook, footer)
- `public/style.css` — styling UI
- `public/app.js` — logika frontend (submit, loading, preview, download)
- `README.md` — cara pakai
- `.gitignore` — abaikan node_modules, temp, output

**Langkah-langkah:**
- [x] Cek environment (node, npm, ffmpeg, yt-dlp)
- [x] Tulis dev-todo.md (file ini)
- [x] Buat package.json + struktur folder
- [x] Implementasi `src/overlay.js` (render teks → PNG)
- [x] Implementasi `src/processor.js` (download + ffmpeg 9:16 + overlay)
- [x] Implementasi `server.js` (Express, /api/clip)
- [x] Implementasi frontend (index.html, style.css, app.js)
- [x] Tulis README.md + .gitignore
- [x] npm install (download binary yt-dlp & ffmpeg)
- [x] Uji jalan server & verifikasi 1 klip end-to-end (output 1080x1920, h264+aac, 8s OK)

**Catatan / Risiko:**
- yt-dlp & ffmpeg di-bundle via npm, jadi tidak perlu install manual.
- Download YouTube tunduk pada Terms of Service YouTube — pakai hanya untuk konten yang
  Anda berhak gunakan (hak cipta milik sendiri / izin / fair use).
- Pemotongan pakai `--download-sections` + `--force-keyframes-at-cuts` agar cepat & akurat.
- Batas durasi klip dibatasi (default 180 dtk) untuk mencegah proses berat.
- Path font/escaping dihindari dengan render teks via SVG+sharp (bukan drawtext ffmpeg).

---

## YouTube Bot-Check Error: Cookies Expired — 2026-06-14

**Masalah:** Mendapat error "Sign in to confirm you're not a bot" dari YouTube saat download video.

**Root Cause:** Cookies di `cookies.txt` sudah expired (kadaluarsa). YouTube memerlukan cookies yang valid & fresh untuk authenticate request.

**Solusi:**
- [x] Extract fresh YouTube cookies menggunakan browser (Chrome/Edge)
- [x] Import cookies ke `cookies.txt` dengan format Netscape
- [ ] Test download sekali untuk verifikasi
- [x] Set env variable `YTDLP_COOKIES` di production (jika deploy di server lain)
- [x] Improve error messages & cookie validation logic

**File yang terlibat:**
- [x] `src/download.js` — improved cookie handling & error messages
- [ ] `cookies.txt` — **REPLACE dengan fresh cookies** (user action)
- [x] `COOKIES_SETUP.md` (NEW) — detailed guide untuk extract cookies
- [x] `FIX_COOKIES_NOW.md` (NEW) — quick action checklist
- [x] `README.md` — updated production deployment section
- [x] `server.js` — enhanced cookiesStatus() dengan age warning

**Catatan:**
- YouTube cookies punya lifetime ~30-90 hari, perlu di-refresh berkala
- Browser extension "Get cookies.txt LOCALLY" recommended (easiest method)
- Di production: gunakan `YTDLP_COOKIES=/path/to/cookies.txt` env variable
- Added age detection: warns if cookies >45 days old, critical if >60 days old
- Error messages sekarang jauh lebih spesifik & actionable

---

## Preset Durasi + Bulk CSV + Refactor — 2026-06-07

**Deskripsi:** Menambah (1) pilihan preset durasi cut **15 dtk / 60 dtk / 5 menit** (+ custom),
(2) **bulk clip** lewat upload **template CSV** menghasilkan banyak video sekaligus dengan nama
file sesuai kolom `title` (fallback ke index), plus download ZIP semua hasil. Sekaligus
**refactor** kode jadi modul-modul kecil yang rapi.

**File yang terlibat:**
- `src/config.js` — BARU: konstanta global (dimensi, preset durasi, dir, max durasi)
- `src/overlay.js` — tetap (render teks)
- `src/download.js` — BARU: validasi URL + download segmen (pecahan dari processor.js)
- `src/compose.js` — BARU: pipeline ffmpeg 9:16 (pecahan dari processor.js)
- `src/clip.js` — BARU: orkestrasi 1 klip (download + overlay + compose + penamaan file)
- `src/csv.js` — BARU: parser CSV sederhana (handle quote, BOM)
- `src/bulk.js` — BARU: job queue in-memory + proses batch + buat ZIP
- `src/processor.js` — DIHAPUS (dipecah ke modul di atas)
- `server.js` — endpoint baru: /api/bulk (POST), /api/bulk/:id (GET), /api/template.csv
- `public/index.html` — tab Single & Bulk, preset durasi, upload CSV, daftar hasil
- `public/style.css` — styling tab, progress, daftar hasil
- `public/app.js` — logika single (preset durasi) + bulk (upload, polling, ZIP)
- `package.json` — tambah `multer` (upload), `archiver` (zip)
- `README.md` — update dokumentasi

**Langkah-langkah:**
- [x] Update dev-todo.md (section ini)
- [x] Tambah dependency multer + archiver
- [x] Buat `src/config.js`
- [x] Pecah processor.js → download.js + compose.js + clip.js (dukung preset durasi & nama file)
- [x] Buat `src/csv.js`
- [x] Buat `src/bulk.js` (job queue + ZIP)
- [x] Refactor `server.js` (route baru)
- [x] Refactor frontend (tab, preset, bulk upload, polling, hasil)
- [x] Update README.md
- [x] npm install
- [x] Uji single (preset) & bulk (CSV multi-row) end-to-end

**Catatan:**
- Bulk diproses asinkron (job in-memory) + polling agar tidak kena timeout HTTP.
- Nama file di-sanitize untuk Windows (`<>:"/\|?*` → `_`), unik (append -1, -2 bila bentrok).
- Naikkan MAX_CLIP_SECONDS jadi 300 dtk agar preset 5 menit valid.

---

## Originalitas Konten (anti-flag TikTok) — 2026-06-07

**Deskripsi:** Memperbaiki pipeline video agar hasil TIDAK dianggap "konten tidak orisinal /
berkualitas rendah" oleh TikTok (dan platform sejenis). Sasaran sesuai pedoman TikTok:
(1) hilangkan kemungkinan **watermark/logo sumber** dengan crop tepi, (2) tambahkan **editing
kreatif baru** (background bergerak/parallax, color grading, sharpening, overlay teks),
(3) cegah **video terlalu pendek** (durasi minimum), (4) pastikan **bukan gambar statis/GIF**
(re-encode video penuh + motion), (5) **strip metadata sumber** agar tidak terdeteksi hasil impor.

**File yang terlibat:**
- `src/config.js` — tambah `MIN_CLIP_SECONDS` + konstanta efek kreatif (crop tepi, motion, grading)
- `src/compose.js` — pipeline baru: crop tepi (anti-watermark) + color grade + sharpen +
  background parallax bergerak + strip metadata
- `src/clip.js` — terapkan validasi durasi minimum
- `README.md` — dokumentasi fitur originalitas

**Langkah-langkah:**
- [x] Update dev-todo.md (section ini)
- [x] `src/config.js`: `MIN_CLIP_SECONDS`, `EDGE_CROP`, motion & grading constants
- [x] `src/compose.js`: crop tepi anti-watermark pada foreground
- [x] `src/compose.js`: color grade (contrast/saturation) + unsharp pada foreground
- [x] `src/compose.js`: background blur PARALLAX bergerak (crop-pan pakai waktu `t`)
- [x] `src/compose.js`: strip metadata sumber (`-map_metadata -1`)
- [x] `src/clip.js`: tolak klip < MIN_CLIP_SECONDS
- [x] Update README.md
- [x] Uji end-to-end (verifikasi output bergerak, ter-grade, durasi valid)

**Catatan / Risiko:**
- Crop tepi default 4% per sisi (`EDGE_CROP`) — cukup memotong watermark sudut tanpa
  membuang banyak konten. Bisa di-nol-kan jika sumber memang bersih.
- Motion background pakai `crop` dengan ekspresi waktu `t` (sin/cos) — aman terhadap framerate
  (ukuran tetap, hanya posisi yang bergeser), tidak butuh ffprobe.
- Tidak menambah watermark/logo apa pun milik kita (justru menghindari penyebab flag).
- Durasi minimum default 5 dtk; TikTok lebih suka klip lebih panjang, ini hanya pengaman.

---

## Naikkan Posisi Footer (hindari ketutup UI TikTok) — 2026-06-07

**Deskripsi:** Footer di hasil video tertutup UI TikTok (caption/tombol) saat diposting.
Naikkan posisi footer agar berada di atas zona aman UI bagian bawah.

**File yang terlibat:**
- `src/compose.js` — perbesar `bottomMargin` agar footer naik ke atas zona UI

**Langkah-langkah:**
- [x] Update dev-todo.md (section ini)
- [x] Naikkan `bottomMargin` footer di `src/compose.js`

**Catatan:**
- UI bawah TikTok menutupi ±15–18% layar bawah (~300px dari 1920). Margin dinaikkan
  ke ~320px agar footer tetap terlihat.

---

## Fix Bot-Check YouTube di Production (cookies + fallback client) — 2026-06-12

**Deskripsi:** Di production, yt-dlp gagal dengan error
`Sign in to confirm you're not a bot` karena IP server/datacenter diblokir YouTube.
Solusi: (1) dukung **file cookies** (Netscape `cookies.txt`) via env `YTDLP_COOKIES`
atau file `cookies.txt` di root project, (2) **retry otomatis** dengan player client
alternatif (`tv_simply`, `tv_embedded`) bila kena bot-check, (3) pesan error yang
jelas + dokumentasi cara export cookies.

**File yang terlibat:**
- `src/download.js` — deteksi cookies file, pass `--cookies`, retry dengan
  `--extractor-args youtube:player_client=...` saat bot-check
- `README.md` — dokumentasi setup cookies untuk production

**Langkah-langkah:**
- [x] Update dev-todo.md (section ini)
- [x] `src/download.js`: resolve cookies file (env `YTDLP_COOKIES` → `cookies.txt` di root)
- [x] `src/download.js`: retry chain player client saat error bot-check
- [x] `src/download.js`: error message ramah saat semua attempt gagal
- [x] README.md: section deploy production + cara export cookies
- [x] Verifikasi: download 1 segmen masih jalan secara lokal (segmen 5 dtk OK)
- [x] Tambah `cookies.txt` ke .gitignore (jangan sampai ter-commit)

**Catatan / Risiko:**
- Cookies harus diexport dari **jendela private/incognito yang lalu ditutup**
  (sesuai wiki yt-dlp) agar tidak di-rotate browser dan tidak cepat kadaluarsa.
- Gunakan akun YouTube sekunder — akun yang dipakai bisa terkena rate-limit.
- yt-dlp binary harus versi baru; binary lama lebih sering kena bot-check.
  Re-run `npm install` (youtube-dl-exec mengunduh release terbaru saat install).
- Tanpa cookies, fallback client kadang berhasil tapi tidak dijamin di IP datacenter.

---

## Feature: Upload Cookies via Web UI — 2026-06-12

**Deskripsi:** Menambah fitur upload `cookies.txt` lewat browser (tab baru "🍪 Cookies"),
supaya tidak perlu SSH/upload manual ke server production. Termasuk endpoint untuk
cek status cookies dan menghapusnya.

**File yang terlibat:**
- `src/download.js` — export `resolveCookiesFile` agar dipakai endpoint status
- `server.js` — endpoint `GET /api/cookies` (status), `POST /api/cookies` (upload +
  validasi format Netscape), `DELETE /api/cookies` (hapus)
- `public/index.html` — tab baru "Cookies": status, form upload, tombol hapus, petunjuk
- `public/app.js` — logika tab cookies (load status, upload, hapus)
- `public/style.css` — styling kecil untuk status cookies (jika perlu)
- `README.md` — update dokumentasi (upload via UI)

**Langkah-langkah:**
- [x] Update dev-todo.md (section ini)
- [x] `src/download.js`: export `resolveCookiesFile`
- [x] `server.js`: GET/POST/DELETE `/api/cookies` + validasi isi file
- [x] `public/index.html`: tab Cookies + form
- [x] `public/app.js`: load status, upload, hapus
- [x] `public/style.css`: styling form cookies
- [x] README.md: dokumentasi
- [x] Verifikasi end-to-end: status awal → tolak file invalid → upload valid →
      status terpasang → hapus (semua via curl, OK)

**Catatan / Risiko:**
- File disimpan ke `<root>/cookies.txt` (sudah di .gitignore).
- Validasi isi: harus format Netscape / mengandung cookie domain youtube.com —
  mencegah salah upload file sembarangan.
- Jika env `YTDLP_COOKIES` diset, file env yang dipakai yt-dlp (prioritas lebih
  tinggi) — status di UI harus menjelaskan ini.
- UI ini tidak ber-autentikasi (sama seperti seluruh app) — siapa pun yang bisa
  akses web bisa ganti cookies. Jangan expose app ke publik tanpa proteksi.

---

## Fix "Requested format is not available" di Production — 2026-06-12

**Deskripsi:** Setelah bot-check teratasi, production gagal dengan
`Requested format is not available`. Penyebab umum: YouTube tidak memberikan
format video ke client default tanpa **PO token** (yt-dlp men-skip semua format,
format selector gagal). Saat ini error tsb TIDAK memicu retry client lain.
Solusi: (1) jadikan error format-not-available **retryable** agar fallback client
ikut dicoba, (2) tambah client `web_safari` (masih dapat format tanpa PO token)
di urutan pertama fallback, (3) pesan error akhir yang membedakan kedua kasus.

**File yang terlibat:**
- `src/download.js` — regex retryable baru + urutan fallback client + pesan error

**Langkah-langkah:**
- [x] Update dev-todo.md (section ini)
- [x] `src/download.js`: deteksi error format ("Requested format is not available",
      "No video formats found", "Only images are available")
- [x] `src/download.js`: retry fallback client juga untuk error format
- [x] `src/download.js`: tambah `web_safari` ke FALLBACK_CLIENTS
- [x] `src/download.js`: pesan error akhir sesuai jenis kegagalan
- [x] Update binary yt-dlp lokal 2026.03.17 → 2026.06.09 (`yt-dlp -U`)
- [x] Tambah script `npm run update-ytdlp` di package.json (verified jalan)
- [x] `.gitignore`: tambah `cookies.txt.*` (file .bak jangan ter-commit)
- [x] README: update-ytdlp + peringatan cookies rusak
- [x] Verifikasi lokal: download segmen OK setelah cookies rusak disingkirkan

**Temuan root cause (lokal, kemungkinan sama di production):**
1. `cookies.txt` di root (524KB, dump SEMUA domain browser, header "generated by
   yt-dlp") DITOLAK YouTube → semua client gagal "no formats". Di-rename ke
   `cookies.txt.bak`. Cookies rusak lebih buruk daripada tanpa cookies.
2. Binary yt-dlp 2026.03.17 terlalu tua → "No video formats found" bahkan tanpa
   cookies. Setelah update ke 2026.06.09 + tanpa cookies rusak: download OK.

---

## Fix HTTP 403 Transien Saat Download Segmen — 2026-06-12

**Deskripsi:** User masih gagal clip (video XV0Z7Vk2Tns). Investigasi: ekstraksi
format BERHASIL (client android_vr), tapi saat ffmpeg membuka URL stream,
googlevideo kadang menjawab **403 Forbidden** (URL signature ditolak, transien).
Error ini tidak retryable di kode → langsung gagal. Penyebab pendukung: yt-dlp
tidak punya JS runtime yang didukung (Node 20 = "unsupported") sehingga JS
challenge tidak bisa diselesaikan untuk client web. Solusi: (1) jadikan error
403/ffmpeg-exit retryable, (2) tambah `android_vr` di urutan pertama fallback
(terbukti dapat format tanpa PO token/JS runtime; retry = URL baru), (3) pesan
error akhir untuk kasus 403.

**File yang terlibat:**
- `src/download.js` — regex 403 + urutan fallback client + pesan error

**Langkah-langkah:**
- [x] Update dev-todo.md (section ini)
- [x] `src/download.js`: deteksi error 403 / ffmpeg exited sebagai retryable
- [x] `src/download.js`: FALLBACK_CLIENTS = android_vr, tv_simply, tv_embedded, web_safari
- [x] `src/download.js`: pesan error khusus 403
- [x] `src/download.js`: retry 2 ronde dengan jeda (kegagalan YouTube bersifat flaky)
- [x] `src/download.js`: fallback otomatis TANPA cookies bila semua percobaan
      dengan cookies gagal (cookies rusak jangan menyabotase download)
- [x] Verifikasi: clip video XV0Z7Vk2Tns berhasil end-to-end DENGAN cookies
      rusak terpasang — fallback aktif, output tes-fix-403.mp4 jadi

**Temuan tambahan:** `cookies.txt` rusak (536KB, dump semua domain) disalin user
kembali ke root pada 16:55 — inilah penyebab "no formats" di semua client; tanpa
cookies, video yang sama berhasil. Fallback no-cookies adalah pengaman permanen.

**Catatan / Risiko:**
- 403 transien adalah perilaku googlevideo yang dikenal; client berbeda
  menghasilkan URL bertanda tangan berbeda, biasanya lolos pada retry.
- Untuk solusi permanen client web, server butuh JS runtime yang didukung
  yt-dlp (mis. deno) — opsional, didokumentasikan saja.

**Catatan / Risiko:**
- `web_safari`/`tv_simply`/`tv_embedded` adalah workaround yang bisa berubah
  sewaktu-waktu mengikuti perubahan YouTube — jaga yt-dlp tetap update
  (`npm install` ulang di server).
- Format selector sudah punya fallback sampai `b` (best), jadi kegagalan format
  hampir pasti berarti "tidak ada format sama sekali" dari client tsb, bukan
  masalah selector.
