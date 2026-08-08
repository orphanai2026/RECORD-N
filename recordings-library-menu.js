(() => {
  'use strict';

  const $ = (selector, scope = document) => scope.querySelector(selector);

  function ensureStyles() {
    if (document.querySelector('link[data-recordings-library-menu]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = './recordings-library-menu.css?v=2026-08-08-1648';
    link.dataset.recordingsLibraryMenu = 'true';
    document.head.append(link);
  }

  function icon(path) {
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;
  }

  function initialize() {
    const trigger = $('#libraryMenuButton');
    if (!trigger || trigger.dataset.libraryMenuReady === 'true') return Boolean(trigger);

    ensureStyles();
    trigger.dataset.libraryMenuReady = 'true';
    trigger.setAttribute('aria-label', 'خيارات مكتبة التسجيلات');
    trigger.setAttribute('aria-haspopup', 'menu');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.title = 'خيارات مكتبة التسجيلات';

    const menu = document.createElement('div');
    menu.className = 'ney-library-menu';
    menu.id = 'neyLibraryMenu';
    menu.hidden = true;
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-label', 'خيارات مكتبة التسجيلات');
    menu.innerHTML = `
      <button type="button" role="menuitem" data-library-action="refresh">
        ${icon('<path d="M20 11a8 8 0 1 0-2.3 5.7"></path><path d="M20 4v7h-7"></path>')}
        <span>تحديث مكتبة التسجيلات</span>
      </button>
      <button type="button" role="menuitem" data-library-action="settings">
        ${icon('<circle cx="12" cy="12" r="3"></circle><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.5 1a7 7 0 0 0-1.7-1L14.5 3h-5L9 6a7 7 0 0 0-1.7 1L4.8 6 2.8 9.5 4.9 11a7 7 0 0 0 0 2l-2.1 1.5 2 3.5 2.5-1a7 7 0 0 0 1.7 1l.5 3h5l.5-3a7 7 0 0 0 1.7-1l2.5 1 2-3.5-2.1-1.5c.1-.3.1-.7.1-1Z"></path>')}
        <span>إعدادات التسجيل والتصدير</span>
      </button>
      <button type="button" role="menuitem" data-library-action="clear">
        ${icon('<path d="M4 7h16"></path><path d="M9 7V4h6v3"></path><path d="m6 7 1 13h10l1-13"></path>')}
        <span>مسح جميع التسجيلات</span>
      </button>`;
    document.body.append(menu);

    function position() {
      const rect = trigger.getBoundingClientRect();
      const width = Math.min(230, window.innerWidth - 20);
      const left = Math.max(10, Math.min(window.innerWidth - width - 10, rect.right - width));
      const top = Math.min(window.innerHeight - 190, rect.bottom + 8);
      menu.style.left = `${left}px`;
      menu.style.top = `${Math.max(10, top)}px`;
    }

    function close({ focus = false } = {}) {
      menu.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      if (focus) trigger.focus();
    }

    function open() {
      position();
      menu.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      menu.querySelector('button')?.focus();
    }

    trigger.addEventListener('click', event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (menu.hidden) open(); else close({ focus: true });
    }, true);

    menu.addEventListener('click', event => {
      const button = event.target.closest('[data-library-action]');
      if (!button) return;
      const action = button.dataset.libraryAction;
      close();
      if (action === 'refresh') {
        window.NeyPerformancePackRecordsUI?.refresh?.();
        const toast = $('#toast');
        if (toast) {
          toast.textContent = 'تم تحديث مكتبة التسجيلات.';
          toast.classList.add('is-visible');
          window.setTimeout(() => toast.classList.remove('is-visible'), 2200);
        }
      } else if (action === 'settings') {
        window.NeyAppShell?.show?.('settings');
      } else if (action === 'clear') {
        $('#clearRecordsButton')?.click();
      }
    });

    document.addEventListener('click', event => {
      if (menu.hidden || menu.contains(event.target) || event.target === trigger || trigger.contains(event.target)) return;
      close();
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !menu.hidden) close({ focus: true });
    });

    window.addEventListener('resize', () => { if (!menu.hidden) position(); }, { passive: true });
    window.addEventListener('scroll', () => { if (!menu.hidden) position(); }, { passive: true });
    window.addEventListener('ney:screenchange', () => close());
    return true;
  }

  if (!initialize()) {
    const observer = new MutationObserver(() => {
      if (initialize()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 15000);
  }
})();
