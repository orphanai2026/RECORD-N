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
