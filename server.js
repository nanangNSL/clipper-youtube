'use strict';

const path = require('path');
const fs = require('fs');
const express = require('express');
const multer = require('multer');

const { ROOT, MAX_CLIP_SECONDS, DURATION_PRESETS } = require('./src/config');
const { resolveCookiesFile } = require('./src/download');
const { createClip } = require('./src/clip');
const { parseCsv, TEMPLATE_CSV } = require('./src/csv');
const { createBulkJob, getJob, jobView } = require('./src/bulk');

const app = express();
const PORT = process.env.PORT || 3000;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB CSV is plenty
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Config for the frontend (presets, limits).
app.get('/api/config', (req, res) => {
  res.json({ maxClipSeconds: MAX_CLIP_SECONDS, durationPresets: DURATION_PRESETS });
});

// Single clip.
app.post('/api/clip', async (req, res) => {
  const { url, start, end, duration, hook, footer, title } = req.body || {};
  try {
    const result = await createClip({
      url,
      start,
      end,
      duration,
      hook,
      footer,
      outName: title,
    });
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('[clip error]', err.message);
    res.status(400).json({ ok: false, error: err.message });
  }
});

// Download a ready-made CSV template.
app.get('/api/template.csv', (req, res) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="bulk-template.csv"');
  res.send(TEMPLATE_CSV);
});

// Start a bulk job from an uploaded CSV.
app.post('/api/bulk', upload.single('csv'), (req, res) => {
  try {
    if (!req.file) throw new Error('File CSV tidak ditemukan.');
    const rows = parseCsv(req.file.buffer.toString('utf8'));
    const job = createBulkJob(rows);
    res.json({ ok: true, job });
  } catch (err) {
    console.error('[bulk error]', err.message);
    res.status(400).json({ ok: false, error: err.message });
  }
});

// ---------- Cookies (auth yt-dlp untuk bypass bot-check YouTube) ----------
const LOCAL_COOKIES = path.join(ROOT, 'cookies.txt');

/** Reject files that are clearly not a Netscape cookies.txt with YouTube cookies. */
function validateCookiesContent(text) {
  if (/\x00/.test(text)) return 'File bukan teks (binary). Export ulang sebagai cookies.txt.';
  const hasNetscapeRows = text
    .split(/\r?\n/)
    .some((line) => !line.startsWith('#') && line.split('\t').length >= 7);
  if (!hasNetscapeRows && !/^# (Netscape|HTTP Cookie)/im.test(text)) {
    return 'Format tidak dikenali. Gunakan format Netscape cookies.txt (extension "Get cookies.txt LOCALLY").';
  }
  if (!/youtube\.com/i.test(text)) {
    return 'Tidak ada cookie domain youtube.com di file ini. Export saat berada di youtube.com.';
  }
  return null;
}

function cookiesStatus() {
  const active = resolveCookiesFile();
  const envPath = (process.env.YTDLP_COOKIES || '').trim();
  const status = {
    installed: Boolean(active),
    source: null, // 'env' | 'upload'
    envOverride: Boolean(envPath && fs.existsSync(envPath)),
    uploadedAt: null,
  };
  if (active) status.source = active === LOCAL_COOKIES ? 'upload' : 'env';
  if (fs.existsSync(LOCAL_COOKIES)) {
    status.uploadedAt = fs.statSync(LOCAL_COOKIES).mtime.toISOString();
  }
  return status;
}

app.get('/api/cookies', (req, res) => {
  res.json({ ok: true, ...cookiesStatus() });
});

app.post('/api/cookies', upload.single('cookies'), (req, res) => {
  try {
    if (!req.file) throw new Error('File cookies tidak ditemukan.');
    const text = req.file.buffer.toString('utf8');
    const invalid = validateCookiesContent(text);
    if (invalid) throw new Error(invalid);
    fs.writeFileSync(LOCAL_COOKIES, text, 'utf8');
    res.json({ ok: true, ...cookiesStatus() });
  } catch (err) {
    console.error('[cookies error]', err.message);
    res.status(400).json({ ok: false, error: err.message });
  }
});

app.delete('/api/cookies', (req, res) => {
  try {
    if (fs.existsSync(LOCAL_COOKIES)) fs.unlinkSync(LOCAL_COOKIES);
    res.json({ ok: true, ...cookiesStatus() });
  } catch (err) {
    console.error('[cookies error]', err.message);
    res.status(400).json({ ok: false, error: err.message });
  }
});

// Poll a bulk job's progress.
app.get('/api/bulk/:id', (req, res) => {
  const job = getJob(req.params.id);
  if (!job) return res.status(404).json({ ok: false, error: 'Job tidak ditemukan.' });
  res.json({ ok: true, job: jobView(job) });
});

app.listen(PORT, () => {
  console.log(`\n  ▶  YouTube → TikTok Clipper berjalan di http://localhost:${PORT}\n`);
});
