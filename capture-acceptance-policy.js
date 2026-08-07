(() => {
  'use strict';

  const policy = Object.freeze({
    requiredPassRatio: 0.90,
    minimumClarity: 0.90,
    rationale: 'engineering-calibration-informed-by-pitch-and-onset-research'
  });

  async function importPatchedModule(path, replacements) {
    const response = await fetch(`${path}?policy=2026-08-07-2236`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${path} ${response.status}`);
    let source = await response.text();

    for (const [before, after] of replacements) {
      if (!source.includes(before)) throw new Error(`Capture policy patch target missing in ${path}: ${before.slice(0, 80)}`);
      source = source.replace(before, after);
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
      ['requiredPassRatio: 1,', 'requiredPassRatio: .90,'],
      ['<strong>100% من القراءات داخل هامش الضبط المختار · جودة ≥ 90%</strong>', '<strong>≥90% من القراءات داخل هامش الضبط المختار · جودة ≥ 90%</strong>'],
      ['if (cleanPassRatio === 1 && deviation <= 3 && range <= 10)', 'if (cleanPassRatio >= CONFIG.requiredPassRatio && deviation <= 3 && range <= 10)'],
      [': 100% من القراءات صحيحة، جودة ${Math.round(meanClarity * 100)}%. جارٍ فحصها للحفظ.', ': ${Math.round(passRatio * 100)}% من القراءات صحيحة، جودة ${Math.round(meanClarity * 100)}%. جارٍ فحصها للحفظ.']
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
      ['passRatio: 1,\n      meanClarity:', 'passRatio: frames.length ? frames.filter(frame => frame.stable && frame.clarity >= CONFIG.minimumClarity && Math.abs(frame.cents) <= tolerance).length / frames.length : 0,\n      meanClarity:'],
      ['const metrics = qualityMetrics(active.frames, active.tolerance);\n    const durationKey', 'const metrics = qualityMetrics(active.frames, active.tolerance);\n    if (metrics.passRatio < (window.NeyCaptureAcceptancePolicy?.requiredPassRatio ?? .90)) return;\n    const durationKey'],
      ['const sampleForScore = { metrics, passRatio: 1 };', 'const sampleForScore = { metrics, passRatio: metrics.passRatio };'],
      ['style: \'clean\',\n        passRatio: 1,', 'style: \'clean\',\n        passRatio: metrics.passRatio,']
    ]);
  }

  window.NeyCaptureAcceptancePolicy = policy;
  window.NeyCapturePolicyLoader = Object.freeze({
    loadAutoCapture,
    loadAutoSessionStart,
    loadEducationalDurationCapture
  });
})();
