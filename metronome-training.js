(() => {
  'use strict';

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const panel = $('.metronome-panel');
  const bpmSource = $('#bpmValue');
  if (!panel || !bpmSource || panel.classList.contains('is-training-metronome')) return;

  panel.classList.add('is-training-metronome');

  const headerTitle = panel.querySelector('.panel-title h2');
  const headerText = panel.querySelector('.panel-title p');
  if (headerTitle) headerTitle.textContent = 'المترونوم';
  if (headerText) headerText.textContent = 'تدريب إيقاعي بالصوت والإضاءة وتمييز النبضة الأولى';

  const trainer = document.createElement('div');
  trainer.className = 'metronome-trainer';
  trainer.innerHTML = `
    <section class="metronome-stage" aria-label="مؤشر المترونوم">
      <div class="metronome-dial" id="trainingMetronomeDial" aria-live="polite">
        <strong class="metronome-beat-number" id="trainingBeatNumber">—</strong>
        <span class="metronome-beat-total" id="trainingBeatTotal">4 / 4</span>
      </div>
      <div class="metronome-lights" id="trainingBeatLights" aria-hidden="true"></div>
      <div class="metronome-stage-status" id="trainingMetronomeStatus">جاهز للتدريب · 60 BPM</div>
    </section>

    <section class="metronome-controls" aria-label="إعدادات المترونوم">
      <div class="metronome-control-card">
        <span class="metronome-control-title">السرعة BPM</span>
        <div class="metronome-bpm-control">
          <button type="button" id="trainingBpmMinus" aria-label="خفض السرعة">−</button>
          <input id="trainingBpm" type="number" min="30" max="240" step="1" value="60" inputmode="numeric" aria-label="سرعة المترونوم BPM">
          <button type="button" id="trainingBpmPlus" aria-label="رفع السرعة">+</button>
        </div>
      </div>

      <div class="metronome-control-card">
        <label for="trainingMeter">الميزان</label>
        <select class="metronome-select" id="trainingMeter">
          <option value="2">2 / 4</option>
          <option value="3">3 / 4</option>
          <option value="4" selected>4 / 4</option>
          <option value="5">5 / 4</option>
          <option value="6">6 / 8</option>
          <option value="7">7 / 8</option>
          <option value="8">8 / 8</option>
        </select>
      </div>

      <div class="metronome-control-card">
        <label for="trainingSound">نوع الصوت</label>
        <select class="metronome-select" id="trainingSound">
          <option value="wood" selected>خشبي</option>
          <option value="click">نقرة واضحة</option>
          <option value="soft">ناعم</option>
        </select>
      </div>

      <div class="metronome-control-card">
        <label for="trainingVolume">مستوى الصوت</label>
        <div class="metronome-volume-row">
          <span>🔊</span>
          <input id="trainingVolume" type="range" min="0" max="100" step="1" value="72">
          <output class="metronome-volume-value" id="trainingVolumeValue">72%</output>
        </div>
      </div>

      <div class="metronome-switches">
        <label class="metronome-switch">
          <span>الصوت</span>
          <input id="trainingSoundEnabled" type="checkbox" checked>
          <span class="metronome-switch-track" aria-hidden="true"></span>
        </label>
        <label class="metronome-switch">
          <span>الإضاءة</span>
          <input id="trainingFlashEnabled" type="checkbox" checked>
          <span class="metronome-switch-track" aria-hidden="true"></span>
        </label>
        <label class="metronome-switch">
          <span>تمييز النبضة الأولى</span>
          <input id="trainingAccentEnabled" type="checkbox" checked>
          <span class="metronome-switch-track" aria-hidden="true"></span>
        </label>
      </div>

      <div class="metronome-actions">
        <button class="metronome-action" id="trainingMetronomeToggle" type="button">تشغيل المترونوم</button>
        <button class="metronome-tap" id="trainingTapTempo" type="button">Tap Tempo</button>
      </div>
    </section>
  `;
  panel.append(trainer);

  const ui = {
    dial: $('#trainingMetronomeDial'),
    beat: $('#trainingBeatNumber'),
    total: $('#trainingBeatTotal'),
    lights: $('#trainingBeatLights'),
    status: $('#trainingMetronomeStatus'),
    bpm: $('#trainingBpm'),
    bpmMinus: $('#trainingBpmMinus'),
    bpmPlus: $('#trainingBpmPlus'),
    meter: $('#trainingMeter'),
    sound: $('#trainingSound'),
    volume: $('#trainingVolume'),
    volumeValue: $('#trainingVolumeValue'),
    soundEnabled: $('#trainingSoundEnabled'),
    flashEnabled: $('#trainingFlashEnabled'),
    accentEnabled: $('#trainingAccentEnabled'),
    toggle: $('#trainingMetronomeToggle'),
    tap: $('#trainingTapTempo')
  };

  const state = {
    running: false,
    bpm: clamp(Number(bpmSource.value) || 60, 30, 240),
    beatsPerBar: 4,
    beat: 0,
    timer: null,
    nextNoteTime: 0,
    audioContext: null,
    schedulerLookahead: 25,
    scheduleAhead: .1,
    taps: []
  };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function renderLights() {
    ui.lights.replaceChildren();
    for (let index = 1; index <= state.beatsPerBar; index += 1) {
      const dot = document.createElement('i');
      dot.className = 'metronome-light';
      dot.dataset.beat = String(index);
      ui.lights.append(dot);
    }
    ui.total.textContent = `${state.beatsPerBar} / ${ui.meter.value === '6' || ui.meter.value === '7' || ui.meter.value === '8' ? '8' : '4'}`;
  }

  function syncBpm(value, fromTrainer = true) {
    const bpm = Math.round(clamp(Number(value) || 60, 30, 240));
    state.bpm = bpm;
    ui.bpm.value = bpm;
    ui.status.textContent = state.running ? `يعمل · ${bpm} BPM` : `جاهز للتدريب · ${bpm} BPM`;
    if (fromTrainer && Number(bpmSource.value) !== bpm) {
      bpmSource.value = bpm;
      bpmSource.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  async function ensureAudio() {
    if (!state.audioContext || state.audioContext.state === 'closed') {
      state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (state.audioContext.state === 'suspended') await state.audioContext.resume();
    return state.audioContext;
  }

  function toneProfile(accent) {
    const type = ui.sound.value;
    if (type === 'click') return { frequency: accent ? 1450 : 1050, duration: .035, wave: 'square' };
    if (type === 'soft') return { frequency: accent ? 760 : 580, duration: .055, wave: 'sine' };
    return { frequency: accent ? 1200 : 820, duration: .045, wave: 'triangle' };
  }

  function scheduleClick(time, beatNumber) {
    const accent = beatNumber === 1 && ui.accentEnabled.checked;
    if (!ui.soundEnabled.checked || !state.audioContext) return;

    const profile = toneProfile(accent);
    const oscillator = state.audioContext.createOscillator();
    const gain = state.audioContext.createGain();
    const volume = Number(ui.volume.value) / 100;

    oscillator.type = profile.wave;
    oscillator.frequency.setValueAtTime(profile.frequency, time);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0001, volume * (accent ? .42 : .26)), time + .004);
    gain.gain.exponentialRampToValueAtTime(.0001, time + profile.duration);

    oscillator.connect(gain);
    gain.connect(state.audioContext.destination);
    oscillator.start(time);
    oscillator.stop(time + profile.duration + .01);
  }

  function visualBeat(beatNumber, accent) {
    ui.beat.textContent = String(beatNumber);
    ui.dial.classList.remove('is-beat', 'is-accent');
    panel.classList.remove('metronome-flash', 'metronome-flash-accent');
    void ui.dial.offsetWidth;
    ui.dial.classList.add('is-beat');
    if (accent) ui.dial.classList.add('is-accent');

    [...ui.lights.children].forEach((light, index) => {
      light.classList.toggle('is-current', index + 1 === beatNumber);
      light.classList.toggle('is-accent', index === 0 && accent);
    });

    if (ui.flashEnabled.checked) {
      panel.classList.add(accent ? 'metronome-flash-accent' : 'metronome-flash');
    }

    window.setTimeout(() => {
      ui.dial.classList.remove('is-beat', 'is-accent');
      panel.classList.remove('metronome-flash', 'metronome-flash-accent');
    }, 130);
  }

  function scheduleBeat(beatNumber, time) {
    const accent = beatNumber === 1 && ui.accentEnabled.checked;
    scheduleClick(time, beatNumber);
    const delay = Math.max(0, (time - state.audioContext.currentTime) * 1000);
    window.setTimeout(() => {
      if (state.running) visualBeat(beatNumber, accent);
    }, delay);
  }

  function scheduler() {
    if (!state.running || !state.audioContext) return;
    while (state.nextNoteTime < state.audioContext.currentTime + state.scheduleAhead) {
      state.beat = (state.beat % state.beatsPerBar) + 1;
      scheduleBeat(state.beat, state.nextNoteTime);
      state.nextNoteTime += 60 / state.bpm;
    }
  }

  async function start() {
    if (state.running) return;
    await ensureAudio();
    state.running = true;
    state.beat = 0;
    state.nextNoteTime = state.audioContext.currentTime + .06;
    ui.toggle.textContent = 'إيقاف المترونوم';
    ui.toggle.classList.add('is-running');
    ui.status.textContent = `يعمل · ${state.bpm} BPM`;
    scheduler();
    state.timer = window.setInterval(scheduler, state.schedulerLookahead);
  }

  function stop() {
    state.running = false;
    clearInterval(state.timer);
    state.timer = null;
    state.beat = 0;
    ui.toggle.textContent = 'تشغيل المترونوم';
    ui.toggle.classList.remove('is-running');
    ui.status.textContent = `جاهز للتدريب · ${state.bpm} BPM`;
    ui.beat.textContent = '—';
    ui.dial.classList.remove('is-beat', 'is-accent');
    panel.classList.remove('metronome-flash', 'metronome-flash-accent');
    [...ui.lights.children].forEach(light => light.classList.remove('is-current', 'is-accent'));
  }

  function restartTimingIfRunning() {
    if (!state.running || !state.audioContext) return;
    state.beat = 0;
    state.nextNoteTime = state.audioContext.currentTime + .08;
  }

  function setMeter(value) {
    state.beatsPerBar = clamp(Number(value) || 4, 2, 8);
    renderLights();
    restartTimingIfRunning();
  }

  function registerTap() {
    const now = performance.now();
    state.taps = state.taps.filter(time => now - time < 3000);
    state.taps.push(now);
    if (state.taps.length < 2) {
      ui.status.textContent = 'اضغط مرة أخرى لحساب السرعة';
      return;
    }
    const intervals = [];
    for (let i = 1; i < state.taps.length; i += 1) intervals.push(state.taps[i] - state.taps[i - 1]);
    const average = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
    syncBpm(60000 / average);
    restartTimingIfRunning();
  }

  ui.toggle.addEventListener('click', () => state.running ? stop() : start().catch(console.error));
  ui.bpmMinus.addEventListener('click', () => { syncBpm(state.bpm - 1); restartTimingIfRunning(); });
  ui.bpmPlus.addEventListener('click', () => { syncBpm(state.bpm + 1); restartTimingIfRunning(); });
  ui.bpm.addEventListener('change', () => { syncBpm(ui.bpm.value); restartTimingIfRunning(); });
  ui.bpm.addEventListener('keydown', event => {
    if (event.key === 'Enter') { syncBpm(ui.bpm.value); restartTimingIfRunning(); ui.bpm.blur(); }
  });
  ui.meter.addEventListener('change', () => setMeter(ui.meter.value));
  ui.volume.addEventListener('input', () => { ui.volumeValue.textContent = `${ui.volume.value}%`; });
  ui.tap.addEventListener('click', registerTap);

  bpmSource.addEventListener('change', () => {
    syncBpm(bpmSource.value, false);
    restartTimingIfRunning();
  });
  bpmSource.addEventListener('input', () => {
    const value = Number(bpmSource.value);
    if (Number.isFinite(value)) syncBpm(value, false);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.running) stop();
  });

  renderLights();
  syncBpm(state.bpm, false);
})();
