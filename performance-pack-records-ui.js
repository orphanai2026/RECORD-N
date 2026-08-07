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

  const DURATION_ORDER = Object.freeze({ whole: 1, half: 2, quarter: 3, eighth: 4, sixteenth: 5 });
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
    badge.setAttribute('aria-label', 'ملخص مكتبة العينات');
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

  function qualityValue(sample) {
    const clarity = Number(sample?.metrics?.meanClarity ?? sample?.meanClarity ?? 0);
    return Number.isFinite(clarity) ? Math.round(clarity * 100) : null;
  }

  function qualityLabel(sample) {
    const value = qualityValue(sample);
    return value == null ? '—' : `${value}%`;
  }

  function centsLabel(sample) {
    const cents = Number(sample?.metrics?.meanAbsCents ?? sample?.meanAbsCents);
    return Number.isFinite(cents) ? `${cents.toFixed(1)} سنت` : '—';
  }

  function frequency(pack) {
    const value = Number(pack?.note?.targetFrequency ?? pack?.note?.measuredFrequency ?? 0);
    return Number.isFinite(value) ? value : 0;
  }

  function sampleKey(pack, sample, type, durationKey = '') {
    return `${pack.packKey}::${type}::${durationKey || sample?.audioId || 'sample'}`;
  }

  function sampleTitle(sample, type) {
    if (type === 'clean') return 'مرجعية';
    return sample?.durationName || 'تعليمية';
  }

  function sampleMeta(sample, type) {
    const parts = [];
    if (type === 'clean') {
      parts.push('صافية');
    } else {
      if (Number.isFinite(Number(sample?.beats))) parts.push(`${sample.beats} زمن`);
      if (Number.isFinite(Number(sample?.bpm))) parts.push(`BPM ${sample.bpm}`);
    }
    parts.push(`جودة ${qualityLabel(sample)}`);
    parts.push(`انحراف ${centsLabel(sample)}`);
    return parts.join(' · ');
  }

  function contextMeta(pack) {
    const context = pack?.context || {};
    const parts = [];
    if (context.maqamAr) parts.push(`مقام ${context.maqamAr}`);
    if (context.maqamDegree) parts.push(`الدرجة ${context.maqamDegree}`);
    if (context.mode === 'chromatic-24') parts.push('كروماتك شرقي');
    else if (context.mode === 'chromatic-12') parts.push('كروماتك غربي');
    return parts.join(' · ');
  }

  function makeFileName(pack, sample, type) {
    const note = String(englishLabel(pack)).replace(/[^a-zA-Z0-9#♯♭½_-]+/g, '-');
    const duration = type === 'educational'
      ? `-${String(sample?.durationName || sample?.durationId || 'duration').replace(/\s+/g, '-')}-${sample?.bpm || ''}`
      : '-reference';
    const date = String(sample?.updatedAt || pack?.updatedAt || new Date().toISOString()).slice(0, 10);
    return `ney-${note || 'sample'}${duration}-${date}.wav`;
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
    button.classList.add('is-playing');
    const text = button.querySelector('[data-action-label]');
    if (text) text.textContent = 'إيقاف';
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

  function createSampleItem(pack, sample, type, durationKey = '') {
    const key = sampleKey(pack, sample, type, durationKey);
    const item = document.createElement('div');
    item.className = `performance-note-sample performance-note-sample--${type}`;
    item.dataset.performanceSampleKey = key;
    item.innerHTML = `
      <div class="performance-note-sample__copy">
        <strong>${escapeHtml(sampleTitle(sample, type))}</strong>
        <span>${escapeHtml(sampleMeta(sample, type))}</span>
      </div>
      <div class="performance-note-sample__actions">
        <button type="button" class="performance-sample-play" aria-label="سماع ${escapeHtml(noteLabel(pack))} ${escapeHtml(sampleTitle(sample, type))}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7Z"></path></svg>
          <span data-action-label>${state.playingSampleKey === key ? 'إيقاف' : 'سماع'}</span>
        </button>
        <button type="button" class="performance-sample-download" aria-label="تنزيل WAV" title="تنزيل WAV">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12"></path><path d="m7 10 5 5 5-5"></path><path d="M5 21h14"></path></svg>
        </button>
      </div>`;

    item.querySelector('.performance-sample-play').addEventListener('click', event => playSample(pack, sample, type, durationKey, event.currentTarget));
    item.querySelector('.performance-sample-download').addEventListener('click', () => downloadSample(pack, sample, type));
    return item;
  }

  function samplesForPack(pack) {
    const samples = [];
    if (pack?.samples?.clean?.audioId) samples.push({ type: 'clean', durationKey: '', sample: pack.samples.clean, order: 0 });
    Object.entries(pack?.samples?.educational || {}).forEach(([durationKey, sample]) => {
      if (!sample?.audioId) return;
      samples.push({
        type: 'educational',
        durationKey,
        sample,
        order: DURATION_ORDER[sample.durationId] || 99
      });
    });
    return samples.sort((a, b) => a.order - b.order || Number(a.sample?.bpm || 0) - Number(b.sample?.bpm || 0));
  }

  function createPackCard(pack) {
    const samples = samplesForPack(pack);
    if (!samples.length) return null;

    const card = document.createElement('article');
    card.className = 'performance-note-card';
    card.dataset.performancePackKey = pack.packKey;
    card.setAttribute('aria-label', `حزمة تسجيلات ${noteLabel(pack)}؛ ${samples.length} عينات`);
    const context = contextMeta(pack);
    card.innerHTML = `
      <header class="performance-note-card__header">
        <div class="performance-note-card__identity">
          <strong class="performance-note-card__english" dir="ltr">${escapeHtml(englishLabel(pack))}</strong>
          <div>
            <h3>${escapeHtml(noteLabel(pack))}</h3>
            <p>${context ? `${escapeHtml(context)} · ` : ''}${samples.length} ${samples.length === 1 ? 'عينة' : 'عينات'}</p>
          </div>
        </div>
        <div class="performance-note-card__frequency" dir="ltr">${frequency(pack).toFixed(2)} <small>Hz</small></div>
      </header>
      <div class="performance-note-card__samples"></div>`;

    const holder = card.querySelector('.performance-note-card__samples');
    samples.forEach(item => holder.appendChild(createSampleItem(pack, item.sample, item.type, item.durationKey)));
    return card;
  }

  function hideLegacyRows(list) {
    list.querySelectorAll(':scope > .record-row:not([data-performance-pack-key])').forEach(row => {
      row.hidden = true;
      row.dataset.legacyRecordingRow = 'true';
    });
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
        .filter(pack => samplesForPack(pack).length)
        .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
      const sampleCount = packs.reduce((sum, pack) => sum + samplesForPack(pack).length, 0);

      list.querySelectorAll(':scope > [data-performance-pack-key]').forEach(node => node.remove());
      hideLegacyRows(list);
      const fragment = document.createDocumentFragment();
      packs.forEach(pack => {
        const card = createPackCard(pack);
        if (card) fragment.appendChild(card);
      });
      if (fragment.childNodes.length) list.insertBefore(fragment, list.firstChild);

      const badge = ensureCountBadge();
      if (badge) {
        badge.textContent = `${packs.length} نغمات · ${sampleCount} عينات`;
        badge.setAttribute('aria-label', `${packs.length} نغمات محفوظة و${sampleCount} عينات صوتية`);
      }
      list.dataset.performancePackCount = String(packs.length);
      list.dataset.performanceSampleCount = String(sampleCount);
      list.setAttribute('aria-label', `التسجيلات المحفوظة؛ ${packs.length} نغمات و${sampleCount} عينات من Ney Auto-Capture`);
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
        const packs = (await store()?.listPacks?.() || []).filter(pack => samplesForPack(pack).length);
        return {
          notes: packs.length,
          samples: packs.reduce((sum, pack) => sum + samplesForPack(pack).length, 0)
        };
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
