(() => {
  'use strict';

  const policy = Object.freeze({
    requiredPassRatio: 0.90,
    get minimumClarity() {
      const value = Number(window.NeySettingsRuntime?.recordingQuality?.() ?? .90);
      return Number.isFinite(value) ? Math.max(.65, Math.min(1, value)) : .90;
    },
    transientGraceMs: 150,
    rationale: 'engineering-calibration-informed-by-pitch-and-onset-research'
  });

  async function importPatchedModule(path, replacements) {
    const response = await fetch(`${path}?policy=2026-08-08-1627`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${path} ${response.status}`);
    let source = await response.text();

    for (const [before, after] of replacements) {
      if (!source.includes(before)) throw new Error(`Capture policy patch target missing in ${path}: ${before.slice(0, 80)}`);
      source = source.split(before).join(after);
    }

    source += `\n//# sourceURL=${path}?capture-policy-unified-settings`;
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
      ['minimumClarity: .90,', 'get minimumClarity() { return Number(window.NeySettingsRuntime?.recordingQuality?.() ?? .90); },'],
      ['<strong>100% من القراءات داخل هامش الضبط المختار · جودة ≥ 90%</strong>', '<strong>القراءات المقبولة ≥ 90% · جودة الإشارة وفق الإعداد المختار</strong>'],
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
    return importPatchedModule('./educational-duration-capture.js', [
      ['minimumClarity: .90,', 'get minimumClarity() { return Number(window.NeySettingsRuntime?.recordingQuality?.() ?? .90); },'],
      [`  function framePasses(frame, candidate) {
    if (!frame || !candidate) return false;
    if (frame.english && candidate.english && frame.english !== candidate.english) return false;

    const expectedTarget = candidateTarget(candidate);
    if (Number.isFinite(expectedTarget) && Number.isFinite(Number(frame.target))) {
      const targetDistance = Math.abs(centsBetween(Number(frame.target), expectedTarget));
      if (targetDistance > Math.max(3, Number(candidate.tolerance || currentTolerance()))) return false;
    }

    return Boolean(frame.stable)
      && Number(frame.clarity) >= CONFIG.minimumClarity
      && Number.isFinite(Number(frame.cents))
      && Math.abs(Number(frame.cents)) <= Number(frame.tolerance || candidate.tolerance || currentTolerance());
  }`, `  function frameFailureReasons(frame, candidate) {
    if (!frame || !candidate) return ['missing'];
    const reasons = [];
    if (frame.english && candidate.english && frame.english !== candidate.english) reasons.push('note');

    const expectedTarget = candidateTarget(candidate);
    if (Number.isFinite(expectedTarget) && Number.isFinite(Number(frame.target))) {
      const targetDistance = Math.abs(centsBetween(Number(frame.target), expectedTarget));
      if (targetDistance > Math.max(3, Number(candidate.tolerance || currentTolerance()))) reasons.push('target');
    }

    if (!frame.stable) reasons.push('unstable');
    if (Number(frame.clarity) < CONFIG.minimumClarity) reasons.push('clarity');
    if (!Number.isFinite(Number(frame.cents)) || Math.abs(Number(frame.cents)) > Number(frame.tolerance || candidate.tolerance || currentTolerance())) reasons.push('cents');
    return reasons;
  }

  function framePasses(frame, candidate) {
    return frameFailureReasons(frame, candidate).length === 0;
  }

  function analyzeFrameSequence(frames, candidate) {
    const rows = frames.map(frame => ({ frame, reasons: frameFailureReasons(frame, candidate) }));
    const reasonCounts = { missing: 0, note: 0, target: 0, unstable: 0, clarity: 0, cents: 0 };
    rows.forEach(row => row.reasons.forEach(reason => { reasonCounts[reason] = (reasonCounts[reason] || 0) + 1; }));

    const rawPassed = rows.filter(row => row.reasons.length === 0).length;
    const maxTransientFrames = Math.max(1, Math.round((window.NeyCaptureAcceptancePolicy?.transientGraceMs ?? 150) / CONFIG.sampleMs));
    let effectiveUnits = 0;
    let acceptedUnits = 0;
    let transientBursts = 0;
    let transientFrames = 0;

    for (let index = 0; index < rows.length;) {
      if (rows[index].reasons.length === 0) {
        acceptedUnits += 1;
        effectiveUnits += 1;
        index += 1;
        continue;
      }

      const start = index;
      const runReasons = new Set();
      while (index < rows.length && rows[index].reasons.length) {
        rows[index].reasons.forEach(reason => runReasons.add(reason));
        index += 1;
      }
      const length = index - start;
      const boundedByGoodFrames = start > 0 && index < rows.length && rows[start - 1].reasons.length === 0 && rows[index].reasons.length === 0;
      const hardFailure = runReasons.has('note') || runReasons.has('target') || runReasons.has('missing');

      if (!hardFailure && boundedByGoodFrames && length <= maxTransientFrames) {
        effectiveUnits += 1;
        transientBursts += 1;
        transientFrames += length;
      } else {
        effectiveUnits += length;
      }
    }

    return {
      totalFrames: rows.length,
      rawPassed,
      rawPassRatio: rows.length ? rawPassed / rows.length : 0,
      effectivePassRatio: effectiveUnits ? acceptedUnits / effectiveUnits : 0,
      transientBursts,
      transientFrames,
      reasonCounts
    };
  }

  function diagnosticsText(analysis) {
    const labels = [];
    if (analysis.reasonCounts.unstable) labels.push('عدم ثبات ' + analysis.reasonCounts.unstable);
    if (analysis.reasonCounts.cents) labels.push('خارج هامش السنت ' + analysis.reasonCounts.cents);
    if (analysis.reasonCounts.clarity) labels.push('جودة أقل من ' + Math.round(CONFIG.minimumClarity * 100) + '% ' + analysis.reasonCounts.clarity);
    if (analysis.reasonCounts.note) labels.push('اختلاف النغمة ' + analysis.reasonCounts.note);
    if (analysis.reasonCounts.target) labels.push('اختلاف الهدف الترددي ' + analysis.reasonCounts.target);
    if (analysis.reasonCounts.missing) labels.push('قراءات مفقودة ' + analysis.reasonCounts.missing);

    const effective = Math.round(analysis.effectivePassRatio * 100);
    const raw = Math.round(analysis.rawPassRatio * 100);
    const transient = analysis.transientBursts
      ? ' دُمج ' + analysis.transientFrames + ' إطارًا عابرًا ضمن ' + analysis.transientBursts + ' انحراف قصير (≤150 ms).'
      : '';
    return 'القبول ' + effective + '% بعد المرشح الزمني (خام ' + raw + '%؛ ' + analysis.rawPassed + '/' + analysis.totalFrames + ' قراءة). أسباب الرفض الرصدية: ' + (labels.join(' · ') || 'لا توجد') + '.' + transient;
  }`],
      [`    const passedFrames = frames.filter(frame => framePasses(frame, active.candidate)).length;
    const passRatio = frames.length ? passedFrames / frames.length : 0;`, `    const frameAnalysis = analyzeFrameSequence(frames, active.candidate);
    const passRatio = frameAnalysis.effectivePassRatio;`],
      [`    if (passRatio < requiredPassRatio()) {
      state.active = active;
      rejectActive('pass-ratio', passRatio);
      return;
    }

    const metrics = qualityMetrics(frames, active.tolerance, passRatio);`, `    if (passRatio < requiredPassRatio()) {
      state.active = active;
      rejectActive('pass-ratio', passRatio, diagnosticsText(frameAnalysis));
      return;
    }

    const metrics = qualityMetrics(frames, active.tolerance, passRatio);
    metrics.rawPassRatio = frameAnalysis.rawPassRatio;
    metrics.transientBursts = frameAnalysis.transientBursts;
    metrics.transientFrames = frameAnalysis.transientFrames;
    metrics.failureReasons = { ...frameAnalysis.reasonCounts };`],
      [`    const candidateWindowMs = Number(candidate.endTime) - Number(candidate.startTime);
    const endTime = Number(candidate.startTime) + targetMs;
    const baseFrames = (candidate.frames || [])
      .filter(frame => Number(frame.time) >= Number(candidate.startTime) && Number(frame.time) <= Math.min(Number(candidate.endTime), endTime))
      .map(frame => ({ ...frame }));`, `    /* The clean window is the acceptance gate only. Record a fresh full duration forward. */
    const acceptedAt = now();
    const endTime = acceptedAt + targetMs;
    const baseFrames = [];`],
      ['startTime: Number(candidate.startTime),', 'startTime: acceptedAt,'],
      ["setUi('recording', 'بدأ التسجيل التعليمي', `${duration.ar} · BPM ${bpm} · استمر على النغمة حتى اكتمال المدة.`, clamp(candidateWindowMs / targetMs, 0, 1));", "setUi('recording', 'بدأ التسجيل التعليمي', `${duration.ar} · BPM ${bpm} · بدأ العد الآن من 0%؛ استمر على النغمة حتى اكتمال المدة.`, 0);"],
      ['    if (targetMs <= candidateWindowMs) finishActive();', '    /* Full educational duration always completes after acceptance; no historical window is counted. */']
    ]);
  }

  window.NeyCaptureAcceptancePolicy = policy;
  window.NeyCapturePolicyLoader = Object.freeze({
    loadAutoCapture,
    loadAutoSessionStart,
    loadEducationalDurationCapture
  });
})();
