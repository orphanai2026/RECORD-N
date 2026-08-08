(() => {
  'use strict';

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
    const activeDivision = $('#divisionControl .segment.is-active');
    const activeDuration = $('#durationControl .duration-option.is-active');
    return {
      division: Number(activeDivision?.dataset.division || 24),
      durationBeats: Number(activeDuration?.dataset.duration || 1),
      durationName: String(activeDuration?.dataset.name || 'نوار'),
      bpm: clamp(Math.round(Number($('#bpmValue')?.value || 60)), 30, 240),
      a4: clamp(Number($('#a4Reference')?.value || 440), 400, 480)
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

  function readBundle() {
    return {
      schemaVersion: 3,
      product: 'Ney Meyar',
      savedAt: new Date().toISOString(),
      basic: readBasic(),
      advanced: readAdvanced()
    };
  }

  function currentQuality() {
    return readAdvanced().recordingQuality / 100;
  }

  function currentExportFormat() {
    const value = $('#exportFormat')?.value || $('#defaultExportFormat')?.value || 'wav';
    return ['wav', 'mp3', 'json'].includes(value) ? value : 'wav';
  }

  function persistBundle() {
    const bundle = readBundle();
    try {
      if (bundle.advanced.persistSettings) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(bundle));
      } else {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(LEGACY_KEY);
      }
    } catch (error) {
      console.warn('Unified settings persistence failed', error);
    }
    return bundle;
  }

  function dispatchApplied(source = 'runtime') {
    const bundle = readBundle();
    document.dispatchEvent(new CustomEvent('ney:settings-applied', { detail: { source, settings: bundle } }));
    syncCaptureRule();
    refreshDiagnostics();
    rebuildChromaticIfNeeded();
    window.NeyPerformancePackRecordsUI?.refresh?.();
    return bundle;
  }

  function clickChoice(selector, predicate) {
    const button = $$(selector).find(predicate);
    if (button && !button.classList.contains('is-active')) button.click();
  }

  function applyBasic(values = {}) {
    const merged = { ...defaults.basic, ...values };
    clickChoice('#divisionControl .segment', button => Number(button.dataset.division) === Number(merged.division));
    clickChoice('#durationControl .duration-option', button => Math.abs(Number(button.dataset.duration) - Number(merged.durationBeats)) < .0001);

    const bpm = $('#bpmValue');
    if (bpm) {
      bpm.value = clamp(Math.round(Number(merged.bpm) || 60), 30, 240);
      bpm.dispatchEvent(new Event('change', { bubbles: true }));
    }

    const a4 = $('#a4Reference');
    if (a4) {
      a4.value = clamp(Number(merged.a4) || 440, 400, 480);
      a4.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function setControl(id, value, inputEvent = true) {
    const control = $(`#${id}`);
    if (!control || value === undefined || value === null) return;
    if (control.type === 'checkbox') control.checked = Boolean(value);
    else control.value = String(value);
    if (inputEvent) control.dispatchEvent(new Event('input', { bubbles: true }));
    control.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function applyAdvanced(values = {}, { save = true } = {}) {
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

  function applyBundle(bundle = {}, options = {}) {
    restoring = true;
    try {
      applyBasic(bundle.basic || defaults.basic);
      applyAdvanced(bundle.advanced || bundle || defaults.advanced, { save: options.save !== false });
    } finally {
      restoring = false;
    }
    if (options.persist !== false) persistBundle();
    dispatchApplied(options.source || 'apply');
  }

  function rebuildChromaticIfNeeded() {
    const active = $('#recordingModeControl .segment.is-active');
    if (active?.dataset.recordingMode === 'chromatic') {
      window.setTimeout(() => active.click(), 0);
    }
  }

  function syncCaptureRule() {
    const percent = Math.round(currentQuality() * 100);
    const rule = $('.ney-auto-capture__rule strong');
    if (rule) rule.textContent = `القراءات المقبولة ≥ 90% · جودة الإشارة ≥ ${percent}%`;
  }

  function browserLabel() {
    const brands = navigator.userAgentData?.brands || [];
    const real = brands.find(item => item?.brand && !/not.?a.?brand/i.test(item.brand));
    if (real) return `${real.brand}${real.version ? ` ${real.version}` : ''}`;
    const ua = navigator.userAgent || '';
    const edge = ua.match(/Edg\/([\d.]+)/);
    if (edge) return `Microsoft Edge ${edge[1]}`;
    const chrome = ua.match(/Chrome\/([\d.]+)/);
    if (chrome) return `Google Chrome ${chrome[1]}`;
    const firefox = ua.match(/Firefox\/([\d.]+)/);
    if (firefox) return `Firefox ${firefox[1]}`;
    const safari = ua.match(/Version\/([\d.]+).*Safari/);
    if (safari) return `Safari ${safari[1]}`;
    return 'المتصفح الحالي';
  }

  function refreshDiagnostics() {
    const panel = $('#diagnosticsPanel');
    if (!panel) return;
    const rows = $$(':scope > div', panel);
    const browserRow = rows.find(row => row.querySelector('span')?.textContent?.includes('المتصفح'));
    const browserValue = browserRow?.querySelector('strong');
    if (browserValue) browserValue.textContent = browserLabel();

    const rateRow = rows.find(row => row.querySelector('span')?.textContent?.includes('معدل الالتقاط'));
    const rateValue = rateRow?.querySelector('strong');
    if (rateValue && /غير نشط/.test(rateValue.textContent)) rateValue.textContent = 'غير نشط';
  }

  function observeDiagnostics() {
    const panel = $('#diagnosticsPanel');
    if (!panel || diagnosticsObserver) return;
    diagnosticsObserver = new MutationObserver(refreshDiagnostics);
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

  function buildPatternName({ note, duration, date = new Date().toISOString().slice(0, 10) }) {
    const pattern = $('#fileNamePattern')?.value || defaults.advanced.fileNamePattern;
    const rendered = pattern
      .replaceAll('{note}', safeName(note))
      .replaceAll('{duration}', safeName(duration))
      .replaceAll('{date}', date);
    return safeName(rendered);
  }

  function writeAscii(view, offset, text) {
    for (let index = 0; index < text.length; index += 1) view.setUint8(offset + index, text.charCodeAt(index));
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
    for (const input of pcm) {
      const value = clamp(Number(input) || 0, -1, 1);
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

  function resample(pcm, sourceRate, targetRate) {
    if (Number(sourceRate) === Number(targetRate)) return pcm;
    const length = Math.max(1, Math.round(pcm.length * Number(targetRate) / Number(sourceRate)));
    const output = new Float32Array(length);
    const ratio = Number(sourceRate) / Number(targetRate);
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

  function samplesFor(pack) {
    const items = [];
    if (pack?.samples?.clean?.audioId) items.push({ type: 'clean', durationKey: '', sample: pack.samples.clean, order: 0 });
    Object.entries(pack?.samples?.educational || {}).forEach(([durationKey, sample]) => {
      if (!sample?.audioId) return;
      items.push({ type: 'educational', durationKey, sample, order: ORDER[sample.durationId] || 99 });
    });
    return items.sort((a, b) => a.order - b.order || Number(a.sample?.bpm || 0) - Number(b.sample?.bpm || 0));
  }

  function tonicKey(tonic) {
    if (!tonic) return 'none';
    if (typeof tonic === 'string') return tonic;
    return `${tonic.letter || 'C'}:${Number(tonic.accidentalQuarterSteps || 0)}:${Number(tonic.octave ?? 4)}`;
  }

  function maqamGroupKey(pack) {
    const c = pack?.context || {};
    return ['maqam-scale', c.maqamId || 'maqam', tonicKey(c.tonic), c.variantId || 'default', c.maqamDirection || 'ascending'].join('|');
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
      new Set(educationalItems(pack).map(item => item.durationKey)).forEach(key => counts.set(key, (counts.get(key) || 0) + 1));
    });
    const complete = [...counts.entries()].filter(([, count]) => count === packs.length);
    if (!complete.length) return null;
    complete.sort((a, b) => {
      const aa = packs[0]?.samples?.educational?.[a[0]];
      const bb = packs[0]?.samples?.educational?.[b[0]];
      return (ORDER[aa?.durationId] || 99) - (ORDER[bb?.durationId] || 99) || Number(aa?.bpm || 0) - Number(bb?.bpm || 0);
    });
    return complete[0][0];
  }

  function preferredItem(pack, durationKey = null) {
    if (durationKey && pack?.samples?.educational?.[durationKey]?.audioId) {
      return { type: 'educational', durationKey, sample: pack.samples.educational[durationKey] };
    }
    const educational = educationalItems(pack).sort((a, b) => Number(b.sample?.score || 0) - Number(a.sample?.score || 0));
    if (educational.length) return educational[0];
    if (pack?.samples?.clean?.audioId) return { type: 'clean', durationKey: '', sample: pack.samples.clean };
    return null;
  }

  function groupFromKey(packs, key) {
    const groupPacks = packs.filter(pack => maqamGroupKey(pack) === key);
    if (!groupPacks.length) return null;
    const direction = groupPacks[0].context?.maqamDirection || 'ascending';
    groupPacks.sort((a, b) => {
      const da = Number(a.context?.maqamDegree || 0);
      const db = Number(b.context?.maqamDegree || 0);
      return direction === 'descending' ? db - da : da - db;
    });
    return {
      key,
      direction,
      maqamId: groupPacks[0].context?.maqamId,
      maqamAr: groupPacks[0].context?.maqamAr || groupPacks[0].context?.maqamId || 'مقام',
      tonic: groupPacks[0].context?.tonic,
      variantId: groupPacks[0].context?.variantId || null,
      packs: groupPacks
    };
  }

  async function buildGroupAudio(groups) {
    const packs = groups.flatMap(group => group?.packs || []);
    if (!packs.length) throw new Error('No packs');
    const commonKey = commonEducationalKey(packs);
    const decoded = [];
    const store = window.NeyPerformancePackStore;
    for (const group of groups) {
      for (const pack of group.packs) {
        const item = preferredItem(pack, commonKey);
        if (!item?.sample?.audioId) throw new Error('Missing audio');
        const record = await store?.getAudio?.(item.sample.audioId);
        const audio = await recordPcm(record);
        if (!audio?.pcm?.length) throw new Error('Unreadable audio');
        decoded.push(audio);
      }
    }
    const targetRate = Number($('#exportSampleRate')?.value || decoded[0]?.sampleRate || 48000);
    return { pcm: joinPcm(decoded.map(audio => resample(audio.pcm, audio.sampleRate, targetRate))), sampleRate: targetRate };
  }

  async function exportMaqamFromButton(button, full) {
    const card = button.closest('.performance-maqam-group');
    const key = card?.dataset.performancePackKey;
    const store = window.NeyPerformancePackStore;
    if (!key || !store?.listPacks) return;
    const packs = await store.listPacks();
    const current = groupFromKey(packs, key);
    if (!current) return;
    let groups = [current];
    if (full) {
      const matching = packs.filter(pack => pack?.context?.mode === 'maqam-scale'
        && pack.context?.maqamId === current.maqamId
        && tonicKey(pack.context?.tonic) === tonicKey(current.tonic)
        && (pack.context?.variantId || null) === current.variantId);
      const ascendingKey = [...new Set(matching.filter(pack => pack.context?.maqamDirection === 'ascending').map(maqamGroupKey))][0];
      const descendingKey = [...new Set(matching.filter(pack => pack.context?.maqamDirection === 'descending').map(maqamGroupKey))][0];
      const ascending = ascendingKey ? groupFromKey(matching, ascendingKey) : null;
      const descending = descendingKey ? groupFromKey(matching, descendingKey) : null;
      if (!ascending || !descending) {
        notify('يلزم وجود الصعود والهبوط لتصدير المقام كاملًا.');
        return;
      }
      groups = [ascending, descending];
    }

    const format = currentExportFormat();
    const scopeName = full ? 'صعود-وهبوط' : (current.direction === 'descending' ? 'هبوط' : 'صعود');
    const base = buildPatternName({ note: `مقام-${current.maqamAr}`, duration: scopeName });
    const oldText = button.textContent;
    button.disabled = true;
    button.textContent = 'جارٍ التجهيز…';
    try {
      if (format === 'json') {
        const payload = {
          schemaVersion: 2,
          type: 'ney-maqam-scale-export',
          exportedAt: new Date().toISOString(),
          settings: readBundle(),
          maqamId: current.maqamId,
          maqamAr: current.maqamAr,
          scope: full ? 'full' : current.direction,
          directions: groups.map(group => ({
            direction: group.direction,
            degrees: group.packs.map(pack => ({ degree: pack.context?.maqamDegree, note: pack.note, context: pack.context }))
          }))
        };
        triggerDownload(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), `${base}.json`);
      } else {
        const audio = await buildGroupAudio(groups);
        const advanced = readAdvanced();
        const blob = format === 'mp3'
          ? encodeMp3(audio.pcm, audio.sampleRate, advanced.mp3Bitrate)
          : encodeWav(audio.pcm, audio.sampleRate, advanced.wavBitDepth);
        triggerDownload(blob, `${base}.${format}`);
      }
      notify(`تم تصدير ${full ? 'المقام كاملًا' : scopeName} بصيغة ${format.toUpperCase()}.`);
    } catch (error) {
      console.error('Unified maqam export failed', error);
      notify('تعذر تجهيز التصدير. التسجيلات الأصلية بقيت محفوظة.');
    } finally {
      button.disabled = false;
      button.textContent = oldText;
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
      const degreeBlock = row.closest('.performance-maqam-degree');
      const key = groupCard?.dataset.performancePackKey;
      const degree = Number(degreeBlock?.querySelector('.performance-maqam-degree__number')?.textContent || 0);
      const group = key ? groupFromKey(packs, key) : null;
      pack = group?.packs.find(item => Number(item.context?.maqamDegree || 0) === degree) || null;
    }

    if (!pack) return null;
    const holder = row.parentElement;
    const index = holder ? [...holder.querySelectorAll(':scope > .performance-note-sample')].indexOf(row) : -1;
    const items = samplesFor(pack);
    const item = items[index] || items[0] || null;
    return item ? { pack, item } : null;
  }

  async function exportSampleFromButton(button) {
    const resolved = await resolveSample(button);
    if (!resolved) return;
    const { pack, item } = resolved;
    const store = window.NeyPerformancePackStore;
    const record = await store?.getAudio?.(item.sample.audioId);
    const audio = await recordPcm(record);
    if (!audio?.pcm?.length) return;
    const advanced = readAdvanced();
    const format = currentExportFormat();
    const targetRate = Number(advanced.exportSampleRate || audio.sampleRate || 48000);
    const pcm = resample(audio.pcm, audio.sampleRate, targetRate);
    const note = pack?.note?.english || pack?.note?.arabic || 'note';
    const duration = item.type === 'clean' ? 'reference' : (item.sample?.durationName || item.sample?.durationId || 'sample');
    const base = buildPatternName({ note, duration });
    try {
      if (format === 'json') {
        const payload = { schemaVersion: 2, exportedAt: new Date().toISOString(), note: pack.note, context: pack.context, sample: item.sample, settings: readBundle() };
        triggerDownload(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), `${base}.json`);
      } else {
        const blob = format === 'mp3' ? encodeMp3(pcm, targetRate, advanced.mp3Bitrate) : encodeWav(pcm, targetRate, advanced.wavBitDepth);
        triggerDownload(blob, `${base}.${format}`);
      }
      notify(`تم تصدير النغمة بصيغة ${format.toUpperCase()}.`);
    } catch (error) {
      console.error('Unified sample export failed', error);
      notify('تعذر تصدير النغمة بهذه الصيغة.');
    }
  }

  function updateSampleExportLabels() {
    const format = currentExportFormat().toUpperCase();
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
    for (const audioId of audioIds) await store.removeAudio?.(audioId);
    for (const pack of packs) await store.removePack?.(pack.packKey);
    document.dispatchEvent(new CustomEvent('ney:performance-pack-updated', { detail: { cleared: true } }));
  }

  function installExportInterceptors() {
    document.addEventListener('click', event => {
      const button = event.target.closest('[data-export-direction], [data-export-full], .performance-sample-download');
      if (!button) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (button.matches('.performance-sample-download')) exportSampleFromButton(button);
      else exportMaqamFromButton(button, button.hasAttribute('data-export-full'));
    }, true);

    const observer = new MutationObserver(updateSampleExportLabels);
    const list = $('#recordingsList');
    if (list) observer.observe(list, { childList: true, subtree: true });
    $('#exportFormat')?.addEventListener('change', updateSampleExportLabels);
    updateSampleExportLabels();
  }

  function installAdminInterceptors() {
    $('#exportSettingsButton')?.addEventListener('click', event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const bundle = readBundle();
      triggerDownload(new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' }), `ney-meyar-settings-${new Date().toISOString().slice(0, 10)}.json`);
      notify('تم تصدير جميع إعدادات الأداة.');
    }, true);

    $('#settingsImportInput')?.addEventListener('change', async event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const input = event.currentTarget;
      const file = input.files?.[0];
      if (!file) return;
      try {
        const payload = JSON.parse(await file.text());
        const bundle = payload?.basic || payload?.advanced ? payload : { basic: readBasic(), advanced: payload };
        applyBundle(bundle, { source: 'import' });
        notify('تم استيراد الإعدادات وتطبيقها على جميع الشاشات.');
      } catch (error) {
        console.error('Settings import failed', error);
        notify('ملف الإعدادات غير صالح.');
      } finally {
        input.value = '';
      }
    }, true);

    $('#resetSettingsButton')?.addEventListener('click', event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!window.confirm('استعادة جميع الإعدادات الأساسية والمتقدمة إلى الوضع الافتراضي؟')) return;
      applyBundle(defaults, { source: 'reset' });
      notify('تمت استعادة جميع الإعدادات الافتراضية.');
    }, true);

    $('#clearRecordsButton')?.addEventListener('click', async event => {
      if (clearBypass) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!window.confirm('مسح جميع التسجيلات المحفوظة، بما فيها Performance Pack؟ لا يمكن التراجع عن ذلك.')) return;

      const button = event.currentTarget;
      const originalConfirm = window.confirm;
      clearBypass = true;
      try {
        window.confirm = () => true;
        button.click();
      } finally {
        window.confirm = originalConfirm;
        clearBypass = false;
      }

      try {
        await clearPerformancePack();
        notify('تم مسح جميع التسجيلات المحفوظة.');
      } catch (error) {
        console.error('Performance Pack clear failed', error);
        notify('تعذر مسح بعض تسجيلات Performance Pack.');
      }
    }, true);
  }

  function installSettingsEvents() {
    $('#saveAdvancedButton')?.addEventListener('click', () => {
      window.setTimeout(() => {
        if (!restoring) persistBundle();
        if (!readAdvanced().persistSettings) {
          try { localStorage.removeItem(LEGACY_KEY); } catch (_) {}
        }
        dispatchApplied('save');
      }, 0);
    });

    ['#bpmValue', '#a4Reference'].forEach(selector => {
      $(selector)?.addEventListener('change', () => window.setTimeout(() => {
        if (!restoring && readAdvanced().persistSettings) persistBundle();
        dispatchApplied('basic');
      }, 0));
    });

    document.addEventListener('click', event => {
      if (!event.target.closest('#divisionControl .segment, #durationControl .duration-option')) return;
      window.setTimeout(() => {
        if (!restoring && readAdvanced().persistSettings) persistBundle();
        dispatchApplied('basic');
      }, 0);
    });

    $('#recordingQualityRange')?.addEventListener('input', syncCaptureRule);
    $('#defaultExportFormat')?.addEventListener('change', () => window.setTimeout(updateSampleExportLabels, 0));
  }

  function restoreUnifiedSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved?.schemaVersion === 3 && saved.basic && saved.advanced) {
        applyBundle(saved, { persist: false, source: 'restore' });
      }
    } catch (error) {
      console.warn('Unified settings restore failed', error);
    }
  }

  function initialize() {
    if (initialized) return true;
    if (!$('#advancedSettingsForm') || !$('#saveAdvancedButton') || !$('#divisionControl')) return false;
    initialized = true;
    enhanceFrequencyFields();
    observeDiagnostics();
    installSettingsEvents();
    installAdminInterceptors();
    installExportInterceptors();
    restoreUnifiedSettings();
    syncCaptureRule();
    refreshDiagnostics();
    dispatchApplied('initialize');
    return true;
  }

  window.NeySettingsRuntime = Object.freeze({
    storageKey: STORAGE_KEY,
    read: readBundle,
    readBasic,
    readAdvanced,
    recordingQuality: currentQuality,
    apply: applyBundle,
    persist: persistBundle,
    refreshDiagnostics
  });

  if (!initialize()) {
    const observer = new MutationObserver(() => {
      if (initialize()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 15000);
  }
})();
