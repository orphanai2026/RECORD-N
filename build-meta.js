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

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadBuildMeta, { once: true });
  else loadBuildMeta();
})();

import('./metronome-reset.js?v=2026-08-07-1449').catch(error => console.error('Metronome reset load failed', error));

import('./maqam-library.js?v=2026-08-07-1614')
  .then(() => import('./recording-generator.js?v=2026-08-07-1614'))
  .then(() => import('./performance-pack-store.js?v=2026-08-07-1707'))
  .then(() => import('./performance-pack-records-ui.js?v=2026-08-07-1742'))
  .catch(error => console.error('Stage 6 recording foundation load failed', error));

if (!document.querySelector('link[data-ney-auto-capture]')) {
  const autoCaptureStyles = document.createElement('link');
  autoCaptureStyles.rel = 'stylesheet';
  autoCaptureStyles.href = './ney-auto-capture.css?v=2026-08-07-1516';
  autoCaptureStyles.dataset.neyAutoCapture = 'true';
  document.head.append(autoCaptureStyles);
}

const capturePolicyReady = import('./capture-acceptance-policy.js?v=2026-08-08-0007');
const autoCaptureReady = capturePolicyReady
  .then(() => import('./ney-auto-capture-stop-sync.js?v=2026-08-07-2011'))
  .then(() => import('./ney-auto-capture-state-watch.js?v=2026-08-07-2018'))
  .then(() => window.NeyCapturePolicyLoader.loadAutoCapture())
  .catch(error => console.error('Ney Auto-Capture load failed', error));

if (!document.querySelector('link[data-auto-session-start]')) {
  const sessionStartStyles = document.createElement('link');
  sessionStartStyles.rel = 'stylesheet';
  sessionStartStyles.href = './auto-session-start.css?v=2026-08-07-1654';
  sessionStartStyles.dataset.autoSessionStart = 'true';
  document.head.append(sessionStartStyles);
}

if (!document.querySelector('link[data-recording-session-flow]')) {
  const sessionFlowStyles = document.createElement('link');
  sessionFlowStyles.rel = 'stylesheet';
  sessionFlowStyles.href = './recording-session-flow.css?v=2026-08-07-2120';
  sessionFlowStyles.dataset.recordingSessionFlow = 'true';
  document.head.append(sessionFlowStyles);
}
autoCaptureReady
  .then(() => window.NeyCapturePolicyLoader.loadAutoSessionStart())
  .then(() => import('./recording-session-flow.js?v=2026-08-07-2105'))
  .catch(error => console.error('Recording session flow load failed', error));

if (!document.querySelector('link[data-recording-maqam-selector]')) {
  const maqamSelectorStyles = document.createElement('link');
  maqamSelectorStyles.rel = 'stylesheet';
  maqamSelectorStyles.href = './recording-maqam-selector.css?v=2026-08-07-2143';
  maqamSelectorStyles.dataset.recordingMaqamSelector = 'true';
  document.head.append(maqamSelectorStyles);
}
autoCaptureReady
  .then(() => import('./maqam-library.js?v=2026-08-07-1614'))
  .then(() => import('./recording-maqam-selector.js?v=2026-08-07-2133'))
  .then(() => import('./maqam-capture-acceptance-guard.js?v=2026-08-07-2206'))
  .then(() => import('./maqam-scale-capture-flow.js?v=2026-08-07-2356'))
  .catch(error => console.error('Recording maqam selector load failed', error));

if (!document.querySelector('link[data-educational-duration]')) {
  const durationStyles = document.createElement('link');
  durationStyles.rel = 'stylesheet';
  durationStyles.href = './educational-duration-capture.css?v=2026-08-07-2344';
  durationStyles.dataset.educationalDuration = 'true';
  document.head.append(durationStyles);
}
autoCaptureReady
  .then(() => window.NeyCapturePolicyLoader.loadEducationalDurationCapture())
  .catch(error => console.error('Educational duration capture load failed', error));

if (!document.querySelector('link[data-about-research-note]')) {
  const researchNoteStyles = document.createElement('link');
  researchNoteStyles.rel = 'stylesheet';
  researchNoteStyles.href = './about-research-note.css?v=2026-08-07-2236';
  researchNoteStyles.dataset.aboutResearchNote = 'true';
  document.head.append(researchNoteStyles);
}
import('./about-research-note.js?v=2026-08-07-2236')
  .catch(error => console.error('About research note load failed', error));

if (!document.querySelector('link[data-recording-modernization]')) {
  const modernizationStyles = document.createElement('link');
  modernizationStyles.rel = 'stylesheet';
  modernizationStyles.href = './recording-modernization.css?v=2026-08-07-1734';
  modernizationStyles.dataset.recordingModernization = 'true';
  document.head.append(modernizationStyles);
}

import('./app-shell-metronome-bridge.js?v=2026-08-07-1941').catch(error => console.error('App Shell metronome bridge load failed', error));

if (!document.querySelector('link[data-app-shell-frame]')) {
  const frameStyles = document.createElement('link');
  frameStyles.rel = 'stylesheet';
  frameStyles.href = './app-shell-frame.css?v=2026-08-07-1832';
  frameStyles.dataset.appShellFrame = 'true';
  document.head.append(frameStyles);
}
import('./app-shell-frame.js?v=2026-08-07-1832').catch(error => console.error('App Shell frame load failed', error));

const existingRecordingPriority = document.querySelector('link[data-recording-priority]');
if (existingRecordingPriority) existingRecordingPriority.href = './recording-priority.css?v=2026-08-07-1922';
else {
  const recordingPriorityStyles = document.createElement('link');
  recordingPriorityStyles.rel = 'stylesheet';
  recordingPriorityStyles.href = './recording-priority.css?v=2026-08-07-1922';
  recordingPriorityStyles.dataset.recordingPriority = 'true';
  document.head.append(recordingPriorityStyles);
}

const existingAmbient = document.querySelector('link[data-metronome-ambient-light]');
if (existingAmbient) existingAmbient.href = './metronome-ambient-light.css?v=2026-08-07-1929';
else {
  const ambientStyles = document.createElement('link');
  ambientStyles.rel = 'stylesheet';
  ambientStyles.href = './metronome-ambient-light.css?v=2026-08-07-1929';
  ambientStyles.dataset.metronomeAmbientLight = 'true';
  document.head.append(ambientStyles);
}

import('./recording-metronome-top.js?v=2026-08-07-1912')
  .then(() => import('./recording-metronome-capture-guard.js?v=2026-08-07-1912'))
  .catch(error => console.error('Recording metronome protection load failed', error));

if (!document.querySelector('link[data-recording-microphone-card]')) {
  const microphoneStyles = document.createElement('link');
  microphoneStyles.rel = 'stylesheet';
  microphoneStyles.href = './recording-microphone-card.css?v=2026-08-07-1954';
  microphoneStyles.dataset.recordingMicrophoneCard = 'true';
  document.head.append(microphoneStyles);
}
import('./recording-microphone-card.js?v=2026-08-07-2002')
  .catch(error => console.error('Recording microphone card load failed', error));
