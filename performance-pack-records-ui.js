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
    expanded: new Set(),
    maqamSessions: new Map()
  };

  const ORDER = { whole: 1, half: 2, quarter: 3, eighth: 4, sixteenth: 5 };
  const store = () => window.NeyPerformancePackStore || null;
  const esc = value => {
    const node = document.createElement('div');
    node.textContent = String(value ?? '');
    return node.innerHTML;
  };

  function notify(message) {
    const toast = document.querySelector('#toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(notify.timer);
    notify.timer = setTimeout(() => toast.classList.remove('is-visible'), 3000);
  }

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

  function maqamSessionKey(value) {
    const c = value?.context || value || {};
    return [c.maqamId || 'maqam', tonicKey(c.tonic), c.variantId || 'default'].join('|');
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

  function indexMaqamSessions(groups) {
    const sessions = new Map();
    groups.forEach(group => {
      const key = maqamSessionKey(group);
      if (!sessions.has(key)) sessions.set(key, { key, ascending: null, descending: null });
      sessions.get(key)[group.direction] = group;
    });
    state.maqamSessions = sessions;
    return sessions;
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

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1800);
  }

  async function download(pack, item) {
    const record = await store()?.getAudio?.(item.sample.audioId);
    if (!record?.blob) return;
    const direction = pack?.context?.maqamDirection ? `-${pack.context.maqamDirection}` : '';
    const suffix = item.type === 'clean' ? 'reference' : `${item.sample.durationName || item.sample.durationId}-${item.sample.bpm || ''}`;
    triggerDownload(record.blob, `ney-${englishLabel(pack).replace(/[^a-zA-Z0-9_-]+/g, '-')}${direction}-${suffix}.wav`);
  }

  function currentExportFormat() {
    const value = document.querySelector('#exportFormat')?.value || document.querySelector('#defaultExportFormat')?.value || 'wav';
    return ['wav', 'mp3', 'json'].includes(value) ? value : 'wav';
  }

  function educationalItems(pack) {
    return Object.entries(pack?.samples?.educational || {})
      .filter(([, sample]) => sample?.audioId)
      .map(([durationKey, sample]) => ({ type: 'educational', durationKey, sample }));
  }

  function commonEducationalKey(packs) {
    if (!packs.length) return null;
    const counts = new Map();
    packs.forEach(pack => {
      const keys = new Set(educationalItems(pack).map(item => item.durationKey));
      keys.forEach(key => counts.set(key, (counts.get(key) || 0) + 1));
    });
    const complete = [...counts.entries()].filter(([, count]) => count === packs.length);
    if (!complete.length) return null;
    complete.sort((a, b) => {
      const aSample = packs[0]?.samples?.educational?.[a[0]];
      const bSample = packs[0]?.samples?.educational?.[b[0]];
      const ao = ORDER[aSample?.durationId] || 99;
      const bo = ORDER[bSample?.durationId] || 99;
      return ao - bo || Number(aSample?.bpm || 0) - Number(bSample?.bpm || 0);
    });
    return complete[0][0];
  }

  function preferredItem(pack, preferredDurationKey = null) {
    if (preferredDurationKey) {
      const sample = pack?.samples?.educational?.[preferredDurationKey];
      if (sample?.audioId) return { type: 'educational', durationKey: preferredDurationKey, sample };
    }
    const educational = educationalItems(pack).sort((a, b) => {
      const as = Number(a.sample?.score ?? 0);
      const bs = Number(b.sample?.score ?? 0);
      return bs - as || String(b.sample?.updatedAt || '').localeCompare(String(a.sample?.updatedAt || ''));
    });
    if (educational.length) return educational[0];
    if (pack?.samples?.clean?.audioId) return { type: 'clean', durationKey: '', sample: pack.samples.clean };
    return null;
  }

  async function recordPcm(record) {
    if (record?.pcm?.length && Number(record.sampleRate) > 0) {
      return { pcm: record.pcm instanceof Float32Array ? record.pcm : new Float32Array(record.pcm), sampleRate: Number(record.sampleRate) };
    }
    if (!record?.blob) return null;
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return null;
    const context = new Context();
    try {
      const decoded = await context.decodeAudioData(await record.blob.arrayBuffer());
      const source = decoded.getChannelData(0);
      return { pcm: new Float32Array(source), sampleRate: decoded.sampleRate };
    } finally {
      try { await context.close(); } catch (_) {}
    }
  }

  function resample(pcm, sourceRate, targetRate) {
    if (sourceRate === targetRate) return pcm;
    const length = Math.max(1, Math.round(pcm.length * targetRate / sourceRate));
    const output = new Float32Array(length);
    const ratio = sourceRate / targetRate;
    for (let index = 0; index < length; index += 1) {
      const position = index * ratio;
      const left = Math.floor(position);
      const right = Math.min(pcm.length - 1, left + 1);
      const fraction = position - left;
      output[index] = pcm[left] * (1 - fraction) + pcm[right] * fraction;
    }
    return output;
  }

  function joinPcm(parts) {
    const total = parts.reduce((sum, part) => sum + part.length, 0);
    const output = new Float32Array(total);
    let offset = 0;
    parts.forEach(part => { output.set(part, offset); offset += part.length; });
    return output;
  }

  function writeAscii(view, offset, text) {
    for (let index = 0; index < text.length; index += 1) view.setUint8(offset + index, text.charCodeAt(index));
  }

  function encodeWav24(pcm, sampleRate) {
    const bytes = 3;
    const dataSize = pcm.length * bytes;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    writeAscii(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeAscii(view, 8, 'WAVE');
    writeAscii(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * bytes, true);
    view.setUint16(32, bytes, true);
    view.setUint16(34, 24, true);
    writeAscii(view, 36, 'data');
    view.setUint32(40, dataSize, true);
    let offset = 44;
    for (const input of pcm) {
      const value = Math.min(1, Math.max(-1, input));
      let sample = value < 0 ? Math.round(value * 0x800000) : Math.round(value * 0x7fffff);
      if (sample < 0) sample += 0x1000000;
      view.setUint8(offset, sample & 0xff);
      view.setUint8(offset + 1, sample >> 8 & 0xff);
      view.setUint8(offset + 2, sample >> 16 & 0xff);
      offset += 3;
    }
    return new Blob([buffer], { type: 'audio/wav' });
  }

  function encodeMp3(pcm, sampleRate) {
    if (!window.lamejs?.Mp3Encoder) throw new Error('MP3 encoder unavailable');
    const bitrate = Number(document.querySelector('#mp3Bitrate')?.value || 192);
    const encoder = new window.lamejs.Mp3Encoder(1, sampleRate, bitrate);
    const int16 = new Int16Array(pcm.length);
    for (let i = 0; i < pcm.length; i += 1) int16[i] = Math.round(Math.min(1, Math.max(-1, pcm[i])) * 32767);
    const chunks = [];
    for (let offset = 0; offset < int16.length; offset += 1152) {
      const encoded = encoder.encodeBuffer(int16.subarray(offset, offset + 1152));
      if (encoded.length) chunks.push(new Int8Array(encoded));
    }
    const flushed = encoder.flush();
    if (flushed.length) chunks.push(new Int8Array(flushed));
    return new Blob(chunks, { type: 'audio/mpeg' });
  }

  function exportMetadata(groups, scope) {
    const directions = groups.filter(Boolean).map(group => ({
      direction: group.direction,
      directionAr: directionLabel(group.direction),
      degrees: group.packs.map(pack => ({
        degree: Number(pack.context?.maqamDegree || 0),
        arabic: noteLabel(pack),
        english: englishLabel(pack),
        targetFrequency: frequency(pack),
        context: pack.context
      }))
    }));
    const first = groups.find(Boolean);
    return {
      schemaVersion: 1,
      type: 'ney-maqam-scale-export',
      scope,
      maqamId: first?.maqamId || null,
      maqamAr: first?.maqamAr || null,
      tonic: first?.tonic || null,
      variantId: first?.variantId || null,
      exportedAt: new Date().toISOString(),
      directions
    };
  }

  async function buildAudio(groups) {
    const packs = groups.filter(Boolean).flatMap(group => group.packs);
    if (!packs.length) throw new Error('No maqam degrees to export');
    const commonKey = commonEducationalKey(packs);
    const entries = [];
    for (const group of groups.filter(Boolean)) {
      for (const pack of group.packs) {
        const item = preferredItem(pack, commonKey);
        if (!item?.sample?.audioId) throw new Error(`Missing audio for degree ${pack.context?.maqamDegree || '?'}`);
        const record = await store()?.getAudio?.(item.sample.audioId);
        const audio = await recordPcm(record);
        if (!audio?.pcm?.length) throw new Error(`Unreadable audio for degree ${pack.context?.maqamDegree || '?'}`);
        entries.push({ group, pack, item, ...audio });
      }
    }
    const targetRate = Number(document.querySelector('#exportSampleRate')?.value || entries[0]?.sampleRate || 48000);
    const parts = entries.map(entry => resample(entry.pcm, entry.sampleRate, targetRate));
    return { pcm: joinPcm(parts), sampleRate: targetRate, entries, commonDurationKey: commonKey };
  }

  function safeName(value) {
    return String(value || 'maqam').trim().replace(/\s+/g, '-').replace(/[^\p{L}\p{N}_-]+/gu, '-');
  }

  async function exportMaqam(groups, scope, button = null) {
    const validGroups = groups.filter(Boolean);
    if (!validGroups.length) return;
    const format = currentExportFormat();
    const first = validGroups[0];
    const maqamName = safeName(first.maqamAr || first.maqamId || 'maqam');
    const suffix = scope === 'full' ? 'صعود-وهبوط' : (first.direction === 'descending' ? 'هبوط' : 'صعود');
    const filenameBase = `مقام-${maqamName}-${suffix}`;
    const original = button?.textContent;
    if (button) { button.disabled = true; button.textContent = 'جارٍ التجهيز…'; }
    try {
      if (scope === 'full' && (!groups[0] || !groups[1])) {
        notify('يلزم وجود الصعود والهبوط لتصدير المقام كاملًا.');
        return;
      }
      if (format === 'json') {
        triggerDownload(new Blob([JSON.stringify(exportMetadata(validGroups, scope), null, 2)], { type: 'application/json' }), `${filenameBase}.json`);
        notify(`تم تصدير ${scope === 'full' ? 'المقام كاملًا' : directionLabel(first.direction)} بصيغة JSON.`);
        return;
      }
      const audio = await buildAudio(validGroups);
      const blob = format === 'mp3' ? encodeMp3(audio.pcm, audio.sampleRate) : encodeWav24(audio.pcm, audio.sampleRate);
      triggerDownload(blob, `${filenameBase}.${format}`);
      notify(`تم تصدير ${scope === 'full' ? 'المقام كاملًا صعودًا وهبوطًا' : directionLabel(first.direction)} بصيغة ${format.toUpperCase()}.`);
    } catch (error) {
      console.error('Maqam export failed', error);
      notify('تعذر تجهيز المقام كاملًا. التسجيلات الأصلية بقيت محفوظة دون تغيير.');
    } finally {
      if (button) { button.disabled = false; button.textContent = original || 'تصدير'; }
    }
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
        <button type="button" class="performance-sample-download" aria-label="تصدير هذه النغمة WAV" title="تصدير النغمة منفردة WAV">
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
    const session = state.maqamSessions.get(maqamSessionKey(group));
    const complete = Boolean(session?.ascending && session?.descending);
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
      <div class="performance-maqam-group__exports">
        <button type="button" data-export-direction>تصدير ${group.direction === 'descending' ? 'الهبوط' : 'الصعود'}</button>
        <button type="button" data-export-full ${complete ? '' : 'disabled'} title="${complete ? 'تصدير ملف واحد: الصعود ثم الهبوط' : 'يكتمل بعد توفر الصعود والهبوط'}">تصدير المقام كاملًا</button>
        <small>الصيغة الحالية: <bdi dir="ltr">${currentExportFormat().toUpperCase()}</bdi></small>
      </div>
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
    card.querySelector('[data-export-direction]').addEventListener('click', event => exportMaqam([group], 'direction', event.currentTarget));
    card.querySelector('[data-export-full]').addEventListener('click', event => {
      const latest = state.maqamSessions.get(maqamSessionKey(group));
      exportMaqam([latest?.ascending, latest?.descending], 'full', event.currentTarget);
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
      indexMaqamSessions(maqamGroups);
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
    document.querySelector('#exportFormat')?.addEventListener('change', () => scheduleSync(0));
    window.addEventListener('beforeunload', () => stopPlayback(false), { once: true });
    window.NeyPerformancePackRecordsUI = Object.freeze({
      refresh: sync,
      stopPlayback,
      exportMaqam,
      count: async () => {
        const packs = (await store()?.listPacks?.() || []).filter(pack => samplesFor(pack).length);
        const groups = buildMaqamGroups(packs);
        const regular = packs.filter(pack => !isMaqamScale(pack));
        return { notes: groups.length + regular.length, samples: packs.reduce((sum, pack) => sum + samplesFor(pack).length, 0) };
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
