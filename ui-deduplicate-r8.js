(() => {
  'use strict';

  function installStyles() {
    if (document.getElementById('deduplicate-r8-styles')) return;
    const style = document.createElement('style');
    style.id = 'deduplicate-r8-styles';
    style.textContent = `
      .oriental-interface-r8 .header-mic-status.status-only,
      .oriental-interface-r8 .header-mic-status.status-only:disabled {
        pointer-events: none !important;
        cursor: default !important;
        opacity: 1 !important;
        filter: none !important;
        color: #d9c79d !important;
      }
      .oriental-interface-r8 .header-utilities.single-utility {
        min-width: 108px;
        justify-content: flex-start !important;
      }
      .oriental-interface-r8 .icon-emblem.decorative-only { pointer-events: none; }
    `;
    document.head.appendChild(style);
  }

  function removeDuplicateSettingsAction() {
    const utilities = document.querySelector('.header-utilities');
    if (!utilities) return;

    utilities.querySelectorAll('.utility-button').forEach(button => {
      if (button.textContent.includes('الإعدادات')) button.remove();
    });
    utilities.classList.toggle('single-utility', utilities.querySelectorAll('.utility-button').length === 1);
  }

  function makeMicHeaderStatusOnly() {
    const status = document.getElementById('headerMicStatus');
    if (!status) return;

    status.disabled = true;
    status.tabIndex = -1;
    status.classList.add('status-only');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.setAttribute('aria-label', 'حالة الميكروفون');
    status.title = 'حالة الميكروفون';
  }

  function removeRepeatedAdvancedButtons() {
    const buttons = [...document.querySelectorAll('.advanced-button')];
    buttons.slice(1).forEach(button => button.remove());
  }

  function markDecorativeIcons() {
    document.querySelectorAll('.panel-heading .icon-emblem, .control-cell-label .icon-emblem').forEach(icon => {
      icon.setAttribute('aria-hidden', 'true');
      icon.classList.add('decorative-only');
    });
  }

  function apply() {
    installStyles();
    removeDuplicateSettingsAction();
    makeMicHeaderStatusOnly();
    removeRepeatedAdvancedButtons();
    markDecorativeIcons();
    document.body.classList.add('deduplicated-interface');
  }

  function start() {
    apply();
    const observer = new MutationObserver(() => apply());
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
