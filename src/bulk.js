'use strict';

const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const archiver = require('archiver');

const { OUTPUT_DIR } = require('./config');
const { createClip } = require('./clip');

// In-memory job store. Suitable for a single-process local tool.
const jobs = new Map();

function getJob(id) {
  return jobs.get(id);
}

/** Public (serializable) view of a job for the API. */
function jobView(job) {
  if (!job) return null;
  return {
    id: job.id,
    status: job.status,
    total: job.total,
    done: job.done,
    succeeded: job.succeeded,
    failed: job.failed,
    zipUrl: job.zipUrl,
    items: job.items.map((it) => ({
      index: it.index,
      title: it.title,
      status: it.status,
      url: it.url || null,
      name: it.name || null,
      error: it.error || null,
    })),
  };
}

/** Build a ZIP of all successfully produced clips for a job. */
function buildZip(job) {
  return new Promise((resolve, reject) => {
    const zipName = `bulk-${job.id}.zip`;
    const zipPath = path.join(OUTPUT_DIR, zipName);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 6 } });

    output.on('close', () => resolve(`/output/${zipName}`));
    archive.on('error', reject);
    archive.pipe(output);

    for (const it of job.items) {
      if (it.status === 'done' && it.file && fs.existsSync(it.file)) {
        archive.file(it.file, { name: it.name });
      }
    }
    archive.finalize();
  });
}

/** Process all rows of a job sequentially, updating progress as it goes. */
async function runJob(job, rows) {
  for (const item of job.items) {
    const row = rows[item.index];
    item.status = 'processing';
    try {
      const result = await createClip({
        url: row.url,
        start: row.start,
        duration: row.duration,
        end: row.end,
        hook: row.hook,
        footer: row.footer,
        outName: row.title || `clip-${item.index + 1}`,
      });
      item.status = 'done';
      item.url = result.url;
      item.name = result.name;
      item.file = result.file;
      job.succeeded += 1;
    } catch (err) {
      item.status = 'error';
      item.error = err.message;
      job.failed += 1;
    }
    job.done += 1;
  }

  if (job.succeeded > 0) {
    try {
      job.zipUrl = await buildZip(job);
    } catch (err) {
      job.zipError = err.message;
    }
  }
  job.status = 'completed';
}

/**
 * Create a bulk job from parsed CSV rows and start processing it (async).
 * @param {Array<object>} rows
 * @returns {object} initial job view
 */
function createBulkJob(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('Tidak ada baris data pada CSV.');
  }
  const id = uuidv4();
  const job = {
    id,
    status: 'processing',
    total: rows.length,
    done: 0,
    succeeded: 0,
    failed: 0,
    zipUrl: null,
    items: rows.map((row, index) => ({
      index,
      title: row.title || `clip-${index + 1}`,
      status: 'queued',
    })),
  };
  jobs.set(id, job);

  // Fire and forget; progress is polled via getJob.
  runJob(job, rows).catch((err) => {
    job.status = 'completed';
    job.fatalError = err.message;
  });

  return jobView(job);
}

module.exports = { createBulkJob, getJob, jobView };
