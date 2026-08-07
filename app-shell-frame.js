(() => {
  'use strict';

  let observer = null;

  function mountFrame() {
    if (document.body.classList.contains('ney-shell-frame-active')) return true;

    const app = document.getElementById('appShell');
    const nav = document.querySelector('.ney-shell-nav');
    if (!app || !nav) return false;

    const frame = document.createElement('div');
    frame.className = 'ney-shell-frame';

    const scroll = document.createElement('div');
    scroll.className = 'ney-shell-scroll';
    scroll.setAttribute('role', 'region');
    scroll.setAttribute('aria-label', 'محتوى التطبيق');

    const appParent = app.parentNode;
    if (!appParent) return false;

    appParent.insertBefore(frame, app);
    scroll.append(app);
    frame.append(scroll, nav);
    document.body.classList.add('ney-shell-frame-active');

    function moveCopyrightIntoScroll() {
      const copyright = document.querySelector('.app-copyright');
      if (copyright && copyright.parentNode !== scroll) scroll.append(copyright);
    }

    moveCopyrightIntoScroll();

    const copyrightObserver = new MutationObserver(() => moveCopyrightIntoScroll());
    copyrightObserver.observe(document.body, { childList: true });

    window.addEventListener('ney:screenchange', () => {
      scroll.scrollTo({ top: 0, behavior: 'auto' });
    });

    window.NeyAppShellFrame = { frame, scroll, nav };
    observer?.disconnect();
    observer = null;
    return true;
  }

  function start() {
    if (mountFrame()) return;
    observer = new MutationObserver(() => mountFrame());
    observer.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(() => observer?.disconnect(), 10000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
