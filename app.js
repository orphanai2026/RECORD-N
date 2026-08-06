(() => {
  'use strict';

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  const state = {
    division: 24,
    durationBeats: 1,
    durationName: 'نوار',
    bpm: 60,
    a4: 440,
    stream: null,
    audioContext: null,
    analyser: null,
    source: null,
    animationFrame: null,
    mediaRecorder: null,
    recordingChunks: [],
    recordingTimer: null,
    metronomeTimer: null,
    beat: 0,
    stableFrames: 0,
    isPitchStable: false,
    recordingArmed: false,
    recordingQualifyingFrames: 0,
    recordingCandidateKey: null,
    recordingStats: null,
    discardRecording: false,
    currentFrequency: null,
    currentNote: null,
    currentCents: 0,
    currentRecordMenuId: null,
    playingRecordId: null,
    demoOscillator: null,
    exportFormat: 'wav',
    exportSampleRate: 48000,
    wavBitDepth: 24,
    mp3Bitrate: 192,
    minFrequency: 60,
    maxFrequency: 1800,
    pcmChunks: [],
    pcmProcessor: null,
    pcmMuteGain: null,
    records: [
      { id: 'sample-1', english: 'C5', arabic: 'دو 5', durationName: 'نوار', type: 'غنة', status: 'طبيعية', frequency: 525.45, sample: true },
      { id: 'sample-2', english: 'C5', arabic: 'دو 5', durationName: 'روند', type: 'غنة', status: 'طبيعية', frequency: 522.78, sample: true }
    ]
  };

  const noteNames = ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
  const arabicNames = ['دو','دو دييز','ري','ري دييز','مي','فا','فا دييز','صول','صول دييز','لا','لا دييز','سي'];
  const quarterArabic = ['دو','دو نصف دييز','دو دييز','ري نصف بيمول','ري','ري نصف دييز','ري دييز','مي نصف بيمول','مي','فا نصف بيمول','فا','فا نصف دييز','فا دييز','صول نصف بيمول','صول','صول نصف دييز','صول دييز','لا نصف بيمول','لا','لا نصف دييز','لا دييز','سي نصف بيمول','سي','سي نصف دييز'];

  const ui = {
    micButton: $('#micButton'),
    headerMicButton: $('#headerMicButton'),
    headerMicText: $('#headerMicText'),
    headerStatusDot: $('#headerStatusDot'),
    waveform: $('#waveform'),
    frequency: $('#frequencyValue'),
    target: $('#targetValue'),
    cents: $('#centsValue'),
    signal: $('#signalValue'),
    needle: $('#tunerNeedle'),
    qualityDot: $('#qualityDot'),
    qualityText: $('#qualityText'),
    noteName: $('#noteName'),
    noteArabic: $('#noteArabic'),
    clarity: $('#clarityValue'),
    stability: $('#stabilityValue'),
    noiseGate: $('#noiseGateValue'),
    micReadyDot: $('#micReadyDot'),
    pitchReadyDot: $('#pitchReadyDot'),
    qualityReadyDot: $('#qualityReadyDot'),
    bpmValue: $('#bpmValue'),
    a4Reference: $('#a4Reference'),
    metronomeOrb: $('#metronomeOrb'),
    beatValue: $('#beatValue'),
    metronomeCaption: $('#metronomeCaption'),
    recordingsList: $('#recordingsList'),
    recordingPlayer: $('#recordingPlayer'),
    toast: $('#toast'),
    menuPopover: $('#menuPopover'),
    qualityToggle: $('#qualityToggle'),
    qualityDetails: $('#qualityDetails'),
    helpDialog: $('#helpDialog'),
    advancedDialog: $('#advancedDialog'),
    exportFormat: $('#exportFormat'),
    tunerCenterZone: $('#tunerCenterZone'),
    tunerLowLimit: $('#tunerLowLimit'),
    tunerHighLimit: $('#tunerHighLimit'),
    tunerLowLabel: $('#tunerLowLabel'),
    tunerHighLabel: $('#tunerHighLabel')
  };

  function showToast(message) {
    ui.toast.textContent = message;
    ui.toast.classList.add('is-visible');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => ui.toast.classList.remove('is-visible'), 2800);
  }

  function setStatusDot(element, active) {
    element.classList.toggle('status-dot--danger', !active);
    element.classList.toggle('status-dot--success', active);
  }

  function setReady(element, active) {
    element.classList.toggle('is-ready', active);
  }

  function updateMicrophoneUI(active) {
    ui.headerMicText.textContent = active ? 'الميكروفون نشط' : 'الميكروفون غير نشط';
    ui.micButton.querySelector('span').textContent = active ? 'إيقاف الميكروفون' : 'تشغيل الميكروفون';
    ui.headerMicButton.setAttribute('aria-label', active ? 'إيقاف الميكروفون' : 'تشغيل الميكروفون');
    setStatusDot(ui.headerStatusDot, active);
    setReady(ui.micReadyDot, active);
    ui.waveform.classList.toggle('is-active', active);
    if (!active) resetPitchUI();
  }

  async function startMicrophone() {
    if (!navigator.mediaDevices?.getUserMedia) {
      showToast('المتصفح لا يدعم الوصول إلى الميكروفون.');
      return;
    }
    try {
      state.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        video: false
      });
      state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      state.source = state.audioContext.createMediaStreamSource(state.stream);
      state.analyser = state.audioContext.createAnalyser();
      state.analyser.fftSize = 4096;
      state.analyser.smoothingTimeConstant = Number($('#smoothingRange')?.value || .15);
      state.source.connect(state.analyser);
      updateMicrophoneUI(true);
      startMetronome();
      analyseAudio();
    } catch (error) {
      console.error(error);
      showToast('تعذر تشغيل الميكروفون. تأكد من منح الإذن للمتصفح.');
    }
  }

  async function stopMicrophone() {
    state.recordingArmed = false;
    resetRecordingQualification();
    if (state.mediaRecorder?.state === 'recording') {
      state.discardRecording = true;
      state.mediaRecorder.stop();
    }
    clearTimeout(state.recordingTimer);
    cancelAnimationFrame(state.animationFrame);
    stopMetronome();
    state.stream?.getTracks().forEach(track => track.stop());
    state.source?.disconnect();
    state.analyser?.disconnect();
    if (state.audioContext && state.audioContext.state !== 'closed') await state.audioContext.close();
    Object.assign(state, { stream: null, audioContext: null, analyser: null, source: null, animationFrame: null, stableFrames: 0, isPitchStable: false, recordingStats: null });
    $('#prepareButton').disabled = false;
    setPrepareButtonState('idle');
    updateMicrophoneUI(false);
  }

  function toggleMicrophone() {
    state.stream ? stopMicrophone() : startMicrophone();
  }

  function autocorrelate(buffer, sampleRate) {
    let rms = 0;
    for (const value of buffer) rms += value * value;
    rms = Math.sqrt(rms / buffer.length);
    const sensitivity = Number($('#sensitivityRange')?.value || .025);
    const noiseGate = Number($('#noiseGateRange')?.value || .015);
    if (rms < Math.max(sensitivity, noiseGate)) return { frequency: null, rms, clarity: 0 };

    let start = 0;
    let end = buffer.length - 1;
    const threshold = .2;
    while (start < buffer.length / 2 && Math.abs(buffer[start]) < threshold) start += 1;
    while (end > buffer.length / 2 && Math.abs(buffer[end]) < threshold) end -= 1;
    const samples = buffer.slice(start, end + 1);
    const size = samples.length;
    const correlation = new Float32Array(size);
    for (let lag = 0; lag < size; lag += 1) {
      let sum = 0;
      for (let i = 0; i < size - lag; i += 1) sum += samples[i] * samples[i + lag];
      correlation[lag] = sum;
    }
    let dip = 0;
    while (dip + 1 < size && correlation[dip] > correlation[dip + 1]) dip += 1;
    let maxIndex = -1;
    let maxValue = -Infinity;
    for (let i = dip; i < Math.min(size, Math.floor(sampleRate / 60)); i += 1) {
      if (correlation[i] > maxValue) { maxValue = correlation[i]; maxIndex = i; }
    }
    if (maxIndex <= 0) return { frequency: null, rms, clarity: 0 };
    const left = correlation[maxIndex - 1] || correlation[maxIndex];
    const center = correlation[maxIndex];
    const right = correlation[maxIndex + 1] || correlation[maxIndex];
    const denominator = (2 * center - left - right);
    const refined = denominator ? maxIndex + .5 * (right - left) / denominator : maxIndex;
    const frequency = sampleRate / refined;
    const clarity = Math.max(0, Math.min(1, center / (correlation[0] || 1)));
    return { frequency: frequency >= state.minFrequency && frequency <= state.maxFrequency ? frequency : null, rms, clarity };
  }

  function noteFromFrequency(frequency) {
    const steps = state.division;
    const step = Math.round(steps * Math.log2(frequency / state.a4));
    const target = state.a4 * 2 ** (step / steps);
    const cents = 1200 * Math.log2(frequency / target);
    const a4Midi = 69;
    if (steps === 12) {
      const midi = a4Midi + step;
      const noteIndex = ((midi % 12) + 12) % 12;
      const octave = Math.floor(midi / 12) - 1;
      return { english: `${noteNames[noteIndex]}${octave}`, arabic: `${arabicNames[noteIndex]} ${octave}`, target, cents };
    }
    const quarterMidi = a4Midi * 2 + step;
    const index = ((quarterMidi % 24) + 24) % 24;
    const octave = Math.floor(quarterMidi / 24) - 1;
    const westernIndex = Math.round(index / 2) % 12;
    const quarterMark = index % 2 ? '½♯' : '';
    return { english: `${noteNames[westernIndex]}${quarterMark}${octave}`, arabic: `${quarterArabic[index]} ${octave}`, target, cents };
  }

  function analyseAudio() {
    if (!state.analyser || !state.audioContext) return;
    const data = new Float32Array(state.analyser.fftSize);
    state.analyser.getFloatTimeDomainData(data);
    const result = autocorrelate(data, state.audioContext.sampleRate);
    updateWaveform(data);
    if (result.frequency) {
      const note = noteFromFrequency(result.frequency);
      state.currentFrequency = result.frequency;
      state.currentNote = note;
      state.currentCents = note.cents;
      const tolerance = Number($('#toleranceRange').value || 12);
      const stable = Math.abs(note.cents) <= tolerance && result.clarity > .55;
      state.stableFrames = stable ? Math.min(30, state.stableFrames + 1) : Math.max(0, state.stableFrames - 2);
      state.isPitchStable = state.stableFrames >= 8;
      updatePitchUI(result, note);
      evaluateAutomaticRecording(result, note, stable);
    } else {
      state.stableFrames = Math.max(0, state.stableFrames - 1);
      state.isPitchStable = false;
      setReady(ui.pitchReadyDot, false);
      setReady(ui.qualityReadyDot, false);
      ui.qualityText.textContent = 'بانتظار نغمة واضحة';
      setStatusDot(ui.qualityDot, false);
      evaluateAutomaticRecording(null, null, false);
    }
    state.animationFrame = requestAnimationFrame(analyseAudio);
  }

  function updateWaveform(samples) {
    const bars = $$('#waveform i');
    const chunk = Math.max(1, Math.floor(samples.length / bars.length));
    bars.forEach((bar, index) => {
      let peak = 0;
      for (let i = index * chunk; i < Math.min(samples.length, (index + 1) * chunk); i += 1) peak = Math.max(peak, Math.abs(samples[i]));
      bar.style.height = `${Math.max(10, Math.min(92, peak * 900))}%`;
    });
  }

  function updatePitchUI(result, note) {
    const cents = Math.max(-50, Math.min(50, note.cents));
    const tolerance = Number($('#toleranceRange')?.value || 12);
    const tunerPanel = $('.tuner-panel');
    tunerPanel.classList.toggle('is-in-tune', Math.abs(note.cents) <= tolerance);
    tunerPanel.classList.toggle('is-flat', note.cents < -tolerance);
    tunerPanel.classList.toggle('is-sharp', note.cents > tolerance);
    ui.frequency.innerHTML = `${result.frequency.toFixed(2)} <small>Hz</small>`;
    ui.target.textContent = `${note.target.toFixed(2)} Hz`;
    ui.cents.innerHTML = `${note.cents > 0 ? '+' : ''}${note.cents.toFixed(1)} <small>سنت</small>`;
    ui.signal.textContent = `${Math.round(result.clarity * 100)}%`;
    ui.needle.style.left = `${50 + cents}%`;
    ui.noteName.textContent = note.english;
    ui.noteArabic.textContent = note.arabic;
    ui.clarity.textContent = `${Math.round(result.clarity * 100)}%`;
    ui.stability.textContent = state.isPitchStable ? 'ثابتة' : 'تتغير';
    ui.noiseGate.textContent = result.rms > .025 ? 'مفتوحة' : 'منخفضة';
    setReady(ui.pitchReadyDot, state.isPitchStable);
    setReady(ui.qualityReadyDot, state.isPitchStable && result.clarity > .65);
    setStatusDot(ui.qualityDot, state.isPitchStable);
    ui.qualityText.textContent = state.isPitchStable ? 'النغمة واضحة ومضبوطة' : 'ثبّت النغمة قليلًا';
  }

  function resetPitchUI() {
    ui.frequency.innerHTML = '0.00 <small>Hz</small>';
    ui.target.textContent = '—';
    ui.cents.innerHTML = '0 <small>سنت</small>';
    ui.signal.textContent = '—';
    ui.needle.style.left = '50%';
    $('.tuner-panel')?.classList.remove('is-in-tune', 'is-flat', 'is-sharp');
    ui.noteName.textContent = 'بانتظار النغمة';
    ui.noteArabic.textContent = 'شغّل الميكروفون واعزف نغمة ثابتة';
    ui.qualityText.textContent = 'بانتظار نغمة واضحة';
    setStatusDot(ui.qualityDot, false);
    setReady(ui.pitchReadyDot, false);
    setReady(ui.qualityReadyDot, false);
    $$('#waveform i').forEach(bar => { bar.style.height = '18%'; });
  }

  function startMetronome() {
    stopMetronome();
    state.beat = 0;
    const interval = 60000 / state.bpm;
    ui.metronomeOrb.style.setProperty('--beat-duration', `${interval}ms`);
    ui.metronomeOrb.classList.add('is-running');
    const tick = () => {
      state.beat = (state.beat % 4) + 1;
      ui.beatValue.textContent = state.beat;
      ui.metronomeOrb.style.setProperty('--beat-progress', `${state.beat * 25}%`);
    };
    tick();
    state.metronomeTimer = setInterval(tick, interval);
  }

  function stopMetronome() {
    clearInterval(state.metronomeTimer);
    ui.metronomeOrb.classList.remove('is-running');
    ui.metronomeOrb.style.setProperty('--beat-progress', '0%');
    ui.beatValue.textContent = '—';
  }

  function updateMetronomeCaption() {
    const seconds = (60 / state.bpm) * state.durationBeats;
    ui.metronomeCaption.textContent = `${state.durationName} · ${seconds.toFixed(3)} ثانية · BPM ${state.bpm}`;
    if (state.stream) startMetronome();
  }

  function chooseExclusive(buttons, activeButton) {
    buttons.forEach(button => {
      const active = button === activeButton;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function startPcmCapture() {
    state.pcmChunks = [];
    if (!state.audioContext || !state.source || !state.audioContext.createScriptProcessor) return;
    const processor = state.audioContext.createScriptProcessor(4096, 1, 1);
    const muteGain = state.audioContext.createGain();
    muteGain.gain.value = 0;
    processor.onaudioprocess = event => {
      if (state.mediaRecorder?.state === 'recording') {
        state.pcmChunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
      }
    };
    state.source.connect(processor);
    processor.connect(muteGain).connect(state.audioContext.destination);
    state.pcmProcessor = processor;
    state.pcmMuteGain = muteGain;
  }

  function finishPcmCapture() {
    const chunks = state.pcmChunks;
    const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const merged = new Float32Array(length);
    let offset = 0;
    chunks.forEach(chunk => { merged.set(chunk, offset); offset += chunk.length; });
    state.pcmProcessor?.disconnect();
    state.pcmMuteGain?.disconnect();
    state.pcmProcessor = null;
    state.pcmMuteGain = null;
    state.pcmChunks = [];
    return merged;
  }

  function recordingNoteKey(note) {
    return note ? `${note.english}|${Number(note.target).toFixed(3)}` : null;
  }

  function resetRecordingQualification() {
    state.recordingQualifyingFrames = 0;
    state.recordingCandidateKey = null;
  }

  function setPrepareButtonState(mode, progress = 0) {
    const button = $('#prepareButton');
    const label = button.querySelector('span');
    button.classList.toggle('is-armed', mode === 'armed');
    button.classList.toggle('is-recording', mode === 'recording');
    if (mode === 'armed') label.textContent = progress > 0 ? `تثبيت النغمة ${progress}%` : 'بانتظار نغمة مضبوطة…';
    else if (mode === 'recording') label.textContent = 'جارٍ التسجيل التلقائي…';
    else label.textContent = 'تجهيز تسجيل النغمة';
  }

  function cancelAutomaticRecording() {
    state.recordingArmed = false;
    resetRecordingQualification();
    setPrepareButtonState('idle');
    showToast('تم إلغاء انتظار التسجيل التلقائي.');
  }

  function prepareRecording() {
    if (!state.stream) {
      showToast('شغّل الميكروفون أولًا قبل تجهيز تسجيل النغمة.');
      return;
    }
    if (!window.MediaRecorder) {
      showToast('التسجيل غير مدعوم في هذا المتصفح.');
      return;
    }
    if (state.mediaRecorder?.state === 'recording') return;
    if (state.recordingArmed) {
      cancelAutomaticRecording();
      return;
    }
    state.recordingArmed = true;
    state.discardRecording = false;
    resetRecordingQualification();
    setPrepareButtonState('armed');
    showToast('تم تجهيز التسجيل. سيبدأ تلقائيًا بعد ثبات النغمة ودقتها.');
  }

  function evaluateAutomaticRecording(result, note, stable) {
    const recorderActive = state.mediaRecorder?.state === 'recording';
    const tolerance = Number($('#toleranceRange')?.value || 12);
    const clarityThreshold = .65;
    const key = recordingNoteKey(note);
    const validFrame = Boolean(result && note && stable && Math.abs(note.cents) <= tolerance && result.clarity >= clarityThreshold);

    if (recorderActive && state.recordingStats) {
      const stats = state.recordingStats;
      stats.totalFrames += 1;
      const sameNote = key === stats.noteKey;
      if (validFrame && sameNote) {
        stats.validFrames += 1;
        stats.centsSum += Math.abs(note.cents);
        stats.claritySum += result.clarity;
        stats.frequencySum += result.frequency;
      } else {
        stats.invalidFrames += 1;
      }
      return;
    }

    if (!state.recordingArmed) return;

    if (!validFrame) {
      resetRecordingQualification();
      setPrepareButtonState('armed');
      return;
    }

    if (state.recordingCandidateKey !== key) {
      state.recordingCandidateKey = key;
      state.recordingQualifyingFrames = 1;
    } else {
      state.recordingQualifyingFrames += 1;
    }

    const requiredFrames = 18;
    const progress = Math.min(100, Math.round(state.recordingQualifyingFrames / requiredFrames * 100));
    setPrepareButtonState('armed', progress);
    if (state.recordingQualifyingFrames >= requiredFrames) beginAutomaticRecording(note, result);
  }

  function beginAutomaticRecording(note, result) {
    if (!state.recordingArmed || state.mediaRecorder?.state === 'recording') return;
    const durationMs = Math.max(350, (60000 / state.bpm) * state.durationBeats);
    state.recordingChunks = [];
    state.recordingStats = {
      note: { ...note },
      noteKey: recordingNoteKey(note),
      totalFrames: 0,
      validFrames: 0,
      invalidFrames: 0,
      centsSum: 0,
      claritySum: 0,
      frequencySum: 0,
      initialFrequency: result.frequency
    };
    state.discardRecording = false;
    try {
      state.mediaRecorder = new MediaRecorder(state.stream);
      state.mediaRecorder.addEventListener('dataavailable', event => { if (event.data.size) state.recordingChunks.push(event.data); });
      state.mediaRecorder.addEventListener('stop', saveRecording, { once: true });
      state.mediaRecorder.start();
      startPcmCapture();
      setPrepareButtonState('recording');
      $('#prepareButton').disabled = true;
      showToast(`النغمة ${note.arabic} مضبوطة. بدأ التسجيل تلقائيًا.`);
      state.recordingTimer = setTimeout(() => {
        if (state.mediaRecorder?.state === 'recording') state.mediaRecorder.stop();
      }, durationMs);
    } catch (error) {
      console.error(error);
      state.recordingStats = null;
      $('#prepareButton').disabled = false;
      state.recordingArmed = true;
      resetRecordingQualification();
      setPrepareButtonState('armed');
      showToast('تعذر بدء التسجيل التلقائي.');
    }
  }

  function saveRecording() {
    const pcm = finishPcmCapture();
    const stats = state.recordingStats;
    const button = $('#prepareButton');
    button.disabled = false;

    if (state.discardRecording || !stats) {
      state.recordingStats = null;
      state.discardRecording = false;
      state.recordingArmed = false;
      resetRecordingQualification();
      setPrepareButtonState('idle');
      return;
    }

    const tolerance = Number($('#toleranceRange')?.value || 12);
    const validRatio = stats.totalFrames ? stats.validFrames / stats.totalFrames : 0;
    const averageCents = stats.validFrames ? stats.centsSum / stats.validFrames : Infinity;
    const averageClarity = stats.validFrames ? stats.claritySum / stats.validFrames : 0;
    const accepted = stats.totalFrames >= 6 && validRatio >= .85 && averageCents <= tolerance && averageClarity >= .65;

    if (!accepted) {
      state.recordingStats = null;
      state.recordingArmed = true;
      resetRecordingQualification();
      setPrepareButtonState('armed');
      showToast('لم يُحفظ التسجيل لأن النغمة فقدت الدقة أو الثبات. ثبّتها وسيعاد التسجيل تلقائيًا.');
      return;
    }

    const blob = new Blob(state.recordingChunks, { type: state.mediaRecorder?.mimeType || 'audio/webm' });
    const url = URL.createObjectURL(blob);
    const averageFrequency = stats.validFrames ? stats.frequencySum / stats.validFrames : stats.initialFrequency;
    const note = stats.note;
    state.records.unshift({
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
      english: note.english,
      arabic: note.arabic,
      durationName: state.durationName,
      type: 'غنة',
      status: 'مضبوطة',
      frequency: averageFrequency || 0,
      averageCents: Number(averageCents.toFixed(2)),
      clarity: Number((averageClarity * 100).toFixed(1)),
      blob,
      url,
      pcm,
      sampleRate: state.audioContext?.sampleRate || 48000,
      sample: false
    });
    state.recordingStats = null;
    state.recordingArmed = false;
    resetRecordingQualification();
    setPrepareButtonState('idle');
    renderRecords();
    showToast('تم اعتماد وحفظ التسجيل المضبوط تلقائيًا.');
  }

  function playSample(record, button) {
    stopPlayback();
    if (record.sample) {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = record.frequency;
      gain.gain.setValueAtTime(.0001, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(.18, audioContext.currentTime + .03);
      gain.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + 1.25);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 1.3);
      state.demoOscillator = { oscillator, audioContext };
      state.playingRecordId = record.id;
      button.querySelector('span').textContent = 'إيقاف';
      setTimeout(() => { if (state.playingRecordId === record.id) { state.playingRecordId = null; renderRecords(); audioContext.close(); } }, 1350);
    } else {
      ui.recordingPlayer.src = record.url;
      ui.recordingPlayer.play();
      state.playingRecordId = record.id;
      button.querySelector('span').textContent = 'إيقاف';
      ui.recordingPlayer.onended = () => { state.playingRecordId = null; renderRecords(); };
    }
  }

  function stopPlayback() {
    ui.recordingPlayer.pause();
    ui.recordingPlayer.removeAttribute('src');
    try { state.demoOscillator?.oscillator.stop(); } catch (_) {}
    state.demoOscillator?.audioContext.close?.();
    state.demoOscillator = null;
    state.playingRecordId = null;
  }

  function toggleRecordPlayback(record, button) {
    if (state.playingRecordId === record.id) { stopPlayback(); renderRecords(); return; }
    playSample(record, button);
  }

  function renderRecords() {
    ui.recordingsList.innerHTML = '';
    state.records.forEach(record => {
      const row = document.createElement('article');
      row.className = 'record-row';
      row.innerHTML = `
        <div class="record-identity">
          <div class="record-note"><strong dir="ltr">${record.english}</strong></div>
          <div class="record-copy"><strong>${record.arabic}</strong><span>${record.durationName} · ${record.type} · ${record.status}</span></div>
        </div>
        <div class="record-frequency" dir="ltr">${Number(record.frequency).toFixed(2)} <small>Hz</small></div>
        <div class="record-row-actions">
          <button class="play-button" type="button" aria-label="سماع ${record.english}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7Z"></path></svg><span>${state.playingRecordId === record.id ? 'إيقاف' : 'سماع'}</span></button>
          <button class="record-menu-button" type="button" aria-label="خيارات التسجيل"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg></button>
        </div>`;
      $('.play-button', row).addEventListener('click', event => toggleRecordPlayback(record, event.currentTarget));
      $('.record-menu-button', row).addEventListener('click', event => openRecordMenu(record.id, event.currentTarget));
      ui.recordingsList.appendChild(row);
    });
  }

  function openRecordMenu(recordId, anchor) {
    state.currentRecordMenuId = recordId;
    const rect = anchor.getBoundingClientRect();
    ui.menuPopover.hidden = false;
    const width = 160;
    const left = Math.max(8, Math.min(window.innerWidth - width - 8, rect.left - width + rect.width));
    const top = Math.min(window.innerHeight - 140, rect.bottom + 5);
    Object.assign(ui.menuPopover.style, { left: `${left}px`, top: `${top}px` });
  }

  async function handleMenuAction(action) {
    const record = state.records.find(item => item.id === state.currentRecordMenuId);
    if (!record) return;
    if (action === 'rename') {
      const name = prompt('أدخل الاسم الجديد للتسجيل:', record.arabic);
      if (name?.trim()) { record.arabic = name.trim(); renderRecords(); }
    }
    if (action === 'download') {
      await downloadRecord(record, state.exportFormat);
    }
    if (action === 'delete') {
      if (confirm(`حذف تسجيل ${record.english}؟`)) {
        if (record.url) URL.revokeObjectURL(record.url);
        state.records = state.records.filter(item => item.id !== record.id);
        renderRecords();
      }
    }
    ui.menuPopover.hidden = true;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function setBpm(value) {
    state.bpm = Math.round(clamp(Number(value) || 60, 30, 240));
    ui.bpmValue.value = state.bpm;
    updateMetronomeCaption();
  }

  function setA4(value) {
    state.a4 = Math.round(clamp(Number(value) || 440, 400, 480) * 10) / 10;
    ui.a4Reference.value = state.a4;
    resetPitchUI();
  }

  function updateToleranceVisualization() {
    const tolerance = clamp(Number($('#toleranceRange')?.value || 12), 3, 25);
    const low = 50 - tolerance;
    const high = 50 + tolerance;
    ui.tunerCenterZone.style.left = `${low}%`;
    ui.tunerCenterZone.style.width = `${tolerance * 2}%`;
    ui.tunerLowLimit.style.left = `${low}%`;
    ui.tunerHighLimit.style.left = `${high}%`;
    ui.tunerLowLabel.textContent = `-${tolerance}`;
    ui.tunerHighLabel.textContent = `+${tolerance}`;
    const output = $('#toleranceOutput');
    if (output) output.textContent = `±${tolerance} سنت`;
  }

  function sanitizeFilePart(value) {
    return String(value || 'recording').replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '-');
  }

  function buildFileName(record, extension) {
    const date = new Date().toISOString().slice(0, 10);
    const pattern = $('#fileNamePattern')?.value || '{note}-{duration}-{date}';
    const base = pattern
      .replaceAll('{note}', sanitizeFilePart(record.english))
      .replaceAll('{duration}', sanitizeFilePart(record.durationName))
      .replaceAll('{date}', date);
    return `${base}.${extension}`;
  }

  function triggerDownload(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  async function recordToPcm(record) {
    if (record.pcm?.length) return { samples: record.pcm, sampleRate: record.sampleRate || 48000 };
    if (record.blob) {
      const context = new (window.AudioContext || window.webkitAudioContext)();
      try {
        const buffer = await context.decodeAudioData(await record.blob.arrayBuffer());
        const channels = buffer.numberOfChannels;
        const mono = new Float32Array(buffer.length);
        for (let channel = 0; channel < channels; channel += 1) {
const data = buffer.getChannelData(channel);
for (let i = 0; i < data.length; i += 1) mono[i] += data[i] / channels;
        }
        return { samples: mono, sampleRate: buffer.sampleRate };
      } finally {
        await context.close();
      }
    }
    const sampleRate = state.exportSampleRate;
    const seconds = Math.max(.5, (60 / state.bpm) * (record.durationName === 'روند' ? 4 : record.durationName === 'بلانش' ? 2 : record.durationName === 'كروش' ? .5 : 1));
    const samples = new Float32Array(Math.floor(sampleRate * seconds));
    for (let i = 0; i < samples.length; i += 1) {
      const envelope = Math.min(1, i / (sampleRate * .03), (samples.length - i) / (sampleRate * .06));
      samples[i] = Math.sin(2 * Math.PI * Number(record.frequency || 440) * i / sampleRate) * .2 * Math.max(0, envelope);
    }
    return { samples, sampleRate };
  }

  function resampleMono(samples, sourceRate, targetRate) {
    if (sourceRate === targetRate) return samples;
    const targetLength = Math.max(1, Math.round(samples.length * targetRate / sourceRate));
    const result = new Float32Array(targetLength);
    const ratio = sourceRate / targetRate;
    for (let i = 0; i < targetLength; i += 1) {
      const position = i * ratio;
      const left = Math.floor(position);
      const right = Math.min(samples.length - 1, left + 1);
      const fraction = position - left;
      result[i] = samples[left] * (1 - fraction) + samples[right] * fraction;
    }
    return result;
  }

  function encodeWav(samples, sampleRate, bitDepth = 24) {
    const bytesPerSample = bitDepth === 24 ? 3 : 2;
    const dataSize = samples.length * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    const writeText = (offset, text) => [...text].forEach((character, index) => view.setUint8(offset + index, character.charCodeAt(0)));
    writeText(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeText(8, 'WAVE');
    writeText(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * bytesPerSample, true);
    view.setUint16(32, bytesPerSample, true);
    view.setUint16(34, bitDepth, true);
    writeText(36, 'data');
    view.setUint32(40, dataSize, true);
    let offset = 44;
    for (const input of samples) {
      const sample = clamp(input, -1, 1);
      if (bitDepth === 24) {
        const value = Math.round(sample < 0 ? sample * 0x800000 : sample * 0x7fffff);
        view.setUint8(offset, value & 0xff);
        view.setUint8(offset + 1, (value >> 8) & 0xff);
        view.setUint8(offset + 2, (value >> 16) & 0xff);
        offset += 3;
      } else {
        view.setInt16(offset, Math.round(sample < 0 ? sample * 0x8000 : sample * 0x7fff), true);
        offset += 2;
      }
    }
    return new Blob([buffer], { type: 'audio/wav' });
  }

  function encodeMp3(samples, sampleRate, bitrate) {
    if (!window.lamejs?.Mp3Encoder) throw new Error('MP3 encoder unavailable');
    const encoder = new window.lamejs.Mp3Encoder(1, sampleRate, bitrate);
    const chunkSize = 1152;
    const chunks = [];
    const pcm = new Int16Array(samples.length);
    for (let i = 0; i < samples.length; i += 1) pcm[i] = Math.round(clamp(samples[i], -1, 1) * 32767);
    for (let offset = 0; offset < pcm.length; offset += chunkSize) {
      const encoded = encoder.encodeBuffer(pcm.subarray(offset, offset + chunkSize));
      if (encoded.length) chunks.push(new Int8Array(encoded));
    }
    const flushed = encoder.flush();
    if (flushed.length) chunks.push(new Int8Array(flushed));
    return new Blob(chunks, { type: 'audio/mpeg' });
  }

  function recordMetadata(record) {
    const { blob, url, pcm, ...metadata } = record;
    return {
      ...metadata,
      exportedAt: new Date().toISOString(),
      division: `${state.division}-TET`,
      a4: state.a4,
      bpm: state.bpm
    };
  }

  async function downloadRecord(record, format) {
    try {
      if (format === 'json') {
        triggerDownload(new Blob([JSON.stringify(recordMetadata(record), null, 2)], { type: 'application/json' }), buildFileName(record, 'json'));
        return;
      }
      showToast(`جارٍ تجهيز ${format === 'mp3' ? 'MP3' : 'WAV عالي الدقة'}…`);
      const source = await recordToPcm(record);
      const samples = resampleMono(source.samples, source.sampleRate, state.exportSampleRate);
      if (format === 'mp3') {
        const blob = encodeMp3(samples, state.exportSampleRate, state.mp3Bitrate);
        triggerDownload(blob, buildFileName(record, 'mp3'));
      } else {
        const blob = encodeWav(samples, state.exportSampleRate, state.wavBitDepth);
        triggerDownload(blob, buildFileName(record, 'wav'));
      }
    } catch (error) {
      console.error(error);
      showToast('تعذر تجهيز ملف التصدير. جرّب صيغة أخرى.');
    }
  }

  async function exportAll() {
    const format = state.exportFormat;
    if (format === 'json') {
      const payload = state.records.map(recordMetadata);
      triggerDownload(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), `ney-standard-recordings-${new Date().toISOString().slice(0,10)}.json`);
      return;
    }
    for (const record of state.records) {
      await downloadRecord(record, format);
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    showToast(`اكتمل تصدير ${state.records.length} تسجيلات.`);
  }

  const defaultSettings = {
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
    persistSettings: true
  };

  function collectSettings() {
    return {
      sensitivity: Number($('#sensitivityRange')?.value || defaultSettings.sensitivity),
      tolerance: Number($('#toleranceRange')?.value || defaultSettings.tolerance),
      noiseGate: Number($('#noiseGateRange')?.value || defaultSettings.noiseGate),
      smoothing: Number($('#smoothingRange')?.value || defaultSettings.smoothing),
      minFrequency: Number($('#minFrequencyInput')?.value || defaultSettings.minFrequency),
      maxFrequency: Number($('#maxFrequencyInput')?.value || defaultSettings.maxFrequency),
      exportFormat: $('#defaultExportFormat')?.value || state.exportFormat,
      exportSampleRate: Number($('#exportSampleRate')?.value || state.exportSampleRate),
      wavBitDepth: Number($('#wavBitDepth')?.value || state.wavBitDepth),
      mp3Bitrate: Number($('#mp3Bitrate')?.value || state.mp3Bitrate),
      fileNamePattern: $('#fileNamePattern')?.value || defaultSettings.fileNamePattern,
      persistSettings: Boolean($('#persistSettings')?.checked)
    };
  }

  function applySettings(settings, persist = true) {
    const values = { ...defaultSettings, ...settings };
    $('#sensitivityRange').value = values.sensitivity;
    $('#toleranceRange').value = values.tolerance;
    $('#noiseGateRange').value = values.noiseGate;
    $('#smoothingRange').value = values.smoothing;
    $('#minFrequencyInput').value = values.minFrequency;
    $('#maxFrequencyInput').value = values.maxFrequency;
    $('#defaultExportFormat').value = values.exportFormat;
    $('#exportSampleRate').value = values.exportSampleRate;
    $('#wavBitDepth').value = values.wavBitDepth;
    $('#mp3Bitrate').value = values.mp3Bitrate;
    $('#fileNamePattern').value = values.fileNamePattern;
    $('#persistSettings').checked = values.persistSettings;
    $('#sensitivityOutput').textContent = Number(values.sensitivity).toFixed(3);
    $('#noiseGateOutput').textContent = Number(values.noiseGate).toFixed(3);
    $('#smoothingOutput').textContent = Number(values.smoothing).toFixed(2);
    state.minFrequency = clamp(Number(values.minFrequency), 30, 500);
    state.maxFrequency = clamp(Number(values.maxFrequency), 500, 4000);
    state.exportFormat = values.exportFormat;
    state.exportSampleRate = Number(values.exportSampleRate);
    state.wavBitDepth = Number(values.wavBitDepth);
    state.mp3Bitrate = Number(values.mp3Bitrate);
    ui.exportFormat.value = state.exportFormat;
    if (state.analyser) state.analyser.smoothingTimeConstant = Number(values.smoothing);
    updateToleranceVisualization();
    updateDiagnostics();
    if (persist && values.persistSettings) localStorage.setItem('ney-standard-settings-v2', JSON.stringify(values));
  }

  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem('ney-standard-settings-v2') || 'null');
      applySettings(saved || defaultSettings, false);
    } catch (_) {
      applySettings(defaultSettings, false);
    }
  }

  function updateDiagnostics() {
    const panel = $('#diagnosticsPanel');
    if (!panel) return;
    const mimeTypes = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'].filter(type => window.MediaRecorder?.isTypeSupported?.(type));
    panel.innerHTML = `
      <div><span>المتصفح</span><strong>${navigator.userAgentData?.brands?.[0]?.brand || navigator.userAgent.split(' ').slice(-1)[0]}</strong></div>
      <div><span>معدل الالتقاط الحالي</span><strong dir="ltr">${state.audioContext?.sampleRate || 'غير نشط'} Hz</strong></div>
      <div><span>ترميزات التسجيل</span><strong>${mimeTypes.length ? mimeTypes.join('، ') : 'افتراضي المتصفح'}</strong></div>
      <div><span>مشفّر MP3</span><strong>${window.lamejs?.Mp3Encoder ? 'جاهز' : 'غير متاح'}</strong></div>`;
  }

  function bindEvents() {
    ui.micButton.addEventListener('click', toggleMicrophone);
    ui.headerMicButton.addEventListener('click', toggleMicrophone);
    $('#prepareButton').addEventListener('click', prepareRecording);
    $('#helpButton').addEventListener('click', () => ui.helpDialog.showModal());
    $('#advancedButton').addEventListener('click', () => { updateDiagnostics(); ui.advancedDialog.showModal(); });
    $('#qualityToggle').addEventListener('click', () => {
      const open = ui.qualityDetails.hidden;
      ui.qualityDetails.hidden = !open;
      ui.qualityToggle.setAttribute('aria-expanded', String(open));
    });
    $$('#divisionControl .segment').forEach(button => button.addEventListener('click', () => {
      chooseExclusive($$('#divisionControl .segment'), button);
      state.division = Number(button.dataset.division);
      resetPitchUI();
    }));
    $$('#durationControl .duration-option').forEach(button => button.addEventListener('click', () => {
      chooseExclusive($$('#durationControl .duration-option'), button);
      state.durationBeats = Number(button.dataset.duration);
      state.durationName = button.dataset.name;
      updateMetronomeCaption();
    }));
    $('#bpmMinus').addEventListener('click', () => setBpm(state.bpm - 1));
    $('#bpmPlus').addEventListener('click', () => setBpm(state.bpm + 1));
    ui.bpmValue.addEventListener('change', () => setBpm(ui.bpmValue.value));
    ui.bpmValue.addEventListener('keydown', event => { if (event.key === 'Enter') { setBpm(ui.bpmValue.value); ui.bpmValue.blur(); } });
    $('#a4Minus').addEventListener('click', () => setA4(state.a4 - .1));
    $('#a4Plus').addEventListener('click', () => setA4(state.a4 + .1));
    ui.a4Reference.addEventListener('change', () => setA4(ui.a4Reference.value));
    ui.a4Reference.addEventListener('keydown', event => { if (event.key === 'Enter') { setA4(ui.a4Reference.value); ui.a4Reference.blur(); } });
    ui.exportFormat.addEventListener('change', () => {
      state.exportFormat = ui.exportFormat.value;
      $('#defaultExportFormat').value = state.exportFormat;
      applySettings(collectSettings());
    });
    $('#exportAllButton').addEventListener('click', exportAll);
    $('#libraryMenuButton').addEventListener('click', event => openRecordMenu(state.records[0]?.id, event.currentTarget));
    ui.menuPopover.addEventListener('click', event => { const action = event.target.closest('[data-action]')?.dataset.action; if (action) handleMenuAction(action); });
    ['sensitivityRange', 'noiseGateRange', 'smoothingRange'].forEach(id => {
      $(`#${id}`).addEventListener('input', event => {
        const output = $(`#${id.replace('Range', 'Output')}`);
        if (output) output.textContent = Number(event.target.value).toFixed(id === 'smoothingRange' ? 2 : 3);
      });
    });
    $('#toleranceRange').addEventListener('input', updateToleranceVisualization);
    $('#saveAdvancedButton').addEventListener('click', () => { applySettings(collectSettings()); showToast('تم حفظ الإعدادات وتطبيقها.'); });
    $('#exportSettingsButton').addEventListener('click', () => triggerDownload(new Blob([JSON.stringify(collectSettings(), null, 2)], { type: 'application/json' }), `ney-standard-settings-${new Date().toISOString().slice(0,10)}.json`));
    $('#importSettingsButton').addEventListener('click', () => $('#settingsImportInput').click());
    $('#settingsImportInput').addEventListener('change', async event => {
      const file = event.target.files?.[0];
      if (!file) return;
      try { applySettings(JSON.parse(await file.text())); showToast('تم استيراد الإعدادات.'); }
      catch (error) { console.error(error); showToast('ملف الإعدادات غير صالح.'); }
      event.target.value = '';
    });
    $('#resetSettingsButton').addEventListener('click', () => { if (confirm('استعادة جميع الإعدادات الافتراضية؟')) { applySettings(defaultSettings); showToast('تمت استعادة الإعدادات الافتراضية.'); } });
    $('#clearRecordsButton').addEventListener('click', () => {
      if (!confirm('مسح جميع التسجيلات المحفوظة؟ لا يمكن التراجع عن ذلك.')) return;
      state.records.forEach(record => record.url && URL.revokeObjectURL(record.url));
      state.records = [];
      renderRecords();
      showToast('تم مسح جميع التسجيلات.');
    });
    document.addEventListener('click', event => { if (!ui.menuPopover.hidden && !ui.menuPopover.contains(event.target) && !event.target.closest('.record-menu-button') && event.target !== $('#libraryMenuButton')) ui.menuPopover.hidden = true; });
    window.addEventListener('beforeunload', () => { state.stream?.getTracks().forEach(track => track.stop()); state.records.forEach(record => record.url && URL.revokeObjectURL(record.url)); });
  }

  function initialize() {
    loadSettings();
    bindEvents();
    setBpm(state.bpm);
    setA4(state.a4);
    renderRecords();
    updateMetronomeCaption();
    updateMicrophoneUI(false);
    updateToleranceVisualization();
    updateDiagnostics();
    resetPitchUI();
  }

  initialize();
})();
