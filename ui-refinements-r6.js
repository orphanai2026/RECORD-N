(() => {
  'use strict';

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function enhanceWaitingState() {
    const panel = document.querySelector('.note-panel');
    const stage = panel?.querySelector('.note-stage');
    const english = panel?.querySelector('.english-note');
    const arabic = panel?.querySelector('.arabic-note');
    if (!panel || !stage || !english || !arabic) return;

    const overlay = el('div', 'note-waiting-overlay');
    overlay.setAttribute('aria-live', 'polite');
    overlay.append(
      el('span', 'waiting-note-mark', '♪'),
      el('strong', '', 'بانتظار النغمة'),
      el('small', '', 'شغّل الميكروفون واعزف نغمة ثابتة')
    );
    stage.appendChild(overlay);

    const isPlaceholder = value => {
      const normalized = String(value || '').trim();
      return !normalized || /^[-–—ـ]+$/.test(normalized);
    };

    const sync = () => {
      const waiting = isPlaceholder(english.textContent) && isPlaceholder(arabic.textContent);
      panel.classList.toggle('is-waiting', waiting);
      overlay.setAttribute('aria-hidden', String(!waiting));
    };

    new MutationObserver(sync).observe(stage, {
      childList: true,
      subtree: true,
      characterData: true
    });
    sync();
  }

  function enhanceRecordingPanel() {
    const panel = document.querySelector('.recording-panel');
    const micButton = document.getElementById('micButton');
    if (!panel || panel.querySelector('.recording-readiness')) return;

    const readiness = el('div', 'recording-readiness');
    const items = [
      ['الميكروفون', 'mic'],
      ['ثبات النغمة', 'pitch'],
      ['جودة التسجيل', 'quality']
    ];

    items.forEach(([label, key]) => {
      const item = el('span', 'readiness-item');
      item.dataset.readiness = key;
      item.append(el('i'), el('b', '', label));
      readiness.appendChild(item);
    });
    panel.appendChild(readiness);

    const syncMic = () => {
      const active = micButton?.textContent.includes('إيقاف');
      readiness.querySelector('[data-readiness="mic"]')?.classList.toggle('is-ready', Boolean(active));
    };
    if (micButton) {
      new MutationObserver(syncMic).observe(micButton, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true
      });
    }
    syncMic();
  }

  function simplifyLibraryToolbar() {
    const toolbar = document.querySelector('.library-panel .library-toolbar');
    if (!toolbar || toolbar.querySelector('.library-tools-more')) return;

    const clearButton = toolbar.querySelector('.danger');
    if (!clearButton) return;

    const menu = el('details', 'library-tools-more');
    const summary = el('summary', 'library-tools-trigger', '⋮');
    summary.setAttribute('aria-label', 'المزيد من إجراءات المكتبة');
    const popover = el('div', 'library-tools-menu');
    popover.appendChild(clearButton);
    menu.append(summary, popover);
    toolbar.appendChild(menu);
  }

  function apply() {
    if (document.body.classList.contains('oriental-interface-r6')) return;
    document.body.classList.add('oriental-interface-r6');
    enhanceWaitingState();
    enhanceRecordingPanel();
    simplifyLibraryToolbar();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply, { once: true });
  } else {
    apply();
  }
})();
