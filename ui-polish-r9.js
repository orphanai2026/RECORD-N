(() => {
  'use strict';

  const apply = () => {
    document.body.classList.add('oriental-interface-r9');

    const app = document.querySelector('.app');
    if (app) app.dataset.polish = 'r9';

    const drawer = document.querySelector('.advanced-drawer');
    const overlay = document.querySelector('.advanced-overlay');
    if (drawer && overlay) {
      drawer.setAttribute('aria-describedby', 'advancedDrawerDescription');
      const description = drawer.querySelector('.advanced-header p');
      if (description) description.id = 'advancedDrawerDescription';

      const keepVisible = () => {
        if (!overlay.classList.contains('is-open')) return;
        drawer.scrollTop = 0;
      };
      new MutationObserver(keepVisible).observe(overlay, {
        attributes: true,
        attributeFilter: ['class']
      });
    }

    document.querySelectorAll('.metric, .control-cell, .segment-button, .record-item').forEach(node => {
      node.classList.add('precision-aligned');
    });
  };

  const start = () => {
    apply();
    new MutationObserver(apply).observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
