'use strict';

const path = require('path');
const fs = require('fs');
const youtubedl = require('youtube-dl-exec');
const ffmpegPath = require('ffmpeg-static');

const { ROOT, TEMP_DIR } = require('./config');

// YouTube blocks unauthenticated requests from datacenter IPs with this check.
const BOT_CHECK_RE = /sign in to confirm|confirm you'?re not a bot|use --cookies/i;

// Player clients to retry with when the default client hits the bot check.
// These TV clients currently work without a PO token more often than web/android.
const FALLBACK_CLIENTS = ['tv_simply', 'tv_embedded'];

/**
 * Resolve a Netscape-format cookies.txt to authenticate yt-dlp with.
 * Priority: env YTDLP_COOKIES (absolute path) → <project root>/cookies.txt.
 * @returns {string|null}
 */
function resolveCookiesFile() {
  const fromEnv = (process.env.YTDLP_COOKIES || '').trim();
  if (fromEnv) {
    if (fs.existsSync(fromEnv)) return fromEnv;
    console.warn(`[download] YTDLP_COOKIES diset tapi file tidak ada: ${fromEnv}`);
  }
  const local = path.join(ROOT, 'cookies.txt');
  if (fs.existsSync(local)) return local;
  return null;
}

function isBotCheckError(err) {
  const text = `${err && err.stderr ? err.stderr : ''}\n${err && err.message ? err.message : ''}`;
  return BOT_CHECK_RE.test(text);
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
  if (cookies) baseOptions.cookies = cookies;

  // Attempt 1 uses yt-dlp's default client; on a bot-check error, retry with
  // alternative player clients before giving up.
  const attempts = [null, ...FALLBACK_CLIENTS];
  let lastError = null;

  for (const client of attempts) {
    const options = client
      ? { ...baseOptions, extractorArgs: `youtube:player_client=${client}` }
      : baseOptions;
    try {
      await youtubedl(url, options);
      lastError = null;
      break;
    } catch (err) {
      lastError = err;
      if (!isBotCheckError(err)) throw err;
      console.warn(
        `[download] Bot-check YouTube${client ? ` (client=${client})` : ''}, ` +
          `mencoba client berikutnya...`
      );
    }
  }

  if (lastError) {
    throw new Error(
      'YouTube memblokir server ini (bot-check). ' +
        (cookies
          ? 'Cookies terpasang tapi ditolak — export ulang cookies.txt dari sesi login yang masih aktif.'
          : 'Pasang cookies YouTube: set env YTDLP_COOKIES ke path cookies.txt, ' +
            'atau taruh cookies.txt di root project. Lihat README bagian "Deploy Production".')
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
