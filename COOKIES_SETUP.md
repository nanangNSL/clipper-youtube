# YouTube Cookies Setup Guide

## Kenapa Cookies Diperlukan?

YouTube memblokir request otomatis dari datacenter dengan "bot check". Untuk bypass ini, yt-dlp membutuhkan cookies dari browser yang sudah login ke YouTube.

## Cara Extract Cookies dari Chrome/Edge

### Option 1: Menggunakan Browser Extension (Paling Mudah)

1. Install extension **"Get cookies.txt LOCALLY"** dari Chrome Web Store
   - Link: https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndcbcohhnpnklcekhpgbkmdecke

2. Buka YouTube.com dan login ke akun Anda
3. Klik extension icon → "Export cookies for this site"
4. Save file sebagai `cookies.txt`
5. Ganti isi `cookies.txt` di project root

### Option 2: Manual Export via DevTools

1. Login ke YouTube.com di Chrome/Edge
2. Buka DevTools (F12 → Application/Storage tab)
3. Pilih Cookies → https://www.youtube.com
4. Cari cookies penting:
   - `__Secure-1PSID`
   - `__Secure-1PSIDTS`
   - `VISITOR_INFO1_LIVE`
   - `CONSISTENCY`

5. Format Netscape-style (manual) atau gunakan extension

### Option 3: Automated Script (Linux/Mac only)

```bash
# Requires: sqlite3, grep
sqlite_path="$HOME/.config/google-chrome/Default/Cookies"
sqlite3 "$sqlite_path" <<EOF
.mode csv
SELECT host_key, secure, path, secure, expiration_utc, name, value
FROM cookies
WHERE host_key LIKE '%youtube%'
EOF
```

## Format Cookies.txt (Netscape)

File harus berupa plain text dengan format:
```
# Netscape HTTP Cookie File
# This is a generated file!  Do not edit.

.youtube.com	TRUE	/	TRUE	1805262940	__Secure-1PSID	<value>
.youtube.com	TRUE	/	TRUE	1805262940	__Secure-1PSIDTS	<value>
```

**Kolom:**
1. Domain
2. Flag (TRUE/FALSE untuk include subdomain)
3. Path
4. Secure flag (TRUE/FALSE)
5. Expiration (Unix timestamp)
6. Name
7. Value

## Production Deployment

### Option A: Use Environment Variable

```bash
# Di server production
export YTDLP_COOKIES=/home/app/secrets/cookies.txt

# Atau di .env file
YTDLP_COOKIES=/path/to/cookies.txt
```

### Option B: Keep cookies.txt di Project

```bash
# Commit (dengan caution, karena sensitive)
git add cookies.txt

# Atau gunakan .env + .gitignore
echo "YTDLP_COOKIES=/path/to/cookies.txt" > .env
echo ".env" >> .gitignore
```

## Testing

```bash
# Di project root, test dengan:
npm start

# Atau test langsung yt-dlp:
npx youtube-dl-exec https://www.youtube.com/watch?v=VIDEO_ID \
  --cookies cookies.txt \
  --list-formats

# Jika berhasil, akan list format video tersedia
```

## Troubleshooting

### "Still getting bot-check error"
- **Cookies sudah expired?** → Extract ulang cookies baru
- **Video dari channel yang restricted?** → YouTube mungkin require login dengan account yang subscribe
- **yt-dlp outdated?** → Run `npm install` untuk update binary

### "Cookies ditolak"
- Cookies mungkin dari incognito window atau private browser
- Pastikan sudah login ke YouTube sebelum export
- Coba di-export dari browser yang sama saat membuat akun

### "No formats available"
- Video mungkin require login dengan account premium (YouTube Music, YouTube Premium)
- Coba dengan video publik test terlebih dahulu

## Refresh Schedule

YouTube cookies biasanya expired dalam 30-90 hari. Untuk production:
- Set reminder setiap bulan untuk refresh cookies
- Atau setup automated CI/CD untuk detect dan alert "cookies akan expired"

## Security Note

⚠️ **PENTING:** Cookies file berisi session authentication. Jangan commit ke GitHub public repo.
Gunakan:
```bash
echo "cookies.txt" >> .gitignore
echo "cookies.txt.bak" >> .gitignore
```

Untuk share dengan team, gunakan password-protected file atau env variable di CI/CD secrets.
