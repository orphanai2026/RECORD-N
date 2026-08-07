(() => {
  'use strict';

  const $ = selector => document.querySelector(selector);

  function centsBetween(a, b) {
    const first = Number(a);
    const second = Number(b);
    if (!(first > 0) || !(second > 0)) return Infinity;
    return 1200 * Math.log2(first / second);
  }

  function averageFinite(values, fallback = NaN) {
    const finite = values.map(Number).filter(Number.isFinite);
    if (!finite.length) return fallback;
    return finite.reduce((sum, value) => sum + value, 0) / finite.length;
  }

  function candidateTarget(candidate) {
    return averageFinite((candidate?.frames || []).map(frame => frame.target));
  }

  function noteTarget(note, sample) {
    const direct = Number(note?.targetFrequency);
    if (direct > 0) return direct;
    return candidateTarget(sample);
  }

  function currentTolerance(sample) {
    const value = Number(sample?.metrics?.tolerance ?? sample?.tolerance ?? $('#toleranceRange')?.value ?? 12);
    return Math.max(1, Math.min(50, Number.isFinite(value) ? value : 12));
  }

  function isMaqamScaleTargeted(context) {
    return context?.mode === 'maqam-scale' && Number(context?.expectedTargetFrequency) > 0;
  }

  function matchesExpected({ note, context, sample } = {}) {
    if (!isMaqamScaleTargeted(context)) return true;
    const actual = noteTarget(note, sample);
    const expected = Number(context.expectedTargetFrequency);
    return Number.isFinite(actual) && Math.abs(centsBetween(actual, expected)) <= currentTolerance(sample);
  }

  function expectedLabel(context = {}) {
    const fromFlow = window.NeyMaqamScaleCaptureFlow?.getExpected?.();
    return context.expectedArabic || fromFlow?.arabic || context.expectedEnglish || fromFlow?.english || 'الدرجة المطلوبة';
  }

  function showRejected(context, sample) {
    const actual = sample?.arabic || sample?.english || 'النغمة الحالية';
    const expected = expectedLabel(context);
    window.setTimeout(() => {
      const badge = $('#neyAutoCaptureBadge');
      const status = $('#neyCaptureStatus');
      if (badge) {
        badge.textContent = 'نغمة غير مطلوبة';
        badge.dataset.state = 'warning';
      }
      if (status) status.textContent = `${actual} صافية، لكنها ليست الدرجة المطلوبة الآن (${expected})؛ لم تُحفظ ولم تتقدم الجلسة.`;
    }, 0);
  }

  function rejectResult(context, sample) {
    showRejected(context, sample);
    document.dispatchEvent(new CustomEvent('ney:maqam-target-rejected', {
      detail: {
        context: { ...context },
        candidate: sample || null,
        expected: Number(context?.expectedTargetFrequency) || null,
        actual: candidateTarget(sample)
      }
    }));
    return { changed: false, rejected: true, reason: 'maqam-target-mismatch', pack: null };
  }

  function installStoreGuard() {
    const original = window.NeyPerformancePackStore;
    if (!original || original.__maqamAcceptanceGuard) return Boolean(original);

    const guarded = {
      ...original,
      __maqamAcceptanceGuard: true,
      async upsertCleanReference(args = {}) {
        if (!matchesExpected(args)) {
          if (args.sample?.audioId) {
            try { await original.removeAudio?.(args.sample.audioId); } catch (_) {}
          }
          return rejectResult(args.context, args.sample);
        }
        return original.upsertCleanReference(args);
      },
      async upsertEducationalSample(args = {}) {
        if (!matchesExpected(args)) {
          if (args.sample?.audioId) {
            try { await original.removeAudio?.(args.sample.audioId); } catch (_) {}
          }
          return rejectResult(args.context, args.sample);
        }
        return original.upsertEducationalSample(args);
      }
    };

    window.NeyPerformancePackStore = Object.freeze(guarded);
    return true;
  }

  function blockWrongCandidate(event) {
    const context = window.NeyAutoCapture?.getCaptureContext?.();
    if (!isMaqamScaleTargeted(context)) return;
    const candidate = event.detail;
    if (matchesExpected({ note: null, context, sample: candidate })) return;

    event.stopImmediatePropagation();
    showRejected(context, candidate);
    document.dispatchEvent(new CustomEvent('ney:maqam-target-rejected', {
      detail: {
        context: { ...context },
        candidate,
        expected: Number(context.expectedTargetFrequency),
        actual: candidateTarget(candidate)
      }
    }));
  }

  function initialize() {
    if (!installStoreGuard()) {
      const timer = window.setInterval(() => {
        if (installStoreGuard()) window.clearInterval(timer);
      }, 25);
      window.setTimeout(() => window.clearInterval(timer), 5000);
    }

    document.addEventListener('ney:auto-capture-candidate', blockWrongCandidate, true);

    window.NeyMaqamCaptureAcceptanceGuard = Object.freeze({
      matchesExpected,
      isInstalled: () => Boolean(window.NeyPerformancePackStore?.__maqamAcceptanceGuard)
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
