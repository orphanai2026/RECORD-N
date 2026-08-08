(() => {
  'use strict';

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  function icon(path) {
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;
  }

  function screenHeading(title, description, iconMarkup) {
    const wrapper = document.createElement('header');
    wrapper.className = 'ney-screen__heading';
    wrapper.innerHTML = `
      <div class="ney-screen__identity">
        <span class="ney-screen__icon" aria-hidden="true">${iconMarkup}</span>
        <div class="ney-screen__copy">
          <h2>${title}</h2>
          <p>${description}</p>
        </div>
      </div>
    `;
    return wrapper;
  }

  function makeScreen(name, className = '') {
    const section = document.createElement('section');
    section.className = `ney-screen ney-screen--${name} ${className}`.trim();
    section.dataset.screen = name;
    section.hidden = true;
    return section;
  }

  function moveNodes(screen, nodes) {
    nodes.filter(Boolean).forEach(node => screen.append(node));
  }

  function createMoreCard(label, description, iconMarkup, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ney-more-card';
    button.innerHTML = `
      <span class="ney-more-card__icon" aria-hidden="true">${iconMarkup}</span>
      <span class="ney-more-card__text"><strong>${label}</strong><span>${description}</span></span>
      <span class="ney-more-card__arrow" aria-hidden="true">‹</span>
    `;
    button.addEventListener('click', onClick);
    return button;
  }

  function createMiniMetronome(router) {
    const mini = document.createElement('section');
    mini.className = 'ney-mini-metronome';
    mini.setAttribute('aria-label', 'المترونوم المصغر');
    mini.innerHTML = `
      <div class="ney-mini-metronome__head">
        <div class="ney-mini-metronome__title"><span class="ney-mini-metronome__pulse" aria-hidden="true"></span><strong>المترونوم المصغر</strong></div>
        <span class="ney-mini-metronome__meter" id="neyMiniMeter">4 / 4</span>
      </div>
      <div class="ney-mini-metronome__body">
        <div class="ney-mini-metronome__beat"><strong id="neyMiniBeat">—</strong></div>
        <div class="ney-mini-metronome__tempo"><span>السرعة</span><strong><bdi id="neyMiniBpm" dir="ltr">60</bdi> BPM</strong></div>
      </div>
      <div class="ney-mini-metronome__actions">
        <button type="button" data-mini-action="toggle">تشغيل</button>
        <button type="button" data-mini-action="open">فتح التدريب الكامل</button>
      </div>
    `;

    const bpmSource = $('#bpmValue');
    const trainingBpm = $('#trainingBpm');
    const trainingMeter = $('#trainingMeter');
    const trainingToggle = $('#trainingMetronomeToggle');
    const trainingBeat = $('#trainingBeatNumber');
    const trainingTotal = $('#trainingBeatTotal');
    const miniBpm = $('#neyMiniBpm', mini);
    const miniMeter = $('#neyMiniMeter', mini);
    const miniBeat = $('#neyMiniBeat', mini);
    const toggle = $('[data-mini-action="toggle"]', mini);
    const open = $('[data-mini-action="open"]', mini);

    function sync() {
      const bpm = Number(trainingBpm?.value || bpmSource?.value || 60);
      miniBpm.textContent = Number.isFinite(bpm) ? Math.round(bpm) : 60;
      miniMeter.textContent = trainingTotal?.textContent?.trim() || (trainingMeter?.value ? trainingMeter.value.replace('/', ' / ') : '4 / 4');
      miniBeat.textContent = trainingBeat?.textContent?.trim() || '—';
      const running = trainingToggle?.textContent?.includes('إيقاف') || false;
      mini.classList.toggle('is-running', running);
      toggle.textContent = running ? 'إيقاف' : 'تشغيل';
    }

    const observer = new MutationObserver(() => {
      mini.classList.add('is-beat');
      window.setTimeout(() => mini.classList.remove('is-beat'), 120);
      sync();
    });
    if (trainingBeat) observer.observe(trainingBeat, { childList: true, subtree: true, characterData: true });
    if (trainingTotal) observer.observe(trainingTotal, { childList: true, subtree: true, characterData: true });
    if (trainingToggle) observer.observe(trainingToggle, { childList: true, subtree: true, characterData: true });
    [bpmSource, trainingBpm, trainingMeter].filter(Boolean).forEach(control => {
      control.addEventListener('input', sync);
      control.addEventListener('change', sync);
    });

    toggle.addEventListener('click', () => trainingToggle?.click());
    open.addEventListener('click', () => router.show('metronome'));
    sync();
    return mini;
  }

  function initializeAppShell() {
    if (document.body.classList.contains('ney-app-shell-active')) return;

    const app = $('#appShell');
    const header = $('.app-header', app || document);
    const topGrid = $('.top-grid', app || document);
    const quickControls = $('.quick-controls', app || document);
    const bottomGrid = $('.bottom-grid', app || document);
    const recording = $('.recording-panel');
    const recordings = $('.recordings-panel');
    const metronome = $('.metronome-panel');
    const helpButton = $('#helpButton');
    const aboutButton = $('#aboutButton');
    const advancedButton = $('#advancedButton');
    const helpDialog = $('#helpDialog');
    const aboutDialog = $('#aboutDialog');
    const advancedDialog = $('#advancedDialog');
    const advancedForm = $('#advancedSettingsForm');

    if (!app || !header || !topGrid || !quickControls || !bottomGrid || !recording || !recordings || !metronome || !advancedForm) return;

    document.body.classList.add('ney-app-shell-active');

    const host = document.createElement('div');
    host.className = 'ney-screen-host';
    app.insertBefore(host, topGrid);

    const tunerScreen = makeScreen('tuner');
    tunerScreen.append(screenHeading('المعيار', 'قياس النغمة والانحراف وجودة الإشارة لحظة بلحظة.', icon('<path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"></path><path d="M19.4 15a8 8 0 1 0-14.8 0"></path><path d="M12 12 16.5 7.5"></path>')));
    tunerScreen.append(topGrid);

    const recordingScreen = makeScreen('recording');
    const recordingHeader = screenHeading('التسجيل', 'Ney Auto-Capture والجلسة مع مترونوم إرشادي مصغر.', icon('<rect x="9" y="3" width="6" height="11" rx="3"></rect><path d="M6 10a6 6 0 0 0 12 0M12 16v5"></path>'));
    const status = document.createElement('div');
    status.className = 'ney-screen-status';
    status.innerHTML = `
      <span class="ney-screen-status__chip">مرجع <strong id="neyScreenA4">A4 = 440 Hz</strong></span>
      <span class="ney-screen-status__chip">التقسيم <strong id="neyScreenDivision">24-TET</strong></span>
      <span class="ney-screen-status__chip">الحفظ <strong>تلقائي</strong></span>
    `;
    recordingHeader.append(status);
    recordingScreen.append(recordingHeader);
    const recordingLayout = document.createElement('div');
    recordingLayout.className = 'ney-recording-layout';
    const recordingMain = document.createElement('div');
    recordingMain.className = 'ney-recording-main';
    const recordingSide = document.createElement('aside');
    recordingSide.className = 'ney-recording-side';
    recordingMain.append(recording);
    recordingLayout.append(recordingMain, recordingSide);
    recordingScreen.append(recordingLayout);

    const recordingsScreen = makeScreen('recordings');
    recordingsScreen.append(screenHeading('التسجيلات', 'مكتبة Performance Pack والتشغيل والتصدير وإدارة التسجيلات.', icon('<path d="M4 6h16M4 12h16M4 18h10"></path>')));
    recordingsScreen.append(recordings);

    const metronomeScreen = makeScreen('metronome');
    metronomeScreen.append(screenHeading('المترونوم', 'تدريب إيقاعي كامل بالصوت والإضاءة والموازين البسيطة والمركبة وغير المنتظمة.', icon('<path d="M8 20h8l2-14H6l2 14Z"></path><path d="m12 7 2 9"></path>')));
    metronomeScreen.append(metronome);

    const settingsScreen = makeScreen('settings');
    const settingsHeading = screenHeading('الإعدادات', 'التحكم السريع والمعايرة وجودة التسجيل والتصدير في شاشة مستقلة.', icon('<circle cx="12" cy="12" r="3"></circle><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.5 1a7 7 0 0 0-1.7-1L14.5 3h-5L9 6a7 7 0 0 0-1.7 1L4.8 6 2.8 9.5 4.9 11a7 7 0 0 0 0 2l-2.1 1.5 2 3.5 2.5-1a7 7 0 0 0 1.7 1l.5 3h5l.5-3a7 7 0 0 0 1.7-1l2.5 1 2-3.5-2.1-1.5c.1-.3.1-.7.1-1Z"></path>'));
    const settingsBack = document.createElement('button');
    settingsBack.type = 'button';
    settingsBack.className = 'ney-settings-back';
    settingsBack.innerHTML = `${icon('<path d="m9 18 6-6-6-6"></path>')}<span>العودة</span>`;
    settingsHeading.append(settingsBack);
    settingsScreen.append(settingsHeading);

    quickControls.classList.add('settings-quick-controls');
    const quickDescription = $('.quick-controls__header p', quickControls);
    if (quickDescription) quickDescription.textContent = 'إعدادات العزف الأساسية التي تضبط قبل بدء التسجيل.';
    if (advancedButton) {
      advancedButton.hidden = true;
      advancedButton.setAttribute('aria-hidden', 'true');
      advancedButton.tabIndex = -1;
    }
    settingsScreen.append(quickControls);

    advancedForm.classList.add('ney-settings-technical');
    advancedForm.removeAttribute('method');
    const oldClose = $('header .icon-button', advancedForm);
    if (oldClose) {
      oldClose.type = 'button';
      oldClose.removeAttribute('value');
      oldClose.hidden = true;
      oldClose.setAttribute('aria-hidden', 'true');
      oldClose.tabIndex = -1;
    }
    const saveAdvancedButton = $('#saveAdvancedButton', advancedForm);
    if (saveAdvancedButton) {
      saveAdvancedButton.type = 'button';
      saveAdvancedButton.removeAttribute('value');
    }
    settingsScreen.append(advancedForm);

    if (advancedDialog) {
      advancedDialog.hidden = true;
      advancedDialog.setAttribute('aria-hidden', 'true');
    }

    const moreScreen = makeScreen('more');
    moreScreen.append(screenHeading('المزيد', 'الإعدادات وطريقة الاستخدام ومعلومات المشروع.', icon('<circle cx="5" cy="12" r="1"></circle><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle>')));
    const moreGrid = document.createElement('div');
    moreGrid.className = 'ney-more-grid';

    let router = null;
    moreGrid.append(
      createMoreCard('الإعدادات', 'التحكم السريع والصوت والمعايرة والجودة والتخزين والتصدير.', icon('<circle cx="12" cy="12" r="3"></circle><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.5 1a7 7 0 0 0-1.7-1L14.5 3h-5L9 6a7 7 0 0 0-1.7 1L4.8 6 2.8 9.5 4.9 11a7 7 0 0 0 0 2l-2.1 1.5 2 3.5 2.5-1a7 7 0 0 0 1.7 1l.5 3h5l.5-3a7 7 0 0 0 1.7-1l2.5 1 2-3.5-2.1-1.5c.1-.3.1-.7.1-1Z"></path>'), () => router?.show('settings')),
      createMoreCard('طريقة الاستخدام', 'شرح سريع للمعيار والتسجيل والحفظ والتدريب.', icon('<circle cx="12" cy="12" r="9"></circle><path d="M9.1 9a3 3 0 1 1 5.4 1.8c-1.3 1-2.5 1.5-2.5 3.2"></path><path d="M12 18h.01"></path>'), () => helpButton?.click()),
      createMoreCard('من نحن', 'تعريف بالمشروع والإصدار والحقوق.', icon('<circle cx="12" cy="12" r="9"></circle><path d="M12 11v6M12 7h.01"></path>'), () => aboutButton?.click())
    );
    moreScreen.append(moreGrid);

    moveNodes(host, [tunerScreen, recordingScreen, recordingsScreen, metronomeScreen, settingsScreen, moreScreen]);
    bottomGrid.hidden = true;

    const screens = { tuner: tunerScreen, recording: recordingScreen, recordings: recordingsScreen, metronome: metronomeScreen, settings: settingsScreen, more: moreScreen };
    const nav = document.createElement('nav');
    nav.className = 'ney-shell-nav';
    nav.setAttribute('aria-label', 'التنقل الرئيسي');

    function navButton(screen, label, iconMarkup, className = '') {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `ney-shell-nav__item ${className}`.trim();
      button.dataset.screenTarget = screen;
      button.innerHTML = `${iconMarkup}<span>${label}</span>`;
      nav.append(button);
      return button;
    }

    navButton('tuner', 'المعيار', icon('<path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"></path><path d="M19.4 15a8 8 0 1 0-14.8 0"></path><path d="M12 12 16.5 7.5"></path>'));
    navButton('recording', 'التسجيل', icon('<rect x="9" y="3" width="6" height="11" rx="3"></rect><path d="M6 10a6 6 0 0 0 12 0M12 16v5"></path>'), 'ney-shell-nav__item--record');
    navButton('recordings', 'التسجيلات', icon('<path d="M4 6h16M4 12h16M4 18h10"></path>'));
    navButton('metronome', 'المترونوم', icon('<path d="M8 20h8l2-14H6l2 14Z"></path><path d="m12 7 2 9"></path>'));
    navButton('more', 'المزيد', icon('<circle cx="5" cy="12" r="1"></circle><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle>'));
    document.body.append(nav);

    router = {
      current: null,
      previous: 'tuner',
      show(name, { updateHash = true } = {}) {
        const resolvedName = screens[name] ? name : 'tuner';
        const next = screens[resolvedName];
        if (this.current && this.current !== resolvedName) this.previous = this.current;
        Object.entries(screens).forEach(([key, screen]) => {
          const active = screen === next;
          screen.hidden = !active;
          screen.setAttribute('aria-hidden', String(!active));
        });
        $$('.ney-shell-nav__item', nav).forEach(button => {
          const directActive = button.dataset.screenTarget === resolvedName;
          const moreOwnsSettings = resolvedName === 'settings' && button.dataset.screenTarget === 'more';
          if (directActive || moreOwnsSettings) button.setAttribute('aria-current', 'page');
          else button.removeAttribute('aria-current');
        });
        this.current = resolvedName;
        if (updateHash && history.replaceState) history.replaceState(null, '', `#${resolvedName}`);
        window.scrollTo({ top: 0, behavior: 'auto' });
        window.dispatchEvent(new CustomEvent('ney:screenchange', { detail: { screen: resolvedName } }));
      }
    };

    $$('.ney-shell-nav__item', nav).forEach(button => button.addEventListener('click', () => router.show(button.dataset.screenTarget)));
    settingsBack.addEventListener('click', () => router.show(router.previous === 'settings' ? 'more' : (router.previous || 'more')));

    const mini = createMiniMetronome(router);
    recordingSide.append(mini);

    const brandReference = $('#brandReferenceValue');
    const divisionControl = $('#divisionControl');
    const screenA4 = $('#neyScreenA4');
    const screenDivision = $('#neyScreenDivision');
    function syncRecordingHeader() {
      if (screenA4 && brandReference) screenA4.textContent = brandReference.textContent.trim() || 'A4 = 440 Hz';
      const activeDivision = $('.segment.is-active[data-division]', divisionControl || document);
      if (screenDivision && activeDivision) screenDivision.textContent = activeDivision.querySelector('strong')?.textContent?.trim() || `${activeDivision.dataset.division}-TET`;
    }
    syncRecordingHeader();
    if (brandReference) new MutationObserver(syncRecordingHeader).observe(brandReference, { childList: true, subtree: true, characterData: true });
    divisionControl?.addEventListener('click', () => queueMicrotask(syncRecordingHeader));

    $('.header-tabs')?.classList.add('ney-shell-legacy-hidden');
    [helpDialog, aboutDialog].filter(Boolean).forEach(dialog => dialog.dataset.shellManaged = 'true');

    const requested = location.hash.replace('#', '');
    router.show(screens[requested] ? requested : 'tuner', { updateHash: false });
    window.addEventListener('hashchange', () => {
      const next = location.hash.replace('#', '');
      if (screens[next] && next !== router.current) router.show(next, { updateHash: false });
    });

    window.NeyAppShell = router;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeAppShell, { once: true });
  else initializeAppShell();
})();
