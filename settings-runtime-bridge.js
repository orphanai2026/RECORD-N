(() => {
  'use strict';

  if (!document.querySelector('link[data-ney-settings-runtime]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = './settings-runtime-bridge.css?v=2026-08-08-1638';
    link.dataset.neySettingsRuntime = 'true';
    document.head.append(link);
  }

  if (window.NeySettingsRuntime?.version === 3) return;

  const STORAGE_KEY = 'ney-meyar-settings-v3';
  const LEGACY_KEY = 'ney-standard-settings-v2';
  const ORDER = { whole: 1, half: 2, quarter: 3, eighth: 4, sixteenth: 5 };
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const defaults = Object.freeze({
    basic: Object.freeze({ division: 24, durationBeats: 1, durationName: 'نوار', bpm: 60, a4: 440 }),
    advanced: Object.freeze({
      sensitivity: .025,
      tolerance: 12,
      noiseGate: .015,
      smoothing: .15,
      minFrequency: 60,
      maxFrequency: 1800,
      exportFormat: 'wav',
      exportSampleRate: 48000,
      wavBitDepth: 24,
      mp3Bitrate: 192,
      fileNamePattern: '{note}-{duration}-{date}',
      recordingQuality: 90,
      persistSettings: true
    })
  });

  let initialized = false;
  let restoring = false;
  let clearBypass = false;
  let diagnosticsObserver = null;

  function notify(message) {
    const toast = $('#toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(notify.timer);
    notify.timer = window.setTimeout(() => toast.classList.remove('is-visible'), 3000);
  }

  function readBasic() {
    const division = $('#divisionControl .segment.is-active');
    const duration = $('#durationControl .duration-option.is-active');
    return {
      division: Number(division?.dataset.division || defaults.basic.division),
      durationBeats: Number(duration?.dataset.duration || defaults.basic.durationBeats),
      durationName: String(duration?.dataset.name || defaults.basic.durationName),
      bpm: clamp(Math.round(Number($('#bpmValue')?.value || defaults.basic.bpm)), 30, 240),
      a4: clamp(Number($('#a4Reference')?.value || defaults.basic.a4), 400, 480)
    };
  }

  function readAdvanced() {
    return {
      sensitivity: Number($('#sensitivityRange')?.value || defaults.advanced.sensitivity),
      tolerance: Number($('#toleranceRange')?.value || defaults.advanced.tolerance),
      noiseGate: Number($('#noiseGateRange')?.value || defaults.advanced.noiseGate),
      smoothing: Number($('#smoothingRange')?.value || defaults.advanced.smoothing),
      minFrequency: Number($('#minFrequencyInput')?.value || defaults.advanced.minFrequency),
      maxFrequency: Number($('#maxFrequencyInput')?.value || defaults.advanced.maxFrequency),
      exportFormat: $('#defaultExportFormat')?.value || defaults.advanced.exportFormat,
      exportSampleRate: Number($('#exportSampleRate')?.value || defaults.advanced.exportSampleRate),
      wavBitDepth: Number($('#wavBitDepth')?.value || defaults.advanced.wavBitDepth),
      mp3Bitrate: Number($('#mp3Bitrate')?.value || defaults.advanced.mp3Bitrate),
      fileNamePattern: $('#fileNamePattern')?.value || defaults.advanced.fileNamePattern,
      recordingQuality: clamp(Number($('#recordingQualityRange')?.value || defaults.advanced.recordingQuality), 65, 100),
      persistSettings: Boolean($('#persistSettings')?.checked)
    };
  }

  function read() {
    return { schemaVersion: 3, product: 'Ney Meyar', savedAt: new Date().toISOString(), basic: readBasic(), advanced: readAdvanced() };
  }

  function recordingQuality() {
    return readAdvanced().recordingQuality / 100;
  }

  function persist() {
    const bundle = read();
    try {
      if (bundle.advanced.persistSettings) localStorage.setItem(STORAGE_KEY, JSON.stringify(bundle));
      else {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(LEGACY_KEY);
      }
    } catch (error) {
      console.warn('Unified settings persistence failed', error);
    }
    return bundle;
  }

  function browserLabel() {
    const brands = navigator.userAgentData?.brands || [];
    const real = brands.find(item => item?.brand && !/not.?a.?brand/i.test(item.brand));
    if (real) return `${real.brand}${real.version ? ` ${real.version}` : ''}`;
    const ua = navigator.userAgent || '';
    const tests = [
      [/Edg\/([\d.]+)/, 'Microsoft Edge'],
      [/Chrome\/([\d.]+)/, 'Google Chrome'],
      [/Firefox\/([\d.]+)/, 'Firefox'],
      [/Version\/([\d.]+).*Safari/, 'Safari']
    ];
    for (const [pattern, name] of tests) {
      const match = ua.match(pattern);
      if (match) return `${name} ${match[1]}`;
    }
    return 'المتصفح الحالي';
  }

  function refreshDiagnostics() {
    const panel = $('#diagnosticsPanel');
    if (!panel) return;
    const rows = $$(':scope > div', panel);
    const browserRow = rows.find(row => row.querySelector('span')?.textContent?.includes('المتصفح'));
    const browserValue = browserRow?.querySelector('strong');
    const nextBrowser = browserLabel();
    if (browserValue && browserValue.textContent !== nextBrowser) browserValue.textContent = nextBrowser;

    const rateRow = rows.find(row => row.querySelector('span')?.textContent?.includes('معدل الالتقاط'));
    const rateValue = rateRow?.querySelector('strong');
    if (rateValue && /غير نشط.*Hz/.test(rateValue.textContent)) rateValue.textContent = 'غير نشط';
  }

  function observeDiagnostics() {
    const panel = $('#diagnosticsPanel');
    if (!panel || diagnosticsObserver) return;
    diagnosticsObserver = new MutationObserver(() => refreshDiagnostics());
    diagnosticsObserver.observe(panel, { childList: true, subtree: true, characterData: true });
    refreshDiagnostics();
  }

  function enhanceFrequencyFields() {
    ['minFrequencyInput', 'maxFrequencyInput'].forEach(id => {
      const input = $(`#${id}`);
      const label = input?.closest('label');
      const unit = label?.querySelector(':scope > small');
      if (!input || !label || !unit || input.closest('.ney-frequency-field')) return;
      const wrap = document.createElement('span');
      wrap.className = 'ney-frequency-field';
      input.before(wrap);
      wrap.append(input, unit);
    });
  }

  function syncCaptureRule() {
    const percent = Math.round(recordingQuality() * 100);
    const rule = $('.ney-auto-capture__rule strong');
    if (rule) rule.textContent = `القراءات المقبولة ≥ 90% · جودة الإشارة ≥ ${percent}%`;
  }

  function rebuildChromaticIfNeeded() {
    const active = $('#recordingModeControl .segment.is-active');
    if (active?.dataset.recordingMode === 'chromatic') window.setTimeout(() => active.click(), 0);
  }

  function dispatchApplied(source = 'runtime') {
    const settings = read();
    document.dispatchEvent(new CustomEvent('ney:settings-applied', { detail: { source, settings } }));
    syncCaptureRule();
    refreshDiagnostics();
    rebuildChromaticIfNeeded();
    window.NeyPerformancePackRecordsUI?.refresh?.();
    return settings;
  }

  function clickChoice(selector, predicate) {
    const button = $$(selector).find(predicate);
    if (button && !button.classList.contains('is-active')) button.click();
  }

  function setControl(id, value, inputEvent = true) {
    const control = $(`#${id}`);
    if (!control || value === undefined || value === null) return;
    if (control.type === 'checkbox') control.checked = Boolean(value);
    else control.value = String(value);
    if (inputEvent) control.dispatchEvent(new Event('input', { bubbles: true }));
    control.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function applyBasic(values = {}) {
    const merged = { ...defaults.basic, ...values };
    clickChoice('#divisionControl .segment', button => Number(button.dataset.division) === Number(merged.division));
    clickChoice('#durationControl .duration-option', button => Math.abs(Number(button.dataset.duration) - Number(merged.durationBeats)) < .0001);
    setControl('bpmValue', clamp(Math.round(Number(merged.bpm) || 60), 30, 240), false);
    setControl('a4Reference', clamp(Number(merged.a4) || 440, 400, 480), false);
  }

  function applyAdvanced(values = {}, save = true) {
    const merged = { ...defaults.advanced, ...values };
    setControl('sensitivityRange', merged.sensitivity);
    setControl('toleranceRange', merged.tolerance);
    setControl('noiseGateRange', merged.noiseGate);
    setControl('smoothingRange', merged.smoothing);
    setControl('minFrequencyInput', merged.minFrequency, false);
    setControl('maxFrequencyInput', merged.maxFrequency, false);
    setControl('defaultExportFormat', merged.exportFormat, false);
    setControl('exportSampleRate', merged.exportSampleRate, false);
    setControl('wavBitDepth', merged.wavBitDepth, false);
    setControl('mp3Bitrate', merged.mp3Bitrate, false);
    setControl('fileNamePattern', merged.fileNamePattern, false);
    setControl('recordingQualityRange', merged.recordingQuality);
    setControl('persistSettings', merged.persistSettings, false);
    if (save) $('#saveAdvancedButton')?.click();
  }

  function apply(bundle = {}, options = {}) {
    restoring = true;
    try {
      applyBasic(bundle.basic || defaults.basic);
      applyAdvanced(bundle.advanced || bundle || defaults.advanced, options.save !== false);
    } finally {
      restoring = false;
    }
    if (options.persist !== false) persist();
    dispatchApplied(options.source || 'apply');
  }

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1800);
  }

  function safeName(value) {
    return String(value || 'recording').trim().replace(/\s+/g, '-').replace(/[^\p{L}\p{N}_-]+/gu, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'recording';
  }

  function patternName(note, duration) {
    const date = new Date().toISOString().slice(0, 10);
    const pattern = $('#fileNamePattern')?.value || defaults.advanced.fileNamePattern;
    return safeName(pattern
      .replaceAll('{note}', safeName(note))
      .replaceAll('{duration}', safeName(duration))
      .replaceAll('{date}', date));
  }

  function writeAscii(view, offset, text) {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  }

  function encodeWav(pcm, sampleRate, bitDepth = 24) {
    const depth = Number(bitDepth) === 16 ? 16 : 24;
    const bytes = depth === 16 ? 2 : 3;
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
    view.setUint16(34, depth, true);
    writeAscii(view, 36, 'data');
    view.setUint32(40, dataSize, true);
    let offset = 44;
    for (const raw of pcm) {
      const value = clamp(Number(raw) || 0, -1, 1);
      if (depth === 16) {
        view.setInt16(offset, Math.round(value < 0 ? value * 0x8000 : value * 0x7fff), true);
        offset += 2;
      } else {
        let sample = value < 0 ? Math.round(value * 0x800000) : Math.round(value * 0x7fffff);
        if (sample < 0) sample += 0x1000000;
        view.setUint8(offset, sample & 0xff);
        view.setUint8(offset + 1, sample >> 8 & 0xff);
        view.setUint8(offset + 2, sample >> 16 & 0xff);
        offset += 3;
      }
    }
    return new Blob([buffer], { type: 'audio/wav' });
  }

  function encodeMp3(pcm, sampleRate, bitrate) {
    if (!window.lamejs?.Mp3Encoder) throw new Error('MP3 encoder unavailable');
    const encoder = new window.lamejs.Mp3Encoder(1, sampleRate, Number(bitrate) || 192);
    const int16 = new Int16Array(pcm.length);
    for (let i = 0; i < pcm.length; i += 1) int16[i] = Math.round(clamp(Number(pcm[i]) || 0, -1, 1) * 32767);
    const chunks = [];
    for (let offset = 0; offset < int16.length; offset += 1152) {
      const encoded = encoder.encodeBuffer(int16.subarray(offset, offset + 1152));
      if (encoded.length) chunks.push(new Int8Array(encoded));
    }
    const flushed = encoder.flush();
    if (flushed.length) chunks.push(new Int8Array(flushed));
    return new Blob(chunks, { type: 'audio/mpeg' });
  }

  function resample(pcm, sourceRate, targetRate) {
    if (Number(sourceRate) === Number(targetRate)) return pcm;
    const length = Math.max(1, Math.round(pcm.length * Number(targetRate) / Number(sourceRate)));
    const out = new Float32Array(length);
    const ratio = Number(sourceRate) / Number(targetRate);
    for (let i = 0; i < length; i += 1) {
      const position = i * ratio;
      const left = Math.floor(position);
      const right = Math.min(pcm.length - 1, left + 1);
      const fraction = position - left;
      out[i] = pcm[left] * (1 - fraction) + pcm[right] * fraction;
    }
    return out;
  }

  function joinPcm(parts) {
    const total = parts.reduce((sum, part) => sum + part.length, 0);
    const out = new Float32Array(total);
    let offset = 0;
    for (const part of parts) { out.set(part, offset); offset += part.length; }
    return out;
  }

  async function recordPcm(record) {
    if (record?.pcm?.length && Number(record.sampleRate) > 0) return { pcm: record.pcm instanceof Float32Array ? record.pcm : new Float32Array(record.pcm), sampleRate: Number(record.sampleRate) };
    if (!record?.blob) return null;
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return null;
    const context = new Context();
    try {
      const decoded = await context.decodeAudioData(await record.blob.arrayBuffer());
      const mono = new Float32Array(decoded.length);
      for (let channel = 0; channel < decoded.numberOfChannels; channel += 1) {
        const source = decoded.getChannelData(channel);
        for (let i = 0; i < source.length; i += 1) mono[i] += source[i] / decoded.numberOfChannels;
      }
      return { pcm: mono, sampleRate: decoded.sampleRate };
    } finally {
      try { await context.close(); } catch (_) {}
    }
  }

  function samplesFor(pack) {
    const items = [];
    if (pack?.samples?.clean?.audioId) items.push({ type: 'clean', durationKey: '', sample: pack.samples.clean, order: 0 });
    Object.entries(pack?.samples?.educational || {}).forEach(([durationKey, sample]) => {
      if (sample?.audioId) items.push({ type: 'educational', durationKey, sample, order: ORDER[sample.durationId] || 99 });
    });
    return items.sort((a, b) => a.order - b.order || Number(a.sample?.bpm || 0) - Number(b.sample?.bpm || 0));
  }

  function tonicKey(tonic) {
    if (!tonic) return 'none';
    if (typeof tonic === 'string') return tonic;
    return `${tonic.letter || 'C'}:${Number(tonic.accidentalQuarterSteps || 0)}:${Number(tonic.octave ?? 4)}`;
  }

  function groupKey(pack) {
    const c = pack?.context || {};
    return ['maqam-scale', c.maqamId || 'maqam', tonicKey(c.tonic), c.variantId || 'default', c.maqamDirection || 'ascending'].join('|');
  }

  function buildGroup(packs, key) {
    const list = packs.filter(pack => groupKey(pack) === key);
    if (!list.length) return null;
    const direction = list[0].context?.maqamDirection || 'ascending';
    list.sort((a, b) => direction === 'descending'
      ? Number(b.context?.maqamDegree || 0) - Number(a.context?.maqamDegree || 0)
      : Number(a.context?.maqamDegree || 0) - Number(b.context?.maqamDegree || 0));
    return {
      key, direction,
      maqamId: list[0].context?.maqamId,
      maqamAr: list[0].context?.maqamAr || list[0].context?.maqamId || 'مقام',
      tonic: list[0].context?.tonic,
      variantId: list[0].context?.variantId || null,
      packs: list
    };
  }

  function educationalItems(pack) {
    return Object.entries(pack?.samples?.educational || {}).filter(([, sample]) => sample?.audioId)
      .map(([durationKey, sample]) => ({ type: 'educational', durationKey, sample }));
  }

  function commonDuration(packs) {
    if (!packs.length) return null;
    const counts = new Map();
    packs.forEach(pack => new Set(educationalItems(pack).map(item => item.durationKey)).forEach(key => counts.set(key, (counts.get(key) || 0) + 1)));
    const complete = [...counts.entries()].filter(([, count]) => count === packs.length);
    if (!complete.length) return null;
    complete.sort((a, b) => {
      const aa = packs[0]?.samples?.educational?.[a[0]];
      const bb = packs[0]?.samples?.educational?.[b[0]];
      return (ORDER[aa?.durationId] || 99) - (ORDER[bb?.durationId] || 99) || Number(aa?.bpm || 0) - Number(bb?.bpm || 0);
    });
    return complete[0][0];
  }

  function preferredItem(pack, durationKey) {
    if (durationKey && pack?.samples?.educational?.[durationKey]?.audioId) return { type: 'educational', durationKey, sample: pack.samples.educational[durationKey] };
    const edu = educationalItems(pack).sort((a, b) => Number(b.sample?.score || 0) - Number(a.sample?.score || 0));
    if (edu.length) return edu[0];
    if (pack?.samples?.clean?.audioId) return { type: 'clean', durationKey: '', sample: pack.samples.clean };
    return null;
  }

  async function buildAudio(groups) {
    const packs = groups.flatMap(group => group?.packs || []);
    const durationKey = commonDuration(packs);
    const decoded = [];
    const store = window.NeyPerformancePackStore;
    for (const group of groups) {
      for (const pack of group.packs) {
        const item = preferredItem(pack, durationKey);
        const record = item ? await store?.getAudio?.(item.sample.audioId) : null;
        const audio = await recordPcm(record);
        if (!audio?.pcm?.length) throw new Error('Missing or unreadable audio');
        decoded.push(audio);
      }
    }
    const targetRate = Number($('#exportSampleRate')?.value || decoded[0]?.sampleRate || 48000);
    return { pcm: joinPcm(decoded.map(audio => resample(audio.pcm, audio.sampleRate, targetRate))), sampleRate: targetRate };
  }

  function currentFormat() {
    const value = $('#exportFormat')?.value || $('#defaultExportFormat')?.value || 'wav';
    return ['wav', 'mp3', 'json'].includes(value) ? value : 'wav';
  }

  async function exportMaqam(button, full) {
    const card = button.closest('.performance-maqam-group');
    const key = card?.dataset.performancePackKey;
    const store = window.NeyPerformancePackStore;
    if (!key || !store?.listPacks) return;
    const packs = await store.listPacks();
    const current = buildGroup(packs, key);
    if (!current) return;
    let groups = [current];
    if (full) {
      const matching = packs.filter(pack => pack?.context?.mode === 'maqam-scale'
        && pack.context?.maqamId === current.maqamId
        && tonicKey(pack.context?.tonic) === tonicKey(current.tonic)
        && (pack.context?.variantId || null) === current.variantId);
      const ascKey = matching.find(pack => pack.context?.maqamDirection === 'ascending') ? groupKey(matching.find(pack => pack.context?.maqamDirection === 'ascending')) : null;
      const descKey = matching.find(pack => pack.context?.maqamDirection === 'descending') ? groupKey(matching.find(pack => pack.context?.maqamDirection === 'descending')) : null;
      const asc = ascKey ? buildGroup(matching, ascKey) : null;
      const desc = descKey ? buildGroup(matching, descKey) : null;
      if (!asc || !desc) return notify('يلزم وجود الصعود والهبوط لتصدير المقام كاملًا.');
      groups = [asc, desc];
    }

    const format = currentFormat();
    const scope = full ? 'صعود-وهبوط' : (current.direction === 'descending' ? 'هبوط' : 'صعود');
    const base = patternName(`مقام-${current.maqamAr}`, scope);
    const old = button.textContent;
    button.disabled = true;
    button.textContent = 'جارٍ التجهيز…';
    try {
      if (format === 'json') {
        const payload = { schemaVersion: 2, type: 'ney-maqam-scale-export', exportedAt: new Date().toISOString(), settings: read(), maqamId: current.maqamId, maqamAr: current.maqamAr, scope, directions: groups.map(group => ({ direction: group.direction, degrees: group.packs.map(pack => ({ degree: pack.context?.maqamDegree, note: pack.note, context: pack.context })) })) };
        triggerDownload(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), `${base}.json`);
      } else {
        const audio = await buildAudio(groups);
        const advanced = readAdvanced();
        const blob = format === 'mp3' ? encodeMp3(audio.pcm, audio.sampleRate, advanced.mp3Bitrate) : encodeWav(audio.pcm, audio.sampleRate, advanced.wavBitDepth);
        triggerDownload(blob, `${base}.${format}`);
      }
      notify(`تم تصدير ${full ? 'المقام كاملًا' : scope} بصيغة ${format.toUpperCase()}.`);
    } catch (error) {
      console.error('Unified maqam export failed', error);
      notify('تعذر تجهيز التصدير. التسجيلات الأصلية بقيت محفوظة.');
    } finally {
      button.disabled = false;
      button.textContent = old;
    }
  }

  async function resolveSample(button) {
    const store = window.NeyPerformancePackStore;
    if (!store?.listPacks) return null;
    const packs = await store.listPacks();
    const row = button.closest('.performance-note-sample');
    if (!row) return null;
    let pack = null;
    const noteCard = row.closest('.performance-note-card');
    if (noteCard?.dataset.performancePackKey) pack = packs.find(item => item.packKey === noteCard.dataset.performancePackKey) || null;
    if (!pack) {
      const groupCard = row.closest('.performance-maqam-group');
      const degree = Number(row.closest('.performance-maqam-degree')?.querySelector('.performance-maqam-degree__number')?.textContent || 0);
      const group = groupCard?.dataset.performancePackKey ? buildGroup(packs, groupCard.dataset.performancePackKey) : null;
      pack = group?.packs.find(item => Number(item.context?.maqamDegree || 0) === degree) || null;
    }
    if (!pack) return null;
    const rows = [...row.parentElement.querySelectorAll(':scope > .performance-note-sample')];
    const item = samplesFor(pack)[rows.indexOf(row)] || samplesFor(pack)[0];
    return item ? { pack, item } : null;
  }

  async function exportSample(button) {
    const resolved = await resolveSample(button);
    if (!resolved) return;
    const { pack, item } = resolved;
    const record = await window.NeyPerformancePackStore?.getAudio?.(item.sample.audioId);
    const audio = await recordPcm(record);
    if (!audio?.pcm?.length) return;
    const advanced = readAdvanced();
    const format = currentFormat();
    const targetRate = Number(advanced.exportSampleRate || audio.sampleRate || 48000);
    const pcm = resample(audio.pcm, audio.sampleRate, targetRate);
    const base = patternName(pack?.note?.english || pack?.note?.arabic || 'note', item.type === 'clean' ? 'reference' : (item.sample?.durationName || 'sample'));
    if (format === 'json') {
      triggerDownload(new Blob([JSON.stringify({ schemaVersion: 2, exportedAt: new Date().toISOString(), note: pack.note, context: pack.context, sample: item.sample, settings: read() }, null, 2)], { type: 'application/json' }), `${base}.json`);
    } else {
      const blob = format === 'mp3' ? encodeMp3(pcm, targetRate, advanced.mp3Bitrate) : encodeWav(pcm, targetRate, advanced.wavBitDepth);
      triggerDownload(blob, `${base}.${format}`);
    }
    notify(`تم تصدير النغمة بصيغة ${format.toUpperCase()}.`);
  }

  function updateExportLabels() {
    const format = currentFormat().toUpperCase();
    $$('.performance-sample-download').forEach(button => {
      button.title = `تصدير هذه النغمة ${format}`;
      button.setAttribute('aria-label', `تصدير هذه النغمة ${format}`);
    });
  }

  async function clearPerformancePack() {
    const store = window.NeyPerformancePackStore;
    if (!store?.listPacks) return;
    const packs = await store.listPacks();
    const audioIds = new Set();
    packs.forEach(pack => {
      if (pack?.samples?.clean?.audioId) audioIds.add(pack.samples.clean.audioId);
      Object.values(pack?.samples?.educational || {}).forEach(sample => sample?.audioId && audioIds.add(sample.audioId));
    });
    for (const id of audioIds) await store.removeAudio?.(id);
    for (const pack of packs) await store.removePack?.(pack.packKey);
    document.dispatchEvent(new CustomEvent('ney:performance-pack-updated', { detail: { cleared: true } }));
  }

  function installExportInterceptors() {
    document.addEventListener('click', event => {
      const button = event.target.closest('[data-export-direction], [data-export-full], .performance-sample-download');
      if (!button) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (button.matches('.performance-sample-download')) exportSample(button).catch(error => console.error(error));
      else exportMaqam(button, button.hasAttribute('data-export-full')).catch(error => console.error(error));
    }, true);
    const list = $('#recordingsList');
    if (list) new MutationObserver(updateExportLabels).observe(list, { childList: true, subtree: true });
    $('#exportFormat')?.addEventListener('change', updateExportLabels);
    updateExportLabels();
  }

  function installAdminInterceptors() {
    $('#exportSettingsButton')?.addEventListener('click', event => {
      event.preventDefault(); event.stopImmediatePropagation();
      triggerDownload(new Blob([JSON.stringify(read(), null, 2)], { type: 'application/json' }), `ney-meyar-settings-${new Date().toISOString().slice(0, 10)}.json`);
      notify('تم تصدير جميع إعدادات الأداة.');
    }, true);

    $('#settingsImportInput')?.addEventListener('change', async event => {
      event.preventDefault(); event.stopImmediatePropagation();
      const input = event.currentTarget;
      const file = input.files?.[0];
      if (!file) return;
      try {
        const payload = JSON.parse(await file.text());
        apply(payload?.basic || payload?.advanced ? payload : { basic: readBasic(), advanced: payload }, { source: 'import' });
        notify('تم استيراد الإعدادات وتطبيقها على جميع الشاشات.');
      } catch (error) {
        console.error('Settings import failed', error);
        notify('ملف الإعدادات غير صالح.');
      } finally { input.value = ''; }
    }, true);

    $('#resetSettingsButton')?.addEventListener('click', event => {
      event.preventDefault(); event.stopImmediatePropagation();
      if (!window.confirm('استعادة جميع الإعدادات الأساسية والمتقدمة إلى الوضع الافتراضي؟')) return;
      apply(defaults, { source: 'reset' });
      notify('تمت استعادة جميع الإعدادات الافتراضية.');
    }, true);

    $('#clearRecordsButton')?.addEventListener('click', async event => {
      if (clearBypass) return;
      event.preventDefault(); event.stopImmediatePropagation();
      if (!window.confirm('مسح جميع التسجيلات المحفوظة، بما فيها Performance Pack؟ لا يمكن التراجع عن ذلك.')) return;
      const button = event.currentTarget;
      const originalConfirm = window.confirm;
      clearBypass = true;
      try { window.confirm = () => true; button.click(); }
      finally { window.confirm = originalConfirm; clearBypass = false; }
      try { await clearPerformancePack(); notify('تم مسح جميع التسجيلات المحفوظة.'); }
      catch (error) { console.error('Performance Pack clear failed', error); notify('تعذر مسح بعض التسجيلات.'); }
    }, true);
  }

  function installEvents() {
    $('#saveAdvancedButton')?.addEventListener('click', () => window.setTimeout(() => {
      if (!restoring) persist();
      if (!readAdvanced().persistSettings) {
        try { localStorage.removeItem(LEGACY_KEY); } catch (_) {}
      }
      dispatchApplied('save');
    }, 0));

    ['#bpmValue', '#a4Reference'].forEach(selector => $(selector)?.addEventListener('change', () => window.setTimeout(() => {
      if (!restoring && readAdvanced().persistSettings) persist();
      dispatchApplied('basic');
    }, 0)));

    document.addEventListener('click', event => {
      if (!event.target.closest('#divisionControl .segment, #durationControl .duration-option')) return;
      window.setTimeout(() => {
        if (!restoring && readAdvanced().persistSettings) persist();
        dispatchApplied('basic');
      }, 0);
    });

    $('#recordingQualityRange')?.addEventListener('input', syncCaptureRule);
  }

  function restore() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved?.schemaVersion === 3 && saved.basic && saved.advanced) apply(saved, { persist: false, source: 'restore' });
    } catch (error) { console.warn('Unified settings restore failed', error); }
  }

  function initialize() {
    if (initialized) return true;
    if (!$('#advancedSettingsForm') || !$('#saveAdvancedButton') || !$('#divisionControl')) return false;
    initialized = true;
    enhanceFrequencyFields();
    observeDiagnostics();
    installEvents();
    installAdminInterceptors();
    installExportInterceptors();
    restore();
    syncCaptureRule();
    refreshDiagnostics();
    dispatchApplied('initialize');
    return true;
  }

  window.NeySettingsRuntime = Object.freeze({
    version: 3,
    storageKey: STORAGE_KEY,
    defaults,
    read,
    readBasic,
    readAdvanced,
    recordingQuality,
    apply,
    persist,
    refreshDiagnostics
  });

  if (!initialize()) {
    const observer = new MutationObserver(() => { if (initialize()) observer.disconnect(); });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 15000);
  }
})();
