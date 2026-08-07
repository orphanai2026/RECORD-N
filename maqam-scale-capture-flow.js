(() => {
  'use strict';

  const $ = selector => document.querySelector(selector);
  const state = { scale: null, index: 0, active: false, pending: false, timer: null };

  const currentMode = () => $('#recordingModeControl .segment.is-active')?.dataset.recordingMode || 'single';
  const expected = () => state.active ? state.scale?.notes?.[state.index] || null : null;

  function readNumber(selector) {
    const match = String($(selector)?.textContent || '').replace(',', '.').match(/[+-]?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : NaN;
  }

  function centsBetween(a, b) {
    return a > 0 && b > 0 ? 1200 * Math.log2(a / b) : Infinity;
  }

  function ensurePanel() {
    let panel = $('#recordingMaqamScaleCaptureProgress');
    if (panel) return panel;
    const preview = $('.recording-maqam-scale-preview');
    const head = preview?.querySelector('.recording-maqam-scale-preview__head');
    if (!preview || !head) return null;

    panel = document.createElement('section');
    panel.id = 'recordingMaqamScaleCaptureProgress';
    panel.className = 'recording-maqam-scale-capture';
    panel.hidden = true;
    panel.innerHTML = `
      <div class="recording-maqam-scale-capture__top">
        <div><strong>جلسة تسجيل السلم</strong><span id="recordingMaqamScaleCaptureStatus">اختر المقام والجذر.</span></div>
        <span id="recordingMaqamScaleCaptureCount">0 / 0</span>
      </div>
      <div id="recordingMaqamScaleCaptureTarget">—</div>
      <progress id="recordingMaqamScaleCaptureBar" value="0" max="1"></progress>`;
    head.after(panel);
    return panel;
  }

  function setStatus(text) {
    const element = $('#recordingMaqamScaleCaptureStatus');
    if (element) element.textContent = text;
  }

  function paint() {
    const panel = ensurePanel();
    if (!panel) return;
    const visible = currentMode() === 'maqam-scale' && Boolean(state.scale?.notes?.length);
    panel.hidden = !visible;
    if (!visible) return;

    const total = state.scale.notes.length;
    const note = expected();
    $('#recordingMaqamScaleCaptureCount').textContent = `${Math.min(state.index, total)} / ${total}`;
    $('#recordingMaqamScaleCaptureBar').max = Math.max(1, total);
    $('#recordingMaqamScaleCaptureBar').value = Math.min(state.index, total);

    if (note) {
      $('#recordingMaqamScaleCaptureTarget').textContent = `المطلوب الآن: ${note.arabic} · ${note.english} · ${note.frequency.toFixed(2)} Hz`;
      if (!state.pending) setStatus('اعزف الدرجة المطلوبة بثبات؛ الانتقال يتم تلقائيًا بعد حفظ التسجيل التعليمي.');
    } else {
      $('#recordingMaqamScaleCaptureTarget').textContent = 'اكتمل تسجيل جميع درجات السلم.';
      setStatus('الجلسة مكتملة.');
    }

    document.querySelectorAll('.recording-maqam-degree').forEach(card => {
      const degree = Number(card.dataset.degree);
      card.classList.toggle('is-complete', degree <= state.index);
      card.classList.toggle('is-current', note && degree === Number(note.degree));
    });
  }

  function setCaptureContext() {
    const note = expected();
    if (!note || !window.NeyAutoCapture?.setCaptureContext) return;
    window.NeyAutoCapture.setCaptureContext({
      mode: 'maqam-scale',
      maqamId: state.scale.maqamId,
      maqamAr: state.scale.maqamAr,
      tonic: state.scale.tonic,
      maqamDegree: note.degree,
      variantId: state.scale.variantId,
      division: 24,
      a4: Number($('#a4Reference')?.value || 440),
      expectedTargetFrequency: note.frequency,
      expectedEnglish: note.english,
      expectedArabic: note.arabic,
      expectedIndex: state.index
    });
  }

  function reset(scale) {
    state.scale = scale?.notes?.length ? scale : null;
    state.index = 0;
    state.pending = false;
    state.active = currentMode() === 'maqam-scale' && Boolean(state.scale);
    if (state.active) {
      $('#divisionControl [data-division="24"]')?.click();
      setCaptureContext();
    }
    paint();
  }

  function candidateTarget(candidate) {
    const values = (candidate?.frames || []).map(frame => Number(frame.target)).filter(Number.isFinite);
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : NaN;
  }

  function handleCandidate(candidate) {
    if (!state.active || state.pending || currentMode() !== 'maqam-scale') return;
    const note = expected();
    if (!note) return;

    const target = candidateTarget(candidate);
    if (!Number.isFinite(target) || Math.abs(centsBetween(target, note.frequency)) > 20) {
      setStatus(`النغمة الحالية ليست المطلوبة. المطلوب: ${note.arabic}.`);
      return;
    }

    state.pending = true;
    setStatus(`تمت مطابقة ${note.arabic}. جارٍ تسجيل المدة التعليمية والتحقق منها.`);
  }

  function advanceFromSaved(event) {
    if (!state.active || !state.pending) return;
    const context = event.detail?.pack?.context || {};
    const note = expected();
    if (context.mode !== 'maqam-scale' || !note) return;
    if (Number(context.maqamDegree) !== Number(note.degree)) return;

    state.pending = false;
    state.index += 1;
    if (state.index >= state.scale.notes.length) {
      state.active = false;
      window.NeyAutoCapture?.clearCaptureContext?.();
      paint();
      document.dispatchEvent(new CustomEvent('ney:maqam-scale-session-complete', { detail: { scale: state.scale } }));
      return;
    }

    setCaptureContext();
    paint();
  }

  function reopenAfterRejected(event) {
    if (!state.active || !state.pending || currentMode() !== 'maqam-scale') return;
    const candidate = event.detail?.candidate;
    const note = expected();
    if (!note || !candidate) return;
    const context = candidate.captureContext || {};
    if (context.mode && context.mode !== 'maqam-scale') return;
    if (context.maqamDegree && Number(context.maqamDegree) !== Number(note.degree)) return;

    state.pending = false;
    setStatus(`لم يكتمل تسجيل ${note.arabic}. أعد عزف الدرجة نفسها؛ المحاولة التالية تبدأ تلقائيًا.`);
    paint();
  }

  function sync(detail) {
    if (currentMode() !== 'maqam-scale') {
      state.active = false;
      state.pending = false;
      paint();
      return;
    }
    reset(detail?.scale || window.NeyMaqamRecordingContext?.getScale?.());
  }

  function initialize() {
    ensurePanel();
    document.addEventListener('ney:maqam-recording-context-change', event => sync(event.detail));
    document.addEventListener('ney:recording-mode-ui-change', () => setTimeout(() => sync(), 0));
    document.addEventListener('ney:auto-capture-candidate', event => handleCandidate(event.detail));
    document.addEventListener('ney:educational-duration-saved', advanceFromSaved);
    document.addEventListener('ney:educational-duration-rejected', reopenAfterRejected);

    const context = window.NeyMaqamRecordingContext?.getContext?.();
    if (currentMode() === 'maqam-scale' && context?.scale) reset(context.scale);

    window.NeyMaqamScaleCaptureFlow = Object.freeze({
      isActive: () => state.active,
      getExpected: () => expected() ? { ...expected() } : null,
      getIndex: () => state.index,
      reset: () => reset(window.NeyMaqamRecordingContext?.getScale?.())
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
