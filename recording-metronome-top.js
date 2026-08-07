(() => {
  'use strict';

  const $ = selector => document.querySelector(selector);
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function emitValue(input, value) {
    if (!input) return;
    input.value = String(value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
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
