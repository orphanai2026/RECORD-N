(() => {
  'use strict';

  function removeDuplicateSettingsAction() {
    document.querySelectorAll('.header-utilities .utility-button').forEach(button => {
      if (button.textContent.includes('الإعدادات')) button.remove();
    });
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

  function markDecorativeIcons() {
    document.querySelectorAll('.panel-heading .icon-emblem, .control-cell-label .icon-emblem').forEach(icon => {
      icon.setAttribute('aria-hidden', 'true');
      icon.classList.add('decorative-only');
    });
  }

  function apply() {
    removeDuplicateSettingsAction();
    makeMicHeaderStatusOnly();
    markDecorativeIcons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply, { once: true });
  } else {
    apply();
  }
})();
