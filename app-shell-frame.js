(() => {
  'use strict';

  function mountFrame() {
    if (document.body.classList.contains('ney-shell-frame-active')) return;

    const app = document.getElementById('appShell');
    const nav = document.querySelector('.ney-shell-nav');
    if (!app || !nav) return;

    const frame = document.createElement('div');
    frame.className = 'ney-shell-frame';

    const scroll = document.createElement('div');
    scroll.className = 'ney-shell-scroll';
    scroll.setAttribute('role', 'region');
    scroll.setAttribute('aria-label', 'محتوى التطبيق');

    const appParent = app.parentNode;
    if (!appParent) return;

    appParent.insertBefore(frame, app);
    scroll.append(app);
    frame.append(scroll, nav);
    document.body.classList.add('ney-shell-frame-active');

    function moveCopyrightIntoScroll() {
      const copyright = document.querySelector('.app-copyright');
      if (copyright && copyright.parentNode !== scroll) scroll.append(copyright);
    }

    moveCopyrightIntoScroll();

    const observer = new MutationObserver(() => moveCopyrightIntoScroll());
    observer.observe(document.body, { childList: true });

    window.addEventListener('ney:screenchange', () => {
      scroll.scrollTo({ top: 0, behavior: 'auto' });
    });

    window.NeyAppShellFrame = { frame, scroll, nav };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(mountFrame), { once: true });
  } else {
    requestAnimationFrame(mountFrame);
  }
})();
