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

/* Stage 6 scientific maqam data and unified recording-session foundation. */
import('./maqam-library.js?v=2026-08-07-1614')
  .then(() => import('./recording-generator.js?v=2026-08-07-1614'))
  .then(() => import('./performance-pack-store.js?v=2026-08-07-1707'))
  .then(() => import('./performance-pack-records-ui.js?v=2026-08-07-1742'))
  .catch(error => console.error('Stage 6 recording foundation load failed', error));

/* Stage 7 ney-specific continuous capture with clean-reference persistence. */
if (!document.querySelector('link[data-ney-auto-capture]')) {
  const autoCaptureStyles = document.createElement('link');
  autoCaptureStyles.rel = 'stylesheet';
  autoCaptureStyles.href = './ney-auto-capture.css?v=2026-08-07-1516';
  autoCaptureStyles.dataset.neyAutoCapture = 'true';
  document.head.append(autoCaptureStyles);
}
import('./ney-auto-capture.js?v=2026-08-07-1629').catch(error => console.error('Ney Auto-Capture load failed', error));

/* Stage 8: automatic first-note session start, with manual mode for advanced players. */
if (!document.querySelector('link[data-auto-session-start]')) {
  const sessionStartStyles = document.createElement('link');
  sessionStartStyles.rel = 'stylesheet';
  sessionStartStyles.href = './auto-session-start.css?v=2026-08-07-1654';
  sessionStartStyles.dataset.autoSessionStart = 'true';
  document.head.append(sessionStartStyles);
}
import('./auto-session-start.js?v=2026-08-07-1654').catch(error => console.error('Automatic session start load failed', error));

/* Stage 9: educational note values captured at real BPM duration. */
if (!document.querySelector('link[data-educational-duration]')) {
  const durationStyles = document.createElement('link');
  durationStyles.rel = 'stylesheet';
  durationStyles.href = './educational-duration-capture.css?v=2026-08-07-1707';
  durationStyles.dataset.educationalDuration = 'true';
  document.head.append(durationStyles);
}
import('./educational-duration-capture.js?v=2026-08-07-1707')
  .catch(error => console.error('Educational duration capture load failed', error));

/* Stage 10: modern Auto-Capture UI. Legacy qualification UI remains in source only as rollback code. */
if (!document.querySelector('link[data-recording-modernization]')) {
  const modernizationStyles = document.createElement('link');
  modernizationStyles.rel = 'stylesheet';
  modernizationStyles.href = './recording-modernization.css?v=2026-08-07-1734';
  modernizationStyles.dataset.recordingModernization = 'true';
  document.head.append(modernizationStyles);
}

/* Stage 11 bridge: keeps the compact recording metronome synchronized with the training engine regardless of load order. */
import('./app-shell-metronome-bridge.js?v=2026-08-07-1818')
  .catch(error => console.error('App Shell metronome bridge load failed', error));

/* Stage 11.2: reserve a real viewport row for persistent navigation instead of overlaying content. */
if (!document.querySelector('link[data-app-shell-frame]')) {
  const frameStyles = document.createElement('link');
  frameStyles.rel = 'stylesheet';
  frameStyles.href = './app-shell-frame.css?v=2026-08-07-1832';
  frameStyles.dataset.appShellFrame = 'true';
  document.head.append(frameStyles);
}
import('./app-shell-frame.js?v=2026-08-07-1832')
  .catch(error => console.error('App Shell frame load failed', error));

/* Stage 12.1: force the latest recording priority/containment layer through the no-cache bootstrap. */
const existingRecordingPriority = document.querySelector('link[data-recording-priority]');
if (existingRecordingPriority) {
  existingRecordingPriority.href = './recording-priority.css?v=2026-08-07-1849';
} else {
  const recordingPriorityStyles = document.createElement('link');
  recordingPriorityStyles.rel = 'stylesheet';
  recordingPriorityStyles.href = './recording-priority.css?v=2026-08-07-1849';
  recordingPriorityStyles.dataset.recordingPriority = 'true';
  document.head.append(recordingPriorityStyles);
}
