(() => {
  'use strict';

  /*
   * Recording preservation policy
   * -----------------------------
   * Performance Pack recordings are user-created test/reference material.
   * They must survive build/version changes so a successful recording can be
   * reused to verify playback, grouping and export. Automatic IndexedDB
   * deletion on a new DEV build is intentionally disabled.
   *
   * Explicit clearing remains available through the application's own
   * user-facing "مسح جميع التسجيلات" action only.
   */
  async function preserveRecordings() {
    let build = '';
    try {
      const response = await fetch(`./VERSION.json?preserve=${Date.now()}`, { cache: 'no-store' });
      if (response.ok) {
        const meta = await response.json();
        build = String(meta.temporaryBuild || meta.version || '').trim();
      }
    } catch (error) {
      console.warn('Unable to read build metadata while preserving recordings', error);
    }

    const result = { build, reset: false, reason: 'recordings-preserved' };
    document.dispatchEvent(new CustomEvent('ney:development-recordings-preserved', { detail: result }));
    console.info(`Development recordings preserved${build ? ` for ${build}` : ''}`);
    return result;
  }

  window.NeyDevBuildResetReady = preserveRecordings().catch(error => {
    console.error('Development recording preservation guard failed', error);
    return { build: '', reset: false, reason: 'preservation-error', error };
  });
})();
