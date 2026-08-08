(() => {
  'use strict';

  window.addEventListener('ney:screenchange', event => {
    if (event?.detail?.screen === 'music-library') return;
    const screen = document.querySelector('.ney-screen--music-library');
    if (!screen) return;
    screen.hidden = true;
    screen.setAttribute('aria-hidden', 'true');
  });
})();
