'use strict';

const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');

const {
  OUT_W,
  OUT_H,
  FG_W,
  EDGE_CROP,
  COLOR_GRADE,
  SHARPEN,
  MOTION_BG,
  MOTION_OVERSCAN,
  MOTION_X_PERIOD,
  MOTION_Y_PERIOD,
} = require('./config');

ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * Build the blurred background chain. When motion is enabled the crop window
 * slowly drifts using time-based (sin/cos) expressions, giving a parallax feel
 * without resampling the framerate (only the position animates, size is fixed).
 */
function buildBackgroundChain() {
  if (!MOTION_BG) {
    return (
      `[bgsrc]scale=${OUT_W}:${OUT_H}:force_original_aspect_ratio=increase,` +
      `crop=${OUT_W}:${OUT_H},boxblur=22:2,eq=brightness=-0.16:saturation=1.1[bg]`
    );
  }

  const bw = Math.round(OUT_W * MOTION_OVERSCAN);
  const bh = Math.round(OUT_H * MOTION_OVERSCAN);
  // Drift within the available slack; offset stays inside [0, slack] for all t.
  const x = `(iw-${OUT_W})/2+sin(t/${MOTION_X_PERIOD})*(iw-${OUT_W})/3`;
  const y = `(ih-${OUT_H})/2+cos(t/${MOTION_Y_PERIOD})*(ih-${OUT_H})/3`;
  return (
    `[bgsrc]scale=${bw}:${bh}:force_original_aspect_ratio=increase,` +
    `crop=${OUT_W}:${OUT_H}:x='${x}':y='${y}',` +
    `boxblur=22:2,eq=brightness=-0.16:saturation=1.1[bg]`
  );
}

/**
 * Build the foreground chain: optional edge crop (removes corner watermarks/
 * logos), scale to a fixed width, then color grade + sharpen for a fresh edit.
 */
function buildForegroundChain() {
  const parts = [];
  if (EDGE_CROP > 0) {
    const keep = (1 - 2 * EDGE_CROP).toFixed(4);
    parts.push(`crop=iw*${keep}:ih*${keep}`);
  }
  parts.push(`scale=${FG_W}:-2`, 'setsar=1', COLOR_GRADE, SHARPEN);
  return `[fgsrc]${parts.join(',')}[fg]`;
}

/**
 * Compose the vertical TikTok video: blurred background fill, centered
 * foreground video, plus hook (top) and footer (bottom) PNG overlays.
 *
 * @param {object} args
 * @param {string} args.rawPath    Source video.
 * @param {string} args.outPath    Output mp4 path.
 * @param {string} [args.hookPng]  Hook overlay PNG (optional).
 * @param {string} [args.footerPng] Footer overlay PNG (optional).
 * @param {{height:number}} [args.footerDim] Footer PNG dimensions.
 * @returns {Promise<string>} outPath
 */
function composeVideo({ rawPath, outPath, hookPng, footerPng, footerDim }) {
  return new Promise((resolve, reject) => {
    const command = ffmpeg(rawPath);

    if (hookPng) command.input(hookPng);
    if (footerPng) command.input(footerPng);

    const hookIdx = hookPng ? 1 : null;
    const footerIdx = footerPng ? (hookPng ? 2 : 1) : null;

    const filters = [];
    // Split source into background + foreground.
    filters.push('[0:v]split=2[bgsrc][fgsrc]');
    // Moving blurred background (parallax) that covers the whole canvas.
    filters.push(buildBackgroundChain());
    // Foreground: edge-cropped (anti-watermark), scaled, color-graded + sharpened.
    filters.push(buildForegroundChain());
    // Center foreground over background.
    filters.push('[bg][fg]overlay=(W-w)/2:(H-h)/2[base]');

    let lastLabel = 'base';
    const topMargin = 90;
    // Keep the footer above TikTok's bottom UI safe zone (caption/buttons cover
    // roughly the bottom ~15-18% of the screen, i.e. ~300px of 1920).
    const bottomMargin = 320;

    if (hookPng) {
      filters.push(`[${lastLabel}][${hookIdx}:v]overlay=(W-w)/2:${topMargin}[withhook]`);
      lastLabel = 'withhook';
    }
    if (footerPng) {
      const y = OUT_H - footerDim.height - bottomMargin;
      filters.push(`[${lastLabel}][${footerIdx}:v]overlay=(W-w)/2:${y}[outv]`);
      lastLabel = 'outv';
    }

    if (lastLabel !== 'outv') {
      filters.push(`[${lastLabel}]null[outv]`);
    }

    command
      .complexFilter(filters, 'outv')
      .outputOptions([
        '-map', '0:a?',
        '-map_metadata', '-1', // strip source metadata (avoid "imported" signals)
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', '22',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-r', '30',
        '-movflags', '+faststart',
        '-shortest',
      ])
      .on('error', (err) => reject(new Error(`Proses ffmpeg gagal: ${err.message}`)))
      .on('end', () => resolve(outPath))
      .save(outPath);
  });
}

module.exports = { composeVideo };
