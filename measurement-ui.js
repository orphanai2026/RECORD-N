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
    const frequency = $('#frequencyValue');
    const signal = $('#signalValue');
    const deviationMetric = $('#deviationMetric');
    const needleValue = $('#tunerNeedleValue');
    const qualityText = $('#qualityText');

    if (!noteName || !noteArabic || !noteResult || !detectedPanel || !frequency || !signal || !deviationMetric || !needleValue) return;

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

    const measuredFrequencyCard = frequency.closest('.metric-card');
    const targetCard = $('#targetValue')?.closest('.metric-card');
    const signalCard = signal.closest('.metric-card');
    if (measuredFrequencyCard) measuredFrequencyCard.dataset.metric = 'frequency';
    if (targetCard) targetCard.dataset.metric = 'target';
    if (signalCard) signalCard.dataset.metric = 'signal';

    function isWaiting() {
      return (deviationMetric.dataset.state || 'idle') === 'idle' || noteName.textContent.trim().startsWith('بانتظار');
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
      if (parsed) {
        visualNote.append(createNoteToken(parsed));
      } else {
        visualNote.textContent = noteName.textContent.trim();
      }
      visualArabic.textContent = rawArabic.replace(/\s-?\d+\s*$/, '').trim();
      visualFrequency.textContent = frequency.textContent.trim() || '—';
      visualNote.setAttribute('aria-label', `${rawArabic}${visualFrequency.textContent !== '—' ? `، ${visualFrequency.textContent}` : ''}`);
    }

    function updateQuality() {
      if (isWaiting()) {
        signal.dataset.rawQuality = '';
        signal.dataset.quality = 'idle';
        signal.textContent = '—';
        return;
      }

      const source = signal.dataset.rawQuality || signal.textContent;
      const match = String(source).match(/([\d.]+)/);
      const percent = match ? Number(match[1]) : NaN;
      if (!Number.isFinite(percent)) return;
      signal.dataset.rawQuality = `${Math.round(percent)}%`;
      const quality = qualityLabel(percent);
      signal.dataset.quality = quality.key;
      signal.textContent = quality.label;
      signal.setAttribute('aria-label', `جودة الإشارة ${quality.label}، ${Math.round(percent)} بالمئة`);
    }

    function updateNeutralValues() {
      if (!isWaiting()) return;
      const currentFrequency = frequency.textContent.trim();
      if (/^0(?:\.0+)?\s*Hz$/i.test(currentFrequency)) frequency.textContent = '—';
      if (/^0(?:\.0+)?$/.test(needleValue.textContent.trim())) needleValue.textContent = '—';
    }

    const noteObserver = new MutationObserver(() => {
      updateNote();
      updateQuality();
      updateNeutralValues();
    });
    noteObserver.observe(noteName, { childList: true, subtree: true, characterData: true });
    noteObserver.observe(noteArabic, { childList: true, subtree: true, characterData: true });
    noteObserver.observe(frequency, { childList: true, subtree: true, characterData: true });
    noteObserver.observe(deviationMetric, { attributes: true, attributeFilter: ['data-state'] });

    const signalObserver = new MutationObserver(() => {
      if (signal.dataset.presentationLock === '1') return;
      const match = signal.textContent.match(/([\d.]+)%/);
      if (match) signal.dataset.rawQuality = `${Math.round(Number(match[1]))}%`;
      signal.dataset.presentationLock = '1';
      updateQuality();
      queueMicrotask(() => { delete signal.dataset.presentationLock; });
    });
    signalObserver.observe(signal, { childList: true, subtree: true, characterData: true });

    if (qualityText) {
      const qualityObserver = new MutationObserver(() => {
        if (qualityText.textContent.includes('بانتظار')) {
          detectedPanel.classList.add('is-waiting');
          updateNote();
          updateQuality();
          updateNeutralValues();
        }
      });
      qualityObserver.observe(qualityText, { childList: true, subtree: true, characterData: true });
    }

    updateNote();
    updateQuality();
    updateNeutralValues();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeMeasurementPresentation, { once: true });
  else initializeMeasurementPresentation();
})();
