# 🎬 YouTube → TikTok Clipper (Web)

Tool berbasis web untuk memotong video dari URL YouTube dan mengubahnya menjadi
format video vertikal **TikTok / Reels / Shorts (1080×1920, 9:16)**, lengkap dengan
**Hook Title** (teks di atas) dan **Footer** (teks di bawah).

## ✨ Fitur
- Input URL YouTube + waktu mulai & selesai (detik), preset durasi (15/60/300 dtk)
- Bulk clip via upload **CSV** + download **ZIP**
- Output otomatis 9:16 dengan background blur + video di tengah
- Overlay **hook title** (atas) dan **footer** (bawah), word-wrap otomatis
- Preview langsung di browser + tombol download
- Binary `yt-dlp` & `ffmpeg` di-bundle via npm (tanpa install manual)

## 🛡️ Originalitas Konten (anti-flag TikTok)
Agar hasil tidak dianggap **konten tidak orisinal / berkualitas rendah** oleh TikTok,
pipeline menerapkan editing kreatif baru pada setiap klip:
- **Crop tepi anti-watermark** — memotong ±4% tiap sisi (`EDGE_CROP`) untuk membuang
  watermark/logo sudut dari sumber.
- **Background parallax bergerak** — background blur perlahan bergeser (sin/cos terhadap
  waktu), jadi frame jelas hasil editan dan tidak pernah terbaca sebagai gambar statis.
- **Color grading + sharpening** — kontras/saturasi disesuaikan + `unsharp`, bukan salinan 1:1.
- **Overlay hook/footer** — teks baru di atas video.
- **Strip metadata sumber** (`-map_metadata -1`) — menghilangkan jejak "hasil impor".
- **Durasi minimum** (`MIN_CLIP_SECONDS`, default 5 dtk) — menolak klip terlalu pendek.

> Semua parameter di atas dapat diatur di `src/config.js`.

## 📦 Persyaratan
- Node.js v18+ (terdeteksi v20 di mesin ini)

## 🚀 Cara Pakai
```bash
npm install      # mengunduh dependency + binary yt-dlp & ffmpeg
npm start        # menjalankan server
```
Lalu buka **http://localhost:3000** di browser.

1. Tempel URL YouTube.
2. Isi waktu **Mulai** dan **Selesai** (dalam detik). 5–300 detik per klip.
3. (Opsional) Isi **Hook Title** dan **Footer**.
4. Klik **Buat Klip TikTok** → tunggu proses → preview & download.

## 🗂️ Struktur
```
server.js          # Express server + endpoint /api/clip, /api/bulk
src/config.js      # konstanta global (dimensi, durasi, efek originalitas)
src/download.js    # validasi URL + download segmen (yt-dlp)
src/compose.js     # compose 9:16 + crop tepi + grade + parallax (ffmpeg)
src/clip.js        # orkestrasi 1 klip (download + overlay + compose)
src/overlay.js     # render teks hook/footer jadi PNG (sharp/SVG)
src/csv.js         # parser CSV untuk bulk
src/bulk.js        # job queue bulk + ZIP
public/            # frontend (index.html, style.css, app.js)
temp/              # file sementara (auto-bersih)
public/output/     # hasil video .mp4
```

## ⚙️ Konfigurasi
- Port: set env `PORT` (default `3000`).
- Durasi klip (min/maks) & efek originalitas: konstanta di `src/config.js`
  (`MIN_CLIP_SECONDS`, `MAX_CLIP_SECONDS`, `EDGE_CROP`, `COLOR_GRADE`, `MOTION_BG`, dst.).

## 🚢 Deploy Production (wajib: cookies YouTube)
YouTube memblokir request tanpa login dari IP server/datacenter dengan error:

```
ERROR: [youtube] ...: Sign in to confirm you're not a bot.
Use --cookies-from-browser or --cookies for the authentication.
```

**Solusi: berikan cookies YouTube yang SEGAR ke yt-dlp.**

**⚠️ PENTING: Cookies punya lifetime terbatas!**
- YouTube cookies biasanya expire dalam **30-90 hari**.
- Jika download tiba-tiba mulai gagal padahal cookies terpasang, **cookies sudah expired**.
- Solusi: export ulang cookies baru dari browser.
- Aplikasi akan warn jika `cookies.txt` terdeteksi tua (>60 hari).

**Panduan lengkap export cookies:**
👉 **Buka file `COOKIES_SETUP.md` di project root untuk langkah detail.**

Versi singkat:
1. Install extension **"Get cookies.txt LOCALLY"** dari Chrome Web Store
2. Login ke youtube.com dengan akun yang ingin digunakan
3. Klik extension → "Export for this site"
4. Save sebagai `cookies.txt`
5. Upload ke aplikasi via tab **🍪 Cookies**, atau
6. Set env: `YTDLP_COOKIES=/path/to/cookies.txt`, atau
7. Taruh di root project (sudah di `.gitignore`)

**Setup yang recommended:**
- **Gunakan akun YouTube sekunder** (bukan akun utama) — akun yang aktif kena rate-limit.
- **Login di jendela private/incognito**, export cookies, **jangan logout dari jendela itu**.
  Ini membuat cookies valid lebih lama (YouTube tidak me-rotate cookies inactive session).
- **Refresh cookies setiap bulan** untuk production — set reminder.

**Troubleshooting:**
- "Still getting bot-check?" → Cookies sudah expired, export ulang.
- "Video restricted?" → Coba dengan video publik terlebih dahulu, atau YouTube mungkin
  require akun premium untuk video itu.
- "No formats available?" → yt-dlp mungkin outdated. Jalankan `npm install` untuk update.

Untuk info lebih detail, lihat **`COOKIES_SETUP.md`**.

## ⚠️ Catatan Hukum
Mengunduh video YouTube tunduk pada Terms of Service YouTube. Gunakan tool ini
**hanya untuk konten yang Anda miliki hak ciptanya, Anda punya izin, atau termasuk
fair use.** Anda bertanggung jawab atas penggunaan konten.
