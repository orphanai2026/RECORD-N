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
    currentFrequency: null,
    currentNote: null,
    currentCents: 0,
    currentRecordMenuId: null,
    playingRecordId: null,
    demoOscillator: null,
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
    advancedDialog: $('#advancedDialog')
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
      state.analyser.smoothingTimeConstant = .15;
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
    if (state.mediaRecorder?.state === 'recording') state.mediaRecorder.stop();
    clearTimeout(state.recordingTimer);
    cancelAnimationFrame(state.animationFrame);
    stopMetronome();
    state.stream?.getTracks().forEach(track => track.stop());
    state.source?.disconnect();
    state.analyser?.disconnect();
    if (state.audioContext && state.audioContext.state !== 'closed') await state.audioContext.close();
    Object.assign(state, { stream: null, audioContext: null, analyser: null, source: null, animationFrame: null, stableFrames: 0, isPitchStable: false });
    updateMicrophoneUI(false);
  }

  function toggleMicrophone() {
    state.stream ? stopMicrophone() : startMicrophone();
  }

  function autocorrelate(buffer, sampleRate) {
    let rms = 0;
    for (const value of buffer) rms += value * value;
    rms = Math.sqrt(rms / buffer.length);
    const sensitivity = Number($('#sensitivityRange').value || .025);
    if (rms < sensitivity) return { frequency: null, rms, clarity: 0 };

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
    return { frequency: frequency >= 60 && frequency <= 1800 ? frequency : null, rms, clarity };
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
    } else {
      state.stableFrames = Math.max(0, state.stableFrames - 1);
      state.isPitchStable = false;
      setReady(ui.pitchReadyDot, false);
      setReady(ui.qualityReadyDot, false);
      ui.qualityText.textContent = 'بانتظار نغمة واضحة';
      setStatusDot(ui.qualityDot, false);
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

  function prepareRecording() {
    if (!state.stream) {
      showToast('شغّل الميكروفون أولًا قبل تجهيز تسجيل النغمة.');
      return;
    }
    if (!window.MediaRecorder) {
      showToast('التسجيل غير مدعوم في هذا المتصفح.');
      return;
    }
    const durationMs = Math.max(350, (60000 / state.bpm) * state.durationBeats);
    state.recordingChunks = [];
    try {
      state.mediaRecorder = new MediaRecorder(state.stream);
      state.mediaRecorder.addEventListener('dataavailable', event => { if (event.data.size) state.recordingChunks.push(event.data); });
      state.mediaRecorder.addEventListener('stop', saveRecording, { once: true });
      state.mediaRecorder.start();
      $('#prepareButton span').textContent = 'جارٍ تسجيل النغمة…';
      $('#prepareButton').disabled = true;
      showToast(`بدأ تسجيل ${state.durationName}. حافظ على النغمة ثابتة.`);
      state.recordingTimer = setTimeout(() => {
        if (state.mediaRecorder?.state === 'recording') state.mediaRecorder.stop();
      }, durationMs);
    } catch (error) {
      console.error(error);
      showToast('تعذر بدء التسجيل.');
    }
  }

  function saveRecording() {
    const blob = new Blob(state.recordingChunks, { type: state.mediaRecorder?.mimeType || 'audio/webm' });
    const url = URL.createObjectURL(blob);
    const note = state.currentNote || { english: '—', arabic: 'نغمة غير محددة' };
    state.records.unshift({
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
      english: note.english,
      arabic: note.arabic,
      durationName: state.durationName,
      type: 'غنة',
      status: state.isPitchStable ? 'طبيعية' : 'غير ثابتة',
      frequency: state.currentFrequency || 0,
      blob,
      url,
      sample: false
    });
    $('#prepareButton span').textContent = 'تجهيز تسجيل النغمة';
    $('#prepareButton').disabled = false;
    renderRecords();
    showToast('تم حفظ التسجيل بنجاح.');
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

  function handleMenuAction(action) {
    const record = state.records.find(item => item.id === state.currentRecordMenuId);
    if (!record) return;
    if (action === 'rename') {
      const name = prompt('أدخل الاسم الجديد للتسجيل:', record.arabic);
      if (name?.trim()) { record.arabic = name.trim(); renderRecords(); }
    }
    if (action === 'download') {
      if (record.sample) { showToast('التسجيل التجريبي لا يحتوي ملفًا للتنزيل.'); }
      else {
        const anchor = document.createElement('a');
        anchor.href = record.url;
        anchor.download = `${record.english}-${record.durationName}.webm`;
        anchor.click();
      }
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

  function exportAll() {
    const payload = state.records.map(({ blob, url, ...record }) => record);
    const data = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(data);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `ney-standard-recordings-${new Date().toISOString().slice(0,10)}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function bindEvents() {
    ui.micButton.addEventListener('click', toggleMicrophone);
    ui.headerMicButton.addEventListener('click', toggleMicrophone);
    $('#prepareButton').addEventListener('click', prepareRecording);
    $('#helpButton').addEventListener('click', () => ui.helpDialog.showModal());
    $('#advancedButton').addEventListener('click', () => ui.advancedDialog.showModal());
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
    $('#bpmMinus').addEventListener('click', () => { state.bpm = Math.max(30, state.bpm - 1); ui.bpmValue.textContent = state.bpm; updateMetronomeCaption(); });
    $('#bpmPlus').addEventListener('click', () => { state.bpm = Math.min(240, state.bpm + 1); ui.bpmValue.textContent = state.bpm; updateMetronomeCaption(); });
    ui.a4Reference.addEventListener('change', () => { state.a4 = Math.max(400, Math.min(480, Number(ui.a4Reference.value) || 440)); ui.a4Reference.value = state.a4; resetPitchUI(); });
    $('#exportAllButton').addEventListener('click', exportAll);
    $('#libraryMenuButton').addEventListener('click', event => openRecordMenu(state.records[0]?.id, event.currentTarget));
    ui.menuPopover.addEventListener('click', event => { const action = event.target.closest('[data-action]')?.dataset.action; if (action) handleMenuAction(action); });
    document.addEventListener('click', event => { if (!ui.menuPopover.hidden && !ui.menuPopover.contains(event.target) && !event.target.closest('.record-menu-button') && event.target !== $('#libraryMenuButton')) ui.menuPopover.hidden = true; });
    window.addEventListener('beforeunload', () => { state.stream?.getTracks().forEach(track => track.stop()); state.records.forEach(record => record.url && URL.revokeObjectURL(record.url)); });
  }

  function initialize() {
    bindEvents();
    renderRecords();
    updateMetronomeCaption();
    updateMicrophoneUI(false);
    resetPitchUI();
  }

  initialize();
})();
