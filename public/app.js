'use strict';

let maxClipSeconds = 300;
let durationPresets = [
  { label: '15 detik', value: 15 },
  { label: '60 detik', value: 60 },
  { label: '5 menit', value: 300 },
];
let selectedDuration = 15;

const $ = (id) => document.getElementById(id);

// ---------- Tabs ----------
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    const target = tab.dataset.tab;
    $('panel-single').classList.toggle('hidden', target !== 'single');
    $('panel-bulk').classList.toggle('hidden', target !== 'bulk');
  });
});

// ---------- Config ----------
fetch('/api/config')
  .then((r) => r.json())
  .then((cfg) => {
    if (cfg.maxClipSeconds) maxClipSeconds = cfg.maxClipSeconds;
    if (Array.isArray(cfg.durationPresets) && cfg.durationPresets.length) {
      durationPresets = cfg.durationPresets;
    }
    renderPresets();
  })
  .catch(renderPresets);

function renderPresets() {
  const wrap = $('presets');
  wrap.innerHTML = '';
  const options = [...durationPresets, { label: 'Custom', value: 'custom' }];
  selectedDuration = durationPresets[0] ? durationPresets[0].value : 15;

  options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'preset' + (i === 0 ? ' active' : '');
    btn.textContent = opt.label;
    btn.dataset.value = opt.value;
    btn.addEventListener('click', () => {
      wrap.querySelectorAll('.preset').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      if (opt.value === 'custom') {
        $('custom-dur-wrap').classList.remove('hidden');
        selectedDuration = Number($('custom-duration').value) || 30;
      } else {
        $('custom-dur-wrap').classList.add('hidden');
        selectedDuration = opt.value;
      }
      updateDurationHint();
    });
    wrap.appendChild(btn);
  });
  updateDurationHint();
}

$('custom-duration').addEventListener('input', () => {
  selectedDuration = Number($('custom-duration').value) || 0;
  updateDurationHint();
});

function updateDurationHint() {
  const hint = $('duration-hint');
  const dur = Number(selectedDuration) || 0;
  if (dur <= 0) {
    hint.textContent = 'Durasi harus lebih dari 0 detik.';
    hint.style.color = '#ffb4c0';
  } else if (dur > maxClipSeconds) {
    hint.textContent = `Durasi ${dur}s melebihi batas ${maxClipSeconds}s.`;
    hint.style.color = '#ffb4c0';
  } else {
    hint.textContent = `Durasi klip: ${dur} detik (maks ${maxClipSeconds}s).`;
    hint.style.color = '';
  }
}

function setStatus(el, type, message) {
  el.className = `status ${type}`;
  el.innerHTML = message;
  el.classList.remove('hidden');
}

// ---------- Single clip ----------
$('clip-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const statusEl = $('status');
  const submitBtn = $('submit-btn');

  const payload = {
    url: $('url').value.trim(),
    start: Number($('start').value),
    duration: Number(selectedDuration),
    hook: $('hook').value,
    footer: $('footer').value,
    title: $('title').value,
  };

  if (!payload.duration || payload.duration <= 0) {
    setStatus(statusEl, 'error', '⚠️ Durasi harus lebih dari 0 detik.');
    return;
  }

  submitBtn.disabled = true;
  $('download').classList.add('hidden');
  setStatus(
    statusEl,
    'loading',
    '<span class="spinner"></span> Memproses... (download segmen + render TikTok). Ini bisa beberapa menit.'
  );

  try {
    const res = await fetch('/api/clip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || 'Terjadi kesalahan.');

    $('placeholder').classList.add('hidden');
    $('preview').src = `${data.url}?t=${Date.now()}`;
    $('preview').load();
    const dl = $('download');
    dl.href = data.url;
    dl.download = data.name;
    dl.classList.remove('hidden');

    setStatus(statusEl, 'success', `✅ Selesai! File: <b>${data.name}</b>`);
  } catch (err) {
    setStatus(statusEl, 'error', `❌ ${err.message}`);
  } finally {
    submitBtn.disabled = false;
  }
});

// ---------- Bulk ----------
let pollTimer = null;

$('bulk-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const statusEl = $('bulk-status');
  const submitBtn = $('bulk-submit');
  const file = $('csv-file').files[0];

  if (!file) {
    setStatus(statusEl, 'error', '⚠️ Pilih file CSV dulu.');
    return;
  }

  submitBtn.disabled = true;
  $('bulk-results').innerHTML = '';
  $('bulk-zip').classList.add('hidden');
  $('bulk-progress-wrap').classList.add('hidden');
  setStatus(statusEl, 'loading', '<span class="spinner"></span> Mengunggah & memulai job...');

  try {
    const fd = new FormData();
    fd.append('csv', file);
    const res = await fetch('/api/bulk', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || 'Gagal memulai job.');

    setStatus(statusEl, 'loading', '<span class="spinner"></span> Memproses klip...');
    $('bulk-progress-wrap').classList.remove('hidden');
    pollJob(data.job.id, submitBtn, statusEl);
  } catch (err) {
    setStatus(statusEl, 'error', `❌ ${err.message}`);
    submitBtn.disabled = false;
  }
});

function pollJob(jobId, submitBtn, statusEl) {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(async () => {
    try {
      const res = await fetch(`/api/bulk/${jobId}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      renderJob(data.job);

      if (data.job.status === 'completed') {
        clearInterval(pollTimer);
        submitBtn.disabled = false;
        const { succeeded, failed } = data.job;
        setStatus(
          statusEl,
          failed ? 'error' : 'success',
          `✅ Selesai: ${succeeded} berhasil, ${failed} gagal.`
        );
        if (data.job.zipUrl) {
          const zip = $('bulk-zip');
          zip.href = data.job.zipUrl;
          zip.classList.remove('hidden');
        }
      }
    } catch (err) {
      clearInterval(pollTimer);
      submitBtn.disabled = false;
      setStatus(statusEl, 'error', `❌ ${err.message}`);
    }
  }, 2000);
}

function renderJob(job) {
  const pct = job.total ? Math.round((job.done / job.total) * 100) : 0;
  $('bulk-bar').style.width = `${pct}%`;
  $('bulk-progress-text').textContent = `${job.done}/${job.total} selesai (${pct}%)`;

  const badge = (s) =>
    ({ queued: '⏳', processing: '⚙️', done: '✅', error: '❌' }[s] || s);

  $('bulk-results').innerHTML = job.items
    .map((it) => {
      const right =
        it.status === 'done'
          ? `<a href="${it.url}" download="${it.name}">⬇️ ${it.name}</a>`
          : it.status === 'error'
          ? `<span class="err">${it.error || 'gagal'}</span>`
          : `<span class="muted">${it.status}</span>`;
      return `<div class="result-row">
          <span class="rstatus">${badge(it.status)}</span>
          <span class="rtitle">${it.index + 1}. ${escapeHtml(it.title)}</span>
          <span class="rright">${right}</span>
        </div>`;
    })
    .join('');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}
