(() => {
  'use strict';

  const mediaDevices = navigator.mediaDevices;
  if (!mediaDevices?.getUserMedia || mediaDevices.getUserMedia.__neyStopSyncWrapped) return;

  const previousGetUserMedia = mediaDevices.getUserMedia.bind(mediaDevices);

  function patchAudioTrack(track) {
    if (!track || track.kind !== 'audio' || track.__neyStopSyncPatched) return;

    const nativeStop = track.stop.bind(track);
    let syntheticEndedSent = false;

    Object.defineProperty(track, '__neyStopSyncPatched', {
      value: true,
      configurable: false,
      enumerable: false
    });

    track.stop = function neySynchronizedTrackStop(...args) {
      const wasLive = track.readyState !== 'ended';
      const result = nativeStop(...args);

      /*
       * MediaStreamTrack.stop() sets readyState to "ended", but browsers do not
       * consistently emit an `ended` event for an explicit stop(). Ney
       * Auto-Capture listens for that event to release its AudioContext, clear
       * its ring buffer, and return the UI to "بانتظار الميكروفون".
       */
      if (wasLive && !syntheticEndedSent) {
        syntheticEndedSent = true;
        queueMicrotask(() => {
          try { track.dispatchEvent(new Event('ended')); } catch (_) {}
          document.dispatchEvent(new CustomEvent('ney:audio-track-stopped', {
            detail: { id: track.id || '', kind: track.kind }
          }));
        });
      }

      return result;
    };
  }

  async function synchronizedGetUserMedia(constraints) {
    const stream = await previousGetUserMedia(constraints);
    if (constraints?.audio && stream?.getAudioTracks) {
      stream.getAudioTracks().forEach(patchAudioTrack);
    }
    return stream;
  }

  Object.defineProperty(synchronizedGetUserMedia, '__neyStopSyncWrapped', {
    value: true,
    configurable: false,
    enumerable: false
  });

  try {
    mediaDevices.getUserMedia = synchronizedGetUserMedia;
  } catch (error) {
    console.warn('Unable to install Ney Auto-Capture stop synchronization', error);
  }
})();
