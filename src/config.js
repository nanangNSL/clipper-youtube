'use strict';

const path = require('path');
const fs = require('fs');

// Output dimensions (TikTok / Reels / Shorts vertical 9:16).
const OUT_W = 1080;
const OUT_H = 1920;
const FG_W = 1000; // width of the foreground (source) video inside the canvas

// Maximum clip length in seconds (must cover the largest preset, 5 minutes).
const MAX_CLIP_SECONDS = 300;

// Minimum clip length. TikTok treats "very short" clips as low quality, so we
// refuse anything shorter than this to keep clips eligible for recommendation.
const MIN_CLIP_SECONDS = 5;

// --- Originality / creative-edit settings (anti "unoriginal content" flag) ---
// Crop this fraction off EACH side of the source before composing. Removes
// most corner watermarks/logos and counts as a real edit. 0 disables cropping.
const EDGE_CROP = 0.04;

// Color grading + sharpening applied to the foreground so the result is a fresh,
// re-graded edit rather than a 1:1 copy of the source.
const COLOR_GRADE = 'eq=contrast=1.06:brightness=0.02:saturation=1.12';
const SHARPEN = 'unsharp=5:5:0.7:5:5:0.0';

// Subtle moving (parallax) blurred background. Adds continuous motion so the
// frame is clearly an edit and never reads as a static image.
const MOTION_BG = true;
const MOTION_OVERSCAN = 1.25; // background scaled larger than canvas to allow pan
const MOTION_X_PERIOD = 5; // seconds per horizontal drift cycle
const MOTION_Y_PERIOD = 6; // seconds per vertical drift cycle

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
  MIN_CLIP_SECONDS,
  EDGE_CROP,
  COLOR_GRADE,
  SHARPEN,
  MOTION_BG,
  MOTION_OVERSCAN,
  MOTION_X_PERIOD,
  MOTION_Y_PERIOD,
  DURATION_PRESETS,
  ROOT,
  TEMP_DIR,
  OUTPUT_DIR,
};
