'use strict';

const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');

const { OUT_W, OUT_H, FG_W } = require('./config');

ffmpeg.setFfmpegPath(ffmpegPath);

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
    // Blurred, slightly darkened background that covers the whole canvas.
    filters.push(
      `[bgsrc]scale=${OUT_W}:${OUT_H}:force_original_aspect_ratio=increase,` +
        `crop=${OUT_W}:${OUT_H},boxblur=24:3,eq=brightness=-0.18[bg]`
    );
    // Foreground scaled to a fixed width, height auto (even).
    filters.push(`[fgsrc]scale=${FG_W}:-2[fg]`);
    // Center foreground over background.
    filters.push('[bg][fg]overlay=(W-w)/2:(H-h)/2[base]');

    let lastLabel = 'base';
    const topMargin = 90;
    const bottomMargin = 110;

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
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', '23',
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
