'use strict';

const path = require('path');
const fs = require('fs');

// Output dimensions (TikTok / Reels / Shorts vertical 9:16).
const OUT_W = 1080;
const OUT_H = 1920;
const FG_W = 1000; // width of the foreground (source) video inside the canvas

// Maximum clip length in seconds (must cover the largest preset, 5 minutes).
const MAX_CLIP_SECONDS = 300;

// Selectable duration presets shown in the UI.
const DURATION_PRESETS = [
  { label: '15 detik', value: 15 },
  { label: '60 detik', value: 60 },
  { label: '5 menit', value: 300 },
];

const ROOT = path.join(__dirname, '..');
const TEMP_DIR = path.join(ROOT, 'temp');
const OUTPUT_DIR = path.join(ROOT, 'public', 'output');

for (const dir of [TEMP_DIR, OUTPUT_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}

module.exports = {
  OUT_W,
  OUT_H,
  FG_W,
  MAX_CLIP_SECONDS,
  DURATION_PRESETS,
  ROOT,
  TEMP_DIR,
  OUTPUT_DIR,
};
