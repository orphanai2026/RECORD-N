(() => {
  'use strict';

  const state = {
    list: null,
    observer: null,
    syncing: false,
    syncTimer: null,
    playingSampleKey: null,
    audio: null,
    objectUrl: null,
    countBadge: null,
    expandedPacks: new Set()
  };

  const DURATION_ORDER = Object.freeze({ whole: 1, half: 2, quarter: 3, eighth: 4, sixteenth: 5 });
  const escapeHtml = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039