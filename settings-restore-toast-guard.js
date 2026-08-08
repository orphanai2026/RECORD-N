(() => {
  'use strict';

  const AUTO_SAVE_MESSAGE = 'تم حفظ الإعدادات وتطبيقها.';
  let trustedSaveWindow = false;
  let boundButton = null;
  let toastObserver = null;

  function toast() {
    return document.querySelector('#toast');
  }

  function hideAutomaticSaveToast() {
    const node = toast();
    if (!node || trustedSaveWindow) return;
    if (node.textContent.trim() !== AUTO_SAVE_MESSAGE) return;
    node.classList.remove('is-visible');
  }

  function bindSaveButton() {
    const button = document.querySelector('#saveAdvancedButton');
    if (!button || button === boundButton) return Boolean(button);
    boundButton = button;

    button.addEventListener('click', event => {
      if (event.isTrusted) {
        trustedSaveWindow = true;
        window.setTimeout(() => { trustedSaveWindow = false; }, 1200);
        return;
      }
      window.setTimeout(hideAutomaticSaveToast, 0);
    }, true);

    return true;
  }

  function observeToast() {
    const node = toast();
    if (!node || toastObserver) return;
    toastObserver = new MutationObserver(hideAutomaticSaveToast);
    toastObserver.observe(node, { childList: true, subtree: true, characterData: true });
    hideAutomaticSaveToast();
  }

  function install() {
    bindSaveButton();
    observeToast();

    const observer = new MutationObserver(() => {
      const buttonReady = bindSaveButton();
      observeToast();
      if (buttonReady && toast()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 12000);

    window.setTimeout(hideAutomaticSaveToast, 0);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
