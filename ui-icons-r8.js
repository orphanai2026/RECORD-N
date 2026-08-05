(() => {
  'use strict';

  const icons = {
    mic: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6"/></svg>',
    mic_external_on: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="4" width="6" height="10" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4M8 21h8M4 7h2M18 7h2"/></svg>',
    tune: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h2M10 17h10M8 4v6M16 14v6"/><circle cx="8" cy="7" r="2"/><circle cx="16" cy="17" r="2"/></svg>',
    help: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.3 2.3 0 1 1 3.6 1.9c-.9.6-1.4 1.1-1.4 2.1M12 17h.01"/></svg>',
    music_note: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V6l9-2v11"/><ellipse cx="6.5" cy="18" rx="2.5" ry="2"/><ellipse cx="15.5" cy="15" rx="2.5" ry="2"/></svg>',
    speed: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 17a8.5 8.5 0 1 1 15 0"/><path d="m12 13 4-4"/><circle cx="12" cy="13" r="1.4"/><path d="M6.5 15h.01M17.5 15h.01M12 7h.01"/></svg>',
    fact_check: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="m7 9 1.5 1.5L11 8M13 9h4M7 15l1.5 1.5L11 14M13 15h4"/></svg>',
    expand_more: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 9 5 5 5-5"/></svg>',
    expand_less: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 15 5-5 5 5"/></svg>',
    piano: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 5v9M12 5v9M17 5v9M5 14h14"/><path d="M8.5 5v6M13.5 5v6" stroke-width="2.5"/></svg>',
    tempo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 20h8M9 20 11 4h2l2 16M10 13h4"/><path d="m12 7 4-2"/></svg>',
    fork_right: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4v16M8 8c5 0 8 3 8 8M16 12V8h-4"/></svg>',
    remove: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg>',
    add: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M12 5v14"/></svg>',
    target: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>',
    noise_control_off: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h2l2-5 3 10 2-6 2 3h2"/><path d="m4 4 16 16"/></svg>',
    settings_input_component: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h4M16 7h4M4 17h8M18 17h2"/><circle cx="12" cy="7" r="2"/><circle cx="15" cy="17" r="2"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',
    graphic_eq: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 14v-4M8 18V6M12 21V3M16 17V7M20 14v-4"/></svg>',
    more_horiz: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.3" fill="currentColor" stroke="none"/></svg>',
    circle: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="6" fill="currentColor" stroke="none"/></svg>'
  };

  let scheduled = false;

  function renderIcon(node) {
    if (!(node instanceof HTMLElement) || !node.classList.contains('material-symbols-rounded')) return;

    const rawText = node.textContent.trim();
    const name = rawText || node.dataset.icon;
    if (!name || !icons[name]) return;

    if (node.dataset.icon === name && node.querySelector('svg') && !rawText) return;

    node.dataset.icon = name;
    node.classList.add('local-svg-icon');
    node.innerHTML = icons[name];
  }

  function scan(root = document) {
    if (root instanceof HTMLElement && root.classList.contains('material-symbols-rounded')) renderIcon(root);
    root.querySelectorAll?.('.material-symbols-rounded').forEach(renderIcon);
  }

  function scheduleScan(root) {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      scan(root || document);
    });
  }

  function start() {
    document.body.classList.add('oriental-interface-r8');
    scan();

    document.querySelectorAll('link[data-material-symbols]').forEach(link => link.remove());

    const observer = new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'characterData') {
          const parent = record.target.parentElement;
          if (parent?.classList.contains('material-symbols-rounded')) scheduleScan(parent);
          continue;
        }

        record.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) scheduleScan(node);
        });

        const target = record.target;
        if (target instanceof HTMLElement && target.classList.contains('material-symbols-rounded')) {
          scheduleScan(target);
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
