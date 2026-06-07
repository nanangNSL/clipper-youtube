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
