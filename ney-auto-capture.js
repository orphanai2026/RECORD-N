(() => {
  'use strict';

  const TAXONOMY = Object.freeze({
    clean: { id: 'clean', ar: 'صافية / مرجعية', en: 'Clean reference' },
    vibrato: { id: 'vibrato', ar: 'فبراتو', en: 'Vibrato' },
    glissando: { id: 'glissando', ar: 'غليساندو', en: 'Glissando' },
    portamento: { id: 'portamento', ar: 'بورتامنتو', en: 'Portamento' },
    acciaccatura: { id: 'acciaccatura', ar: 'ضربة زخرفية', en: 'Çarpma / Acciaccatura' },
    trill: { id: 'trill', ar: 'تريل', en: 'Trill' },
    unclassified: { id: 'unclassified', ar: 'قيد التصنيف', en: 'Unclassified' }
  });

  const CONFIG = Object.freeze({
    ringSeconds: 8,
    pitchSampleMs: 50,
    attackGuardMs: 180,
    releaseGapMs: 150,
    minimumEventMs: 180,
    cleanWindowMs: 500,
    minimumClarity: .90,
    requiredPassRatio: 1,
    candidateCooldownMs: 650,
    maxRecentEvents: 24,
    extractionInnerTrimMs: 8,
    minimumSavedAudioMs: 260
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
    pitchTimer: null,
    activeEvent: null,
    recentEvents: [],
    bestByNote: new Map(),
    lastCandidateAt: 0,
    originalGetUserMedia: null,
    ui: null,
    running: false,
    captureContext: null,
    persistChains: new Map()
  };

  const now = () => performance.now();
  const $ = selector => document.querySelector(selector);

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function numberFromText(element) {
    if (!element) return NaN;
    const match = String(element.textContent || '').replace(',', '.').match(/[+-]?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : NaN;
  }

  function installUi() {
    if ($('#neyAutoCapturePanel')) return;
    const recordingPanel = $('.recording-panel');
    const workflow = recordingPanel?.querySelector('.recording-workflow');
    if (!recordingPanel || !workflow) return;

    const panel = document.createElement('section');
    panel.id = 'neyAutoCapturePanel';
    panel.className = 'ney-auto-capture';
    panel.setAttribute('aria-label', 'حالة الالتقاط الذاتي المتخصص للناي');
    panel.innerHTML = `
      <div class="ney-auto-capture__header">
        <div>
          <strong>Ney Auto-Capture</strong>
          <span>رصد تلقائي مستمر وانتقاء أنظف نافذة دون تدخل أثناء العزف</span>
        </div>
        <span class="ney-auto-capture__badge" id="neyAutoCaptureBadge" data-state="idle">بانتظار الميكروفون</span>
      </div>
      <div class="ney-auto-capture__metrics">
        <div><span>النغمة الحالية</span><strong id="neyCaptureNote">—</strong></div>
        <div><span>النافذة النظيفة</span><strong id="neyCaptureWindow">0%</strong></div>
        <div><span>ذاكرة الصوت</span><strong id="neyCaptureBuffer">0.0 ث</strong></div>
        <div><span>نوع الأداء</span><strong id="neyCaptureStyle">قيد التصنيف</strong></div>
      </div>
      <div class="ney-auto-capture__status" id="neyCaptureStatus" aria-live="polite">
        شغّل الميكروفون وابدأ العزف؛ المحرك سيعمل تلقائيًا.
      </div>
      <div class="ney-auto-capture__rule">
        <span>شرط العينة المرجعية</span>
        <strong>100% من القراءات داخل هامش الضبط المختار · جودة ≥ 90%</strong>
      </div>
    `;
    workflow.before(panel);

    state.ui = {
      panel,
      badge: $('#neyAutoCaptureBadge'),
      note: $('#neyCaptureNote'),
      window: $('#neyCaptureWindow'),
      buffer: $('#neyCaptureBuffer'),
      style: $('#neyCaptureStyle'),
      status: $('#neyCaptureStatus')
    };
  }

  function updateBadge(text, mode = 'idle') {
    if (!state.ui) return;
    state.ui.badge.textContent = text;
    state.ui.badge.dataset.state = mode;
  }

  function updateStatus(text) {
    if (state.ui) state.ui.status.textContent = text;
  }

  function updateBufferMetric() {
    if (!state.ui || !state.sampleRate) return;
    state.ui.buffer.textContent = `${(state.ringSamples / state.sampleRate).toFixed(1)} ث`;
  }

  function currentDivision() {
    return Number($('#divisionControl .segment.is-active')?.dataset.division || 24);
  }

  function currentTolerance() {
    return clamp(Number($('#toleranceRange')?.value || 12), 1, 50);
  }

  function readPitchFrame() {
    const english = String($('#noteName')?.textContent || '').trim();
    const arabic = String($('#noteArabic')?.textContent || '').trim();
    const frequency = numberFromText($('#frequencyValue'));
    const target = numberFromText($('#targetValue'));
    const cents = numberFromText($('#tunerNeedleValue'));
    const clarityPercent = numberFromText($('#clarityValue'));
    const stableText = String($('#stabilityValue')?.textContent || '').trim();
    const waiting = !english || english.includes('بانتظار') || !Number.isFinite(frequency) || frequency <= 0;
    if (waiting) return null;

    return {
      time: now(),
      english,
      arabic,
      frequency,
      target: Number.isFinite(target) ? target : null,
      cents: Number.isFinite(cents) ? cents : 999,
      clarity: Number.isFinite(clarityPercent) ? clarityPercent / 100 : 0,
      stable: stableText === 'ثابتة',
      division: currentDivision(),
      a4: Number($('#a4Reference')?.value || 440),
      tolerance: currentTolerance()
    };
  }

  function noteKey(frame) {
    return `${frame.english}|${frame.target ? frame.target.toFixed(3) : 'na'}|${frame.division}`;
  }

  function ringLimitSamples() {
    return Math.max(1, Math.round(state.sampleRate * CONFIG.ringSeconds));
  }

  function pushPcm(pcm) {
    const endTime = now();
    const durationMs = (pcm.length / state.sampleRate) * 1000;
    const chunk = {
      pcm,
      startTime: endTime - durationMs,
      endTime
    };
    state.ringChunks.push(chunk);
    state.ringSamples += pcm.length;
    const limit = ringLimitSamples();
    while (state.ringSamples > limit && state.ringChunks.length > 1) {
      const removed = state.ringChunks.shift();
      state.ringSamples -= removed.pcm.length;
    }
    updateBufferMetric();
  }

  function extractPcm(startTime, endTime) {
    if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) return null;
    let safeStart = startTime + CONFIG.extractionInnerTrimMs;
    let safeEnd = endTime - CONFIG.extractionInnerTrimMs;
    if (safeEnd <= safeStart) {
      safeStart = startTime;
      safeEnd = endTime;
    }

    const slices = [];
    let total = 0;
    for (const chunk of state.ringChunks) {
      if (chunk.endTime <= safeStart || chunk.startTime >= safeEnd) continue;
      const duration = Math.max(.001, chunk.endTime - chunk.startTime);
      const overlapStart = Math.max(safeStart, chunk.startTime);
      const overlapEnd = Math.min(safeEnd, chunk.endTime);
      const from = clamp(Math.floor(((overlapStart - chunk.startTime) / duration) * chunk.pcm.length), 0, chunk.pcm.length);
      const to = clamp(Math.ceil(((overlapEnd - chunk.startTime) / duration) * chunk.pcm.length), from, chunk.pcm.length);
      if (to <= from) continue;
      const slice = chunk.pcm.slice(from, to);
      slices.push(slice);
      total += slice.length;
    }

    if (!total) return null;
    const merged = new Float32Array(total);
    let offset = 0;
    for (const slice of slices) {
      merged.set(slice, offset);
      offset += slice.length;
    }
    return merged;
  }

  function writeAscii(view, offset, text) {
    for (let index = 0; index < text.length; index += 1) view.setUint8(offset + index, text.charCodeAt(index));
  }

  function encodeWav24(pcm, sampleRate) {
    const bytesPerSample = 3;
    const dataSize = pcm.length * bytesPerSample;
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
    view.setUint32(28, sampleRate * bytesPerSample, true);
    view.setUint16(32, bytesPerSample, true);
    view.setUint16(34, 24, true);
    writeAscii(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    let offset = 44;
    for (let index = 0; index < pcm.length; index += 1) {
      const value = clamp(pcm[index], -1, 1);
      let sample = value < 0 ? Math.round(value * 0x800000) : Math.round(value * 0x7fffff);
      if (sample < 0) sample += 0x1000000;
      view.setUint8(offset, sample & 0xff);
      view.setUint8(offset + 1, (sample >> 8) & 0xff);
      view.setUint8(offset + 2, (sample >> 16) & 0xff);
      offset += 3;
    }
    return new Blob([buffer], { type: 'audio/wav' });
  }

  function disconnectAudioGraph() {
    try { state.processor?.disconnect(); } catch (_) {}
    try { state.muteGain?.disconnect(); } catch (_) {}
    try { state.source?.disconnect(); } catch (_) {}
    state.processor = null;
    state.muteGain = null;
    state.source = null;
  }

  async function stopCapture() {
    clearInterval(state.pitchTimer);
    state.pitchTimer = null;
    finalizeActiveEvent('microphone-stop');
    disconnectAudioGraph();
    if (state.audioContext && state.audioContext.state !== 'closed') {
      try { await state.audioContext.close(); } catch (_) {}
    }
    state.audioContext = null;
    state.stream = null;
    state.ringChunks = [];
    state.ringSamples = 0;
    state.running = false;
    if (state.ui) {
      state.ui.note.textContent = '—';
      state.ui.window.textContent = '0%';
      state.ui.buffer.textContent = '0.0 ث';
      state.ui.style.textContent = TAXONOMY.unclassified.ar;
    }
    updateBadge('بانتظار الميكروفون', 'idle');
    updateStatus('شغّل الميكروفون وابدأ العزف؛ المحرك سيعمل تلقائيًا.');
  }

  async function startCapture(stream) {
    await stopCapture();
    if (!stream?.getAudioTracks?.().length) return;

    state.stream = stream;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      updateBadge('غير مدعوم', 'danger');
      updateStatus('هذا المتصفح لا يدعم Web Audio المطلوب للالتقاط الذاتي.');
      return;
    }

    try {
      state.audioContext = new AudioContextClass();
      if (state.audioContext.state === 'suspended') await state.audioContext.resume();
      state.sampleRate = state.audioContext.sampleRate;
      state.source = state.audioContext.createMediaStreamSource(stream);

      if (state.audioContext.createScriptProcessor) {
        state.processor = state.audioContext.createScriptProcessor(2048, 1, 1);
        state.muteGain = state.audioContext.createGain();
        state.muteGain.gain.value = 0;
        state.processor.onaudioprocess = event => {
          if (!state.running) return;
          pushPcm(new Float32Array(event.inputBuffer.getChannelData(0)));
        };
        state.source.connect(state.processor);
        state.processor.connect(state.muteGain).connect(state.audioContext.destination);
      }

      state.running = true;
      state.pitchTimer = window.setInterval(samplePitch, CONFIG.pitchSampleMs);
      updateBadge('رصد مستمر', 'active');
      updateStatus('المحرك يستمع الآن ويبحث عن أنظف نافذة تلقائيًا.');

      const audioTrack = stream.getAudioTracks()[0];
      audioTrack?.addEventListener('ended', () => stopCapture(), { once: true });
    } catch (error) {
      console.error('Ney Auto-Capture start failed', error);
      updateBadge('تعذر البدء', 'danger');
      updateStatus('تعذر تشغيل محرك الالتقاط الذاتي؛ التسجيل الحالي ما زال متاحًا كمسار احتياطي.');
    }
  }

  function beginEvent(frame) {
    state.activeEvent = {
      key: noteKey(frame),
      english: frame.english,
      arabic: frame.arabic,
      startedAt: frame.time,
      lastFrameAt: frame.time,
      frames: [frame],
      cleanCandidate: null
    };
    if (state.ui) {
      state.ui.note.textContent = frame.arabic || frame.english;
      state.ui.window.textContent = '0%';
      state.ui.style.textContent = TAXONOMY.unclassified.ar;
    }
    updateBadge('تحليل النغمة', 'active');
  }

  function framePassesCleanRule(frame) {
    return frame.stable && frame.clarity >= CONFIG.minimumClarity && Math.abs(frame.cents) <= frame.tolerance;
  }

  function standardDeviation(values) {
    if (!values.length) return 0;
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length);
  }

  function detectStyle(frames, cleanPassRatio) {
    if (!frames.length) return TAXONOMY.unclassified;
    const cents = frames.map(frame => frame.cents).filter(Number.isFinite);
    const deviation = standardDeviation(cents);
    const range = cents.length ? Math.max(...cents) - Math.min(...cents) : 0;
    const mean = cents.length ? cents.reduce((a, b) => a + b, 0) / cents.length : 0;
    let crossings = 0;
    for (let index = 1; index < cents.length; index += 1) {
      if ((cents[index - 1] - mean) * (cents[index] - mean) < 0) crossings += 1;
    }

    if (cleanPassRatio === 1 && deviation <= 3 && range <= 10) return TAXONOMY.clean;
    if (deviation >= 3 && range >= 8 && crossings >= 3) return TAXONOMY.vibrato;
    return TAXONOMY.unclassified;
  }

  function averageFinite(values, fallback = null) {
    const finite = values.filter(Number.isFinite);
    if (!finite.length) return fallback;
    return finite.reduce((sum, value) => sum + value, 0) / finite.length;
  }

  function centsBetween(a, b) {
    const first = Number(a);
    const second = Number(b);
    if (!(first > 0) || !(second > 0)) return Infinity;
    return 1200 * Math.log2(first / second);
  }

  function candidateTarget(candidate) {
    return averageFinite(candidate.frames.map(frame => Number(frame.target)), null);
  }

  function frozenCaptureContext() {
    return state.captureContext && typeof state.captureContext === 'object' ? { ...state.captureContext } : null;
  }

  function candidateMatchesCaptureTarget(candidate) {
    const context = candidate.captureContext || state.captureContext;
    if (context?.mode !== 'maqam-scale' || !(Number(context.expectedTargetFrequency) > 0)) return true;
    const actual = candidateTarget(candidate);
    const expected = Number(context.expectedTargetFrequency);
    const tolerance = Math.max(1, Number(candidate.tolerance || currentTolerance()));
    return Number.isFinite(actual) && Math.abs(centsBetween(actual, expected)) <= tolerance;
  }

  function rejectOffTargetCandidate(candidate) {
    const context = candidate.captureContext || state.captureContext || {};
    const expected = context.expectedArabic || context.expectedEnglish || window.NeyMaqamScaleCaptureFlow?.getExpected?.()?.arabic || 'الدرجة المطلوبة';
    updateBadge('نغمة غير مطلوبة', 'warning');
    updateStatus(`${candidate.arabic || candidate.english} صافية، لكنها ليست الدرجة المطلوبة الآن (${expected})؛ لم تُحفظ ولم تتقدم الجلسة.`);
    document.dispatchEvent(new CustomEvent('ney:maqam-target-rejected', {
      detail: {
        candidate,
        context: { ...context },
        expectedTargetFrequency: Number(context.expectedTargetFrequency) || null,
        actualTargetFrequency: candidateTarget(candidate)
      }
    }));
  }

  function candidateNote(candidate) {
    const first = candidate.frames[0] || {};
    return {
      noteKey: candidate.key,
      english: candidate.english,
      arabic: candidate.arabic,
      targetFrequency: averageFinite(candidate.frames.map(frame => frame.target), first.target ?? null),
      measuredFrequency: averageFinite(candidate.frames.map(frame => frame.frequency), null),
      division: Number(first.division || currentDivision()),
      a4: Number(first.a4 || $('#a4Reference')?.value || 440),
      register: 'unclassified'
    };
  }

  function candidateContext(candidate) {
    const first = candidate.frames[0] || {};
    const captured = candidate.captureContext || state.captureContext || {};
    return {
      mode: 'general-note',
      ...captured,
      division: Number(captured.division || first.division || currentDivision()),
      a4: Number(captured.a4 || first.a4 || $('#a4Reference')?.value || 440)
    };
  }

  function newAudioId() {
    if (window.crypto?.randomUUID) return `clean-${window.crypto.randomUUID()}`;
    return `clean-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  async function persistCleanCandidate(candidate) {
    if (!candidateMatchesCaptureTarget(candidate)) {
      rejectOffTargetCandidate(candidate);
      return;
    }

    const store = window.NeyPerformancePackStore;
    if (!store) {
      updateBadge('نافذة صافية ✓', 'success');
      updateStatus('تم العثور على نافذة صافية، لكن مخزن Performance Pack لم يجهز بعد؛ لم يتأثر التسجيل القديم.');
      return;
    }

    const note = candidateNote(candidate);
    const context = candidateContext(candidate);
    const packKey = store.makePackKey({ note, context });
    const existing = await store.getPack(packKey);
    const incomingScore = store.qualityScore(candidate);
    const existingScore = store.qualityScore(existing?.samples?.clean || {});

    if (existing?.samples?.clean && incomingScore <= existingScore) {
      updateBadge('العينة الأفضل محفوظة ✓', 'success');
      updateStatus(`تم رصد نافذة صافية لـ ${candidate.arabic || candidate.english}، لكن العينة المحفوظة أفضل أو مساوية؛ لم تُستبدل.`);
      return;
    }

    const pcm = extractPcm(candidate.startTime, candidate.endTime);
    const durationMs = pcm ? (pcm.length / state.sampleRate) * 1000 : 0;
    if (!pcm || durationMs < CONFIG.minimumSavedAudioMs) {
      updateBadge('نافذة صافية ✓', 'success');
      updateStatus('تحققت شروط النغمة، لكن لم يكتمل تطابق النافذة مع ذاكرة الصوت بما يكفي للحفظ؛ أواصل البحث تلقائيًا.');
      return;
    }

    const audioId = newAudioId();
    const wavBlob = encodeWav24(pcm, state.sampleRate);
    await store.saveAudio({
      audioId,
      blob: wavBlob,
      pcm,
      sampleRate: state.sampleRate,
      mimeType: 'audio/wav'
    });

    const result = await store.upsertCleanReference({
      note,
      context,
      sample: {
        ...candidate,
        audioId,
        sampleRate: state.sampleRate,
        durationMs,
        mimeType: 'audio/wav',
        bitDepth: 24,
        metrics: {
          passRatio: candidate.passRatio,
          meanClarity: candidate.meanClarity,
          meanAbsCents: candidate.meanAbsCents,
          tolerance: candidate.tolerance
        },
        referenceWindow: {
          startTime: candidate.startTime,
          endTime: candidate.endTime,
          durationMs
        }
      }
    });

    if (!result.changed) {
      if (result.rejected) {
        rejectOffTargetCandidate(candidate);
        return;
      }
      updateBadge('العينة الأفضل محفوظة ✓', 'success');
      updateStatus(`العينة المرجعية الحالية لـ ${candidate.arabic || candidate.english} بقيت الأفضل ولم تُستبدل.`);
      return;
    }

    updateBadge('حُفظت العينة ✓', 'success');
    updateStatus(`حُفظت تلقائيًا أفضل عينة صافية لـ ${candidate.arabic || candidate.english} داخل Performance Pack — جودة ${Math.round(candidate.meanClarity * 100)}%.`);
    document.dispatchEvent(new CustomEvent('ney:auto-capture-saved', {
      detail: { candidate, note, context, packKey, audioId, durationMs, pack: result.pack }
    }));
  }

  function queuePersistence(candidate) {
    const key = candidate.key;
    const previous = state.persistChains.get(key) || Promise.resolve();
    const next = previous
      .catch(() => {})
      .then(() => persistCleanCandidate(candidate))
      .catch(error => {
        console.error('Ney Auto-Capture persistence failed', error);
        updateBadge('الحفظ تعذر', 'warning');
        updateStatus('تم تحليل النغمة لكن تعذر حفظ Performance Pack محليًا؛ مسار التسجيل القديم ما زال متاحًا.');
      })
      .finally(() => {
        if (state.persistChains.get(key) === next) state.persistChains.delete(key);
      });
    state.persistChains.set(key, next);
  }

  function evaluateCleanWindow(event) {
    const elapsed = event.lastFrameAt - event.startedAt;
    const usable = event.frames.filter(frame => frame.time - event.startedAt >= CONFIG.attackGuardMs);
    const windowStart = event.lastFrameAt - CONFIG.cleanWindowMs;
    const windowFrames = usable.filter(frame => frame.time >= windowStart);
    const expectedFrames = Math.max(1, Math.floor(CONFIG.cleanWindowMs / CONFIG.pitchSampleMs));
    const coverage = clamp(windowFrames.length / expectedFrames, 0, 1);
    const passCount = windowFrames.filter(framePassesCleanRule).length;
    const passRatio = windowFrames.length ? passCount / windowFrames.length : 0;

    if (state.ui) state.ui.window.textContent = `${Math.round(passRatio * coverage * 100)}%`;
    if (elapsed < CONFIG.attackGuardMs + CONFIG.cleanWindowMs || coverage < .8) return;

    const style = detectStyle(windowFrames, passRatio);
    if (state.ui) state.ui.style.textContent = style.ar;

    if (passRatio < CONFIG.requiredPassRatio || style.id !== 'clean') {
      updateStatus(style.id === 'vibrato'
        ? 'تم رصد فبراتو محتمل؛ لن يُعامل كعينة صافية ولن يُعتمد تلقائيًا في هذا الإصدار.'
        : 'أواصل البحث؛ النافذة الحالية ليست صافية بالكامل وفق شروط الجودة.');
      return;
    }

    const meanClarity = windowFrames.reduce((sum, frame) => sum + frame.clarity, 0) / windowFrames.length;
    const meanAbsCents = windowFrames.reduce((sum, frame) => sum + Math.abs(frame.cents), 0) / windowFrames.length;
    const tolerance = Math.max(1, windowFrames[0]?.tolerance || 12);
    const score = clamp(meanClarity * .62 + (1 - Math.min(1, meanAbsCents / tolerance)) * .38, 0, 1);

    const candidate = {
      key: event.key,
      english: event.english,
      arabic: event.arabic,
      style: TAXONOMY.clean.id,
      score,
      passRatio,
      meanClarity,
      meanAbsCents,
      tolerance,
      startTime: windowFrames[0].time,
      endTime: windowFrames[windowFrames.length - 1].time,
      captureContext: frozenCaptureContext(),
      frames: windowFrames.map(frame => ({
        time: frame.time,
        frequency: frame.frequency,
        target: frame.target,
        cents: frame.cents,
        clarity: frame.clarity,
        stable: frame.stable,
        division: frame.division,
        a4: frame.a4,
        tolerance: frame.tolerance
      }))
    };

    if (!candidateMatchesCaptureTarget(candidate)) {
      event.cleanCandidate = null;
      rejectOffTargetCandidate(candidate);
      return;
    }

    event.cleanCandidate = candidate;
    const previous = state.bestByNote.get(event.key);
    if (!previous || candidate.score > previous.score) {
      state.bestByNote.set(event.key, candidate);
      queuePersistence(candidate);
      document.dispatchEvent(new CustomEvent('ney:auto-capture-candidate', { detail: candidate }));
      if (now() - state.lastCandidateAt > CONFIG.candidateCooldownMs) {
        state.lastCandidateAt = now();
        updateBadge('نافذة صافية ✓', 'success');
        updateStatus(`تم العثور على نافذة صافية لـ ${event.arabic || event.english}: 100% من القراءات صحيحة، جودة ${Math.round(meanClarity * 100)}%. جارٍ فحصها للحفظ.`);
      }
    }
  }

  function addFrame(frame) {
    const key = noteKey(frame);
    if (!state.activeEvent) {
      beginEvent(frame);
      return;
    }

    if (state.activeEvent.key !== key) {
      finalizeActiveEvent('note-change');
      beginEvent(frame);
      return;
    }

    state.activeEvent.frames.push(frame);
    state.activeEvent.lastFrameAt = frame.time;
    evaluateCleanWindow(state.activeEvent);
  }

  function finalizeActiveEvent(reason) {
    const event = state.activeEvent;
    if (!event) return;
    const duration = event.lastFrameAt - event.startedAt;
    if (duration >= CONFIG.minimumEventMs) {
      state.recentEvents.push({
        key: event.key,
        english: event.english,
        arabic: event.arabic,
        startedAt: event.startedAt,
        endedAt: event.lastFrameAt,
        duration,
        cleanCandidate: event.cleanCandidate,
        reason
      });
      if (state.recentEvents.length > CONFIG.maxRecentEvents) state.recentEvents.shift();
      detectSequencePatterns();
    }
    state.activeEvent = null;
  }

  function detectSequencePatterns() {
    const recent = state.recentEvents.slice(-8);
    if (recent.length < 3) return;

    const compact = recent.filter(event => event.duration < 900 && event.duration > 80);
    if (compact.length >= 4) {
      const a = compact[compact.length - 4]?.key;
      const b = compact[compact.length - 3]?.key;
      const c = compact[compact.length - 2]?.key;
      const d = compact[compact.length - 1]?.key;
      if (a && b && a === c && b === d && a !== b && state.ui) {
        state.ui.style.textContent = TAXONOMY.trill.ar;
        updateStatus('تم رصد نمط تبادل سريع بين نغمتين؛ مصنف مبدئيًا كتريل ويحتاج تحققًا قبل الحفظ النهائي.');
      }
    }
  }

  function samplePitch() {
    if (!state.running) return;
    const frame = readPitchFrame();
    if (frame) {
      addFrame(frame);
      return;
    }

    if (state.activeEvent && now() - state.activeEvent.lastFrameAt >= CONFIG.releaseGapMs) {
      finalizeActiveEvent('silence');
      if (state.ui) {
        state.ui.note.textContent = '—';
        state.ui.window.textContent = '0%';
        state.ui.style.textContent = TAXONOMY.unclassified.ar;
      }
      updateBadge('رصد مستمر', 'active');
    }
  }

  function installMediaBridge() {
    const mediaDevices = navigator.mediaDevices;
    if (!mediaDevices?.getUserMedia || state.originalGetUserMedia) return;
    state.originalGetUserMedia = mediaDevices.getUserMedia.bind(mediaDevices);

    try {
      mediaDevices.getUserMedia = async constraints => {
        const stream = await state.originalGetUserMedia(constraints);
        if (constraints?.audio && stream?.getAudioTracks?.().length) {
          queueMicrotask(() => startCapture(stream));
        }
        return stream;
      };
    } catch (error) {
      console.warn('Unable to install getUserMedia bridge', error);
      updateBadge('مسار احتياطي', 'warning');
      updateStatus('تعذر ربط الالتقاط الذاتي بالميكروفون في هذا المتصفح؛ وظائف التسجيل الحالية لم تتأثر.');
    }
  }

  function setCaptureContext(context) {
    state.captureContext = context && typeof context === 'object' ? { ...context } : null;
    state.bestByNote.clear();
    return state.captureContext ? { ...state.captureContext } : null;
  }

  function initialize() {
    installUi();
    installMediaBridge();
    window.NeyPerformanceTaxonomy = TAXONOMY;
    window.NeyAutoCapture = Object.freeze({
      taxonomy: TAXONOMY,
      config: CONFIG,
      getBestCandidates: () => [...state.bestByNote.values()].map(item => ({ ...item, frames: [...item.frames] })),
      getRecentEvents: () => state.recentEvents.map(item => ({ ...item })),
      getCaptureContext: () => state.captureContext ? { ...state.captureContext } : null,
      setCaptureContext,
      clearCaptureContext: () => setCaptureContext(null),
      isRunning: () => state.running
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
