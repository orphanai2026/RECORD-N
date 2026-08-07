(() => {
  'use strict';

  const DEFAULTS = Object.freeze({
    bpm: 60,
    meter: '4/4',
    grouping: '1+1+1+1',
    sound: 'wood',
    volume: 72
  });

  function emit(element, type = 'change') {
    element?.dispatchEvent(new Event(type, { bubbles: true }));
  }

  function installResetButton() {
    const actions = document.querySelector('.metronome-actions');
    if (!actions || document.querySelector('#trainingMetronomeReset')) return;

    const button = document.createElement('button');
    button.id = 'trainingMetronomeReset';
    button.type = 'button';
    button.className = 'metronome-tap metronome-reset';
    button.textContent = 'استعادة الافتراضي';
    button.setAttribute('aria-label', 'استعادة إعدادات المترونوم الافتراضية');
    button.style.gridColumn = '1 / -1';

    button.addEventListener('click', () => {
      const toggle = document.querySelector('#trainingMetronomeToggle');
      const bpm = document.querySelector('#trainingBpm');
      const meter = document.querySelector('#trainingMeter');
      const grouping = document.querySelector('#trainingGrouping');
      const sound = document.querySelector('#trainingSound');
      const volume = document.querySelector('#trainingVolume');
      const volumeValue = document.querySelector('#trainingVolumeValue');
      const soundEnabled = document.querySelector('#trainingSoundEnabled');
      const flashEnabled = document.querySelector('#trainingFlashEnabled');
      const accentEnabled = document.querySelector('#trainingAccentEnabled');
      const numerator = document.querySelector('#trainingNumerator');
      const denominator = document.querySelector('#trainingDenominator');
      const customMeter = document.querySelector('#trainingCustomMeter');
      const groupingHint = document.querySelector('#trainingGroupingHint');

      if (toggle?.classList.contains('is-running')) toggle.click();

      if (bpm) {
        bpm.value = String(DEFAULTS.bpm);
        emit(bpm, 'change');
      }

      if (meter) {
        meter.value = DEFAULTS.meter;
        emit(meter, 'change');
      }

      if (grouping) {
        grouping.value = DEFAULTS.grouping;
        grouping.classList.remove('is-invalid');
        emit(grouping, 'change');
      }

      if (sound) sound.value = DEFAULTS.sound;

      if (volume) {
        volume.value = String(DEFAULTS.volume);
        emit(volume, 'input');
      }
      if (volumeValue) volumeValue.textContent = `${DEFAULTS.volume}%`;

      if (soundEnabled) soundEnabled.checked = true;
      if (flashEnabled) flashEnabled.checked = true;
      if (accentEnabled) accentEnabled.checked = true;

      if (numerator) numerator.value = '4';
      if (denominator) denominator.value = '4';
      if (customMeter) customMeter.hidden = true;
      if (groupingHint) groupingHint.textContent = 'مجموع التقسيم يجب أن يساوي 4 · مثال 1+1+1+1';

      button.textContent = 'تمت الاستعادة ✓';
      window.setTimeout(() => { button.textContent = 'استعادة الافتراضي'; }, 1300);
    });

    actions.append(button);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installResetButton, { once: true });
  } else {
    installResetButton();
  }
})();
