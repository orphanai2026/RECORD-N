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
      <div class="metronome-meter-caption" id="trainingMeterCaption">4/4 · 1+1+1+1</div>
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
          <optgroup label="موازين بسيطة">
            <option value="2/2">2 / 2</option>
            <option value="2/4">2 / 4</option>
            <option value="3/2">3 / 2</option>
            <option value="3/4">3 / 4</option>
            <option value="4/2">4 / 2</option>
            <option value="4/4" selected>4 / 4</option>
            <option value="4/8">4 / 8</option>
          </optgroup>
          <optgroup label="موازين مركبة">
            <option value="6/4">6 / 4</option>
            <option value="6/8">6 / 8</option>
            <option value="6/16">6 / 16</option>
            <option value="9/4">9 / 4</option>
            <option value="9/8">9 / 8</option>
            <option value="9/16">9 / 16</option>
            <option value="12/4">12 / 4</option>
            <option value="12/8">12 / 8</option>
            <option value="12/16">12 / 16</option>
          </optgroup>
          <optgroup label="موازين فردية وغير منتظمة">
            <option value="5/4">5 / 4</option>
            <option value="5/8">5 / 8</option>
            <option value="5/16">5 / 16</option>
            <option value="7/4">7 / 4</option>
            <option value="7/8">7 / 8</option>
            <option value="7/16">7 / 16</option>
            <option value="8/8">8 / 8</option>
            <option value="10/8">10 / 8</option>
            <option value="11/8">11 / 8</option>
            <option value="13/8">13 / 8</option>
            <option value="15/8">15 / 8</option>
          </optgroup>
          <option value="custom">مخصص…</option>
        </select>
        <div class="metronome-custom-meter" id="trainingCustomMeter" hidden>
          <input id="trainingNumerator" type="number" min="1" max="32" value="7" aria-label="بسط الميزان">
          <span class="metronome-meter-slash">/</span>
          <input id="trainingDenominator" type="number" min="1" max="32" value="8" aria-label="مقام الميزان">
          <button id="trainingApplyMeter" type="button">تطبيق</button>
        </div>
      </div>

      <div class="metronome-control-card">
        <label for="trainingGrouping">التقسيم الداخلي</label>
        <div class="metronome-grouping-wrap">
          <input class="metronome-grouping-input" id="trainingGrouping" type="text" value="1+1+1+1" inputmode="text" aria-label="تقسيم النبضات">
          <span class="metronome-grouping-hint" id="trainingGroupingHint">مثال: 7/8 = 2+2+3 أو 3+2+2</span>
        </div>
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
        <label class="metronome-switch"><span>الصوت</span><input id="trainingSoundEnabled" type="checkbox" checked><span class="metronome-switch-track" aria-hidden="true"></span></label>
        <label class="metronome-switch"><span>الإضاءة</span><input id="trainingFlashEnabled" type="checkbox" checked><span class="metronome-switch-track" aria-hidden="true"></span></label>
        <label class="metronome-switch"><span>تمييز النبضة الأولى</span><input id="trainingAccentEnabled" type="checkbox" checked><span class="metronome-switch-track" aria-hidden="true"></span></label>
      </div>

      <div class="metronome-actions">
        <button class="metronome-action" id="trainingMetronomeToggle" type="button">تشغيل المترونوم</button>
        <button class="metronome-tap" id="trainingTapTempo" type="button">Tap Tempo</button>
      </div>
    </section>
  `;
  panel.append(trainer);

  const ui = {
    dial: $('#trainingMetronomeDial'), beat: $('#trainingBeatNumber'), total: $('#trainingBeatTotal'),
    caption: $('#trainingMeterCaption'), lights: $('#trainingBeatLights'), status: $('#trainingMetronomeStatus'),
    bpm: $('#trainingBpm'), bpmMinus: $('#trainingBpmMinus'), bpmPlus: $('#trainingBpmPlus'),
    meter: $('#trainingMeter'), customMeter: $('#trainingCustomMeter'), numerator: $('#trainingNumerator'), denominator: $('#trainingDenominator'), applyMeter: $('#trainingApplyMeter'),
    grouping: $('#trainingGrouping'), groupingHint: $('#trainingGroupingHint'), sound: $('#trainingSound'),
    volume: $('#trainingVolume'), volumeValue: $('#trainingVolumeValue'), soundEnabled: $('#trainingSoundEnabled'),
    flashEnabled: $('#trainingFlashEnabled'), accentEnabled: $('#trainingAccentEnabled'), toggle: $('#trainingMetronomeToggle'), tap: $('#trainingTapTempo')
  };

  const state = {
    running: false, bpm: clamp(Number(bpmSource.value) || 60, 30, 240), numerator: 4, denominator: 4,
    grouping: [1,1,1,1], beat: 0, timer: null, nextNoteTime: 0, audioContext: null,
    schedulerLookahead: 25, scheduleAhead: .1, taps: []
  };

  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }

  function defaultGrouping(numerator, denominator) {
    if (denominator === 8 || denominator === 16) {
      if (numerator === 5) return [2,3];
      if (numerator === 7) return [2,2,3];
      if (numerator === 8) return [3,3,2];
      if (numerator === 10) return [3,3,2,2];
      if (numerator === 11) return [3,3,3,2];
      if (numerator === 13) return [3,3,3,2,2];
      if (numerator === 15) return [3,3,3,3,3];
      if (numerator > 3 && numerator % 3 === 0) return Array(numerator / 3).fill(3);
    }
    return Array(numerator).fill(1);
  }

  function parseGrouping(raw) {
    const parts = String(raw || '').split('+').map(part => Number(part.trim())).filter(Number.isFinite);
    if (!parts.length || parts.some(part => part < 1 || !Number.isInteger(part))) return null;
    return parts.reduce((a,b) => a + b, 0) === state.numerator ? parts : null;
  }

  function groupStarts() {
    const starts = new Set([1]);
    let cursor = 1;
    for (const size of state.grouping.slice(0, -1)) { cursor += size; starts.add(cursor); }
    return starts;
  }

  function renderMeter() {
    ui.total.textContent = `${state.numerator} / ${state.denominator}`;
    ui.caption.textContent = `${state.numerator}/${state.denominator} · ${state.grouping.join('+')}`;
    ui.grouping.value = state.grouping.join('+');
    ui.grouping.classList.remove('is-invalid');
    ui.groupingHint.textContent = `مجموع التقسيم يجب أن يساوي ${state.numerator} · مثال ${state.grouping.join('+')}`;
    renderLights();
  }

  function renderLights() {
    ui.lights.replaceChildren();
    const starts = groupStarts();
    for (let index = 1; index <= state.numerator; index += 1) {
      const dot = document.createElement('i');
      dot.className = 'metronome-light';
      if (starts.has(index)) dot.classList.add('is-group-start');
      dot.dataset.beat = String(index);
      ui.lights.append(dot);
    }
  }

  function syncBpm(value, fromTrainer = true) {
    const bpm = Math.round(clamp(Number(value) || 60, 30, 240));
    state.bpm = bpm; ui.bpm.value = bpm;
    ui.status.textContent = state.running ? `يعمل · ${bpm} BPM` : `جاهز للتدريب · ${bpm} BPM`;
    if (fromTrainer && Number(bpmSource.value) !== bpm) {
      bpmSource.value = bpm; bpmSource.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  async function ensureAudio() {
    if (!state.audioContext || state.audioContext.state === 'closed') state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (state.audioContext.state === 'suspended') await state.audioContext.resume();
    return state.audioContext;
  }

  function toneProfile(level) {
    const type = ui.sound.value;
    if (type === 'click') return { frequency: level === 2 ? 1450 : level === 1 ? 1220 : 1050, duration: .035, wave: 'square' };
    if (type === 'soft') return { frequency: level === 2 ? 760 : level === 1 ? 670 : 580, duration: .055, wave: 'sine' };
    return { frequency: level === 2 ? 1200 : level === 1 ? 980 : 820, duration: .045, wave: 'triangle' };
  }

  function accentLevel(beatNumber) {
    if (!ui.accentEnabled.checked) return 0;
    if (beatNumber === 1) return 2;
    return groupStarts().has(beatNumber) ? 1 : 0;
  }

  function scheduleClick(time, beatNumber) {
    if (!ui.soundEnabled.checked || !state.audioContext) return;
    const level = accentLevel(beatNumber); const profile = toneProfile(level);
    const oscillator = state.audioContext.createOscillator(); const gain = state.audioContext.createGain();
    const volume = Number(ui.volume.value) / 100;
    oscillator.type = profile.wave; oscillator.frequency.setValueAtTime(profile.frequency, time);
    gain.gain.setValueAtTime(.0001, time);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0001, volume * (level === 2 ? .42 : level === 1 ? .33 : .26)), time + .004);
    gain.gain.exponentialRampToValueAtTime(.0001, time + profile.duration);
    oscillator.connect(gain); gain.connect(state.audioContext.destination); oscillator.start(time); oscillator.stop(time + profile.duration + .01);
  }

  function visualBeat(beatNumber) {
    const level = accentLevel(beatNumber);
    ui.beat.textContent = String(beatNumber);
    ui.dial.classList.remove('is-beat','is-accent','is-group-accent');
    panel.classList.remove('metronome-flash','metronome-flash-accent');
    void ui.dial.offsetWidth; ui.dial.classList.add('is-beat');
    if (level === 2) ui.dial.classList.add('is-accent'); else if (level === 1) ui.dial.classList.add('is-group-accent');
    [...ui.lights.children].forEach((light,index) => {
      light.classList.toggle('is-current', index + 1 === beatNumber);
      light.classList.toggle('is-accent', index === 0 && level === 2);
      light.classList.toggle('is-group-accent', index + 1 === beatNumber && level === 1);
    });
    if (ui.flashEnabled.checked) panel.classList.add(level === 2 ? 'metronome-flash-accent' : 'metronome-flash');
    setTimeout(() => { ui.dial.classList.remove('is-beat','is-accent','is-group-accent'); panel.classList.remove('metronome-flash','metronome-flash-accent'); }, 130);
  }

  function scheduleBeat(beatNumber, time) {
    scheduleClick(time, beatNumber);
    const delay = Math.max(0, (time - state.audioContext.currentTime) * 1000);
    setTimeout(() => { if (state.running) visualBeat(beatNumber); }, delay);
  }

  function secondsPerUnit() { return (60 / state.bpm) * (4 / state.denominator); }

  function scheduler() {
    if (!state.running || !state.audioContext) return;
    while (state.nextNoteTime < state.audioContext.currentTime + state.scheduleAhead) {
      state.beat = (state.beat % state.numerator) + 1;
      scheduleBeat(state.beat, state.nextNoteTime);
      state.nextNoteTime += secondsPerUnit();
    }
  }

  async function start() {
    if (state.running) return; await ensureAudio(); state.running = true; state.beat = 0;
    state.nextNoteTime = state.audioContext.currentTime + .06;
    ui.toggle.textContent = 'إيقاف المترونوم'; ui.toggle.classList.add('is-running');
    ui.status.textContent = `يعمل · ${state.bpm} BPM`; scheduler(); state.timer = setInterval(scheduler, state.schedulerLookahead);
  }

  function stop() {
    state.running = false; clearInterval(state.timer); state.timer = null; state.beat = 0;
    ui.toggle.textContent = 'تشغيل المترونوم'; ui.toggle.classList.remove('is-running'); ui.status.textContent = `جاهز للتدريب · ${state.bpm} BPM`;
    ui.beat.textContent = '—'; ui.dial.classList.remove('is-beat','is-accent','is-group-accent'); panel.classList.remove('metronome-flash','metronome-flash-accent');
    [...ui.lights.children].forEach(light => light.classList.remove('is-current','is-accent','is-group-accent'));
  }

  function restartTimingIfRunning() { if (state.running && state.audioContext) { state.beat = 0; state.nextNoteTime = state.audioContext.currentTime + .08; } }

  function applyMeter(numerator, denominator) {
    state.numerator = clamp(Math.round(Number(numerator) || 4), 1, 32);
    state.denominator = clamp(Math.round(Number(denominator) || 4), 1, 32);
    state.grouping = defaultGrouping(state.numerator, state.denominator);
    renderMeter(); restartTimingIfRunning();
  }

  function chooseMeter(value) {
    if (value === 'custom') { ui.customMeter.hidden = false; return; }
    ui.customMeter.hidden = true;
    const [num, den] = value.split('/').map(Number); applyMeter(num, den);
  }

  function applyGrouping() {
    const parsed = parseGrouping(ui.grouping.value);
    if (!parsed) { ui.grouping.classList.add('is-invalid'); ui.groupingHint.textContent = `التقسيم غير صالح: يجب أن يكون مجموع الأرقام = ${state.numerator}`; return; }
    state.grouping = parsed; ui.grouping.classList.remove('is-invalid'); renderMeter(); restartTimingIfRunning();
  }

  function registerTap() {
    const now = performance.now(); state.taps = state.taps.filter(time => now - time < 3000); state.taps.push(now);
    if (state.taps.length < 2) { ui.status.textContent = 'اضغط مرة أخرى لحساب السرعة'; return; }
    const intervals = []; for (let i=1;i<state.taps.length;i+=1) intervals.push(state.taps[i]-state.taps[i-1]);
    syncBpm(60000 / (intervals.reduce((a,b)=>a+b,0)/intervals.length)); restartTimingIfRunning();
  }

  ui.toggle.addEventListener('click', () => state.running ? stop() : start().catch(console.error));
  ui.bpmMinus.addEventListener('click', () => { syncBpm(state.bpm-1); restartTimingIfRunning(); });
  ui.bpmPlus.addEventListener('click', () => { syncBpm(state.bpm+1); restartTimingIfRunning(); });
  ui.bpm.addEventListener('change', () => { syncBpm(ui.bpm.value); restartTimingIfRunning(); });
  ui.bpm.addEventListener('keydown', e => { if (e.key === 'Enter') { syncBpm(ui.bpm.value); restartTimingIfRunning(); ui.bpm.blur(); } });
  ui.meter.addEventListener('change', () => chooseMeter(ui.meter.value));
  ui.applyMeter.addEventListener('click', () => applyMeter(ui.numerator.value, ui.denominator.value));
  ui.grouping.addEventListener('change', applyGrouping);
  ui.grouping.addEventListener('keydown', e => { if (e.key === 'Enter') { applyGrouping(); ui.grouping.blur(); } });
  ui.volume.addEventListener('input', () => { ui.volumeValue.textContent = `${ui.volume.value}%`; });
  ui.tap.addEventListener('click', registerTap);
  bpmSource.addEventListener('change', () => { syncBpm(bpmSource.value, false); restartTimingIfRunning(); });
  bpmSource.addEventListener('input', () => { const value = Number(bpmSource.value); if (Number.isFinite(value)) syncBpm(value, false); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && state.running) stop(); });

  renderMeter(); syncBpm(state.bpm, false);
})();
