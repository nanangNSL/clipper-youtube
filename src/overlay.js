'use strict';

const sharp = require('sharp');

/**
 * Escape text for safe inclusion inside SVG.
 */
function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Naive word-wrap based on an estimated max characters per line.
 * Good enough for overlay captions; breaks very long words too.
 */
function wrapText(text, maxChars) {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);

    if (word.length > maxChars) {
      // Hard-break an over-long word.
      let rest = word;
      while (rest.length > maxChars) {
        lines.push(rest.slice(0, maxChars));
        rest = rest.slice(maxChars);
      }
      current = rest;
    } else {
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

/**
 * Render a caption block (hook or footer) to a transparent PNG file.
 *
 * @param {string} text       The caption text.
 * @param {object} opts
 * @param {number} opts.width        Canvas width (match video width, e.g. 1080).
 * @param {number} opts.fontSize     Font size in px.
 * @param {string} opts.outPath      Where to write the PNG.
 * @param {string} [opts.color]      Text fill color.
 * @param {string} [opts.bgColor]    Background pill color (rgba).
 * @param {boolean}[opts.bold]       Bold text.
 * @param {number} [opts.padding]    Inner vertical padding.
 * @returns {Promise<{width:number,height:number}>}
 */
async function renderTextPng(text, opts) {
  const {
    width = 1080,
    fontSize = 64,
    outPath,
    color = '#ffffff',
    bgColor = 'rgba(0,0,0,0.55)',
    bold = true,
    padding = 32,
  } = opts;

  const sideMargin = 24;
  const innerPad = 28;
  const usableWidth = width - 2 * sideMargin - 2 * innerPad;
  const avgCharWidth = fontSize * 0.56;
  const maxChars = Math.max(6, Math.floor(usableWidth / avgCharWidth));

  const lines = wrapText(text, maxChars);
  const lineHeight = Math.round(fontSize * 1.25);
  const textBlockHeight = lines.length * lineHeight;
  const height = textBlockHeight + padding * 2;

  const tspans = lines
    .map(
      (line, i) =>
        `<tspan x="${width / 2}" dy="${i === 0 ? fontSize : lineHeight}">${escapeXml(line)}</tspan>`
    )
    .join('');

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect x="${sideMargin}" y="0" width="${width - 2 * sideMargin}" height="${height}"
        rx="28" ry="28" fill="${bgColor}"/>
  <text x="${width / 2}" y="${padding}"
        font-family="'Segoe UI', Arial, Helvetica, sans-serif"
        font-size="${fontSize}" font-weight="${bold ? '700' : '400'}"
        fill="${color}" text-anchor="middle"
        stroke="#000000" stroke-width="3" paint-order="stroke">${tspans}</text>
</svg>`;

  await sharp(Buffer.from(svg)).png().toFile(outPath);
  return { width, height };
}

module.exports = { renderTextPng, wrapText, escapeXml };
