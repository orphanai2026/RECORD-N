(() => {
  'use strict';

  const $ = (selector, scope = document) => scope.querySelector(selector);

  const noteMap = new Map([
    ['دو', 'C'],
    ['ري', 'D'],
    ['مي', 'E'],
    ['فا', 'F'],
    ['صول', 'G'],
    ['لا', 'A'],
    ['سي', 'B']
  ]);

  function accidentalSvg(type, label) {
    const img = document.createElement('img');
    img.className = `note-accidental note-accidental--${type}`;
    img.src = type === 'half-flat' ? 'assets/half-flat.svg' : 'assets/half-sharp.svg';
    img.alt = label;
    img.setAttribute('aria-label', label);
    return img;
  }

  function standardAccidental(symbol, label) {
    const span = document.createElement('span');
    span.className = 'note-accidental note-accidental--standard';
    span.textContent = symbol;
    span.setAttribute('aria-label', label);
    return span;
  }

  function parseArabicNote(raw) {
    const text = String(raw || '').trim();
    if (!text || text.startsWith('بانتظار') || text.startsWith('شغّل') || text.startsWith('اعزف')) return null;

    const octaveMatch = text.match(/\s(-?\d+)\s*$/);
    const octave = octaveMatch ? octaveMatch[1] : '';
    const body = octaveMatch ? text.slice(0, octaveMatch.index).trim() : text;
    const root = [...noteMap.keys()].sort((a, b) => b.length - a.length).find(name => body.startsWith(name));
    if (!root) return null;

    let accidental = null;
    if (body.includes('نصف بيمول')) accidental = { type: 'half-flat', label: 'نصف بيمول' };
    else if (body.includes('نصف دييز')) accidental = { type: 'half-sharp', label: 'نصف دييز' };
    else if (body.includes('بيمول')) accidental = { type: 'flat', label: 'بيمول', symbol: '♭' };
    else if (body.includes('دييز')) accidental = { type: 'sharp', label: 'دييز', symbol: '♯' };

    return { letter: noteMap.get(root), octave, accidental };
  }

  function createNoteToken(parsed) {
    const token = document.createElement('span');
    token.className = 'note-token';

    const letter = document.createElement('span');
    letter.className = 'note-letter';
    letter.textContent = parsed.letter;
    token.append(letter);

    if (parsed.accidental) {
      if (parsed.accidental.type === 'half-flat' || parsed.accidental.type === 'half-sharp') {
        token.append(accidentalSvg(parsed.accidental.type, parsed.accidental.label));
      } else {
        token.append(standardAccidental(parsed.accidental.symbol, parsed.accidental.label));
      }
    }

    if (parsed.octave) {
      const octave = document.createElement('span');
      octave.className = 'note-octave';
      octave.textContent = parsed.octave;
      token.append(octave);
    }

    return token;
  }

  function qualityLabel(percent) {
    if (!Number.isFinite(percent)) return { label: '—', key: 'idle' };
    if (percent >= 85) return { label: 'ممتازة', key: 'excellent' };
    if (percent >= 65) return { label: 'جيدة', key: 'good' };
    return { label: 'ضعيفة', key: 'weak' };
  }

  function initializeMeasurementPresentation() {
    const noteName = $('#noteName');
    const noteArabic = $('#noteArabic');
    const noteResult = $('#noteResult');
    const detectedPanel = $('.detected-panel');
    const tunerPanel = $('.tuner-panel');
    const frequency = $('#frequencyValue');
    const signal = $('#signalValue');
    const deviationMetric = $('#deviationMetric');
    const needle = $('#tunerNeedle');
    const needleValue = $('#tunerNeedleValue');
    const tunerBar = $('#tunerBar');
    const toleranceRange = $('#toleranceRange');
    const qualityText = $('#qualityText');

    if (!noteName || !noteArabic || !noteResult || !detectedPanel || !tunerPanel || !frequency || !signal || !deviationMetric || !needleValue) return;

    const visualNote = document.createElement('strong');
    visualNote.className = 'detected-note-visual';
    visualNote.setAttribute('aria-live', 'polite');
    visualNote.setAttribute('aria-atomic', 'true');
    noteName.classList.add('measurement-data-source');
    noteName.setAttribute('aria-hidden', 'true');
    noteResult.insertBefore(visualNote, noteName);

    const visualArabic = document.createElement('span');
    visualArabic.className = 'detected-note-arabic';
    noteArabic.classList.add('measurement-data-source');
    noteArabic.setAttribute('aria-hidden', 'true');
    noteResult.insertBefore(visualArabic, noteArabic);

    const visualFrequency = document.createElement('small');
    visualFrequency.className = 'detected-note-frequency';
    noteResult.append(visualFrequency);

    function liveCents() {
      const normalized = needleValue.textContent.replace('−', '-').trim();
      const match = normalized.match(/[+-]?\d+(?:\.\d+)?/);
      return match ? Number(match[0]) : NaN;
    }

    function currentTolerance() {
      const value = Number(toleranceRange?.value || 12);
      return Math.min(25, Math.max(3, Number.isFinite(value) ? value : 12));
    }

    function isWaiting() {
      const noSignal = qualityText?.textContent.includes('بانتظار') ?? false;
      const noteWaiting = noteName.textContent.trim().startsWith('بانتظار');
      return noSignal || noteWaiting || !Number.isFinite(liveCents());
    }

    function liveTuningState() {
      if (isWaiting()) return 'idle';
      const cents = liveCents();
      const tolerance = currentTolerance();
      if (cents < -tolerance) return 'flat';
      if (cents > tolerance) return 'sharp';
      return 'tuned';
    }

    function updateNote() {
      const waiting = isWaiting();
      detectedPanel.classList.toggle('is-waiting', waiting);
      visualNote.replaceChildren();

      if (waiting) {
        visualNote.textContent = 'بانتظار النغمة';
        visualArabic.textContent = 'اعزف نغمة ثابتة';
        visualFrequency.textContent = '—';
        visualNote.setAttribute('aria-label', 'بانتظار النغمة. اعزف نغمة ثابتة.');
        return;
      }

      const rawArabic = noteArabic.textContent.trim();
      const parsed = parseArabicNote(rawArabic);
      if (parsed) visualNote.append(createNoteToken(parsed));
      else visualNote.textContent = noteName.textContent.trim();

      visualArabic.textContent = rawArabic.replace(/\s-?\d+\s*$/, '').trim();
      visualFrequency.textContent = frequency.textContent.trim() || '—';
      visualNote.setAttribute('aria-label', `${rawArabic}${visualFrequency.textContent !== '—' ? `، ${visualFrequency.textContent}` : ''}`);
    }

    function renderQuality(percent) {
      const quality = qualityLabel(percent);
      signal.dataset.quality = quality.key;
      if (signal.textContent !== quality.label) signal.textContent = quality.label;
      if (Number.isFinite(percent)) signal.setAttribute('aria-label', `جودة الإشارة ${quality.label}، ${Math.round(percent)} بالمئة`);
      else signal.removeAttribute('aria-label');
    }

    function updateQualityFromSource() {
      if (isWaiting()) {
        signal.dataset.rawQuality = '';
        renderQuality(NaN);
        return;
      }

      const current = signal.textContent.trim();
      const percentMatch = current.match(/([\d.]+)%/);
      if (percentMatch) signal.dataset.rawQuality = `${Math.round(Number(percentMatch[1]))}%`;
      const rawMatch = String(signal.dataset.rawQuality || '').match(/([\d.]+)/);
      renderQuality(rawMatch ? Number(rawMatch[1]) : NaN);
    }

    function updateNeutralValues() {
      if (!isWaiting()) return;
      if (frequency.textContent.trim() !== '—') frequency.textContent = '—';
      if (needleValue.textContent.trim() !== '—') needleValue.textContent = '—';
    }

    function syncTuningVisualState() {
      const state = liveTuningState();
      tunerPanel.classList.toggle('is-in-tune', state === 'tuned');
      tunerPanel.classList.toggle('is-flat', state === 'flat');
      tunerPanel.classList.toggle('is-sharp', state === 'sharp');
      if (deviationMetric.dataset.state !== state) deviationMetric.dataset.state = state;

      const colors = {
        tuned: '#70f0b1',
        flat: '#ffd166',
        sharp: '#ff756d',
        idle: '#b9c3c0'
      };
      needleValue.style.color = colors[state] || colors.idle;
      needleValue.dataset.tuningState = state;
    }

    function protectNeedleReadingAtEdges() {
      if (!needle || !tunerBar || !needleValue) return;
      needleValue.classList.remove('is-edge-left', 'is-edge-right');
      if (isWaiting()) return;

      const barRect = tunerBar.getBoundingClientRect();
      const needleRect = needle.getBoundingClientRect();
      if (!barRect.width || !needleRect.width) return;

      const needleCenter = needleRect.left + (needleRect.width / 2);
      const ratio = (needleCenter - barRect.left) / barRect.width;
      if (ratio < .12) needleValue.classList.add('is-edge-left');
      else if (ratio > .88) needleValue.classList.add('is-edge-right');
    }

    let refreshing = false;
    function refresh() {
      if (refreshing) return;
      refreshing = true;
      try {
        updateNote();
        updateQualityFromSource();
        updateNeutralValues();
        syncTuningVisualState();
        requestAnimationFrame(protectNeedleReadingAtEdges);
      } finally {
        queueMicrotask(() => { refreshing = false; });
      }
    }

    const sourceObserver = new MutationObserver(refresh);
    sourceObserver.observe(noteName, { childList: true, subtree: true, characterData: true });
    sourceObserver.observe(noteArabic, { childList: true, subtree: true, characterData: true });
    sourceObserver.observe(frequency, { childList: true, subtree: true, characterData: true });
    sourceObserver.observe(deviationMetric, { attributes: true, attributeFilter: ['data-state'] });
    sourceObserver.observe(signal, { childList: true, subtree: true, characterData: true });
    sourceObserver.observe(needleValue, { childList: true, subtree: true, characterData: true });
    if (qualityText) sourceObserver.observe(qualityText, { childList: true, subtree: true, characterData: true });
    if (needle) sourceObserver.observe(needle, { attributes: true, attributeFilter: ['style', 'class'] });

    if (toleranceRange) {
      toleranceRange.addEventListener('input', refresh);
      toleranceRange.addEventListener('change', refresh);
    }

    if ('ResizeObserver' in window && tunerBar) {
      const resizeObserver = new ResizeObserver(() => requestAnimationFrame(protectNeedleReadingAtEdges));
      resizeObserver.observe(tunerBar);
    } else {
      window.addEventListener('resize', protectNeedleReadingAtEdges, { passive: true });
    }

    refresh();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeMeasurementPresentation, { once: true });
  else initializeMeasurementPresentation();
})();

/* Stage 2 navigation is isolated from measurement logic. */
import('./navigation.js?v=2026-08-07-r1').catch(error => console.error('Navigation load failed', error));
/* Build bootstrap must always be fresh during development so nested module versions cannot be pinned by browser cache. */
import(`./build-meta.js?ts=${Date.now()}`).catch(error => console.error('Build metadata load failed', error));
