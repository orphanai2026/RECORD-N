(() => {
  'use strict';

  const ICONS = {
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

  const create = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  function installUtilityStyles() {
    if (document.getElementById('ney-final-utility-styles')) return;
    const style = document.createElement('style');
    style.id = 'ney-final-utility-styles';
    style.textContent = `
      .header-mic-status.status-only,.header-mic-status.status-only:disabled{pointer-events:none!important;cursor:default!important;opacity:1!important;filter:none!important}
      .header-utilities.single-utility{min-width:108px;justify-content:flex-start!important}
      .icon-emblem.decorative-only{pointer-events:none!important}
    `;
    document.head.appendChild(style);
  }

  function renderIcon(node) {
    if (!(node instanceof HTMLElement) || !node.classList.contains('material-symbols-rounded')) return;
    const name = node.dataset.icon || node.textContent.trim();
    if (!name || !ICONS[name]) return;
    if (node.dataset.icon === name && node.querySelector('svg')) return;
    node.dataset.icon = name;
    node.classList.add('local-svg-icon');
    node.innerHTML = ICONS[name];
  }

  function renderIcons(root = document) {
    if (root instanceof HTMLElement && root.classList.contains('material-symbols-rounded')) renderIcon(root);
    root.querySelectorAll?.('.material-symbols-rounded').forEach(renderIcon);
    document.querySelectorAll('link[data-material-symbols],link[href*="fonts.googleapis.com"][href*="Material+Symbols"]').forEach(link => link.remove());
  }

  function enhanceWaitingState() {
    const panel = document.querySelector('.note-panel');
    const stage = panel?.querySelector('.note-stage');
    const english = panel?.querySelector('.english-note');
    const arabic = panel?.querySelector('.arabic-note');
    if (!panel || !stage || !english || !arabic) return;

    let overlay = stage.querySelector('.note-waiting-overlay');
    if (!overlay) {
      overlay = create('div', 'note-waiting-overlay');
      overlay.setAttribute('aria-live', 'polite');
      overlay.append(
        create('span', 'waiting-note-mark', '♪'),
        create('strong', '', 'بانتظار النغمة'),
        create('small', '', 'شغّل الميكروفون واعزف نغمة ثابتة')
      );
      stage.appendChild(overlay);
    }

    const isPlaceholder = value => {
      const normalized = String(value || '').trim();
      return !normalized || /^[-–—ـ]+$/.test(normalized);
    };
    const sync = () => {
      const waiting = isPlaceholder(english.textContent) && isPlaceholder(arabic.textContent);
      panel.classList.toggle('is-waiting', waiting);
      overlay.setAttribute('aria-hidden', String(!waiting));
    };
    if (!stage.dataset.waitingObserver) {
      new MutationObserver(sync).observe(stage, { childList: true, subtree: true, characterData: true });
      stage.dataset.waitingObserver = 'true';
    }
    sync();
  }

  function enhanceRecordingPanel() {
    const panel = document.querySelector('.recording-panel');
    const micButton = document.getElementById('micButton');
    if (!panel) return;

    let readiness = panel.querySelector('.recording-readiness');
    if (!readiness) {
      readiness = create('div', 'recording-readiness');
      [['الميكروفون','mic'],['ثبات النغمة','pitch'],['جودة التسجيل','quality']].forEach(([label,key]) => {
        const item = create('span', 'readiness-item');
        item.dataset.readiness = key;
        item.append(create('i'), create('b', '', label));
        readiness.appendChild(item);
      });
      panel.appendChild(readiness);
    }

    const syncMic = () => {
      const active = micButton?.textContent.includes('إيقاف');
      readiness.querySelector('[data-readiness="mic"]')?.classList.toggle('is-ready', Boolean(active));
    };
    if (micButton && !micButton.dataset.readinessObserver) {
      new MutationObserver(syncMic).observe(micButton, { childList: true, subtree: true, characterData: true, attributes: true });
      micButton.dataset.readinessObserver = 'true';
    }
    syncMic();
  }

  function simplifyLibraryToolbar() {
    const toolbar = document.querySelector('.library-panel .library-toolbar');
    if (!toolbar || toolbar.querySelector('.library-tools-more')) return;
    const clearButton = toolbar.querySelector('.danger');
    if (!clearButton) return;
    const menu = create('details', 'library-tools-more');
    const summary = create('summary', 'library-tools-trigger', '⋮');
    summary.setAttribute('aria-label', 'المزيد من إجراءات المكتبة');
    const popover = create('div', 'library-tools-menu');
    popover.appendChild(clearButton);
    menu.append(summary, popover);
    toolbar.appendChild(menu);
  }

  function removeDuplicateActions() {
    const utilities = document.querySelector('.header-utilities');
    if (utilities) {
      utilities.querySelectorAll('.utility-button').forEach(button => {
        if (button.textContent.includes('الإعدادات')) button.remove();
      });
      utilities.classList.toggle('single-utility', utilities.querySelectorAll('.utility-button').length === 1);
    }

    const status = document.getElementById('headerMicStatus');
    if (status) {
      status.disabled = true;
      status.tabIndex = -1;
      status.classList.add('status-only');
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      status.setAttribute('aria-label', 'حالة الميكروفون');
      status.title = 'حالة الميكروفون';
    }

    [...document.querySelectorAll('.advanced-button')].slice(1).forEach(button => button.remove());
    document.querySelectorAll('.panel-heading .icon-emblem,.control-cell-label .icon-emblem').forEach(icon => {
      icon.setAttribute('aria-hidden', 'true');
      icon.classList.add('decorative-only');
    });
  }

  function polishDrawer() {
    const drawer = document.querySelector('.advanced-drawer');
    const overlay = document.querySelector('.advanced-overlay');
    if (!drawer || !overlay) return;
    const description = drawer.querySelector('.advanced-header p');
    if (description) {
      description.id = 'advancedDrawerDescription';
      drawer.setAttribute('aria-describedby', description.id);
    }
    if (!overlay.dataset.scrollObserver) {
      new MutationObserver(() => {
        if (overlay.classList.contains('is-open')) drawer.scrollTop = 0;
      }).observe(overlay, { attributes: true, attributeFilter: ['class'] });
      overlay.dataset.scrollObserver = 'true';
    }
  }

  function markPrecisionNodes() {
    document.querySelectorAll('.metric,.control-cell,.segment-button,.record-item').forEach(node => node.classList.add('precision-aligned'));
  }

  let scheduled = false;
  function applyAll() {
    document.body.classList.add('oriental-interface-r8','oriental-interface-r9','deduplicated-interface');
    installUtilityStyles();
    renderIcons();
    enhanceWaitingState();
    enhanceRecordingPanel();
    simplifyLibraryToolbar();
    removeDuplicateActions();
    polishDrawer();
    markPrecisionNodes();
  }

  function scheduleApply() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      applyAll();
    });
  }

  function start() {
    applyAll();
    new MutationObserver(scheduleApply).observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
