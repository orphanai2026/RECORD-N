(() => {
  'use strict';

  const MODES = Object.freeze({
    generalNote: 'general-note',
    maqamNote: 'maqam-note',
    chromatic12: 'chromatic-12',
    chromatic24: 'chromatic-24',
    maqamScale: 'maqam-scale'
  });

  const ARABIC_PC24 = Object.freeze([
    'دو', 'دو نصف دييز', 'دو دييز', 'ري نصف بيمول',
    'ري', 'ري نصف دييز', 'ري دييز', 'مي نصف بيمول',
    'مي', 'فا نصف بيمول', 'فا', 'فا نصف دييز',
    'فا دييز', 'صول نصف بيمول', 'صول', 'صول نصف دييز',
    'صول دييز', 'لا نصف بيمول', 'لا', 'لا نصف دييز',
    'لا دييز', 'سي نصف بيمول', 'سي', 'دو نصف بيمول'
  ]);

  const A4_ABS24 = 4 * 24 + 18;

  function requireLibrary() {
    if (!window.NeyMaqamLibrary) throw new Error('NeyMaqamLibrary is not loaded');
    return window.NeyMaqamLibrary;
  }

  function frequencyFromAbs24(abs24, a4 = 440, extraCents = 0) {
    return (Number(a4) || 440) * (2 ** ((((Number(abs24) - A4_ABS24) * 50) + Number(extraCents || 0)) / 1200));
  }

  function parseAbs24(input) {
    const lib = requireLibrary();
    return lib.tonicAbs24(lib.normalizeTonic(input));
  }

  function arabicChromaticName(abs24) {
    const pc = ((abs24 % 24) + 24) % 24;
    const octave = Math.floor(abs24 / 24);
    return `${ARABIC_PC24[pc]} ${octave}`;
  }

  function chromaticSession({ division = 12, start = 'C4', end = 'C5', direction = 'ascending', a4 = 440 } = {}) {
    if (![12, 24].includes(Number(division))) throw new Error('Chromatic division must be 12 or 24');
    const step24 = Number(division) === 12 ? 2 : 1;
    const startAbs = parseAbs24(start);
    const endAbs = parseAbs24(end);
    const low = Math.min(startAbs, endAbs);
    const high = Math.max(startAbs, endAbs);
    const ascending = [];
    for (let abs24 = low; abs24 <= high; abs24 += step24) {
      ascending.push(Object.freeze({
        index: ascending.length + 1,
        abs24,
        arabic: arabicChromaticName(abs24),
        frequency: frequencyFromAbs24(abs24, a4),
        referenceCents: (abs24 - low) * 50,
        adjustmentCents: 0,
        division: Number(division)
      }));
    }
    let notes = ascending;
    if (direction === 'descending') notes = [...ascending].reverse();
    if (direction === 'both') notes = [...ascending, ...ascending.slice(0, -1).reverse()];
    return Object.freeze({
      mode: Number(division) === 12 ? MODES.chromatic12 : MODES.chromatic24,
      division: Number(division),
      direction,
      a4: Number(a4) || 440,
      notes: Object.freeze(notes)
    });
  }

  function generalNote({ note = 'C4', a4 = 440, adjustmentCents = 0 } = {}) {
    const abs24 = parseAbs24(note);
    return Object.freeze({
      mode: MODES.generalNote,
      notes: Object.freeze([Object.freeze({
        degree: 1,
        abs24,
        arabic: arabicChromaticName(abs24),
        frequency: frequencyFromAbs24(abs24, a4, adjustmentCents),
        adjustmentCents: Number(adjustmentCents) || 0
      })])
    });
  }

  function maqamScale(options = {}) {
    const result = requireLibrary().buildScale(options);
    return Object.freeze({ ...result, mode: MODES.maqamScale });
  }

  function maqamNote({ maqamId, tonic = 'C4', degree = 1, variantId, a4 = 440, intonationAdjustmentsCents = {} } = {}) {
    const scale = requireLibrary().buildScale({
      maqamId,
      tonic,
      variantId,
      a4,
      intonationAdjustmentsCents,
      direction: 'ascending'
    });
    const index = Math.max(0, Math.min(scale.notes.length - 1, Number(degree || 1) - 1));
    const note = scale.notes[index];
    return Object.freeze({
      mode: MODES.maqamNote,
      maqamId: scale.maqamId,
      maqamAr: scale.maqamAr,
      category: scale.category,
      tonic: scale.tonic,
      variantId: scale.variantId,
      source: scale.source,
      notes: Object.freeze([Object.freeze({ ...note, maqamDegree: index + 1 })])
    });
  }

  function build(options = {}) {
    switch (options.mode) {
      case MODES.generalNote: return generalNote(options);
      case MODES.maqamNote: return maqamNote(options);
      case MODES.chromatic12: return chromaticSession({ ...options, division: 12 });
      case MODES.chromatic24: return chromaticSession({ ...options, division: 24 });
      case MODES.maqamScale: return maqamScale(options);
      default: throw new Error(`Unknown recording mode: ${options.mode}`);
    }
  }

  window.NeyRecordingGenerator = Object.freeze({
    modes: MODES,
    build,
    generalNote,
    maqamNote,
    chromatic12: options => chromaticSession({ ...options, division: 12 }),
    chromatic24: options => chromaticSession({ ...options, division: 24 }),
    maqamScale
  });
})();
