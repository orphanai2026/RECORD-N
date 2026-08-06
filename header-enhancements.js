(() => {
  'use strict';

  const body = document.body;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const motionClasses = ['ney-motion--recording', 'ney-motion--preview', 'ney-motion--tuned'];
  const timers = new Map();

  function pulse(type, duration) {
    if (reducedMotion.matches) return;
    const className = `ney-motion--${type}`;
    motionClasses.forEach(name => body.classList.remove(name));
    clearTimeout(timers.get(className));
    void body.offsetWidth;
    body.classList.add(className);
    timers.set(className, setTimeout(() => body.classList.remove(className), duration));
  }

  const prepareButton = document.getElementById('prepareButton');
  const headerMicButton = document.getElementById('headerMicButton');
  const tunerPanel = document.querySelector('.tuner-panel');
  const recordingsList = document.getElementById('recordingsList');

  if (prepareButton) {
    const observer = new MutationObserver(() => {
      if (prepareButton.classList.contains('is-recording')) pulse('recording', 1550);
    });
    observer.observe(prepareButton, { attributes: true, attributeFilter: ['class'] });
  }

  if (headerMicButton) {
    headerMicButton.addEventListener('click', () => {
      window.setTimeout(() => {
        const isActive = document.getElementById('headerStatusDot')?.classList.contains('status-dot--success');
        if (!isActive) motionClasses.forEach(name => body.classList.remove(name));
      }, 180);
    });
  }

  if (tunerPanel) {
    let wasInTune = tunerPanel.classList.contains('is-in-tune');
    const observer = new MutationObserver(() => {
      const isInTune = tunerPanel.classList.contains('is-in-tune');
      if (isInTune && !wasInTune) pulse('tuned', 900);
      wasInTune = isInTune;
    });
    observer.observe(tunerPanel, { attributes: true, attributeFilter: ['class'] });
  }

  if (recordingsList) {
    recordingsList.addEventListener('click', event => {
      const button = event.target.closest('.play-button');
      if (!button) return;
      const label = button.querySelector('span')?.textContent?.trim();
      if (label !== 'إيقاف') pulse('preview', 1550);
    });
  }

  reducedMotion.addEventListener?.('change', event => {
    if (event.matches) motionClasses.forEach(name => body.classList.remove(name));
  });
})();
