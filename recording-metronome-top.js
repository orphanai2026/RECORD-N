(() => {
  'use strict';

  const $ = selector => document.querySelector(selector);
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const OUTPUT_KEY = 'ney-recording-metronome-output';

  function emitValue(input, value) {
    if (!input) return;
    input.value = String(value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function readOutputPreference() {
    try {
      const value = localStorage.getItem(OUTPUT_KEY);
      return ['light', 'sound', 'both'].includes(value) ? value : 'light';
    } catch (_) {
      return 'light';
    }
  }

  function saveOutputPreference(mode) {
    try { localStorage.setItem(OUTPUT_KEY, mode); } catch (_) {}
  }

  function applyOutputMode(mode, mini) {
    const soundEnabled = $('#trainingSoundEnabled');
    const flashEnabled = $('#trainingFlashEnabled');
    const safeMode = ['light', 'sound', 'both'].includes(mode) ? mode : 'light';

    if (soundEnabled) {
      soundEnabled.checked = safeMode === 'sound' || safeMode === 'both';
      soundEnabled.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (flashEnabled) {
      flashEnabled.checked = safeMode === 'light' || safeMode === 'both';
      flashEnabled.dispatchEvent(new Event('change', { bubbles: true }));
    }

    mini.querySelectorAll('[data-mini-output]').forEach(button => {
      const active = button.dataset.miniOutput === safeMode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    mini.dataset.outputMode = safeMode;
    saveOutputPreference(safeMode);
  }

  function syncOutputFromEngine(mini) {
    const soundEnabled = $('#trainingSoundEnabled');
    const flashEnabled = $('#trainingFlashEnabled');
    if (!soundEnabled || !flashEnabled) return;
    const mode = soundEnabled.checked && flashEnabled.checked
      ? 'both'
      : soundEnabled.checked
        ? 'sound'
        : 'light';
    mini.querySelectorAll('[data-mini-output]').forEach(button => {
      const active = button.dataset.miniOutput === mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    mini.dataset.outputMode = mode;
  }

  function install() {
    const screen = $('.ney-screen--recording');
    const layout = screen?.querySelector('.ney-recording-layout');
    const mini = screen?.querySelector('.ney-mini-metronome');
    if (!screen || !layout || !mini) return false;

    if (!mini.classList.contains('ney-mini-metronome--top')) {
      mini.classList.add('ney-mini-metronome--top');
      screen.insertBefore(mini, layout);
    }

    const body = mini.querySelector('.ney-mini-metronome__body');
    if (body && !body.querySelector('[data-mini-bpm-adjust]')) {
      const down = document.createElement('button');
      down.type = 'button';
      down.className = 'ney-mini-metronome__bpm-button';
      down.dataset.miniBpmAdjust = '-1';
      down.setAttribute('aria-label', 'خفض سرعة المترونوم');
      down.textContent = '−';

      const up = document.createElement('button');
      up.type = 'button';
      up.className = 'ney-mini-metronome__bpm-button';
      up.dataset.miniBpmAdjust = '1';
      up.setAttribute('aria-label', 'رفع سرعة المترونوم');
      up.textContent = '+';

      body.prepend(down);
      body.append(up);
    }

    if (!mini.querySelector('.ney-mini-metronome__output')) {
      const output = document.createElement('div');
      output.className = 'ney-mini-metronome__output';
      output.setAttribute('role', 'group');
      output.setAttribute('aria-label', 'طريقة إرشاد المترونوم أثناء التسجيل');
      output.innerHTML = `
        <span class="ney-mini-metronome__output-label">الإرشاد</span>
        <button type="button" data-mini-output="light" aria-pressed="true">ضوء فقط</button>
        <button type="button" data-mini-output="sound" aria-pressed="false">صوت فقط</button>
        <button type="button" data-mini-output="both" aria-pressed="false">صوت + ضوء</button>
        <small>للتسجيل النظيف استخدم «ضوء فقط» حتى لا تلتقط العينة نقرة المترونوم.</small>
      `;
      const actions = mini.querySelector('.ney-mini-metronome__actions');
      if (actions) mini.insertBefore(output, actions);
      else mini.append(output);

      output.addEventListener('click', event => {
        const button = event.target.closest('[data-mini-output]');
        if (!button) return;
        applyOutputMode(button.dataset.miniOutput, mini);
      });

      const soundEnabled = $('#trainingSoundEnabled');
      const flashEnabled = $('#trainingFlashEnabled');
      [soundEnabled, flashEnabled].filter(Boolean).forEach(control => {
        control.addEventListener('change', () => syncOutputFromEngine(mini));
      });

      applyOutputMode(readOutputPreference(), mini);
    }

    if (!mini.dataset.topMetronomeBound) {
      mini.dataset.topMetronomeBound = 'true';
      mini.addEventListener('click', event => {
        const button = event.target.closest('[data-mini-bpm-adjust]');
        if (!button) return;
        const trainingBpm = $('#trainingBpm');
        const recordingBpm = $('#bpmValue');
        const current = Number(trainingBpm?.value || recordingBpm?.value || $('#neyMiniBpm')?.textContent || 60);
        const next = clamp(Math.round(current + Number(button.dataset.miniBpmAdjust || 0)), 30, 240);
        emitValue(recordingBpm, next);
        emitValue(trainingBpm, next);
        const miniValue = $('#neyMiniBpm');
        if (miniValue) miniValue.textContent = String(next);
      });
    }

    return true;
  }

  function initialize() {
    if (install()) return;
    const observer = new MutationObserver(() => {
      if (install()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 12000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
