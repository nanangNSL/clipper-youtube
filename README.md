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
```

Solusinya: berikan **cookies YouTube** ke yt-dlp.

**Cara export cookies (sekali setup):**
1. Gunakan **akun YouTube sekunder** (bukan akun utama — akun yang dipakai bisa
   kena rate-limit).
2. Buka jendela **private/incognito** di browser, login ke youtube.com.
3. Export cookies domain youtube.com ke format **Netscape `cookies.txt`**
   (pakai extension seperti "Get cookies.txt LOCALLY").
4. **Tutup jendela private tersebut** tanpa logout — ini mencegah browser
   me-rotate cookies sehingga cookies tetap valid lebih lama.

**Pasang di server (pilih salah satu):**
- **Upload lewat web UI** — buka tab **🍪 Cookies** di aplikasi, upload file
  `cookies.txt` hasil export. Status terpasang/tidak terlihat di tab yang sama.
- Set env `YTDLP_COOKIES=/path/ke/cookies.txt` (prioritas tertinggi, menimpa
  hasil upload), atau
- Taruh file `cookies.txt` di root project secara manual (sudah masuk
  `.gitignore` — **jangan pernah commit file ini**, isinya setara password akun).

**Tambahan:**
- Pastikan yt-dlp versi terbaru — binary lama lebih sering kena bot-check.
  Jalankan ulang `npm install` di server (youtube-dl-exec mengunduh release
  terbaru saat install).
- Tanpa cookies, app otomatis retry dengan player client alternatif
  (`tv_simply`, `tv_embedded`) — kadang lolos, tapi tidak dijamin di IP datacenter.
- Jika cookies mulai ditolak lagi, export ulang dengan langkah di atas.

## ⚠️ Catatan Hukum
Mengunduh video YouTube tunduk pada Terms of Service YouTube. Gunakan tool ini
**hanya untuk konten yang Anda miliki hak ciptanya, Anda punya izin, atau termasuk
fair use.** Anda bertanggung jawab atas penggunaan konten.
