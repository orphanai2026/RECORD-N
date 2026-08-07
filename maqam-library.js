(() => {
  'use strict';

  const REFERENCE_SYSTEM = '24-EDO theoretical reference; maqam intonation may use independent cent adjustments';

  const CATEGORIES = Object.freeze({
    eastern_identity: Object.freeze({
      id: 'eastern_identity',
      ar: 'مقامات الهوية الشرقية / الدرجات المحايدة',
      maqams: Object.freeze(['rast', 'bayati', 'sikah'])
    }),
    familiar_no_quarter: Object.freeze({
      id: 'familiar_no_quarter',
      ar: 'المقامات الخالية من أرباع التون',
      maqams: Object.freeze(['ajam', 'nahawand', 'kurd'])
    }),
    special_intervals: Object.freeze({
      id: 'special_intervals',
      ar: 'المقامات ذات الأبعاد الخاصة',
      maqams: Object.freeze(['hijaz', 'saba'])
    })
  });

  const MAQAMS = Object.freeze({
    rast: Object.freeze({
      id: 'rast', ar: 'راست', en: 'Rast', category: 'eastern_identity',
      family: 'Rast', rootJins: 'Rast', ghammazDegree: 5,
      source: 'https://www.maqamworld.com/en/maqam/rast.php',
      variants: Object.freeze([
        Object.freeze({ id: 'upper-rast', ar: 'راست علوي', upperJins: 'Upper Rast', offsets24: Object.freeze([0, 4, 7, 10, 14, 18, 21, 24]), octaveEquivalent: true }),
        Object.freeze({ id: 'nahawand', ar: 'نهاوند علوي', upperJins: 'Nahawand', offsets24: Object.freeze([0, 4, 7, 10, 14, 18, 20, 24]), octaveEquivalent: true })
      ]),
      defaultVariantId: 'upper-rast'
    }),
    bayati: Object.freeze({
      id: 'bayati', ar: 'بياتي', en: 'Bayati', category: 'eastern_identity',
      family: 'Bayati', rootJins: 'Bayati', ghammazDegree: 4,
      source: 'https://www.maqamworld.com/en/maqam/bayati.php',
      variants: Object.freeze([
        Object.freeze({ id: 'nahawand', ar: 'نهاوند علوي', upperJins: 'Nahawand', offsets24: Object.freeze([0, 3, 6, 10, 14, 16, 20, 24]), octaveEquivalent: true }),
        Object.freeze({ id: 'rast', ar: 'راست علوي', upperJins: 'Rast', offsets24: Object.freeze([0, 3, 6, 10, 14, 17, 20, 24]), octaveEquivalent: true })
      ]),
      defaultVariantId: 'nahawand'
    }),
    sikah: Object.freeze({
      id: 'sikah', ar: 'سيكا', en: 'Sikah', category: 'eastern_identity',
      family: 'Sikah', rootJins: 'Sikah', ghammazDegree: 3,
      secondaryGhammazDegree: 6,
      source: 'https://www.maqamworld.com/en/maqam/sikah.php',
      variants: Object.freeze([
        Object.freeze({ id: 'standard', ar: 'المسار الأساسي', upperJins: 'Upper Rast → Rast', offsets24: Object.freeze([0, 3, 7, 11, 14, 17, 21, 24]), octaveEquivalent: true })
      ]),
      defaultVariantId: 'standard'
    }),
    ajam: Object.freeze({
      id: 'ajam', ar: 'عجم', en: 'Ajam', category: 'familiar_no_quarter',
      family: 'Ajam', rootJins: 'Ajam', ghammazDegree: 5,
      source: 'https://www.maqamworld.com/en/maqam/ajam.php',
      variants: Object.freeze([
        Object.freeze({ id: 'upper-ajam', ar: 'عجم علوي', upperJins: 'Upper Ajam', offsets24: Object.freeze([0, 4, 8, 10, 14, 18, 22, 24]), octaveEquivalent: true }),
        Object.freeze({ id: 'nahawand', ar: 'نهاوند علوي', upperJins: 'Nahawand', offsets24: Object.freeze([0, 4, 8, 10, 14, 18, 20, 24]), octaveEquivalent: true })
      ]),
      defaultVariantId: 'upper-ajam'
    }),
    nahawand: Object.freeze({
      id: 'nahawand', ar: 'نهاوند', en: 'Nahawand', category: 'familiar_no_quarter',
      family: 'Nahawand', rootJins: 'Nahawand', ghammazDegree: 5,
      source: 'https://www.maqamworld.com/en/maqam/nahawand.php',
      variants: Object.freeze([
        Object.freeze({ id: 'kurd', ar: 'كرد علوي', upperJins: 'Kurd', offsets24: Object.freeze([0, 4, 6, 10, 14, 16, 20, 24]), octaveEquivalent: true }),
        Object.freeze({ id: 'hijaz', ar: 'حجاز علوي', upperJins: 'Hijaz', offsets24: Object.freeze([0, 4, 6, 10, 14, 16, 22, 24]), octaveEquivalent: true })
      ]),
      defaultVariantId: 'kurd'
    }),
    kurd: Object.freeze({
      id: 'kurd', ar: 'كرد', en: 'Kurd', category: 'familiar_no_quarter',
      family: 'Kurd', rootJins: 'Kurd', ghammazDegree: 4,
      source: 'https://www.maqamworld.com/en/maqam/kurd.php',
      variants: Object.freeze([
        Object.freeze({ id: 'standard', ar: 'المسار الأساسي', upperJins: 'Nahawand', offsets24: Object.freeze([0, 2, 6, 10, 14, 16, 20, 24]), octaveEquivalent: true })
      ]),
      defaultVariantId: 'standard'
    }),
    hijaz: Object.freeze({
      id: 'hijaz', ar: 'حجاز', en: 'Hijaz', category: 'special_intervals',
      family: 'Hijaz', rootJins: 'Hijaz', ghammazDegree: 4,
      source: 'https://www.maqamworld.com/en/maqam/hijaz.php',
      variants: Object.freeze([
        Object.freeze({ id: 'nahawand', ar: 'نهاوند علوي', upperJins: 'Nahawand', offsets24: Object.freeze([0, 2, 8, 10, 14, 16, 20, 24]), octaveEquivalent: true }),
        Object.freeze({ id: 'rast', ar: 'راست علوي', upperJins: 'Rast', offsets24: Object.freeze([0, 2, 8, 10, 14, 17, 20, 24]), octaveEquivalent: true })
      ]),
      defaultVariantId: 'nahawand',
      intonationNote: 'MaqamWorld notes that the 2nd–3rd degree span of Jins Hijaz is commonly performed narrower than staff notation by slightly raising degree 2 and lowering degree 3.'
    }),
    saba: Object.freeze({
      id: 'saba', ar: 'صبا', en: 'Saba', category: 'special_intervals',
      family: null, rootJins: 'Saba', ghammazDegree: 3,
      alternateGhammazDegree: 6,
      source: 'https://www.maqamworld.com/en/maqam/saba.php',
      variants: Object.freeze([
        Object.freeze({
          id: 'standard', ar: 'المسار الأساسي', upperJins: 'Hijaz → Ajam/Nikriz',
          offsets24: Object.freeze([0, 3, 6, 8, 14, 16, 20, 22]),
          extendedOffsets24: Object.freeze([0, 3, 6, 8, 14, 16, 20, 22, 26, 30]),
          octaveEquivalent: false
        })
      ]),
      defaultVariantId: 'standard',
      intonationNote: 'Saba is treated as a special non-octave-equivalent path; its scale can extend beyond eight notes.'
    })
  });

  const LETTERS = Object.freeze(['C', 'D', 'E', 'F', 'G', 'A', 'B']);
  const NATURAL_PC24 = Object.freeze({ C: 0, D: 4, E: 8, F: 10, G: 14, A: 18, B: 22 });
  const ARABIC_LETTERS = Object.freeze({ C: 'دو', D: 'ري', E: 'مي', F: 'فا', G: 'صول', A: 'لا', B: 'سي' });
  const A4_ABS24 = 4 * 24 + NATURAL_PC24.A;

  function clampInteger(value, min, max) {
    const number = Math.round(Number(value));
    return Math.min(max, Math.max(min, Number.isFinite(number) ? number : 0));
  }

  function accidentalText(quarterSteps, language = 'en') {
    const qs = clampInteger(quarterSteps, -4, 4);
    const en = {
      '-4': 'double-flat', '-3': 'three-quarter-flat', '-2': 'flat', '-1': 'half-flat',
      '0': '', '1': 'half-sharp', '2': 'sharp', '3': 'three-quarter-sharp', '4': 'double-sharp'
    };
    const ar = {
      '-4': 'دبل بيمول', '-3': 'ثلاثة أرباع بيمول', '-2': 'بيمول', '-1': 'نصف بيمول',
      '0': '', '1': 'نصف دييز', '2': 'دييز', '3': 'ثلاثة أرباع دييز', '4': 'دبل دييز'
    };
    return (language === 'ar' ? ar : en)[String(qs)] || '';
  }

  function normalizeTonic(input) {
    if (input && typeof input === 'object') {
      const letter = String(input.letter || 'C').toUpperCase();
      if (!LETTERS.includes(letter)) throw new Error('Invalid tonic letter');
      return {
        letter,
        accidentalQuarterSteps: clampInteger(input.accidentalQuarterSteps || 0, -4, 4),
        octave: clampInteger(input.octave ?? 4, -1, 9)
      };
    }

    const text = String(input || 'C4').trim();
    const match = text.match(/^([A-Ga-g])\s*(bb|b|hb|hf|hs|h#|##|#)?\s*(-?\d+)$/i);
    if (!match) throw new Error(`Unsupported tonic notation: ${text}`);
    const accidentalMap = { bb: -4, b: -2, hb: -1, hf: -1, hs: 1, 'h#': 1, '#': 2, '##': 4 };
    return {
      letter: match[1].toUpperCase(),
      accidentalQuarterSteps: accidentalMap[(match[2] || '').toLowerCase()] || 0,
      octave: clampInteger(match[3], -1, 9)
    };
  }

  function tonicAbs24(tonic) {
    const normalized = normalizeTonic(tonic);
    return normalized.octave * 24 + NATURAL_PC24[normalized.letter] + normalized.accidentalQuarterSteps;
  }

  function frequencyFromAbs24(abs24, a4 = 440, extraCents = 0) {
    const reference = Number(a4) || 440;
    return reference * (2 ** (((Number(abs24) - A4_ABS24) * 50 + Number(extraCents || 0)) / 1200));
  }

  function spellDegree(tonic, degreeIndex, abs24) {
    const root = normalizeTonic(tonic);
    const rootLetterIndex = LETTERS.indexOf(root.letter);
    const absoluteLetterIndex = rootLetterIndex + degreeIndex;
    const letter = LETTERS[((absoluteLetterIndex % 7) + 7) % 7];
    const octave = root.octave + Math.floor(absoluteLetterIndex / 7);
    const naturalAbs = octave * 24 + NATURAL_PC24[letter];
    const accidentalQuarterSteps = clampInteger(abs24 - naturalAbs, -4, 4);
    const enAccidental = accidentalText(accidentalQuarterSteps, 'en');
    const arAccidental = accidentalText(accidentalQuarterSteps, 'ar');
    return {
      letter,
      octave,
      accidentalQuarterSteps,
      english: `${letter}${enAccidental ? ` ${enAccidental}` : ''}${octave}`,
      arabic: `${ARABIC_LETTERS[letter]}${arAccidental ? ` ${arAccidental}` : ''} ${octave}`
    };
  }

  function resolveMaqam(maqamId) {
    const maqam = MAQAMS[String(maqamId || '').toLowerCase()];
    if (!maqam) throw new Error(`Unknown maqam: ${maqamId}`);
    return maqam;
  }

  function resolveVariant(maqam, variantId) {
    return maqam.variants.find(item => item.id === variantId) || maqam.variants.find(item => item.id === maqam.defaultVariantId) || maqam.variants[0];
  }

  function buildScale(options = {}) {
    const maqam = resolveMaqam(options.maqamId);
    const variant = resolveVariant(maqam, options.variantId);
    const tonic = normalizeTonic(options.tonic || 'C4');
    const rootAbs24 = tonicAbs24(tonic);
    const useExtended = maqam.id === 'saba' && options.extended === true && Array.isArray(variant.extendedOffsets24);
    const offsets = useExtended ? variant.extendedOffsets24 : variant.offsets24;
    const adjustmentMap = options.intonationAdjustmentsCents || {};
    const a4 = Number(options.a4) || 440;

    const ascending = offsets.map((offset24, index) => {
      const abs24 = rootAbs24 + offset24;
      const adjustmentCents = Number(adjustmentMap[index + 1] ?? 0) || 0;
      const spelling = spellDegree(tonic, index, abs24);
      return Object.freeze({
        degree: index + 1,
        offset24,
        referenceCents: offset24 * 50,
        adjustmentCents,
        targetCents: offset24 * 50 + adjustmentCents,
        frequency: frequencyFromAbs24(abs24, a4, adjustmentCents),
        abs24,
        ...spelling
      });
    });

    const direction = options.direction || 'ascending';
    let notes = ascending;
    if (direction === 'descending') notes = [...ascending].reverse();
    if (direction === 'both') notes = [...ascending, ...ascending.slice(0, -1).reverse()];

    return Object.freeze({
      mode: 'maqam',
      maqamId: maqam.id,
      maqamAr: maqam.ar,
      maqamEn: maqam.en,
      category: maqam.category,
      tonic: Object.freeze({ ...tonic }),
      variantId: variant.id,
      variantAr: variant.ar,
      rootJins: maqam.rootJins,
      upperJins: variant.upperJins,
      ghammazDegree: maqam.ghammazDegree,
      octaveEquivalent: variant.octaveEquivalent !== false,
      referenceSystem: REFERENCE_SYSTEM,
      source: maqam.source,
      direction,
      notes: Object.freeze(notes)
    });
  }

  function getCategories() {
    return Object.values(CATEGORIES).map(category => ({ ...category, maqams: [...category.maqams] }));
  }

  function getMaqams() {
    return Object.values(MAQAMS).map(maqam => ({
      ...maqam,
      variants: maqam.variants.map(variant => ({ ...variant, offsets24: [...variant.offsets24], extendedOffsets24: variant.extendedOffsets24 ? [...variant.extendedOffsets24] : undefined }))
    }));
  }

  window.NeyMaqamLibrary = Object.freeze({
    referenceSystem: REFERENCE_SYSTEM,
    categories: CATEGORIES,
    maqams: MAQAMS,
    getCategories,
    getMaqams,
    getMaqam: id => resolveMaqam(id),
    buildScale,
    normalizeTonic,
    tonicAbs24,
    frequencyFromAbs24
  });
})();
