(() => {
  'use strict';

  let bound = false;
  let beatObserver = null;
  let stateObserver = null;

  function bindBridge() {
    if (bound) return true;

    const mini = document.querySelector('.ney-mini-metronome');
    const miniBpm = document.querySelector('#neyMiniBpm');
    const miniMeter = document.querySelector('#neyMiniMeter');
    const miniBeat = document.querySelector('#neyMiniBeat');
    const miniToggle = document.querySelector('[data-mini-action="toggle"]');
    const trainingToggle = document.querySelector('#trainingMetronomeToggle');
    const trainingBpm = document.querySelector('#trainingBpm');
    const bpmSource = document.querySelector('#bpmValue');
    const trainingBeat = document.querySelector('#trainingBeatNumber');
    const trainingTotal = document.querySelector('#trainingBeatTotal');
    const trainingMeter = document.querySelector('#trainingMeter');

    if (!mini || !miniBpm || !miniMeter || !miniBeat || !miniToggle || !trainingToggle || !trainingBeat) return false;

    function currentBeatNumber() {
      const value = Number(String(trainingBeat.textContent || '').trim());
      return Number.isFinite(value) ? value : null;
    }

    function sync() {
      const bpm = Number(trainingBpm?.value || bpmSource?.value || 60);
      const beat = currentBeatNumber();
      miniBpm.textContent = Number.isFinite(bpm) ? String(Math.round(bpm)) : '60';
      miniBeat.textContent = trainingBeat.textContent.trim() || '—';
      miniMeter.textContent = trainingTotal?.textContent?.trim() || (trainingMeter?.value ? trainingMeter.value.replace('/', ' / ') : '4 / 4');
      mini.classList.toggle('is-accent', beat === 1);
      const running = trainingToggle.textContent.includes('إيقاف');
      mini.classList.toggle('is-running', running);
      miniToggle.textContent = running ? 'إيقاف' : 'تشغيل';
    }

    miniToggle.addEventListener('click', () => {
      const liveToggle = document.querySelector('#trainingMetronomeToggle');
      liveToggle?.click();
      queueMicrotask(sync);
    });

    [trainingBpm, bpmSource, trainingMeter].filter(Boolean).forEach(control => {
      control.addEventListener('input', sync);
      control.addEventListener('change', sync);
    });

    beatObserver = new MutationObserver(() => {
      const beat = currentBeatNumber();
      mini.classList.toggle('is-accent', beat === 1);
      mini.classList.remove('is-beat');
      void mini.offsetWidth;
      mini.classList.add('is-beat');
      window.setTimeout(() => mini.classList.remove('is-beat'), 120);
      sync();
    });
    beatObserver.observe(trainingBeat, { childList: true, subtree: true, characterData: true });

    stateObserver = new MutationObserver(sync);
    stateObserver.observe(trainingToggle, { childList: true, subtree: true, characterData: true });
    if (trainingTotal) stateObserver.observe(trainingTotal, { childList: true, subtree: true, characterData: true });

    sync();
    bound = true;
    return true;
  }

  if (bindBridge()) return;

  const bootstrapObserver = new MutationObserver(() => {
    if (bindBridge()) bootstrapObserver.disconnect();
  });
  bootstrapObserver.observe(document.documentElement, { childList: true, subtree: true });

  window.setTimeout(() => bootstrapObserver.disconnect(), 15000);
})();
