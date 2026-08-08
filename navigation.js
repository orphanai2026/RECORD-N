(() => {
  'use strict';

  const $ = (selector, scope = document) => scope.querySelector(selector);
  let settingsScreen = null;

  function icon(path) {
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;
  }

  function closeSettingsScreen() {
    if (!settingsScreen) return;
    settingsScreen.hidden = true;
    document.body.classList.remove('app-settings-screen-open');
    $('.app-shell')?.removeAttribute('aria-hidden');
  }

  function openSettingsScreen(focusSelector = '') {
    settingsScreen = ensureSettingsScreen();
    if (!settingsScreen) return;
    settingsScreen.hidden = false;
    document.body.classList.add('app-settings-screen-open');
    $('.app-shell')?.setAttribute('aria-hidden', 'true');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (focusSelector) {
      window.setTimeout(() => {
        const target = $(focusSelector, settingsScreen) || $(focusSelector);
        target?.focus({ preventScroll: true });
        target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 80);
    }
  }

  function ensureSettingsScreen() {
    if (settingsScreen?.isConnected) return settingsScreen;

    const quickControls = $('.quick-controls');
    const advancedDialog = $('#advancedDialog');
    const advancedForm = $('#advancedSettingsForm');
    if (!quickControls && !advancedForm) return null;

    const screen = document.createElement('section');
    screen.id = 'settingsScreen';
    screen.className = 'app-settings-screen';
    screen.hidden = true;
    screen.setAttribute('aria-labelledby', 'settingsScreenTitle');
    screen.innerHTML = `
      <header class="app-settings-screen__hero">
        <div>
          <span class="app-settings-screen__kicker">إعدادات معيار الناي</span>
          <h1 id="settingsScreenTitle">الإعدادات</h1>
          <p>جميع إعدادات العزف والقياس والتسجيل والتصدير في شاشة مستقلة عن شاشة التسجيل.</p>
        </div>
        <button type="button" class="app-settings-screen__back" aria-label="العودة إلى شاشة التسجيل">
          ${icon('<path d="m9 18 6-6-6-6"></path>')}
          <span>العودة للتسجيل</span>
        </button>
      </header>
      <div class="app-settings-screen__content"></div>`;

    const content = $('.app-settings-screen__content', screen);

    if (quickControls) {
      quickControls.classList.add('settings-quick-controls');
      const title = $('h2', quickControls);
      const description = $('.quick-controls__header p', quickControls);
      if (title) title.textContent = 'التحكم السريع';
      if (description) description.textContent = 'إعدادات العزف الأساسية التي تضبطها قبل بدء التسجيل.';
      const advancedButton = $('#advancedButton', quickControls) || $('#advancedButton');
      if (advancedButton) {
        advancedButton.hidden = true;
        advancedButton.setAttribute('aria-hidden', 'true');
        advancedButton.tabIndex = -1;
      }
      content.appendChild(quickControls);
    }

    if (advancedForm) {
      advancedForm.classList.add('settings-screen-form');
      advancedForm.removeAttribute('method');

      const formHeader = $('header', advancedForm);
      const closeButton = formHeader?.querySelector('button[value="cancel"], .dialog-close, .icon-button');
      if (closeButton) {
        closeButton.type = 'button';
        closeButton.removeAttribute('value');
        closeButton.setAttribute('aria-label', 'العودة إلى شاشة التسجيل');
        closeButton.addEventListener('click', closeSettingsScreen);
      }

      const saveButton = $('#saveAdvancedButton', advancedForm);
      if (saveButton) {
        saveButton.type = 'button';
        saveButton.removeAttribute('value');
      }

      content.appendChild(advancedForm);
    }

    if (advancedDialog) {
      advancedDialog.hidden = true;
      advancedDialog.setAttribute('aria-hidden', 'true');
    }

    $('.app-settings-screen__back', screen)?.addEventListener('click', closeSettingsScreen);
    document.body.appendChild(screen);
    settingsScreen = screen;
    return screen;
  }

  function scrollToTarget(selector, button) {
    closeSettingsScreen();
    window.requestAnimationFrame(() => {
      const target = $(selector);
      if (!target) return;
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.classList.remove('app-nav-target-pulse');
      requestAnimationFrame(() => target.classList.add('app-nav-target-pulse'));
      window.setTimeout(() => target.classList.remove('app-nav-target-pulse'), 800);
    });
    document.querySelectorAll('.app-bottom-nav__item').forEach(item => item.classList.remove('is-active'));
    button?.classList.add('is-active');
  }

  function makeNavButton({ label, className = '', iconMarkup, action }) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `app-bottom-nav__item ${className}`.trim();
    button.innerHTML = `${iconMarkup}<span>${label}</span>`;
    button.addEventListener('click', action);
    return button;
  }

  function initializeNavigation() {
    if ($('.app-bottom-nav')) return;

    ensureSettingsScreen();

    const headerTabs = $('.app-header > .header-tabs');
    const helpButton = $('#helpButton');
    const aboutButton = $('#aboutButton');

    const nav = document.createElement('nav');
    nav.className = 'app-bottom-nav';
    nav.setAttribute('aria-label', 'التنقل الرئيسي');

    const recordingsButton = makeNavButton({
      label: 'التسجيلات',
      iconMarkup: icon('<path d="M4 6h16M4 12h16M4 18h10"></path>'),
      action(event) { scrollToTarget('.recordings-panel', event.currentTarget); }
    });

    const metronomeButton = makeNavButton({
      label: 'المترونوم',
      iconMarkup: icon('<path d="M8 20h8l2-14H6l2 14Z"></path><path d="m12 7 2 9"></path>'),
      action(event) { scrollToTarget('.metronome-panel', event.currentTarget); }
    });

    const recordButton = makeNavButton({
      label: 'تسجيل',
      className: 'app-bottom-nav__item--record',
      iconMarkup: icon('<rect x="9" y="3" width="6" height="11" rx="3"></rect><path d="M6 10a6 6 0 0 0 12 0M12 16v5"></path>'),
      action(event) { scrollToTarget('.recording-panel', event.currentTarget); }
    });

    const calibrationButton = makeNavButton({
      label: 'معايرة الناي',
      iconMarkup: icon('<circle cx="12" cy="12" r="8"></circle><path d="M12 4v3M12 17v3M4 12h3M17 12h3"></path><circle cx="12" cy="12" r="2"></circle>'),
      action(event) {
        document.querySelectorAll('.app-bottom-nav__item').forEach(item => item.classList.remove('is-active'));
        event.currentTarget.classList.add('is-active');
        openSettingsScreen('#toleranceRange');
      }
    });

    const settingsButton = makeNavButton({
      label: 'الإعدادات',
      className: 'nav-settings',
      iconMarkup: icon('<circle cx="12" cy="12" r="3"></circle><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.5 1a7 7 0 0 0-1.7-1L14.5 3h-5L9 6a7 7 0 0 0-1.7 1L4.8 6 2.8 9.5 4.9 11a7 7 0 0 0 0 2l-2.1 1.5 2 3.5 2.5-1a7 7 0 0 0 1.7 1l.5 3h5l.5-3a7 7 0 0 0 1.7-1l2.5 1 2-3.5-2.1-1.5c.1-.3.1-.7.1-1Z"></path>'),
      action(event) {
        document.querySelectorAll('.app-bottom-nav__item').forEach(item => item.classList.remove('is-active'));
        event.currentTarget.classList.add('is-active');
        openSettingsScreen();
      }
    });

    nav.append(recordingsButton, metronomeButton, recordButton, calibrationButton, settingsButton);

    if (helpButton) {
      helpButton.classList.add('nav-info');
      helpButton.innerHTML = `${icon('<path d="M9.1 9a3 3 0 1 1 5.4 1.8c-1.3 1-2.5 1.5-2.5 3.2"></path><path d="M12 18h.01"></path><circle cx="12" cy="12" r="9"></circle>')}<span>طريقة الاستخدام</span>`;
      nav.append(helpButton);
    }
    if (aboutButton) {
      aboutButton.classList.add('nav-info');
      aboutButton.innerHTML = `${icon('<circle cx="12" cy="12" r="9"></circle><path d="M12 11v6M12 7h.01"></path>')}<span>من نحن</span>`;
      nav.append(aboutButton);
    }

    const moreButton = makeNavButton({
      label: 'المزيد',
      className: 'app-bottom-nav__more',
      iconMarkup: icon('<circle cx="5" cy="12" r="1"></circle><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle>'),
      action() { moreMenu.hidden = !moreMenu.hidden; }
    });
    nav.append(moreButton);

    const moreMenu = document.createElement('div');
    moreMenu.className = 'app-nav-more-menu';
    moreMenu.hidden = true;
    moreMenu.setAttribute('aria-label', 'المزيد');

    const menuSettings = document.createElement('button');
    menuSettings.type = 'button';
    menuSettings.textContent = 'الإعدادات';
    menuSettings.addEventListener('click', () => { moreMenu.hidden = true; settingsButton.click(); });
    moreMenu.append(menuSettings);

    if (helpButton) {
      const menuHelp = document.createElement('button');
      menuHelp.type = 'button';
      menuHelp.textContent = 'طريقة الاستخدام';
      menuHelp.addEventListener('click', () => { moreMenu.hidden = true; helpButton.click(); });
      moreMenu.append(menuHelp);
    }
    if (aboutButton) {
      const menuAbout = document.createElement('button');
      menuAbout.type = 'button';
      menuAbout.textContent = 'من نحن';
      menuAbout.addEventListener('click', () => { moreMenu.hidden = true; aboutButton.click(); });
      moreMenu.append(menuAbout);
    }

    document.body.append(nav, moreMenu);
    headerTabs?.remove();

    document.addEventListener('click', event => {
      if (moreMenu.hidden) return;
      if (moreMenu.contains(event.target) || moreButton.contains(event.target)) return;
      moreMenu.hidden = true;
    });

    window.NeySettingsScreen = Object.freeze({
      open: openSettingsScreen,
      close: closeSettingsScreen,
      isOpen: () => Boolean(settingsScreen && !settingsScreen.hidden)
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeNavigation, { once: true });
  else initializeNavigation();
})();

/* Stage 3.1 complete time-signature controls. */
if (!document.querySelector('link[data-meter-forms]')) {
  const meterStyles = document.createElement('link');
  meterStyles.rel = 'stylesheet';
  meterStyles.href = './meter-forms.css?v=2026-08-07-1442';
  meterStyles.dataset.meterForms = 'true';
  document.head.append(meterStyles);
}
import('./metronome-training.js?v=2026-08-07-1442').catch(error => console.error('Training metronome load failed', error));
