(() => {
  'use strict';

  const DIALOG = '#frequencyReferenceDialog';
  const TABLE_WRAP = '.ney-frequency-reference-table-wrap';
  const MAQAM_CONTROLS = '#frequencyReferenceMaqam, #frequencyReferenceRoot, #frequencyReferenceMaqamOctave';
  const VIEW_BUTTON = '[data-frequency-view]';

  function isQuarterToneText(text) {
    return /نصف\s+(?:بيمول|دييز)|half-(?:flat|sharp)|three-quarter/i.test(String(text || ''));
  }

  function resetReferenceScroll(dialog) {
    if (!dialog) return;
    dialog.scrollTo({ top: 0, behavior: 'auto' });
    const table = dialog.querySelector(TABLE_WRAP);
    if (table) table.scrollTop = 0;
  }

  function decorateRows(dialog) {
    if (!dialog) return;
    const maqamView = dialog.classList.contains('is-maqam-view');
    const rows = [...dialog.querySelectorAll('#frequencyReferenceBody tr')];

    rows.forEach((row, index) => {
      row.classList.toggle('is-root-degree', maqamView && index === 0);
      row.querySelectorAll('.ney-quarter-tone-badge').forEach(node => node.remove());

      const noteCell = maqamView ? row.cells?.[1] : row.cells?.[0];
      if (!noteCell || !isQuarterToneText(noteCell.textContent)) return;
      const badge = document.createElement('span');
      badge.className = 'ney-quarter-tone-badge';
      badge.textContent = '¼';
      badge.setAttribute('aria-label', 'درجة ربع تون');
      noteCell.append(badge);
    });
  }

  function install(dialog) {
    if (!dialog || dialog.dataset.frequencyPolishInstalled === 'true') return;
    dialog.dataset.frequencyPolishInstalled = 'true';

    const body = dialog.querySelector('#frequencyReferenceBody');
    if (body) {
      const observer = new MutationObserver(() => decorateRows(dialog));
      observer.observe(body, { childList: true, subtree: true, characterData: true });
      decorateRows(dialog);
    }

    dialog.addEventListener('click', event => {
      if (!event.target.closest(VIEW_BUTTON)) return;
      window.requestAnimationFrame(() => {
        resetReferenceScroll(dialog);
        decorateRows(dialog);
      });
    });

    dialog.addEventListener('change', event => {
      if (!event.target.matches(MAQAM_CONTROLS)) return;
      window.requestAnimationFrame(() => {
        resetReferenceScroll(dialog);
        decorateRows(dialog);
      });
    });
  }

  function start() {
    const existing = document.querySelector(DIALOG);
    if (existing) install(existing);

    const observer = new MutationObserver(() => {
      const dialog = document.querySelector(DIALOG);
      if (dialog) install(dialog);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 20000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
