# 🚀 IMMEDIATE FIX: YouTube Bot-Check Error

Your cookies are **EXPIRED**. Here's the step-by-step fix:

## ✅ Step 1: Export Fresh Cookies (5 min)

### Fastest Method (Using Extension)

1. **Install Extension**: Open Chrome/Edge → go to [Get cookies.txt LOCALLY](https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndcbcohhnpnklcekhpgbkmdecke)
   - Click "Add to Chrome" button

2. **Login to YouTube**: 
   - Preferably use a **secondary YouTube account** (not your main one)
   - Or use **Incognito/Private window** with your main account
   - Go to https://www.youtube.com and make sure you're logged in

3. **Export Cookies**:
   - Click the extension icon in top-right corner
   - Select "Export cookies for this site"
   - File `cookies.txt` akan di-download

4. **Copy to Project**:
   - Drag the downloaded `cookies.txt` to your project root folder
   - It will replace the old expired cookies

## ✅ Step 2: Verify Fix (1 min)

Try downloading a video again:

1. Open http://localhost:3000 (or your server)
2. Paste a YouTube URL (try a public video first)
3. Set start/end times
4. Click "Buat Klip TikTok"
5. If it downloads successfully → **DONE!** ✅

## ⚠️ If Still Getting Error

The new cookies might also be expired/invalid. Try:

```bash
# Clear old cookies
rm cookies.txt

# Try without cookies (may work for some videos)
npm start

# If that fails, export fresh cookies again
# Make sure you're logged into YouTube before exporting
```

## 📝 Prevention (Set Reminder)

**YouTube cookies expire every 30-90 days**. To avoid this in future:

- Set a calendar reminder every month to **refresh cookies**
- For production servers: automate cookie refresh or use a monitoring script

## 🔗 For Detailed Guide

See **`COOKIES_SETUP.md`** in project root for:
- Browser extension instructions (detailed)
- Manual DevTools export method
- Linux/Mac automated scripts
- Production deployment guidance
- Security notes on handling cookies

---

**That's it!** Once fresh cookies are in place, YouTube authentication should work. 🎉
