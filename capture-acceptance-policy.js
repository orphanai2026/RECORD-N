(() => {
  'use strict';

  const policy = Object.freeze({
    requiredPassRatio: 0.90,
    minimumClarity: 0.90,
    rationale: 'engineering-calibration-informed-by-pitch-and-onset-research'
  });

  async function importPatchedModule(path, replacements) {
    const response = await fetch(`${path}?policy=2026-08-07-2344`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${path} ${response.status}`);
    let source = await response.text();

    for (const [before, after] of replacements) {
      if (!source.includes(before)) throw new Error(`Capture policy patch target missing in ${path}: ${before.slice(0, 80)}`);
      source = source.split(before).join(after);
    }

    source += `\n//# sourceURL=${path}?capture-policy-90`;
    const blobUrl = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
    try {
      return await import(blobUrl);
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  }

  async function loadAutoCapture() {
    return importPatchedModule('./ney-auto-capture.js', [
      [`    event.cleanCandidate = candidate;
    const previous = state.bestByNote.get(event.key);
    if (!previous || candidate.score > previous.score) {
      state.bestByNote.set(event.key, candidate);
      queuePersistence(candidate);
      document.dispatchEvent(new CustomEvent('ney:auto-capture-candidate', { detail: candidate }));
      if (now() - state.lastCandidateAt > CONFIG.candidateCooldownMs) {
        state.lastCandidateAt = now();
        updateBadge('نافذة صافية ✓', 'success');
        updateStatus(\`تم العثور على نافذة صافية لـ \${event.arabic || event.english}: 100% من القراءات صحيحة، جودة \${Math.round(meanClarity * 100)}%. جارٍ فحصها للحفظ.\`);
      }
    }
  }`, `    event.cleanCandidate = candidate;
    const previous = state.bestByNote.get(event.key);
    if (!previous || candidate.score > previous.score) {
      state.bestByNote.set(event.key, candidate);
      queuePersistence(candidate);
    }

    if (now() - state.lastCandidateAt > CONFIG.candidateCooldownMs) {
      state.lastCandidateAt = now();
      document.dispatchEvent(new CustomEvent('ney:auto-capture-candidate', { detail: candidate }));
      updateBadge('نافذة صافية ✓', 'success');
      updateStatus(\`تم العثور على نافذة صافية لـ \${event.arabic || event.english}: \${Math.round(passRatio * 100)}% من القراءات صحيحة، جودة \${Math.round(meanClarity * 100)}%. بدأت/تجددت محاولة التسجيل التعليمي.\`);
    }
  }`],
      ['requiredPassRatio: 1,', 'requiredPassRatio: .90,'],
      ['<strong>100% من القراءات داخل هامش الضبط المختار · جودة ≥ 90%</strong>', '<strong>القراءات المقبولة ≥ 90% · جودة الإشارة ≥ 90%</strong>'],
      ['if (cleanPassRatio === 1 && deviation <= 3 && range <= 10)', 'if (cleanPassRatio >= CONFIG.requiredPassRatio && deviation <= 3 && range <= 10)'],
      ["updateBadge('العينة الأفضل محفوظة ✓', 'success');", "updateBadge('المرجع الأفضل موجود ✓', 'success');"],
      ['لكن العينة المحفوظة أفضل أو مساوية؛ لم تُستبدل.', 'لكن المرجع المحفوظ أفضل أو مساوٍ؛ لم يُستبدل. التسجيل التعليمي يمكنه الاستمرار أو إعادة المحاولة بصورة مستقلة.'],
      ['العينة المرجعية الحالية لـ ${candidate.arabic || candidate.english} بقيت الأفضل ولم تُستبدل.', 'المرجع الحالي لـ ${candidate.arabic || candidate.english} بقي الأفضل ولم يُستبدل. التسجيل التعليمي مستقل عن قرار استبدال المرجع.'],
      ["updateBadge('حُفظت العينة ✓', 'success');", "updateBadge('حُفظ المرجع ✓', 'success');"],
      ['حُفظت تلقائيًا أفضل عينة صافية لـ ${candidate.arabic || candidate.english} داخل Performance Pack — جودة ${Math.round(candidate.meanClarity * 100)}%.', 'حُفظ مرجع التحليل الصافي لـ ${candidate.arabic || candidate.english} — جودة ${Math.round(candidate.meanClarity * 100)}%. التسجيل التعليمي يعمل بمسار مستقل.']
    ]);
  }

  async function loadAutoSessionStart() {
    return importPatchedModule('./auto-session-start.js', [
      ['Number(candidate.passRatio) === 1', 'Number(candidate.passRatio) >= (window.NeyCaptureAcceptancePolicy?.requiredPassRatio ?? .90)']
    ]);
  }

  async function loadEducationalDurationCapture() {
    return import('./educational-duration-capture.js?v=2026-08-07-2344');
  }

  window.NeyCaptureAcceptancePolicy = policy;
  window.NeyCapturePolicyLoader = Object.freeze({
    loadAutoCapture,
    loadAutoSessionStart,
    loadEducationalDurationCapture
  });
})();
