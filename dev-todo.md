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
