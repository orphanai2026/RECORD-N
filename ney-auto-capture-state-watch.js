(() => {
  'use strict';

  const mediaDevices = navigator.mediaDevices;
  if (!mediaDevices?.getUserMedia || mediaDevices.getUserMedia.__neyStateWatchWrapped) return;

  const previousGetUserMedia = mediaDevices.getUserMedia.bind(mediaDevices);
  const trackedStreams = new Set();
  let stopping = false;

  function microphoneIsActive() {
    const text = String(document.querySelector('#headerMicText')?.textContent || '').trim();
    const dot = document.querySelector('#headerStatusDot');
    return text === 'الميكروفون نشط' && Boolean(dot?.classList.contains('status-dot--success'));
  }

  function trackStream(stream) {
    if (!stream?.getAudioTracks?.().length) return;
    trackedStreams.add(stream);
    stream.getAudioTracks().forEach(track => {
      track.addEventListener('ended', () => {
        const anyLive = stream.getAudioTracks().some(item => item.readyState !== 'ended');
        if (!anyLive) trackedStreams.delete(stream);
      });
    });
  }

  function forceAutoCaptureStop() {
    if (stopping) return;
    stopping = true;

    for (const stream of [...trackedStreams]) {
      const tracks = stream.getAudioTracks?.() || [];
      tracks.forEach(track => {
        /*
         * Explicit MediaStreamTrack.stop() does not reliably emit `ended` in
         * Chrome/Android. Ney Auto-Capture already listens for `ended`, so
         * dispatch it from the canonical microphone UI transition.
         */
        try { track.dispatchEvent(new Event('ended')); } catch (_) {}
      });
      trackedStreams.delete(stream);
    }

    document.dispatchEvent(new CustomEvent('ney:microphone-canonical-stop'));

    window.setTimeout(() => {
      stopping = false;
    }, 120);
  }

  async function watchedGetUserMedia(constraints) {
    const stream = await previousGetUserMedia(constraints);
    if (constraints?.audio) trackStream(stream);
    return stream;
  }

  Object.defineProperty(watchedGetUserMedia, '__neyStateWatchWrapped', {
    value: true,
    configurable: false,
    enumerable: false
  });

  try {
    mediaDevices.getUserMedia = watchedGetUserMedia;
  } catch (error) {
    console.warn('Unable to install canonical microphone state watch', error);
    return;
  }

  function installUiWatch() {
    const text = document.querySelector('#headerMicText');
    const dot = document.querySelector('#headerStatusDot');
    if (!text || !dot) return false;

    let lastActive = microphoneIsActive();
    const sync = () => {
      const active = microphoneIsActive();
      if (lastActive && !active) forceAutoCaptureStop();
      lastActive = active;
    };

    const observer = new MutationObserver(sync);
    observer.observe(text, { childList: true, subtree: true, characterData: true });
    observer.observe(dot, { attributes: true, attributeFilter: ['class'] });
    return true;
  }

  if (!installUiWatch()) {
    const bootstrap = new MutationObserver(() => {
      if (installUiWatch()) bootstrap.disconnect();
    });
    bootstrap.observe(document.documentElement, { childList: true, subtree: true });
    window.setTimeout(() => bootstrap.disconnect(), 12000);
  }
})();
