(() => {
  'use strict';

  const $ = selector => document.querySelector(selector);
  let installed = false;
  let sourceResolved = false;

  function percentageFromText(value) {
    const match = String(value || '').match(/\d+(?:\.\d+)?/);
    if (!match) return null;
    return Math.max(0, Math.min(100, Number(match[0])));
  }

  async function resolveMicrophoneSource() {
    const source = $('#neyMicrophoneSource');
    const status