(() => {
  'use strict';

  const state = {
    list: null,
    observer: null,
    syncing: false,
    timer: null,
    playingKey: null,
    audio: null,
    url: null,
    badge: null,
    expanded: new Set()
  };

  const ORDER = { whole: 1, half: 2, quarter: 3, eighth: 4, sixteenth: 5 };
  const store = () => window.NeyPerformancePackStore || null;
  const esc = value => {
    const node = document.createElement('div');
    node.textContent = String(value ?? '');
    return node.innerHTML;
  };

  function ensureBadge() {
    if (state.badge?.isConnected) return state.badge;
    const title = document.querySelector('.recordings-panel .panel-title h2');
    if (!title) return null;
    const badge = document.createElement('span');
    badge.className = 'performance-pack-library-count';
    title.appendChild(badge);
    state.badge = badge;
    return badge;
  }

  function noteLabel(pack) { return pack?.note?.arabic || pack?.note?.english || 'نغمة محفوظة'; }
  function englishLabel(pack) { return pack?.note?.english || '—'; }
  function frequency(pack) {
    const n = Number(pack?.note?.targetFrequency ?? pack?.note?.measuredFrequency ?? 0);
    return Number.isFinite(n) ? n : 0;
  }
  function quality(sample) {
    const n = Number(sample?.metrics?.meanClarity ?? sample?.meanClarity);
    return Number.isFinite(n) ? `${Math.round(n * 100)}%` : '—';
  }
  function cents(sample) {
    const n = Number(sample?.metrics?.meanAbsCents ?? sample?.meanAbsCents);
    return Number.isFinite(n) ? `${n.toFixed(1)} سنت` : '—';
  }
  function sampleKey(pack, sample, type, durationKey = '') {
    return `${pack.packKey}::${type}::${durationKey || sample?.audioId || 'sample'}`;
  }
  function sampleTitle(sample, type) {
    return type === 'clean' ? 'مرجعية' : (sample?.durationName || 'تعليمية');
  }
  function sampleMeta(sample, type) {
    const parts = [type === 'clean' ? 'صافية' : 'تعليمية زمنية'];
    if (type === 'educational') {
      if (Number.isFinite(Number(sample?.beats))) parts.push(`${sample.beats} زمن`);
      if (Number.isFinite(Number(sample?.bpm))) parts.push(`BPM ${sample.bpm}`);
    }
    parts.push(`جودة ${quality(sample)}`);
    parts.push(`انحراف ${cents(sample)}`);
    return parts.join(' · ');
  }
  function contextMeta(pack) {
    const c = pack?.context || {};
    const parts = [];
    if (c.maqamAr) parts.push(`مقام ${c.maqamAr}`);
    if (c.maqamDegree) parts.push(`الدرجة ${c.maqamDegree}`);
    if (c.mode === 'chromatic-24') parts.push('كروماتك شرقي');
    if (c.mode === 'chromatic-12') parts.push('كروماتك غربي');
    return parts.join(' · ');
  }

  function samplesFor(pack) {
    const out = [];
    if (pack?.samples?.clean?.audioId) {
      out.push({ type: 'clean', durationKey: '', sample: pack.samples.clean, order: 0 });
    }
    Object.entries(pack?.samples?.educational || {}).forEach(([durationKey, sample]) => {
      if (!sample?.audioId) return;
      out.push({ type: 'educational', durationKey, sample, order: ORDER[sample.durationId] || 99 });
    });
    return out.sort((a, b) => a.order - b.order || Number(a.sample?.bpm || 0) - Number(b.sample?.bpm || 0));
  }

  function directionLabel(direction) {
    return direction === 'descending' ? 'هبوط ↓' : 'صعود ↑';
  }

  function tonicKey(tonic) {
    if (!tonic) return 'none';
    if (typeof tonic === 'string') return tonic;
    return `${tonic.letter || 'C'}:${Number(tonic.accidentalQuarterSteps || 0)}:${Number(tonic.octave ?? 4)}`;
  }

  function maqamGroupKey(pack) {
    const c = pack.context || {};
    return ['maqam-scale', c.maqamId || 'maqam', tonicKey(c.tonic), c.variantId || 'default', c.maqamDirection || 'ascending'].join('|');
  }

  function isMaqamScale(pack) {
    return pack?.context?.mode === 'maqam-scale' && Boolean(pack?.context?.maqamId);
  }

  function buildMaqamGroups(packs) {
    const map = new Map();
    packs.filter(isMaqamScale).forEach(pack => {
      const key = maqamGroupKey(pack);
      if (!map.has(key)) {
        map.set(key, {
          key,
          direction: pack.context?.maqamDirection || 'ascending',
          maqamId: pack.context?.maqamId,
          maqamAr: pack.context?.maqamAr || pack.context?.maqamId || 'مقام',
          tonic: pack.context?.tonic,
          variantId: pack.context?.variantId || null,
          packs: [],
          updatedAt: pack.updatedAt || ''
        });
      }
      const group = map.get(key);
      group.packs.push(pack);
      if (String(pack.updatedAt || '') > String(group.updatedAt || '')) group.updatedAt = pack.updatedAt;
    });

    return [...map.values()].map(group => {
      group.packs.sort((a, b) => {
        const da = Number(a.context?.maqamDegree || 0);
        const db = Number(b.context?.maqamDegree || 0);
        return group.direction === 'descending' ? db - da : da - db;
      });
      return group;
    }).sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
  }

  function stopPlayback(refresh = true) {
    try { state.audio?.pause(); } catch (_) {}
    if (state.url) URL.revokeObjectURL(state.url);
    state.audio = null;
    state.url = null;
    state.playingKey = null;
    if (refresh) scheduleSync(0);
  }

  async function play(pack, item, button) {
    const key = sampleKey(pack, item.sample, item.type, item.durationKey);
    if (state.playingKey === key) return stopPlayback();
    stopPlayback(false);
    const record = await store()?.getAudio?.(item.sample.audioId);
    if (!record?.blob) return;
    state.url = URL.createObjectURL(record.blob);
    state.audio = new Audio(state.url);
    state.playingKey = key;
    button.classList.add('is-playing');
    const label = button.querySelector('[data-action-label]');
    if (label) label.textContent = 'إيقاف';
    state.audio.addEventListener('ended', () => stopPlayback(), { once: true });
    state.audio.addEventListener('error', () => stopPlayback(), { once: true });
    try { await state.audio.play(); } catch (error) { console.error('Performance Pack playback failed', error); stopPlayback(); }
  }

  async function download(pack, item) {
    const record = await store()?.getAudio?.(item.sample.audioId);
    if (!record?.blob) return;
    const url = URL.createObjectURL(record.blob);
    const link = document.createElement('a');
    const direction = pack?.context?.maqamDirection ? `-${pack.context.maqamDirection}` : '';
    const suffix = item.type === 'clean' ? 'reference' : `${item.sample.durationName || item.sample.durationId}-${item.sample.bpm || ''}`;
    link.href = url;
    link.download = `ney-${englishLabel(pack).replace(/[^a-zA-Z0-9_-]+/g, '-')}${direction}-${suffix}.wav`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function createSample(pack, item) {
    const key = sampleKey(pack, item.sample, item.type, item.durationKey);
    const row = document.createElement('div');
    row.className = `performance-note-sample performance-note-sample--${item.type}`;
    row.dataset.performanceSampleKey = key;
    row.innerHTML = `
      <div class="performance-note-sample__copy">
        <strong>${esc(sampleTitle(item.sample, item.type))}</strong>
        <span>${esc(sampleMeta(item.sample, item.type))}</span>
      </div>
      <div class="performance-note-sample__actions">
        <button type="button" class="performance-sample-play" aria-label="سماع العينة">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7Z"></path></svg>
          <span data-action-label>${state.playingKey === key ? 'إيقاف' : 'سماع'}</span>
        </button>
        <button type="button" class="performance-sample-download" aria-label="تنزيل WAV" title="تنزيل WAV">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12"></path><path d="m7 10 5 5 5-5"></path><path d="M5 21h14"></path></svg>
        </button>
      </div>`;
    row.querySelector('.performance-sample-play').addEventListener('click', e => play(pack, item, e.currentTarget));
    row.querySelector('.performance-sample-download').addEventListener('click', () => download(pack, item));
    return row;
  }

  function createDegreeBlock(pack) {
    const items = samplesFor(pack);
    const block = document.createElement('section');
    block.className = 'performance-maqam-degree';
    block.innerHTML = `
      <div class="performance-maqam-degree__head">
        <span class="performance-maqam-degree__number">${esc(pack.context?.maqamDegree || '—')}</span>
        <div class="performance-maqam-degree__identity">
          <strong>${esc(noteLabel(pack))}</strong>
          <small dir="ltr">${esc(englishLabel(pack))} · ${frequency(pack).toFixed(2)} Hz</small>
        </div>
        <span class="performance-maqam-degree__count">${items.length} ${items.length === 1 ? 'عينة' : 'عينات'}</span>
      </div>
      <div class="performance-maqam-degree__samples"></div>`;
    const holder = block.querySelector('.performance-maqam-degree__samples');
    items.forEach(item => holder.appendChild(createSample(pack, item)));
    return block;
  }

  function createMaqamGroup(group) {
    const expanded = state.expanded.has(group.key);
    const totalSamples = group.packs.reduce((sum, pack) => sum + samplesFor(pack).length, 0);
    const card = document.createElement('article');
    card.className = `performance-maqam-group${expanded ? ' is-expanded' : ''}`;
    card.dataset.performancePackKey = group.key;
    card.innerHTML = `
      <button type="button" class="performance-maqam-group__toggle" aria-expanded="${expanded}">
        <span class="performance-maqam-group__identity">
          <strong>مقام ${esc(group.maqamAr)}</strong>
          <span class="performance-maqam-group__direction performance-maqam-group__direction--${esc(group.direction)}">${esc(directionLabel(group.direction))}</span>
        </span>
        <span class="performance-maqam-group__summary">
          <small>${group.packs.length} درجات · ${totalSamples} عينات</small>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 9 5 5 5-5"></path></svg>
        </span>
      </button>
      <div class="performance-maqam-group__degrees" ${expanded ? '' : 'hidden'}></div>`;
    const holder = card.querySelector('.performance-maqam-group__degrees');
    group.packs.forEach(pack => holder.appendChild(createDegreeBlock(pack)));
    card.querySelector('.performance-maqam-group__toggle').addEventListener('click', event => {
      const open = !state.expanded.has(group.key);
      if (open) state.expanded.add(group.key); else state.expanded.delete(group.key);
      card.classList.toggle('is-expanded', open);
      holder.hidden = !open;
      event.currentTarget.setAttribute('aria-expanded', String(open));
    });
    return card;
  }

  function createCard(pack) {
    const items = samplesFor(pack);
    if (!items.length) return null;
    const expanded = state.expanded.has(pack.packKey);
    const card = document.createElement('article');
    card.className = `performance-note-card${expanded ? ' is-expanded' : ''}`;
    card.dataset.performancePackKey = pack.packKey;
    const context = contextMeta(pack);
    card.innerHTML = `
      <button type="button" class="performance-note-card__toggle" aria-expanded="${expanded}" aria-label="${expanded ? 'إغلاق' : 'فتح'} تسجيلات ${esc(noteLabel(pack))}">
        <span class="performance-note-card__identity">
          <strong class="performance-note-card__english" dir="ltr">${esc(englishLabel(pack))}</strong>
          <span class="performance-note-card__copy">
            <strong>${esc(noteLabel(pack))}</strong>
            <small>${context ? `${esc(context)} · ` : ''}${items.length} ${items.length === 1 ? 'عينة' : 'عينات'}</small>
          </span>
        </span>
        <span class="performance-note-card__summary">
          <span class="performance-note-card__frequency" dir="ltr">${frequency(pack).toFixed(2)} <small>Hz</small></span>
          <svg class="performance-note-card__chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 9 5 5 5-5"></path></svg>
        </span>
      </button>
      <div class="performance-note-card__samples" ${expanded ? '' : 'hidden'}></div>`;

    const holder = card.querySelector('.performance-note-card__samples');
    items.forEach(item => holder.appendChild(createSample(pack, item)));
    card.querySelector('.performance-note-card__toggle').addEventListener('click', event => {
      const open = !state.expanded.has(pack.packKey);
      if (open) state.expanded.add(pack.packKey); else state.expanded.delete(pack.packKey);
      card.classList.toggle('is-expanded', open);
      holder.hidden = !open;
      event.currentTarget.setAttribute('aria-expanded', String(open));
      event.currentTarget.setAttribute('aria-label', `${open ? 'إغلاق' : 'فتح'} تسجيلات ${noteLabel(pack)}`);
    });
    return card;
  }

  function hideLegacy(list) {
    list.querySelectorAll(':scope > .record-row:not([data-performance-pack-key])').forEach(row => {
      row.hidden = true;
      row.dataset.legacyRecordingRow = 'true';
    });
  }

  function observe() {
    if (!state.list) return;
    if (!state.observer) state.observer = new MutationObserver(() => { if (!state.syncing) scheduleSync(50); });
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
        .filter(pack => samplesFor(pack).length)
        .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
      const maqamGroups = buildMaqamGroups(packs);
      const regularPacks = packs.filter(pack => !isMaqamScale(pack));
      const sampleCount = packs.reduce((sum, pack) => sum + samplesFor(pack).length, 0);

      list.querySelectorAll(':scope > [data-performance-pack-key]').forEach(node => node.remove());
      hideLegacy(list);
      const fragment = document.createDocumentFragment();
      maqamGroups.forEach(group => fragment.appendChild(createMaqamGroup(group)));
      regularPacks.forEach(pack => { const card = createCard(pack); if (card) fragment.appendChild(card); });
      if (fragment.childNodes.length) list.insertBefore(fragment, list.firstChild);

      const badge = ensureBadge();
      const visibleUnits = maqamGroups.length + regularPacks.length;
      if (badge) badge.textContent = `${visibleUnits} مجموعات · ${sampleCount} عينات`;
      list.dataset.performancePackCount = String(visibleUnits);
      list.dataset.performanceSampleCount = String(sampleCount);
    } catch (error) {
      console.error('Performance Pack recordings sync failed', error);
    } finally {
      state.syncing = false;
      observe();
    }
  }

  function scheduleSync(delay = 20) {
    clearTimeout(state.timer);
    state.timer = setTimeout(sync, delay);
  }

  function initialize() {
    state.list = document.querySelector('#recordingsList');
    if (!state.list) return;
    ensureBadge();
    observe();
    scheduleSync(0);
    ['ney:performance-pack-updated', 'ney:auto-capture-saved', 'ney:educational-duration-saved']
      .forEach(name => document.addEventListener(name, () => scheduleSync(0)));
    window.addEventListener('beforeunload', () => stopPlayback(false), { once: true });
    window.NeyPerformancePackRecordsUI = Object.freeze({ refresh: sync, stopPlayback, count: async () => {
      const packs = (await store()?.listPacks?.() || []).filter(pack => samplesFor(pack).length);
      const groups = buildMaqamGroups(packs);
      const regular = packs.filter(pack => !isMaqamScale(pack));
      return { notes: groups.length + regular.length, samples: packs.reduce((sum, pack) => sum + samplesFor(pack).length, 0) };
    }});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
