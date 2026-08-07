(() => {
  'use strict';

  const DURATIONS = Object.freeze({
    whole: Object.freeze({ id: 'whole', ar: 'روند', beats: 4, symbol: '𝅝' }),
    half: Object.freeze({ id: 'half', ar: 'بلانش', beats: 2, symbol: '𝅗𝅥' }),
    quarter: Object.freeze({ id: 'quarter', ar: 'نوار', beats: 1, symbol: '♩' }),
    eighth: Object.freeze({ id: 'eighth', ar: 'كروش', beats: .5, symbol: '♪' }),
    sixteenth: Object.freeze({ id: 'sixteenth', ar: 'دبل كروش', beats: .25, symbol: '𝅘𝅥𝅯' })
  });

  const CONFIG = Object.freeze({
    ringSeconds: 12,
    sampleMs: 50,
    minimumClarity: .90,
    requiredPassRatio: .90,
    minimumCoverage: .80,
    extractionTrimMs: 6,
    minimumAudioMs: 45,
    minimumAudioCoverage: .80
  });

  const state = {
    stream: null,
    audioContext: null,
    source: null,
    processor: null,
    muteGain: null,
    sampleRate: 48000,
    ringChunks: [],
    ringSamples: 0,
    originalGetUserMedia: null,
    timer: null,
    active: null,
    saving: false,
    selected: DURATIONS.quarter,
    latestCandidate: null,
    ui: null
  };

  const $ = selector => document.querySelector(selector);
  const now = () => performance.now();
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function requiredPassRatio() {
    return Number(window.NeyCaptureAcceptancePolicy?.requiredPassRatio ?? CONFIG.requiredPassRatio);
  }

  function currentBpm() {
    return clamp(Math.round(Number($('#bpmValue')?.value || 60)), 30, 240);
  }

  function currentTolerance() {
    return clamp(Number($('#toleranceRange')?.value || 12), 1, 50);
  }

  function durationMs(duration = state.selected, bpm = currentBpm()) {
    return (60000 / bpm) * duration.beats;
  }

  function emitState(phase, detail = {}) {
    document.dispatchEvent(new CustomEvent('ney:educational-duration-state', {
      detail: { phase, ...detail }
    }));
  }

  function installStatusUi() {
    if (state.ui?.root?.isConnected) return;
    const host = $('#neyAutoCapturePanel');
    if (!host) return;

    let root = $('#neyEducationalCaptureStatus');
    if (!root) {
      root = document.createElement('section');
      root.id = 'neyEducationalCaptureStatus';
      root.className = 'ney-educational-capture-status';
      root.dataset.state = 'idle';
      root.innerHTML = `
        <div class="ney-educational-capture-status__copy">
          <strong id="neyEducationalCaptureBadge">التسجيل التعليمي: بانتظار نافذة صافية</strong>
          <span id="neyEducationalCaptureText">عند قبول النغمة يبدأ التسجيل الزمني تلقائيًا.</span>
        </div>
        <div class="ney-educational-capture-status__progress" aria-hidden="true">
          <span id="neyEducationalCaptureProgress"></span>
        </div>`;
      const metrics = host.querySelector('.ney-auto-capture__metrics');
      if (metrics) metrics.after(root);
      else host.append(root);
    }

    state.ui = {
      root,
      badge: $('#neyEducationalCaptureBadge'),
      text: $('#neyEducationalCaptureText'),
      progress: $('#neyEducationalCaptureProgress')
    };
  }

  function setUi(stateName, badge, text, progress = 0) {
    installStatusUi();
    if (!state.ui) return;
    state.ui.root.dataset.state = stateName;
    state.ui.badge.textContent = badge;
    state.ui.text.textContent = text;
    state.ui.progress.style.width = `${clamp(Number(progress) || 0, 0, 1) * 100}%`;
  }

  function durationFromButton(button) {
    const beats = Number(button?.dataset.duration);
    const name = String(button?.dataset.name || '');
    return Object.values(DURATIONS).find(item => item.beats === beats && item.ar === name) || null;
  }

  function ensureSixteenthButton() {
    const control = $('#durationControl');
    if (!control) return;
    control.classList.add('duration-control--five');
    if (!control.querySelector('[data-duration-id="sixteenth"]')) {
      const button = document.createElement('button');
      button.className = 'duration-option';
      button.type = 'button';
      button.dataset.duration = String(DURATIONS.sixteenth.beats);
      button.dataset.name = DURATIONS.sixteenth.ar;
      button.dataset.durationId = DURATIONS.sixteenth.id;
      button.setAttribute('aria-pressed', 'false');
      button.innerHTML = `<span class="music-symbol">${DURATIONS.sixteenth.symbol}</span><strong>${DURATIONS.sixteenth.ar}</strong><small>1/4</small>`;
      control.appendChild(button);
    }

    control.querySelectorAll('.duration-option').forEach(button => {
      const duration = durationFromButton(button);
      if (duration && !button.dataset.durationId) button.dataset.durationId = duration.id;
    });

    const active = control.querySelector('.duration-option.is-active');
    state.selected = durationFromButton(active) || DURATIONS.quarter;
  }

  function selectDuration(button) {
    const duration = durationFromButton(button);
    if (!duration) return;
    state.selected = duration;
    $('#durationControl')?.querySelectorAll('.duration-option').forEach(item => {
      const selected = item === button;
      item.classList.toggle('is-active', selected);
      item.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
    if (state.active) rejectActive('duration-changed', 0, 'تغيرت القيمة الزمنية أثناء التسجيل؛ أعد النغمة بالمدة الجديدة.');
    document.dispatchEvent(new CustomEvent('ney:educational-duration-changed', {
      detail: { ...duration, bpm: currentBpm(), milliseconds: durationMs(duration) }
    }));
  }

  function bindDurationControl() {
    const control = $('#durationControl');
    if (!control) return;
    control.addEventListener('click', event => {
      const button = event.target.closest('.duration-option');
      if (!button) return;
      selectDuration(button);
    });
  }

  function ringLimitSamples() {
    return Math.max(1, Math.round(state.sampleRate * CONFIG.ringSeconds));
  }

  function pushPcm(pcm) {
    const endTime = now();
    const chunkDurationMs = pcm.length / state.sampleRate * 1000;
    state.ringChunks.push({ pcm, startTime: endTime - chunkDurationMs, endTime });
    state.ringSamples += pcm.length;
    const limit = ringLimitSamples();
    while (state.ringSamples > limit && state.ringChunks.length > 1) {
      const removed = state.ringChunks.shift();
      state.ringSamples -= removed.pcm.length;
    }
  }

  function extractPcm(startTime, endTime) {
    let safeStart = startTime + CONFIG.extractionTrimMs;
    let safeEnd = endTime - CONFIG.extractionTrimMs;
    if (safeEnd <= safeStart) { safeStart = startTime; safeEnd = endTime; }
    const pieces = [];
    let total = 0;

    for (const chunk of state.ringChunks) {
      if (chunk.endTime <= safeStart || chunk.startTime >= safeEnd) continue;
      const duration = Math.max(.001, chunk.endTime - chunk.startTime);
      const overlapStart = Math.max(safeStart, chunk.startTime);
      const overlapEnd = Math.min(safeEnd, chunk.endTime);
      const from = clamp(Math.floor((overlapStart - chunk.startTime) / duration * chunk.pcm.length), 0, chunk.pcm.length);
      const to = clamp(Math.ceil((overlapEnd - chunk.startTime) / duration * chunk.pcm.length), from, chunk.pcm.length);
      if (to <= from) continue;
      const piece = chunk.pcm.slice(from, to);
      pieces.push(piece);
      total += piece.length;
    }

    if (!total) return null;
    const merged = new Float32Array(total);
    let offset = 0;
    pieces.forEach(piece => { merged.set(piece, offset); offset += piece.length; });
    return merged;
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
      const value = clamp(input, -1, 1);
      let sample = value < 0 ? Math.round(value * 0x800000) : Math.round(value * 0x7fffff);
      if (sample < 0) sample += 0x1000000;
      view.setUint8(offset, sample & 0xff);
      view.setUint8(offset + 1, sample >> 8 & 0xff);
      view.setUint8(offset + 2, sample >> 16 & 0xff);
      offset += 3;
    }
    return new Blob([buffer], { type: 'audio/wav' });
  }

  function textNumber(selector) {
    const match = String($(selector)?.textContent || '').replace(',', '.').match(/[+-]?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : NaN;
  }

  function currentFrame() {
    const english = String($('#noteName')?.textContent || '').trim();
    const arabic = String($('#noteArabic')?.textContent || '').trim();
    const frequency = textNumber('#frequencyValue');
    const target = textNumber('#targetValue');
    const cents = textNumber('#tunerNeedleValue');
    const clarity = textNumber('#clarityValue') / 100;
    const stable = String($('#stabilityValue')?.textContent || '').trim() === 'ثابتة';
    if (!english || english.includes('بانتظار') || !Number.isFinite(frequency)) return null;
    return { time: now(), english, arabic, frequency, target, cents, clarity, stable, tolerance: currentTolerance() };
  }

  function average(values, fallback = 0) {
    const finite = values.map(Number).filter(Number.isFinite);
    return finite.length ? finite.reduce((sum, value) => sum + value, 0) / finite.length : fallback;
  }

  function centsBetween(a, b) {
    const first = Number(a);
    const second = Number(b);
    return first > 0 && second > 0 ? 1200 * Math.log2(first / second) : Infinity;
  }

  function candidateTarget(candidate) {
    return average(candidate?.frames?.map(frame => frame.target) || [], NaN);
  }

  function framePasses(frame, candidate) {
    if (!frame || !candidate) return false;
    if (frame.english && candidate.english && frame.english !== candidate.english) return false;

    const expectedTarget = candidateTarget(candidate);
    if (Number.isFinite(expectedTarget) && Number.isFinite(Number(frame.target))) {
      const targetDistance = Math.abs(centsBetween(Number(frame.target), expectedTarget));
      if (targetDistance > Math.max(3, Number(candidate.tolerance || currentTolerance()))) return false;
    }

    return Boolean(frame.stable)
      && Number(frame.clarity) >= CONFIG.minimumClarity
      && Number.isFinite(Number(frame.cents))
      && Math.abs(Number(frame.cents)) <= Number(frame.tolerance || candidate.tolerance || currentTolerance());
  }

  function noteFromCandidate(candidate) {
    return {
      noteKey: candidate.key,
      english: candidate.english,
      arabic: candidate.arabic,
      targetFrequency: candidateTarget(candidate),
      measuredFrequency: average(candidate.frames.map(frame => frame.frequency), null),
      division: Number(candidate.frames?.[0]?.division || 24),
      a4: Number(candidate.frames?.[0]?.a4 || 440),
      register: 'unclassified'
    };
  }

  function contextFromCandidate(candidate) {
    return {
      mode: 'general-note',
      ...(candidate.captureContext || window.NeyAutoCapture?.getCaptureContext?.() || {}),
      division: Number(candidate.frames?.[0]?.division || 24),
      a4: Number(candidate.frames?.[0]?.a4 || 440)
    };
  }

  function qualityMetrics(frames, tolerance, passRatio) {
    const passing = frames.filter(frame => framePasses(frame, state.active?.candidate || state.latestCandidate));
    return {
      passRatio,
      meanClarity: average(passing.map(frame => frame.clarity), average(frames.map(frame => frame.clarity), 0)),
      meanAbsCents: average(passing.map(frame => Math.abs(Number(frame.cents))), average(frames.map(frame => Math.abs(Number(frame.cents))), 999)),
      tolerance
    };
  }

  function newAudioId(duration) {
    const id = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return `edu-${duration.id}-${id}`;
  }

  function rejectActive(reason, passRatio = 0, message = '') {
    const active = state.active;
    state.active = null;
    const percent = Math.round(Number(passRatio || 0) * 100);
    const text = message || `لم يكتمل التسجيل التعليمي؛ نسبة القراءات المقبولة ${percent}% وتحتاج إلى 90% على الأقل.`;
    setUi('warning', 'التسجيل التعليمي لم يكتمل', `${text} يمكنك إعادة النغمة مباشرة.`, 0);
    document.dispatchEvent(new CustomEvent('ney:educational-duration-rejected', {
      detail: { reason, passRatio, candidate: active?.candidate || state.latestCandidate }
    }));
    emitState('rejected', { reason, passRatio, candidate: active?.candidate || null });
  }

  async function saveEducational(active, metrics) {
    const store = window.NeyPerformancePackStore;
    if (!store?.upsertEducationalSample) {
      rejectActive('store-unavailable', metrics.passRatio, 'تعذر الوصول إلى مخزن التسجيلات.');
      return;
    }

    state.saving = true;
    setUi('saving', 'جارٍ حفظ التسجيل التعليمي', 'اكتملت المدة المقبولة؛ جارٍ إنشاء ملف WAV وحفظه.', 1);
    emitState('saving', { candidate: active.candidate, metrics });

    try {
      const pcm = extractPcm(active.startTime, active.endTime);
      const actualMs = pcm ? pcm.length / state.sampleRate * 1000 : 0;
      const requiredAudioMs = Math.max(CONFIG.minimumAudioMs, active.targetMs * CONFIG.minimumAudioCoverage);
      if (!pcm || actualMs < requiredAudioMs) {
        state.saving = false;
        state.active = active;
        rejectActive('audio-window', metrics.passRatio, `لم تكتمل نافذة الصوت المسجلة (${Math.round(actualMs)} ms من ${Math.round(active.targetMs)} ms).`);
        return;
      }

      const note = noteFromCandidate(active.candidate);
      const context = contextFromCandidate(active.candidate);
      const durationKey = `${active.duration.id}@${active.bpm}`;
      const packKey = store.makePackKey({ note, context });
      const sampleForScore = { metrics, passRatio: metrics.passRatio };
      const existing = await store.getPack(packKey);
      const previous = existing?.samples?.educational?.[durationKey];

      if (previous && store.qualityScore(previous) >= store.qualityScore(sampleForScore)) {
        state.saving = false;
        setUi('success', 'التسجيل التعليمي مقبول ✓', 'المحاولة الحالية اجتازت الشروط، لكن التسجيل الأفضل السابق بقي محفوظًا في شاشة التسجيلات.', 1);
        document.dispatchEvent(new CustomEvent('ney:educational-duration-retained', {
          detail: { packKey, durationKey, duration: active.duration, bpm: active.bpm, note, pack: existing, metrics }
        }));
        emitState('retained', { note, packKey, metrics });
        return;
      }

      const audioId = newAudioId(active.duration);
      await store.saveAudio({
        audioId,
        blob: encodeWav24(pcm, state.sampleRate),
        pcm,
        sampleRate: state.sampleRate,
        mimeType: 'audio/wav'
      });

      const result = await store.upsertEducationalSample({
        note,
        context,
        sample: {
          audioId,
          style: 'clean',
          passRatio: metrics.passRatio,
          durationId: active.duration.id,
          durationName: active.duration.ar,
          durationKey,
          beats: active.duration.beats,
          bpm: active.bpm,
          expectedDurationMs: active.targetMs,
          durationMs: actualMs,
          sampleRate: state.sampleRate,
          bitDepth: 24,
          mimeType: 'audio/wav',
          score: store.qualityScore(sampleForScore),
          metrics,
          referenceWindow: { startTime: active.startTime, endTime: active.endTime, durationMs: actualMs }
        }
      });

      if (!result.changed) {
        await store.removeAudio?.(audioId);
        state.saving = false;
        if (result.rejected) {
          state.active = active;
          rejectActive('store-rejected', metrics.passRatio, 'رفض مخزن التسجيلات العينة بعد التحقق النهائي.');
          return;
        }
        setUi('success', 'التسجيل التعليمي مقبول ✓', 'بقي التسجيل الأفضل السابق محفوظًا في شاشة التسجيلات.', 1);
        document.dispatchEvent(new CustomEvent('ney:educational-duration-retained', {
          detail: { packKey, durationKey, duration: active.duration, bpm: active.bpm, note, pack: result.pack || existing, metrics }
        }));
        emitState('retained', { note, packKey, metrics });
        return;
      }

      if (result.replacedAudioId && result.replacedAudioId !== audioId) await store.removeAudio?.(result.replacedAudioId);
      state.saving = false;
      setUi('success', 'تم حفظ التسجيل التعليمي ✓', `تم إنشاء ملف WAV وحفظ ${note.arabic || note.english} فعليًا في شاشة التسجيلات.`, 1);
      document.dispatchEvent(new CustomEvent('ney:educational-duration-saved', {
        detail: { packKey, durationKey, duration: active.duration, bpm: active.bpm, note, pack: result.pack, audioId, metrics }
      }));
      emitState('saved', { note, packKey, audioId, metrics });
    } catch (error) {
      console.error('Educational duration save failed', error);
      state.saving = false;
      state.active = active;
      rejectActive('save-error', metrics.passRatio, 'حدث خطأ أثناء إنشاء أو حفظ التسجيل الصوتي.');
    }
  }

  function finishActive() {
    const active = state.active;
    if (!active) return;
    state.active = null;

    const frames = active.frames.filter(frame => Number(frame.time) >= active.startTime && Number(frame.time) <= active.endTime + CONFIG.sampleMs);
    const expectedFrames = Math.max(1, Math.round(active.targetMs / CONFIG.sampleMs));
    const coverage = Math.min(1, frames.length / expectedFrames);
    const passedFrames = frames.filter(frame => framePasses(frame, active.candidate)).length;
    const passRatio = frames.length ? passedFrames / frames.length : 0;

    if (coverage < CONFIG.minimumCoverage) {
      state.active = active;
      rejectActive('frame-coverage', passRatio, `لم تكتمل تغطية مدة التسجيل (${Math.round(coverage * 100)}%).`);
      return;
    }

    if (passRatio < requiredPassRatio()) {
      state.active = active;
      rejectActive('pass-ratio', passRatio);
      return;
    }

    const metrics = qualityMetrics(frames, active.tolerance, passRatio);
    saveEducational(active, metrics);
  }

  function monitorActive() {
    if (!state.active || state.saving) return;
    const active = state.active;
    const frame = currentFrame();
    if (frame) active.frames.push(frame);

    const clock = frame?.time || now();
    const progress = clamp((clock - active.startTime) / active.targetMs, 0, 1);
    setUi('recording', 'جارٍ التسجيل التعليمي', `${active.duration.ar} · BPM ${active.bpm} · ${Math.round(progress * 100)}%`, progress);
    emitState('recording', { progress, candidate: active.candidate, duration: active.duration, bpm: active.bpm });

    if (clock >= active.endTime) finishActive();
  }

  function beginFromCandidate(candidate) {
    if (!candidate || candidate.style !== 'clean' || Number(candidate.passRatio) < requiredPassRatio()) return;
    if (state.active || state.saving) return;

    const duration = state.selected;
    const bpm = currentBpm();
    const targetMs = durationMs(duration, bpm);
    const candidateWindowMs = Number(candidate.endTime) - Number(candidate.startTime);
    const endTime = Number(candidate.startTime) + targetMs;
    const baseFrames = (candidate.frames || [])
      .filter(frame => Number(frame.time) >= Number(candidate.startTime) && Number(frame.time) <= Math.min(Number(candidate.endTime), endTime))
      .map(frame => ({ ...frame }));

    state.latestCandidate = candidate;
    state.active = {
      candidate: { ...candidate, captureContext: candidate.captureContext ? { ...candidate.captureContext } : null, frames: (candidate.frames || []).map(frame => ({ ...frame })) },
      duration,
      bpm,
      targetMs,
      startTime: Number(candidate.startTime),
      endTime,
      tolerance: Number(candidate.tolerance || currentTolerance()),
      frames: baseFrames
    };

    setUi('recording', 'بدأ التسجيل التعليمي', `${duration.ar} · BPM ${bpm} · استمر على النغمة حتى اكتمال المدة.`, clamp(candidateWindowMs / targetMs, 0, 1));
    document.dispatchEvent(new CustomEvent('ney:educational-duration-started', {
      detail: { candidate: state.active.candidate, duration, bpm, milliseconds: targetMs }
    }));
    emitState('started', { candidate: state.active.candidate, duration, bpm, milliseconds: targetMs });

    if (targetMs <= candidateWindowMs) finishActive();
  }

  function disconnectAudio() {
    try { state.processor?.disconnect(); } catch (_) {}
    try { state.muteGain?.disconnect(); } catch (_) {}
    try { state.source?.disconnect(); } catch (_) {}
    try { state.audioContext?.close?.(); } catch (_) {}
    state.processor = null;
    state.muteGain = null;
    state.source = null;
    state.audioContext = null;
    state.ringChunks = [];
    state.ringSamples = 0;
    state.active = null;
    state.saving = false;
    setUi('idle', 'التسجيل التعليمي: بانتظار الميكروفون', 'شغّل الميكروفون ثم اعزف النغمة المطلوبة.', 0);
  }

  async function startAudio(stream) {
    disconnectAudio();
    if (!stream?.getAudioTracks?.().length) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    state.stream = stream;
    state.audioContext = new AudioContextClass();
    if (state.audioContext.state === 'suspended') await state.audioContext.resume();
    state.sampleRate = state.audioContext.sampleRate;
    state.source = state.audioContext.createMediaStreamSource(stream);

    if (state.audioContext.createScriptProcessor) {
      state.processor = state.audioContext.createScriptProcessor(2048, 1, 1);
      state.muteGain = state.audioContext.createGain();
      state.muteGain.gain.value = 0;
      state.processor.onaudioprocess = event => pushPcm(new Float32Array(event.inputBuffer.getChannelData(0)));
      state.source.connect(state.processor);
      state.processor.connect(state.muteGain).connect(state.audioContext.destination);
    }

    setUi('idle', 'التسجيل التعليمي جاهز', 'بانتظار أول نافذة صافية مقبولة.', 0);
    stream.getAudioTracks()[0]?.addEventListener('ended', disconnectAudio, { once: true });
  }

  function installMediaBridge() {
    const mediaDevices = navigator.mediaDevices;
    if (!mediaDevices?.getUserMedia || state.originalGetUserMedia) return;
    state.originalGetUserMedia = mediaDevices.getUserMedia.bind(mediaDevices);
    try {
      mediaDevices.getUserMedia = async constraints => {
        const stream = await state.originalGetUserMedia(constraints);
        if (constraints?.audio && stream?.getAudioTracks?.().length) queueMicrotask(() => startAudio(stream));
        return stream;
      };
    } catch (error) {
      console.warn('Educational duration media bridge unavailable', error);
      setUi('warning', 'التسجيل التعليمي غير جاهز', 'تعذر ربط وحدة التسجيل التعليمي بالميكروفون.', 0);
    }
  }

  function initialize() {
    ensureSixteenthButton();
    bindDurationControl();
    installStatusUi();
    installMediaBridge();
    state.timer = window.setInterval(monitorActive, CONFIG.sampleMs);

    document.addEventListener('ney:auto-capture-candidate', event => beginFromCandidate(event.detail));

    window.NeyEducationalDurationCapture = Object.freeze({
      durations: DURATIONS,
      getSelected: () => ({ ...state.selected, bpm: currentBpm(), milliseconds: durationMs() }),
      isCapturing: () => Boolean(state.active),
      isSaving: () => state.saving,
      getState: () => state.saving ? 'saving' : (state.active ? 'recording' : 'idle')
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
