(() => {
  'use strict';

  const state = {
    list: null,
    observer: null,
    syncing: false,
    syncTimer: null,
    playingSampleKey: null,
    audio: null,
    objectUrl: null,
    countBadge: null
  };

  const escapeHtml = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  function store() {
    return window.NeyPerformancePackStore || null;
  }

  function ensureCountBadge() {
    if (state.countBadge?.isConnected) return state.countBadge;
    const title = document.querySelector('.recordings-panel .panel-title h2');
    if (!title) return null;
    const badge = document.createElement('span');
    badge.className = 'performance-pack-library-count';
    badge.setAttribute('aria-label', 'عدد العينات المحفوظة');
    badge.textContent = '0';
    title.appendChild(badge);
    state.countBadge = badge;
    return badge;
  }

  function stopPlayback({ refresh = true } = {}) {
    if (state.audio) {
      try { state.audio.pause(); } catch (_) {}
      state.audio.src = '';
    }
    if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);
    state.audio = null;
    state.objectUrl = null;
    state.playingSampleKey = null;
    if (refresh) scheduleSync(0);
  }

  function noteLabel(pack) {
    return pack?.note?.arabic || pack?.note?.english || 'نغمة محفوظة';
  }

  function englishLabel(pack) {
    return pack?.note?.english || '—';
  }

  function qualityLabel(sample) {
    const clarity = Number(sample?.metrics?.meanClarity ?? sample?.meanClarity ?? 0);
    return Number.isFinite(clarity) ? `${Math.round(clarity * 100)}%` : '—';
  }

  function centsLabel(sample) {
    const cents = Number(sample?.metrics?.meanAbsCents ?? sample?.meanAbsCents);
    return Number.isFinite(cents) ? `${cents.toFixed(1)} سنت` : '—';
  }

  function frequency(pack) {
    const value = Number(pack?.note?.targetFrequency ?? pack?.note?.measuredFrequency ?? 0);
    return Number.isFinite(value) ? value : 0;
  }

  function contextText(pack, sample, type) {
    const context = pack?.context || {};
    const parts = [type === 'clean' ? 'صافية / مرجعية' : 'تعليمية زمنية'];
    if (type === 'educational') {
      parts.push(sample.durationName || 'قيمة زمنية');
      if (Number.isFinite(Number(sample.beats))) parts.push(`${sample.beats} زمن`);
      if (Number.isFinite(Number(sample.bpm))) parts.push(`BPM ${sample.bpm}`);
    }
    if (context.maqamAr) parts.push(`مقام ${context.maqamAr}`);
    if (context.maqamDegree) parts.push(`الدرجة ${context.maqamDegree}`);
    parts.push(`جودة ${qualityLabel(sample)}`);
    parts.push(`انحراف ${centsLabel(sample)}`);
    return parts.join(' · ');
  }

  function makeFileName(pack, sample, type) {
    const note = String(englishLabel(pack)).replace(/[^a-zA-Z0-9#♯♭½_-]+/g, '-');
    const duration = type === 'educational' ? `-${String(sample.durationName || sample.durationId || 'duration').replace(/\s+/g, '-')}-${sample.bpm || ''}` : '-reference';
    const date = String(sample?.updatedAt || pack?.updatedAt || new Date().toISOString()).slice(0, 10);
    return `ney-${note || 'sample'}${duration}-${date}.wav`;
  }

  function sampleKey(pack, sample, type, durationKey = '') {
    return `${pack.packKey}::${type}::${durationKey || sample.audioId || 'sample'}`;
  }

  async function playSample(pack, sample, type, durationKey, button) {
    const key = sampleKey(pack, sample, type, durationKey);
    if (state.playingSampleKey === key) {
      stopPlayback();
      return;
    }
    stopPlayback({ refresh: false });
    const audioId = sample?.audioId;
    if (!audioId || !store()) return;
    const audioRecord = await store().getAudio(audioId);
    if (!audioRecord?.blob) return;

    state.objectUrl = URL.createObjectURL(audioRecord.blob);
    state.audio = new Audio(state.objectUrl);
    state.playingSampleKey = key;
    button.querySelector('span').textContent = 'إيقاف';
    state.audio.addEventListener('ended', () => stopPlayback(), { once: true });
    state.audio.addEventListener('error', () => stopPlayback(), { once: true });
    try {
      await state.audio.play();
    } catch (error) {
      console.error('Performance Pack playback failed', error);
      stopPlayback();
    }
  }

  async function downloadSample(pack, sample, type) {
    const audioId = sample?.audioId;
    if (!audioId || !store()) return;
    const audioRecord = await store().getAudio(audioId);
    if (!audioRecord?.blob) return;
    const url = URL.createObjectURL(audioRecord.blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = makeFileName(pack, sample, type);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function createRow(pack, sample, type, durationKey = '') {
    if (!sample?.audioId) return null;
    const key = sampleKey(pack, sample, type, durationKey);
    const row = document.createElement('article');
    row.className = `record-row record-row--performance-pack record-row--${type}`;
    row.dataset.performancePackKey = pack.packKey;
    row.dataset.performanceSampleKey = key;
    row.setAttribute('aria-label', `${type === 'clean' ? 'عينة مرجعية' : 'عينة تعليمية'} محفوظة ${noteLabel(pack)}`);
    row.innerHTML = `
      <div class="record-identity">
        <div class="record-note"><strong dir="ltr">${escapeHtml(englishLabel(pack))}</strong></div>
        <div class="record-copy">
          <strong>${escapeHtml(noteLabel(pack))}</strong>
          <span>${escapeHtml(contextText(pack, sample, type))}</span>
        </div>
      </div>
      <div class="record-frequency" dir="ltr">${frequency(pack).toFixed(2)} <small>Hz</small></div>
      <div class="record-row-actions">
        <button class="play-button" type="button" aria-label="سماع ${escapeHtml(noteLabel(pack))}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7Z"></path></svg>
          <span>${state.playingSampleKey === key ? 'إيقاف' : 'سماع'}</span>
        </button>
        <button class="record-menu-button performance-pack-download" type="button" aria-label="تنزيل WAV" title="تنزيل WAV">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12"></path><path d="m7 10 5 5 5-5"></path><path d="M5 21h14"></path></svg>
        </button>
      </div>`;

    row.querySelector('.play-button').addEventListener('click', event => playSample(pack, sample, type, durationKey, event.currentTarget));
    row.querySelector('.performance-pack-download').addEventListener('click', () => downloadSample(pack, sample, type));
    return row;
  }

  function connectObserver() {
    if (!state.list) return;
    if (!state.observer) {
      state.observer = new MutationObserver(() => {
        if (!state.syncing) scheduleSync(40);
      });
    }
    state.observer.observe(state.list, { childList: true });
  }

  async function sync() {
    const packStore = store();
    const list = document.querySelector('#recordingsList');
    if (!packStore || !list || state.syncing) return;

    state.list = list;
    state.syncing = true;
    state.observer?.disconnect();
    try {
      const packs = await packStore.listPacks();
      const rows = [];
      packs.forEach(pack => {
        const clean = pack?.samples?.clean;
        if (clean?.audioId) rows.push({ pack, sample: clean, type: 'clean', durationKey: '', updatedAt: clean.updatedAt || pack.updatedAt || '' });
        Object.entries(pack?.samples?.educational || {}).forEach(([durationKey, sample]) => {
          if (sample?.audioId) rows.push({ pack, sample, type: 'educational', durationKey, updatedAt: sample.updatedAt || pack.updatedAt || '' });
        });
      });
      rows.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));

      list.querySelectorAll('[data-performance-sample-key]').forEach(node => node.remove());
      const fragment = document.createDocumentFragment();
      rows.forEach(item => {
        const row = createRow(item.pack, item.sample, item.type, item.durationKey);
        if (row) fragment.appendChild(row);
      });
      if (fragment.childNodes.length) list.insertBefore(fragment, list.firstChild);
      const badge = ensureCountBadge();
      if (badge) badge.textContent = String(rows.length);
      list.dataset.performancePackCount = String(rows.length);
      list.setAttribute('aria-label', `التسجيلات المحفوظة؛ ${rows.length} عينة من Ney Auto-Capture`);
    } catch (error) {
      console.error('Performance Pack recordings sync failed', error);
    } finally {
      state.syncing = false;
      connectObserver();
    }
  }

  function scheduleSync(delay = 20) {
    clearTimeout(state.syncTimer);
    state.syncTimer = setTimeout(sync, delay);
  }

  function initialize() {
    state.list = document.querySelector('#recordingsList');
    if (!state.list) return;
    ensureCountBadge();
    connectObserver();
    scheduleSync(0);
    document.addEventListener('ney:performance-pack-updated', () => scheduleSync(0));
    document.addEventListener('ney:auto-capture-saved', () => scheduleSync(0));
    document.addEventListener('ney:educational-duration-saved', () => scheduleSync(0));
    window.addEventListener('beforeunload', () => stopPlayback({ refresh: false }), { once: true });

    window.NeyPerformancePackRecordsUI = Object.freeze({
      refresh: () => sync(),
      stopPlayback: () => stopPlayback(),
      count: async () => {
        const packs = await store()?.listPacks?.() || [];
        return packs.reduce((sum, pack) => sum + (pack?.samples?.clean?.audioId ? 1 : 0) + Object.values(pack?.samples?.educational || {}).filter(sample => sample?.audioId).length, 0);
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
