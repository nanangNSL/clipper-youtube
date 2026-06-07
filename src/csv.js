'use strict';

/**
 * Minimal RFC-4180-ish CSV parser. Handles quoted fields, embedded commas,
 * escaped quotes (""), CRLF/LF line endings, and a leading UTF-8 BOM.
 * @param {string} text
 * @returns {string[][]} rows of string cells
 */
function parseCsvRaw(text) {
  const src = String(text).replace(/^﻿/, '');
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < src.length; i++) {
    const c = src[i];

    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (c === '\r') {
      // ignore; handled by \n
    } else {
      field += c;
    }
  }
  // Flush last field/row if any content remains.
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/**
 * Parse CSV text into an array of objects keyed by the header row.
 * Expected headers (case-insensitive): url, start, duration, hook, footer, title.
 * @param {string} text
 * @returns {Array<object>}
 */
function parseCsv(text) {
  const rows = parseCsvRaw(text).filter((r) => r.some((c) => c.trim() !== ''));
  if (rows.length < 2) {
    throw new Error('CSV kosong atau hanya berisi header.');
  }
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  return rows.slice(1).map((cells) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = (cells[i] ?? '').trim();
    });
    return obj;
  });
}

const TEMPLATE_CSV = [
  'url,start,duration,hook,footer,title',
  'https://www.youtube.com/watch?v=aqz-KE-bpKQ,10,15,TUNGGU SAMPAI AKHIR!,Follow untuk part 2,Klip Pertama',
  'https://www.youtube.com/watch?v=aqz-KE-bpKQ,40,60,Bagian paling seru,Like & Share,Klip Kedua',
  'https://www.youtube.com/watch?v=aqz-KE-bpKQ,120,300,Full scene,Subscribe ya,Klip Panjang',
  '',
].join('\n');

module.exports = { parseCsv, parseCsvRaw, TEMPLATE_CSV };
