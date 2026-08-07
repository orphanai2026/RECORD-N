(() => {
  'use strict';

  const state = {
    mode: 'auto',
    detected: null,
    controller: null,
    status: null,
    autoButton: null,
    manualButton: null,
    settings: null,
    startLabel: null,
    endLabel: null,
    buildButton: null
  };

  const $ = selector => document.querySelector(selector);

  function currentRecordingMode() {
    return $('#recordingModeControl .segment.is-active')?.dataset.recordingMode || 'single';
  }

  function currentDivision() {
    return Number($('#divisionControl .segment.is-active')?.dataset.division || 24);
  }

  function currentA4() {
    return Number($('#a4Reference')?.value || 440);
  }

  function savePreference() {
    try { localStorage.setItem('ney-session-start-mode', state.mode); } catch (_) {}
  }

  function loadPreference() {
    try {
      const value = localStorage.getItem('ney-session-start-mode');
      return value === 'manual' ? 'manual' : 'auto';
    } catch (_) {
      return 'auto';
    }
  }

  function setCaptureContext() {
    if (!window.NeyAutoCapture?.setCaptureContext) return;
    if (currentRecordingMode() !== 'chromatic') {
      window.NeyAutoCapture.clearCaptureContext?.();
      return;
    }
    const division = currentDivision();
    window.NeyAutoCapture.setCaptureContext({
      mode: division === 12 ? 'chromatic-12' : 'chromatic-24',
      division,
      a4: currentA4()
    });
  }

  function resetDetected() {
    state.detected = null;
    if (state.status) {
      state.status.innerHTML = '<strong>بانتظار أول نغمة صافية</strong><span>ابدأ العزف مباشرة؛ أول نافذة معتمدة تحدد نقطة البداية تلقائيًا.</span>';
      state.status.dataset.state = 'waiting';
    }
  }

  function updateVisibility() {
    const chromatic = currentRecordingMode() === 'chromatic';
    if (state.controller) state.controller.hidden = !chromatic;
    if (!chromatic) {
      state.startLabel?.removeAttribute('hidden');
      state.endLabel?.removeAttribute('hidden');
      if (state.buildButton) state.buildButton.hidden = false;
      return;
    }

    const automatic = state.mode === 'auto';
    if (state.startLabel) state.startLabel.hidden = automatic;
    if (state.endLabel) state.endLabel.hidden = automatic;
    if (state.buildButton) state.buildButton.hidden = automatic;
    state.autoButton?.classList.toggle('is-active', automatic);
    state.manualButton?.classList.toggle('is-active', !automatic);
    state.autoButton?.setAttribute('aria-pressed', automatic ? 'true' : 'false');
    state.manualButton?.setAttribute('aria-pressed', automatic ? 'false' : 'true');

    if (automatic && !state.detected) resetDetected();
    setCaptureContext();
  }

  function setMode(mode) {
    state.mode = mode === 'manual' ? 'manual' : 'auto';
    savePreference();
    resetDetected();
    updateVisibility();
  }

  function detectStart(candidate) {
    if (state.mode !== 'auto' || currentRecordingMode() !== 'chromatic' || state.detected) return;
    if (!candidate || candidate.style !== 'clean' || Number(candidate.passRatio) !== 1) return;

    state.detected = {
      key: candidate.key,
      english: candidate.english,
      arabic: candidate.arabic,
      frequency: candidate.frames?.[0]?.target || candidate.frames?.[0]?.frequency || null,
      division: candidate.frames?.[0]?.division || currentDivision(),
      detectedAt: new Date().toISOString()
    };

    if (state.status) {
      const note = state.detected.arabic || state.detected.english || 'النغمة المكتشفة';
      state.status.innerHTML = `<strong>تم تحديد البداية: ${note}</strong><span>استمر في العزف؛ Ney Auto-Capture يلتقط كل نغمة صافية جديدة دون إجبارك على نقطة بداية محددة.</span>`;
      state.status.dataset.state = 'detected';
    }

    document.dispatchEvent(new CustomEvent('ney:auto-session-start-detected', { detail: { ...state.detected } }));
  }

  function installController() {
    const settings = $('#chromaticSettings');
    if (!settings || $('#autoSessionStartController')) return;

    state.settings = settings;
    state.startLabel = $('#chromaticStart')?.closest('label') || null;
    state.endLabel = $('#chromaticEnd')?.closest('label') || null;
    state.buildButton = $('#buildChromaticButton');

    const controller = document.createElement('section');
    controller.id = 'autoSessionStartController';
    controller.className = 'auto-session-start';
    controller.innerHTML = `
      <div class="auto-session-start__head">
        <div>
          <strong>بداية الجلسة</strong>
          <span>الوضع الافتراضي يحدد البداية من عزفك الفعلي.</span>
        </div>
        <div class="auto-session-start__modes" role="group" aria-label="طريقة تحديد بداية الجلسة">
          <button type="button" class="is-active" data-start-mode="auto" aria-pressed="true">اكتشاف تلقائي</button>
          <button type="button" data-start-mode="manual" aria-pressed="false">تحديد يدوي</button>
        </div>
      </div>
      <div class="auto-session-start__status" id="autoSessionStartStatus" data-state="waiting" aria-live="polite">
        <strong>بانتظار أول نغمة صافية</strong>
        <span>ابدأ العزف مباشرة؛ أول نافذة معتمدة تحدد نقطة البداية تلقائيًا.</span>
      </div>`;

    settings.prepend(controller);
    state.controller = controller;
    state.status = $('#autoSessionStartStatus');
    state.autoButton = controller.querySelector('[data-start-mode="auto"]');
    state.manualButton = controller.querySelector('[data-start-mode="manual"]');

    controller.addEventListener('click', event => {
      const button = event.target.closest('[data-start-mode]');
      if (!button) return;
      setMode(button.dataset.startMode);
    });

    state.mode = loadPreference();
    updateVisibility();
  }

  function monitorModeChanges() {
    $('#recordingModeControl')?.addEventListener('click', () => {
      setTimeout(() => {
        resetDetected();
        updateVisibility();
      }, 0);
    });

    $('#divisionControl')?.addEventListener('click', () => {
      setTimeout(() => {
        resetDetected();
        setCaptureContext();
      }, 0);
    });

    $('#a4Reference')?.addEventListener('change', () => {
      resetDetected();
      setCaptureContext();
    });
  }

  function initialize() {
    installController();
    monitorModeChanges();
    document.addEventListener('ney:auto-capture-candidate', event => detectStart(event.detail));

    window.NeyAutoSessionStart = Object.freeze({
      getMode: () => state.mode,
      getDetectedStart: () => state.detected ? { ...state.detected } : null,
      reset: resetDetected,
      setMode
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
