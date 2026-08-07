(() => {
  'use strict';

  const policy = Object.freeze({
    requiredPassRatio: 0.90,
    minimumClarity: 0.90,
    rationale: 'engineering-calibration-informed-by-pitch-and-onset-research'
  });

  async function importPatchedModule(path, replacements) {
    const response = await fetch(`${path}?policy=2026-08-07-2324`, { cache: 'no-store' });
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

    /* Every qualifying clean window may start/retry the educational recording.
       Best-reference replacement remains a separate persistence decision. */
    if (now() - state.lastCandidateAt > CONFIG.candidateCooldownMs) {
      state.lastCandidateAt = now();
      document.dispatchEvent(new CustomEvent('ney:auto-capture-candidate', { detail: candidate }));
      updateBadge('نافذة صافية ✓', 'success');
      updateStatus(\`تم العثور على نافذة صافية لـ \${event.arabic || event.english}: 100% من القراءات صحيحة، جودة \${Math.round(meanClarity * 100)}%. بدأت/تجددت محاولة التسجيل التعليمي.\`);
    }
  }`],
      ['requiredPassRatio: 1,', 'requiredPassRatio: .90,'],
      ['<strong>100% من القراءات داخل هامش الضبط المختار · جودة ≥ 90%</strong>', '<strong>القراءات المقبولة ≥ 90% · جودة الإشارة ≥ 90%</strong>'],
      ['if (cleanPassRatio === 1 && deviation <= 3 && range <= 10)', 'if (cleanPassRatio >= CONFIG.requiredPassRatio && deviation <= 3 && range <= 10)'],
      [': 100% من القراءات صحيحة، جودة ${Math.round(meanClarity * 100)}%. بدأت/تجددت محاولة التسجيل التعليمي.', ': ${Math.round(passRatio * 100)}% من القراءات صحيحة، جودة ${Math.round(meanClarity * 100)}%. بدأت/تجددت محاولة التسجيل التعليمي.'],
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
    return importPatchedModule('./educational-duration-capture.js', [
      ['if (!candidate || candidate.style !== \'clean\' || Number(candidate.passRatio) !== 1) return;', 'if (!candidate || candidate.style !== \'clean\' || Number(candidate.passRatio) < (window.NeyCaptureAcceptancePolicy?.requiredPassRatio ?? .90)) return;'],
      ['if (!frame || frame.english !== candidate.english) return false;', 'if (!frame) return false;\n    if (frame.english && candidate.english && frame.english !== candidate.english) return false;'],
      ['...(window.NeyAutoCapture?.getCaptureContext?.() || {}),', '...(candidate.captureContext || window.NeyAutoCapture?.getCaptureContext?.() || {}),'],
      ['passRatio: 1,\n      meanClarity:', 'passRatio: frames.length ? frames.filter(frame => framePasses(frame, state.active?.candidate || state.latestCandidate)).length / frames.length : 0,\n      meanClarity:'],
      ['const metrics = qualityMetrics(active.frames, active.tolerance);\n    const durationKey', 'const metrics = qualityMetrics(active.frames, active.tolerance);\n    if (Number.isFinite(active.acceptancePassRatio)) metrics.passRatio = active.acceptancePassRatio;\n    if (metrics.passRatio < (window.NeyCaptureAcceptancePolicy?.requiredPassRatio ?? .90)) {\n      document.dispatchEvent(new CustomEvent(\'ney:educational-duration-rejected\', { detail: { reason: \'pass-ratio\', passRatio: metrics.passRatio, candidate: active.candidate } }));\n      return;\n    }\n    const durationKey'],
      ['const sampleForScore = { metrics, passRatio: 1 };', 'const sampleForScore = { metrics, passRatio: metrics.passRatio };'],
      ['style: \'clean\',\n        passRatio: 1,', 'style: \'clean\',\n        passRatio: metrics.passRatio,'],
      [`  function monitorActive() {
    if (!state.active) return;
    const active = state.active;
    const frame = currentFrame();
    if (frame) active.frames.push(frame);
    if (!framePasses(frame, active.candidate)) {
      finishActive(false);
      return;
    }
    if (frame.time >= active.endTime) finishActive(true);
  }`, `  function monitorActive() {
    if (!state.active) return;
    const active = state.active;
    const frame = currentFrame();
    if (frame) active.frames.push(frame);

    const clock = frame?.time || now();
    if (clock < active.endTime) return;

    const expectedFrames = Math.max(1, Math.round(active.targetMs / CONFIG.sampleMs));
    const passedFrames = active.frames.filter(item => framePasses(item, active.candidate)).length;
    active.acceptancePassRatio = Math.min(1, passedFrames / expectedFrames);
    const accepted = active.acceptancePassRatio >= (window.NeyCaptureAcceptancePolicy?.requiredPassRatio ?? .90);

    if (!accepted) {
      document.dispatchEvent(new CustomEvent('ney:educational-duration-rejected', {
        detail: { reason: 'pass-ratio', passRatio: active.acceptancePassRatio, candidate: active.candidate }
      }));
    }
    finishActive(accepted);
  }`]
    ]);
  }

  function setCaptureUi(badgeText, statusText, stateName = 'success') {
    const badge = document.querySelector('#neyAutoCaptureBadge');
    const status = document.querySelector('#neyCaptureStatus');
    if (badge) {
      badge.textContent = badgeText;
      badge.dataset.state = stateName;
    }
    if (status) status.textContent = statusText;
  }

  document.addEventListener('ney:educational-duration-saved', event => {
    const note = event.detail?.note;
    const label = note?.arabic || note?.english || 'النغمة';
    setCaptureUi('تم حفظ التسجيل ✓', `تم حفظ التسجيل الصوتي التعليمي فعليًا لـ ${label}، وسيظهر في شاشة التسجيلات.`, 'success');
  });

  document.addEventListener('ney:educational-duration-rejected', event => {
    const percent = Math.round(Number(event.detail?.passRatio || 0) * 100);
    setCaptureUi('التسجيل لم يكتمل', `لم يُحفظ التسجيل التعليمي؛ نسبة القراءات المقبولة خلال المدة كانت ${percent}% وتحتاج إلى 90% على الأقل. يمكنك إعادة النغمة مباشرة.`, 'warning');
  });

  window.NeyCaptureAcceptancePolicy = policy;
  window.NeyCapturePolicyLoader = Object.freeze({
    loadAutoCapture,
    loadAutoSessionStart,
    loadEducationalDurationCapture
  });
})();
