(() => {
  'use strict';

  async function loadBuildMeta() {
    try {
      const response = await fetch(`VERSION.json?ts=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`VERSION.json ${response.status}`);
      const meta = await response.json();

      if (meta.temporaryBuildVisible !== false && meta.temporaryBuild) {
        const badge = document.createElement('div');
        badge.className = 'dev-build-badge';
        badge.textContent = meta.temporaryBuild;
        badge.setAttribute('aria-label', `رقم البناء المؤقت ${meta.temporaryBuild}`);
        document.body.append(badge);
      }

      const copyright = document.createElement('footer');
      copyright.className = 'app-copyright';
      copyright.setAttribute('aria-label', 'حقوق الملكية');
      const owner = meta.copyrightOwner || 'محمد الزهراني';
      const year = new Date().getFullYear();
      copyright.innerHTML = `© ${year} <strong>${owner}</strong> — جميع الحقوق محفوظة.`;
      document.body.append(copyright);
    } catch (error) {
      console.warn('Unable to load build metadata', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadBuildMeta, { once: true });
  } else {
    loadBuildMeta();
  }
})();

/* Metronome reset control is isolated from the metronome engine. */
import('./metronome-reset.js?v=2026-08-07-1449').catch(error => console.error('Metronome reset load failed', error));

/* Stage 4 smart recording flow: presentation only. */
if (!document.querySelector('link[data-recording-flow]')) {
  const recordingFlowStyles = document.createElement('link');
  recordingFlowStyles.rel = 'stylesheet';
  recordingFlowStyles.href = './recording-flow.css?v=2026-08-07-1458';
  recordingFlowStyles.dataset.recordingFlow = 'true';
  document.head.append(recordingFlowStyles);
}
import('./recording-flow.js?v=2026-08-07-1458').catch(error => console.error('Recording flow load failed', error));

/* Stage 6 scientific maqam data and unified recording-session foundation. */
import('./maqam-library.js?v=2026-08-07-1614')
  .then(() => import('./recording-generator.js?v=2026-08-07-1614'))
  .then(() => import('./performance-pack-store.js?v=2026-08-07-1614'))
  .catch(error => console.error('Stage 6 recording foundation load failed', error));

/* Stage 5 ney-specific continuous auto-capture monitor. */
if (!document.querySelector('link[data-ney-auto-capture]')) {
  const autoCaptureStyles = document.createElement('link');
  autoCaptureStyles.rel = 'stylesheet';
  autoCaptureStyles.href = './ney-auto-capture.css?v=2026-08-07-1516';
  autoCaptureStyles.dataset.neyAutoCapture = 'true';
  document.head.append(autoCaptureStyles);
}
import('./ney-auto-capture.js?v=2026-08-07-1516').catch(error => console.error('Ney Auto-Capture load failed', error));
