(() => {
  'use strict';

  const $ = selector => document.querySelector(selector);
  const state = { scale: null, ascending: [], descending: [], phase: 'ascending', index: 0, active: false, pending: false, timer: null };

  const currentMode = () => $('#recordingModeControl .segment.is-active')?.dataset.recordingMode || 'single';
  const phaseNotes = () => state.phase === 'descending' ? state.descending : state.ascending;
  const expected = () => state.active ? phaseNotes()?.[state.index] || null : null;

  function readNumber(selector) {
    const match = String($(selector)?.textContent || '').replace(',', '.').match(/[+-]?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : NaN;
  }

  function centsBetween(a, b) {
    return a > 0 && b > 0 ? 1200 * Math.log2(a / b) : Infinity;
  }

  function tonicKey(tonic) {
    if (!tonic) return 'none';
    if (typeof tonic === 'string') return tonic.trim();
    const letter = String(tonic.letter || '').toUpperCase();
    const accidentalQuarterSteps = Number(tonic.accidentalQuarterSteps || 0);
    const octave = Number.isFinite(Number(tonic.octave)) ? Number(tonic.octave) : 4;
    return `${letter}:${accidentalQuarterSteps}:${octave}`;
  }

  function sameTonic(a, b) {
    return tonicKey(a) === tonicKey(b);
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
        <span id="recordingMaqamScaleCaptureCount" dir="ltr">0 / 0</span>
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

  function phaseLabel() {
    return state.phase === 'descending' ? 'الهبوط' : 'الصعود';
  }

  function paint() {
    const panel = ensurePanel();
    if (!panel) return;
    const visible = currentMode() === 'maqam-scale' && Boolean(state.scale?.notes?.length);
    panel.hidden = !visible;
    if (!visible) return;

    const notes = phaseNotes();
    const total = notes.length;
    const note = expected();
    const count = $('#recordingMaqamScaleCaptureCount');
    if (count) {
      count.dir = 'ltr';
      count.textContent = `${phaseLabel()} ${Math.min(state.index, total)} / ${total}`;
    }
    $('#recordingMaqamScaleCaptureBar').max = Math.max(1, total);
    $('#recordingMaqamScaleCaptureBar').value = Math.min(state.index, total);

    if (note) {
      $('#recordingMaqamScaleCaptureTarget').textContent = `المطلوب الآن (${phaseLabel()}): ${note.arabic} · ${note.english} · ${note.frequency.toFixed(2)} Hz`;
      if (!state.pending) setStatus(`اعزف درجة ${phaseLabel()} المطلوبة بثبات؛ الانتقال يتم تلقائيًا بعد حفظ التسجيل التعليمي.`);
    } else if (!state.active) {
      $('#recordingMaqamScaleCaptureTarget').textContent = 'اكتمل تسجيل المقام صعودًا وهبوطًا.';
      setStatus('الجلسة مكتملة.');
    }

    document.querySelectorAll('.recording-maqam-degree').forEach(card => {
      const degree = Number(card.dataset.degree);
      card.classList.toggle('is-current', note && degree === Number(note.degree));
      if (state.phase === 'ascending') card.classList.toggle('is-complete', degree <= state.index);
      else card.classList.toggle('is-complete', false);
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
      maqamDirection: state.phase,
      variantId: state.scale.variantId,
      division: 24,
      a4: Number($('#a4Reference')?.value || 440),
      expectedTargetFrequency: note.frequency,
      expectedEnglish: note.english,
      expectedArabic: note.arabic,
      expectedIndex: state.index
    });
  }

  function buildDescending(scale) {
    try {
      const descendingScale = window.NeyMaqamLibrary?.buildScale?.({
        maqamId: scale.maqamId,
        tonic: scale.tonic,
        variantId: scale.variantId,
        a4: Number($('#a4Reference')?.value || 440),
        direction: 'descending'
      });
      const notes = descendingScale?.notes || [];
      return notes.length > 1 ? notes.slice(1) : [];
    } catch (_) {
      const fallback = [...(scale?.notes || [])].reverse();
      return fallback.length > 1 ? fallback.slice(1) : [];
    }
  }

  function reset(scale) {
    state.scale = scale?.notes?.length ? scale : null;
    state.ascending = state.scale?.notes ? [...state.scale.notes] : [];
    state.descending = state.scale ? buildDescending(state.scale) : [];
    state.phase = 'ascending';
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
      setStatus(`النغمة الحالية ليست المطلوبة في ${phaseLabel()}. المطلوب: ${note.arabic}.`);
      return;
    }

    state.pending = true;
    setStatus(`تمت مطابقة ${note.arabic} في ${phaseLabel()}. بدأ تسجيل المدة التعليمية من لحظة القبول؛ استمر حتى اكتمالها.`);
  }

  function matchingContext(event) {
    const packContext = event.detail?.pack?.context || {};
    const eventCandidateContext = event.detail?.candidate?.captureContext || {};
    const context = Object.keys(packContext).length ? packContext : eventCandidateContext;
    const note = expected();
    if (!state.active || !note) return null;
    if (context.mode !== 'maqam-scale') return null;
    if (context.maqamId && context.maqamId !== state.scale?.maqamId) return null;
    if (context.tonic && !sameTonic(context.tonic, state.scale?.tonic)) return null;
    if (context.maqamDirection && context.maqamDirection !== state.phase) return null;
    if (Number(context.maqamDegree) !== Number(note.degree)) return null;
    return { context, note };
  }

  function advanceFromSaved(event) {
    const match = matchingContext(event);
    if (!match) return;

    state.pending = false;
    state.index += 1;
    const notes = phaseNotes();

    if (state.index >= notes.length) {
      if (state.phase === 'ascending' && state.descending.length) {
        state.phase = 'descending';
        state.index = 0;
        setCaptureContext();
        paint();
        setStatus(`اكتمل الصعود. ابدأ الآن الهبوط من ${expected()?.arabic || 'الدرجة التالية'}.`);
        return;
      }

      state.active = false;
      window.NeyAutoCapture?.clearCaptureContext?.();
      paint();
      document.dispatchEvent(new CustomEvent('ney:maqam-scale-session-complete', {
        detail: { scale: state.scale, ascendingCount: state.ascending.length, descendingCount: state.descending.length }
      }));
      return;
    }

    setCaptureContext();
    paint();
    setStatus(`تم حفظ الدرجة السابقة. انتقل الآن إلى ${expected()?.arabic || 'الدرجة التالية'} في ${phaseLabel()}.`);
  }

  function reopenAfterRejected(event) {
    if (!state.active || currentMode() !== 'maqam-scale') return;
    const candidate = event.detail?.candidate;
    const note = expected();
    if (!note || !candidate) return;
    const context = candidate.captureContext || {};
    if (context.mode && context.mode !== 'maqam-scale') return;
    if (context.maqamId && context.maqamId !== state.scale?.maqamId) return;
    if (context.tonic && !sameTonic(context.tonic, state.scale?.tonic)) return;
    if (context.maqamDirection && context.maqamDirection !== state.phase) return;
    if (context.maqamDegree && Number(context.maqamDegree) !== Number(note.degree)) return;

    state.pending = false;
    setStatus(`لم يكتمل تسجيل ${note.arabic} في ${phaseLabel()}. أعد عزف الدرجة نفسها؛ المحاولة التالية تبدأ تلقائيًا.`);
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
    document.addEventListener('ney:educational-duration-retained', advanceFromSaved);
    document.addEventListener('ney:educational-duration-rejected', reopenAfterRejected);

    const context = window.NeyMaqamRecordingContext?.getContext?.();
    if (currentMode() === 'maqam-scale' && context?.scale) reset(context.scale);

    window.NeyMaqamScaleCaptureFlow = Object.freeze({
      isActive: () => state.active,
      getExpected: () => expected() ? { ...expected() } : null,
      getIndex: () => state.index,
      getPhase: () => state.phase,
      reset: () => reset(window.NeyMaqamRecordingContext?.getScale?.())
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();

/* Contextual fingering guide — loaded after the maqam flow so it can follow the active target. */
if (!document.querySelector('link[data-ney-fingering-guide]')) {
  const fingeringStyles = document.createElement('link');
  fingeringStyles.rel = 'stylesheet';
  fingeringStyles.href = './ney-fingering-guide.css?v=2026-08-08-1152';
  fingeringStyles.dataset.neyFingeringGuide = 'true';
  document.head.append(fingeringStyles);
}
import('./ney-fingering-guide.js?v=2026-08-08-1152')
  .catch(error => console.error('Ney fingering guide load failed', error));