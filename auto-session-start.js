(() => {
  'use strict';

  const state = {
    mode: 'auto',
    detected: null,
    sequence: [],
    sequenceKeys: new Set(),
    controller: null,
    status: null,
    headSubtitle: null,
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
      return localStorage.getItem('ney-session-start-mode') === 'manual' ? 'manual' : 'auto';
    } catch (_) {
      return 'auto';
    }
  }

  function ownsChromaticContext(context) {
    return context?.mode === 'chromatic-12' || context?.mode === 'chromatic-24';
  }

  function setCaptureContext() {
    if (!window.NeyAutoCapture?.setCaptureContext) return;
    if (currentRecordingMode() !== 'chromatic') {
      const currentContext = window.NeyAutoCapture.getCaptureContext?.();
      if (ownsChromaticContext(currentContext)) window.NeyAutoCapture.clearCaptureContext?.();
      return;
    }
    const division = currentDivision();
    window.NeyAutoCapture.setCaptureContext({
      mode: division === 12 ? 'chromatic-12' : 'chromatic-24',
      sessionStart: state.mode,
      division,
      a4: currentA4()
    });
  }

  function resetDetected() {
    state.detected = null;
    state.sequence = [];
    state.sequenceKeys.clear();
    if (state.status) {
      state.status.innerHTML = '<strong>بانتظار أول نغمة صافية</strong><span>ابدأ العزف مباشرة؛ أول نافذة معتمدة تبدأ الجلسة تلقائيًا.</span>';
      state.status.dataset.state = 'waiting';
    }
  }

  function updateHeadGuidance(automatic) {
    if (!state.headSubtitle) return;
    state.headSubtitle.textContent = automatic
      ? 'ابدأ العزف مباشرة؛ تبدأ الجلسة من أول نغمة صافية معتمدة.'
      : 'حدد نطاق الجلسة والاتجاه، ثم جهّز السلم قبل بدء العزف.';
  }

  function updateVisibility() {
    const chromatic = currentRecordingMode() === 'chromatic';
    if (state.controller) state.controller.hidden = !chromatic;
    if (!chromatic) {
      state.startLabel?.removeAttribute('hidden');
      state.endLabel?.removeAttribute('hidden');
      if (state.buildButton) state.buildButton.hidden = false;
      setCaptureContext();
      return;
    }

    const automatic = state.mode === 'auto';
    updateHeadGuidance(automatic);
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

  function candidateIsClean(candidate) {
    return Boolean(candidate && candidate.style === 'clean' && Number(candidate.passRatio) === 1);
  }

  function addAutomaticSessionNote(candidate) {
    if (state.mode !== 'auto' || currentRecordingMode() !== 'chromatic' || !candidateIsClean(candidate)) return;

    const key = candidate.key || `${candidate.english || ''}|${candidate.arabic || ''}`;
    const isFirst = !state.detected;

    if (isFirst) {
      state.detected = {
        key,
        english: candidate.english,
        arabic: candidate.arabic,
        frequency: candidate.frames?.[0]?.target || candidate.frames?.[0]?.frequency || null,
        division: candidate.frames?.[0]?.division || currentDivision(),
        detectedAt: new Date().toISOString()
      };
      document.dispatchEvent(new CustomEvent('ney:auto-session-start-detected', { detail: { ...state.detected } }));
    }

    if (state.sequenceKeys.has(key)) return;
    state.sequenceKeys.add(key);
    state.sequence.push({
      key,
      english: candidate.english,
      arabic: candidate.arabic,
      frequency: candidate.frames?.[0]?.target || candidate.frames?.[0]?.frequency || null,
      detectedAt: new Date().toISOString()
    });

    const firstNote = state.detected?.arabic || state.detected?.english || 'النغمة الأولى';
    const last = state.sequence[state.sequence.length - 1];
    const lastNote = last?.arabic || last?.english || 'النغمة الحالية';

    if (state.status) {
      state.status.innerHTML = isFirst
        ? `<strong>بدأت الجلسة من: ${firstNote}</strong><span>استمر في العزف كروماتيًا؛ كل نغمة صافية جديدة تُضاف تلقائيًا إلى الجلسة.</span>`
        : `<strong>الجلسة مستمرة · ${state.sequence.length} نغمات صافية</strong><span>آخر نغمة: ${lastNote} · لا حاجة لتجهيز نطاق مسبق.</span>`;
      state.status.dataset.state = 'detected';
    }

    document.dispatchEvent(new CustomEvent('ney:auto-session-note', {
      detail: {
        start: state.detected ? { ...state.detected } : null,
        note: { ...last },
        count: state.sequence.length,
        sequence: state.sequence.map(item => ({ ...item }))
      }
    }));
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
          <span id="autoSessionStartSubtitle">ابدأ العزف مباشرة؛ تبدأ الجلسة من أول نغمة صافية معتمدة.</span>
        </div>
        <div class="auto-session-start__modes" role="group" aria-label="طريقة تحديد بداية الجلسة">
          <button type="button" class="is-active" data-start-mode="auto" aria-pressed="true">اكتشاف تلقائي</button>
          <button type="button" data-start-mode="manual" aria-pressed="false">تحديد يدوي</button>
        </div>
      </div>
      <div class="auto-session-start__status" id="autoSessionStartStatus" data-state="waiting" aria-live="polite">
        <strong>بانتظار أول نغمة صافية</strong>
        <span>ابدأ العزف مباشرة؛ أول نافذة معتمدة تبدأ الجلسة تلقائيًا.</span>
      </div>`;

    settings.prepend(controller);
    state.controller = controller;
    state.status = $('#autoSessionStartStatus');
    state.headSubtitle = $('#autoSessionStartSubtitle');
    state.autoButton = controller.querySelector('[data-start-mode="auto"]');
    state.manualButton = controller.querySelector('[data-start-mode="manual"]');

    controller.addEventListener('click', event => {
      const button = event.target.closest('[data-start-mode]');
      if (button) setMode(button.dataset.startMode);
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
    document.addEventListener('ney:auto-capture-candidate', event => addAutomaticSessionNote(event.detail));

    window.NeyAutoSessionStart = Object.freeze({
      getMode: () => state.mode,
      getDetectedStart: () => state.detected ? { ...state.detected } : null,
      getSequence: () => state.sequence.map(item => ({ ...item })),
      reset: resetDetected,
      setMode
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
