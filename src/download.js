'use strict';

const path = require('path');
const fs = require('fs');
const youtubedl = require('youtube-dl-exec');
const ffmpegPath = require('ffmpeg-static');

const { TEMP_DIR } = require('./config');

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

  await youtubedl(url, {
    output: rawPath,
    format: 'bv*[ext=mp4]+ba[ext=m4a]/bv*+ba/b[ext=mp4]/b',
    mergeOutputFormat: 'mp4',
    downloadSections: `*${toTimestamp(start)}-${toTimestamp(end)}`,
    forceKeyframesAtCuts: true,
    noPlaylist: true,
    noWarnings: true,
    ffmpegLocation: path.dirname(ffmpegPath),
  });

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

module.exports = { isValidYouTubeUrl, toTimestamp, downloadSegment };
