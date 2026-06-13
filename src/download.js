'use strict';

const path = require('path');
const fs = require('fs');
const youtubedl = require('youtube-dl-exec');
const ffmpegPath = require('ffmpeg-static');

const { ROOT, TEMP_DIR } = require('./config');

// YouTube blocks unauthenticated requests from datacenter IPs with this check.
const BOT_CHECK_RE = /sign in to confirm|confirm you'?re not a bot|use --cookies/i;

// A client can pass extraction yet receive zero usable formats (YouTube withholds
// them when a PO token is required) — yt-dlp then fails format selection.
const NO_FORMATS_RE =
  /requested format is not available|no video formats found|only images are available/i;

// googlevideo intermittently rejects a signed stream URL with 403 when ffmpeg
// opens it; a retry (other client = freshly signed URL) usually goes through.
const STREAM_403_RE = /HTTP error 403|403 Forbidden|ffmpeg exited with code/i;

// Player clients to retry with when the default client hits the bot check,
// gets no formats, or its stream URL is rejected. android_vr first: it still
// receives formats without a PO token or JS runtime.
const FALLBACK_CLIENTS = ['android_vr', 'tv_simply', 'tv_embedded', 'web_safari'];

// YouTube's rejections are time-flaky: the same request can fail and then
// succeed minutes later, so walk the client list more than once with a pause.
const RETRY_ROUNDS = 2;
const RETRY_DELAY_MS = 3000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Check if cookies file appears to be expired (heuristic based on modification time).
 * If file is older than 60 days, likely expired.
 * @param {string} cookiesPath - path to cookies file
 * @returns {boolean}
 */
function appearsCookiesExpired(cookiesPath) {
  if (!fs.existsSync(cookiesPath)) return false;
  const stat = fs.statSync(cookiesPath);
  const ageMs = Date.now() - stat.mtime.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return ageDays > 60; // YouTube cookies typically live ~30-90 days
}

/**
 * Resolve a Netscape-format cookies.txt to authenticate yt-dlp with.
 * Priority: env YTDLP_COOKIES (absolute path) → <project root>/cookies.txt.
 * @returns {string|null}
 */
function resolveCookiesFile() {
  const fromEnv = (process.env.YTDLP_COOKIES || '').trim();
  if (fromEnv) {
    if (fs.existsSync(fromEnv)) {
      if (appearsCookiesExpired(fromEnv)) {
        console.warn(
          `[download] YTDLP_COOKIES file tua (>60 hari), mungkin sudah expired: ${fromEnv}. ` +
          'Coba export ulang dari browser ke COOKIES_SETUP.md.'
        );
      }
      return fromEnv;
    }
    console.warn(`[download] YTDLP_COOKIES diset tapi file tidak ada: ${fromEnv}`);
  }
  const local = path.join(ROOT, 'cookies.txt');
  if (fs.existsSync(local)) {
    if (appearsCookiesExpired(local)) {
      console.warn(
        `[download] cookies.txt tua (>60 hari), mungkin sudah expired. ` +
        'Lihat COOKIES_SETUP.md untuk extract cookies baru dari browser.'
      );
    }
    return local;
  }
  return null;
}

function errorText(err) {
  return `${err && err.stderr ? err.stderr : ''}\n${err && err.message ? err.message : ''}`;
}

function isBotCheckError(err) {
  return BOT_CHECK_RE.test(errorText(err));
}

function isNoFormatsError(err) {
  return NO_FORMATS_RE.test(errorText(err));
}

function isStream403Error(err) {
  return STREAM_403_RE.test(errorText(err));
}

function isValidYouTubeUrl(url) {
  return /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/|live\/)|youtu\.be\/)[\w\-]+/i.test(
    String(url || '').trim()
  );
}

/** Convert seconds (number) to HH:MM:SS for yt-dlp download-sections. */
function toTimestamp(seconds) {
  const s = Math.max(0, Number(seconds) || 0);
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = Math.floor(s % 60);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
}

/**
 * Run yt-dlp with the default client, then each fallback client, for the given
 * number of rounds. Returns null on success, or the last retryable error.
 * Non-retryable errors are thrown immediately.
 */
async function tryAllClients(url, baseOptions, rounds) {
  const attempts = [null, ...FALLBACK_CLIENTS];
  let lastError = null;

  for (let round = 1; round <= rounds; round++) {
    for (const client of attempts) {
      const options = client
        ? { ...baseOptions, extractorArgs: `youtube:player_client=${client}` }
        : baseOptions;
      try {
        await youtubedl(url, options);
        return null;
      } catch (err) {
        lastError = err;
        const retryable = isBotCheckError(err) || isNoFormatsError(err) || isStream403Error(err);
        if (!retryable) throw err;
        const reason = isBotCheckError(err)
          ? 'Bot-check YouTube'
          : isNoFormatsError(err)
          ? 'Tidak ada format tersedia'
          : 'Stream ditolak (403)';
        console.warn(
          `[download] ${reason}${client ? ` (client=${client})` : ''} ` +
            `[ronde ${round}/${rounds}], mencoba lagi...`
        );
        await sleep(RETRY_DELAY_MS);
      }
    }
  }
  return lastError;
}

/**
 * Download a [start, end] section of a YouTube video as an mp4 file.
 * @returns {Promise<string>} path to the downloaded raw mp4
 */
async function downloadSegment(url, start, end, id) {
  const rawPath = path.join(TEMP_DIR, `${id}-raw.mp4`);

  const baseOptions = {
    output: rawPath,
    format: 'bv*[ext=mp4]+ba[ext=m4a]/bv*+ba/b[ext=mp4]/b',
    mergeOutputFormat: 'mp4',
    downloadSections: `*${toTimestamp(start)}-${toTimestamp(end)}`,
    forceKeyframesAtCuts: true,
    noPlaylist: true,
    noWarnings: true,
    ffmpegLocation: path.dirname(ffmpegPath),
  };

  const cookies = resolveCookiesFile();

  // With cookies: one round only — if YouTube rejects the cookies, every client
  // fails the same way and it is faster to drop the cookies than to re-walk
  // the whole client list. Without cookies: the failures are time-flaky, so
  // walk the list twice.
  let lastError = null;
  if (cookies) {
    lastError = await tryAllClients(url, { ...baseOptions, cookies }, 1);
    if (lastError) {
      console.warn(
        '[download] Semua percobaan DENGAN cookies gagal — cookies kemungkinan ' +
          'rusak/kadaluarsa. Mencoba ulang tanpa cookies...'
      );
      lastError = await tryAllClients(url, baseOptions, RETRY_ROUNDS);
      if (!lastError) {
        console.warn(
          '[download] Berhasil TANPA cookies. Hapus atau export ulang cookies.txt — ' +
            'file yang terpasang ditolak YouTube.'
        );
      }
    }
  } else {
    lastError = await tryAllClients(url, baseOptions, RETRY_ROUNDS);
  }

  if (lastError) {
    if (isStream403Error(lastError) && !isBotCheckError(lastError) && !isNoFormatsError(lastError)) {
      throw new Error(
        'YouTube menolak stream video (403) di semua client — biasanya gangguan sementara. ' +
          'Coba lagi beberapa saat, atau jalankan `npm run update-ytdlp` di server.'
      );
    }
    if (isNoFormatsError(lastError) && !isBotCheckError(lastError)) {
      throw new Error(
        'YouTube tidak memberikan format video ke server ini (semua client dicoba). ' +
          'Biasanya karena yt-dlp kadaluarsa — jalankan ulang `npm install` di server ' +
          'untuk update binary yt-dlp' +
          (cookies ? ', dan coba export ulang cookies.txt.' : ', dan pasang cookies YouTube (tab Cookies).')
      );
    }
    // Bot-check error — primary issue for this user
    const cookieStatus = cookies ? '(dengan cookies terpasang)' : '(tanpa cookies)';
    const cookieMsg = cookies
      ? `Cookies terpasang di ${cookies} tapi ditolak YouTube. Kemungkinan penyebab:
        1. Cookies sudah EXPIRED (>60 hari lalu). Extract ulang dari browser. Lihat COOKIES_SETUP.md.
        2. Cookies dari private/incognito window. Export dari regular browser yang sudah login.
        3. Cookies dari berbeda browser/device. Gunakan cookies dari saat biasanya pakai YouTube.
        
        Langkah: Buka https://www.youtube.com login, buka COOKIES_SETUP.md untuk ekstrak cookies baru.`
      : `Tidak ada cookies dipasang. YouTube memblokir request dari server tanpa authentication.
        Langkah: 
        1. Buka COOKIES_SETUP.md untuk panduan extract cookies dari browser.
        2. Simpan di ./cookies.txt atau set env YTDLP_COOKIES=/path/to/cookies.txt
        3. Coba download lagi.`;
    
    throw new Error(
      `YouTube bot-check block ${cookieStatus}.\n${cookieMsg}`
    );
  }

  if (!fs.existsSync(rawPath)) {
    // Fallback: yt-dlp sometimes appends the real extension.
    const base = path.basename(rawPath).replace(/\.mp4$/, '');
    const found = fs
      .readdirSync(TEMP_DIR)
      .find((f) => f.startsWith(base) && f !== path.basename(rawPath));
    if (found) return path.join(TEMP_DIR, found);
    throw new Error('Download gagal: file segmen tidak ditemukan.');
  }
  return rawPath;
}

module.exports = { isValidYouTubeUrl, toTimestamp, downloadSegment, resolveCookiesFile };
