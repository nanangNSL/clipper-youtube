# 🎬 YouTube → TikTok Clipper (Web)

Tool berbasis web untuk memotong video dari URL YouTube dan mengubahnya menjadi
format video vertikal **TikTok / Reels / Shorts (1080×1920, 9:16)**, lengkap dengan
**Hook Title** (teks di atas) dan **Footer** (teks di bawah).

## ✨ Fitur
- Input URL YouTube + waktu mulai & selesai (detik)
- Output otomatis 9:16 dengan background blur + video di tengah
- Overlay **hook title** (atas) dan **footer** (bawah), word-wrap otomatis
- Preview langsung di browser + tombol download
- Binary `yt-dlp` & `ffmpeg` di-bundle via npm (tanpa install manual)

## 📦 Persyaratan
- Node.js v18+ (terdeteksi v20 di mesin ini)

## 🚀 Cara Pakai
```bash
npm install      # mengunduh dependency + binary yt-dlp & ffmpeg
npm start        # menjalankan server
```
Lalu buka **http://localhost:3000** di browser.

1. Tempel URL YouTube.
2. Isi waktu **Mulai** dan **Selesai** (dalam detik). Maks 180 detik per klip.
3. (Opsional) Isi **Hook Title** dan **Footer**.
4. Klik **Buat Klip TikTok** → tunggu proses → preview & download.

## 🗂️ Struktur
```
server.js          # Express server + endpoint /api/clip
src/processor.js   # download segmen + compose 9:16 + overlay (ffmpeg)
src/overlay.js     # render teks hook/footer jadi PNG (sharp/SVG)
public/            # frontend (index.html, style.css, app.js)
temp/              # file sementara (auto-bersih)
public/output/     # hasil video .mp4
```

## ⚙️ Konfigurasi
- Port: set env `PORT` (default `3000`).
- Durasi maksimal klip: konstanta `MAX_CLIP_SECONDS` di `src/processor.js`.

## ⚠️ Catatan Hukum
Mengunduh video YouTube tunduk pada Terms of Service YouTube. Gunakan tool ini
**hanya untuk konten yang Anda miliki hak ciptanya, Anda punya izin, atau termasuk
fair use.** Anda bertanggung jawab atas penggunaan konten.
