(() => {
  'use strict';

  const DB_NAME = 'ney-meyar-performance-packs';
  const DB_VERSION = 1;
  const PACK_STORE = 'packs';
  const AUDIO_STORE = 'audio';
  const REQUIRED_PASS_RATIO = 0.90;

  let dbPromise = null;

  function openDb() {
    if (!('indexedDB' in window)) return Promise.reject(new Error('IndexedDB is unavailable'));
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(PACK_STORE)) {
          const packs = db.createObjectStore(PACK_STORE, { keyPath: 'packKey' });
          packs.createIndex('maqamId', 'context.maqamId', { unique: false });
          packs.createIndex('noteKey', 'note.noteKey', { unique: false });
          packs.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
        if (!db.objectStoreNames.contains(AUDIO_STORE)) {
          db.createObjectStore(AUDIO_STORE, { keyPath: 'audioId' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Unable to open IndexedDB'));
    });
    return dbPromise;
  }

  function requestToPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('IndexedDB request failed'));
    });
  }

  function transactionDone(tx) {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('IndexedDB transaction failed'));
      tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
    });
  }

  function normalizeContext(context = {}) {
    return {
      mode: context.mode || 'general-note',
      maqamId: context.maqamId || null,
      maqamAr: context.maqamAr || null,
      tonic: context.tonic || null,
      maqamDegree: context.maqamDegree || null,
      variantId: context.variantId || null,
      division: Number(context.division || 24),
      a4: Number(context.a4 || 440)
    };
  }

  function tonicKey(tonic) {
    if (!tonic) return 'none';
    if (typeof tonic === 'string') return tonic.trim() || 'none';
    const letter = String(tonic.letter || '').toUpperCase() || 'C';
    const accidental = Number(tonic.accidentalQuarterSteps || 0);
    const octave = Number.isFinite(Number(tonic.octave)) ? Number(tonic.octave) : 4;
    return `${letter}:${accidental}:${octave}`;
  }

  function makePackKey({ note = {}, context = {} } = {}) {
    const c = normalizeContext(context);
    const noteKey = note.noteKey || note.english || note.arabic || `${note.abs24 ?? 'na'}`;
    return [c.mode, c.maqamId || 'none', tonicKey(c.tonic), c.maqamDegree || 'none', c.variantId || 'default', c.division, c.a4, noteKey].join('|');
  }

  function qualityScore(sample = {}) {
    if (Number.isFinite(sample.score)) return Number(sample.score);
    const clarity = Number(sample.metrics?.meanClarity ?? sample.meanClarity ?? 0);
    const absCents = Number(sample.metrics?.meanAbsCents ?? sample.meanAbsCents ?? 999);
    const tolerance = Math.max(1, Number(sample.metrics?.tolerance ?? sample.tolerance ?? 12));
    const pitchScore = Math.max(0, 1 - Math.min(1, absCents / tolerance));
    return Math.max(0, Math.min(1, clarity * 0.62 + pitchScore * 0.38));
  }

  function assertPassRatio(sample, label) {
    const ratio = Number(sample?.passRatio);
    if (!Number.isFinite(ratio) || ratio < REQUIRED_PASS_RATIO) {
      throw new Error(`${label} requires at least ${Math.round(REQUIRED_PASS_RATIO * 100)}% passing frames`);
    }
  }

  async function getPack(packKey) {
    const db = await openDb();
    const tx = db.transaction(PACK_STORE, 'readonly');
    return requestToPromise(tx.objectStore(PACK_STORE).get(packKey));
  }

  async function listPacks() {
    const db = await openDb();
    const tx = db.transaction(PACK_STORE, 'readonly');
    return requestToPromise(tx.objectStore(PACK_STORE).getAll());
  }

  async function saveAudio({ audioId, blob, pcm, sampleRate, mimeType } = {}) {
    if (!audioId) throw new Error('audioId is required');
    const db = await openDb();
    const tx = db.transaction(AUDIO_STORE, 'readwrite');
    tx.objectStore(AUDIO_STORE).put({
      audioId,
      blob: blob || null,
      pcm: pcm || null,
      sampleRate: Number(sampleRate || 0) || null,
      mimeType: mimeType || blob?.type || null,
      createdAt: new Date().toISOString()
    });
    await transactionDone(tx);
    return audioId;
  }

  async function getAudio(audioId) {
    const db = await openDb();
    const tx = db.transaction(AUDIO_STORE, 'readonly');
    return requestToPromise(tx.objectStore(AUDIO_STORE).get(audioId));
  }

  async function removeAudio(audioId) {
    if (!audioId) return;
    const db = await openDb();
    const tx = db.transaction(AUDIO_STORE, 'readwrite');
    tx.objectStore(AUDIO_STORE).delete(audioId);
    await transactionDone(tx);
  }

  async function upsertCleanReference({ note, context, sample } = {}) {
    if (!note || !sample) throw new Error('note and sample are required');
    if (sample.style && sample.style !== 'clean') throw new Error('Only clean reference samples can be auto-approved in this release');
    assertPassRatio(sample, 'Clean reference');

    const db = await openDb();
    const normalizedContext = normalizeContext(context);
    const packKey = makePackKey({ note, context: normalizedContext });
    const tx = db.transaction(PACK_STORE, 'readwrite');
    const store = tx.objectStore(PACK_STORE);
    const current = await requestToPromise(store.get(packKey));
    const incomingScore = qualityScore(sample);
    const previousScore = qualityScore(current?.samples?.clean || {});

    if (current?.samples?.clean && incomingScore <= previousScore) {
      tx.abort();
      return { changed: false, pack: current, reason: 'existing-sample-is-better-or-equal' };
    }

    const timestamp = new Date().toISOString();
    const pack = {
      packKey,
      schemaVersion: 1,
      note: {
        ...note,
        noteKey: note.noteKey || note.english || note.arabic || `${note.abs24 ?? 'na'}`
      },
      context: normalizedContext,
      samples: {
        ...(current?.samples || {}),
        clean: {
          ...sample,
          style: 'clean',
          score: incomingScore,
          approvedAutomatically: true,
          acceptanceRule: 'at-least-90-percent-valid-window',
          updatedAt: timestamp
        }
      },
      createdAt: current?.createdAt || timestamp,
      updatedAt: timestamp
    };

    store.put(pack);
    await transactionDone(tx);
    document.dispatchEvent(new CustomEvent('ney:performance-pack-updated', { detail: { packKey, pack, sampleType: 'clean' } }));
    return { changed: true, pack, replacedAudioId: current?.samples?.clean?.audioId || null };
  }

  async function upsertEducationalSample({ note, context, sample } = {}) {
    if (!note || !sample) throw new Error('note and sample are required');
    if (sample.style && sample.style !== 'clean') throw new Error('Educational duration samples must be clean in this release');
    assertPassRatio(sample, 'Educational duration sample');
    if (!sample.durationId || !sample.durationName || !Number.isFinite(Number(sample.beats))) throw new Error('duration metadata is required');
    if (!Number.isFinite(Number(sample.bpm)) || Number(sample.bpm) <= 0) throw new Error('bpm is required');

    const db = await openDb();
    const normalizedContext = normalizeContext(context);
    const packKey = makePackKey({ note, context: normalizedContext });
    const durationKey = sample.durationKey || `${sample.durationId}@${Math.round(Number(sample.bpm))}`;
    const tx = db.transaction(PACK_STORE, 'readwrite');
    const store = tx.objectStore(PACK_STORE);
    const current = await requestToPromise(store.get(packKey));
    const incomingScore = qualityScore(sample);
    const previous = current?.samples?.educational?.[durationKey] || null;
    const previousScore = qualityScore(previous || {});

    if (previous && incomingScore <= previousScore) {
      tx.abort();
      return { changed: false, pack: current, durationKey, reason: 'existing-educational-sample-is-better-or-equal' };
    }

    const timestamp = new Date().toISOString();
    const educational = {
      ...(current?.samples?.educational || {}),
      [durationKey]: {
        ...sample,
        durationKey,
        purpose: 'educational-duration',
        style: 'clean',
        score: incomingScore,
        approvedAutomatically: true,
        acceptanceRule: 'at-least-90-percent-valid-duration-window',
        updatedAt: timestamp
      }
    };

    const pack = {
      packKey,
      schemaVersion: 1,
      note: {
        ...(current?.note || {}),
        ...note,
        noteKey: note.noteKey || current?.note?.noteKey || note.english || note.arabic || `${note.abs24 ?? 'na'}`
      },
      context: current?.context || normalizedContext,
      samples: {
        ...(current?.samples || {}),
        educational
      },
      createdAt: current?.createdAt || timestamp,
      updatedAt: timestamp
    };

    store.put(pack);
    await transactionDone(tx);
    document.dispatchEvent(new CustomEvent('ney:performance-pack-updated', { detail: { packKey, pack, sampleType: 'educational', durationKey } }));
    return { changed: true, pack, durationKey, replacedAudioId: previous?.audioId || null };
  }

  async function removePack(packKey) {
    const db = await openDb();
    const tx = db.transaction(PACK_STORE, 'readwrite');
    tx.objectStore(PACK_STORE).delete(packKey);
    await transactionDone(tx);
  }

  window.NeyPerformancePackStore = Object.freeze({
    dbName: DB_NAME,
    schemaVersion: DB_VERSION,
    requiredPassRatio: REQUIRED_PASS_RATIO,
    makePackKey,
    tonicKey,
    qualityScore,
    getPack,
    listPacks,
    saveAudio,
    getAudio,
    removeAudio,
    upsertCleanReference,
    upsertEducationalSample,
    removePack
  });
})();
