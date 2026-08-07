(() => {
  'use strict';

  const DB_NAME = 'ney-meyar-performance-packs';
  const MARKER_KEY = 'ney-meyar:last-recordings-reset-build';

  async function fetchBuild() {
    const response = await fetch(`./VERSION.json?reset=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`VERSION.json ${response.status}`);
    const meta = await response.json();
    return String(meta.temporaryBuild || meta.version || '').trim();
  }

  function deleteDatabase(name) {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        resolve(false);
        return;
      }
      const request = indexedDB.deleteDatabase(name);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error || new Error(`Unable to delete ${name}`));
      request.onblocked = () => {
        console.warn(`Development recording reset blocked for ${name}; retrying on next page load.`);
        resolve(false);
      };
    });
  }

  async function resetForCurrentBuild() {
    const build = await fetchBuild();
    if (!build) return { build: '', reset: false, reason: 'missing-build' };

    let previous = '';
    try { previous = localStorage.getItem(MARKER_KEY) || ''; } catch (_) {}
    if (previous === build) return { build, reset: false, reason: 'already-reset' };

    const deleted = await deleteDatabase(DB_NAME);
    if (!deleted && 'indexedDB' in window) return { build, reset: false, reason: 'blocked' };

    try { localStorage.setItem(MARKER_KEY, build); } catch (_) {}

    document.dispatchEvent(new CustomEvent('ney:development-recordings-reset', {
      detail: { build, database: DB_NAME }
    }));
    console.info(`Development recordings cleared for ${build}`);
    return { build, reset: true, reason: 'new-build' };
  }

  window.NeyDevBuildResetReady = resetForCurrentBuild().catch(error => {
    console.error('Development recording reset failed', error);
    return { build: '', reset: false, reason: 'error', error };
  });
})();
