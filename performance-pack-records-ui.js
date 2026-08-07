(() => {
  'use strict';

  const state = {
    list: null,
    observer: null,
    syncing: false,
    syncTimer: null,
    playingPackKey: null,
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
    badge.setAttribute('aria-label', 'عدد العينات المرجعية المحفوظة');
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
    state.playingPackKey = null;
    if (refresh) scheduleSync(0);
  }

  function noteLabel(pack) {
    return pack?.note?.arabic || pack?.note?.english || 'نغمة مرجعية';
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

  function contextText(pack) {
    const context = pack?.context || {};
    const parts = ['صافية / مرجعية'];
    if (context.maqamAr) parts.push(`مقام ${context.maqamAr}`);
    if (context.maqamDegree) parts.push(`الدرجة ${context.maqamDegree}`);
    parts.push(`جودة ${qualityLabel(pack?.samples?.clean)}`);
    parts.push(`انحراف ${centsLabel(pack?.samples?.clean)}`);
    return parts.join(' · ');
  }

  function makeFileName(pack) {
    const note = String(englishLabel(pack)).replace(/[^a-zA-Z0-9#♯♭½_-]+/g, '-');
    const date = String(pack?.updatedAt || new Date().toISOString()).slice(0, 10);
    return `ney-${note || 'reference'}-${date}.wav`;
  }

  async function playPack(pack, button) {
    if (state.playingPackKey === pack.packKey) {
      stopPlayback();
      return;
    }
    stopPlayback({ refresh: false });
    const audioId = pack?.samples?.clean?.audioId;
    if (!audioId || !store()) return;
    const audioRecord = await store().getAudio(audioId);
    if (!audioRecord?.blob) return;

    state.objectUrl = URL.createObjectURL(audioRecord.blob);
    state.audio = new Audio(state.objectUrl);
    state.playingPackKey = pack.packKey;
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

  async function downloadPack(pack) {
    const audioId = pack?.samples?.clean?.audioId;
    if (!audioId || !store()) return;
    const audioRecord = await store().getAudio(audioId);
    if (!audioRecord?.blob) return;
    const url = URL.createObjectURL(audioRecord.blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = makeFileName(pack);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function createRow(pack) {
    const sample = pack?.samples?.clean;
    if (!sample?.audioId) return null;

    const row = document.createElement('article');
    row.className = 'record-row record-row--performance-pack';
    row.dataset.performancePackKey = pack.packKey;
    row.setAttribute('aria-label', `عينة مرجعية محفوظة ${noteLabel(pack)}`);
    row.innerHTML = `
      <div class="record-identity">
        <div class="record-note"><strong dir="ltr">${escapeHtml(englishLabel(pack))}</strong></div>
        <div class="record-copy">
          <strong>${escapeHtml(noteLabel(pack))}</strong>
          <span>${escapeHtml(contextText(pack))}</span>
        </div>
      </div>
      <div class="record-frequency" dir="ltr">${frequency(pack).toFixed(2)} <small>Hz</small></div>
      <div class="record-row-actions">
        <button class="play-button" type="button" aria-label="سماع ${escapeHtml(noteLabel(pack))}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7Z"></path></svg>
          <span>${state.playingPackKey === pack.packKey ? 'إيقاف' : 'سماع'}</span>
        </button>
        <button class="record-menu-button performance-pack-download" type="button" aria-label="تنزيل WAV" title="تنزيل WAV">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12"></path><path d="m7 10 5 5 5-5"></path><path d="M5 21h14"></path></svg>
        </button>
      </div>`;

    row.querySelector('.play-button').addEventListener('click', event => playPack(pack, event.currentTarget));
    row.querySelector('.performance-pack-download').addEventListener('click', () => downloadPack(pack));
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
      const packs = (await packStore.listPacks())
        .filter(pack => pack?.samples?.clean?.audioId)
        .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));

      list.querySelectorAll('[data-performance-pack-key]').forEach(node => node.remove());
      const fragment = document.createDocumentFragment();
      packs.forEach(pack => {
        const row = createRow(pack);
        if (row) fragment.appendChild(row);
      });
      if (fragment.childNodes.length) list.insertBefore(fragment, list.firstChild);
      const badge = ensureCountBadge();
      if (badge) badge.textContent = String(packs.length);
      list.dataset.performancePackCount = String(packs.length);
      list.setAttribute('aria-label', `التسجيلات المحفوظة؛ ${packs.length} عينة مرجعية من Ney Auto-Capture`);
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
    window.addEventListener('beforeunload', () => stopPlayback({ refresh: false }), { once: true });

    window.NeyPerformancePackRecordsUI = Object.freeze({
      refresh: () => sync(),
      stopPlayback: () => stopPlayback(),
      count: async () => (await store()?.listPacks?.() || []).filter(pack => pack?.samples?.clean?.audioId).length
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
