(() => {
  'use strict';

  const THEME_VERSION = '2026-08-05-r4';

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function icon(name, className = '') {
    const span = el('span', `material-symbols-rounded ${className}`.trim());
    span.setAttribute('aria-hidden', 'true');
    span.textContent = name;
    return span;
  }

  function emblem(name, tone = 'teal', size = 'md') {
    const wrap = el('span', `icon-emblem tone-${tone} emblem-${size}`);
    wrap.append(icon(name));
    return wrap;
  }

  function loadTheme() {
    document.querySelectorAll('link[data-oriental-theme]').forEach(node => node.remove());

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `./theme-oriental-r4.css?v=${THEME_VERSION}`;
    link.dataset.orientalTheme = 'true';
    document.head.appendChild(link);

    if (!document.querySelector('link[data-material-symbols]')) {
      const icons = document.createElement('link');
      icons.rel = 'stylesheet';
      icons.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,300,0,0';
      icons.dataset.materialSymbols = 'true';
      document.head.appendChild(icons);
    }
  }

  function panelHeading(title, caption, iconName, tone = 'teal') {
    const heading = el('header', 'panel-heading');
    const copy = el('div', 'panel-heading-copy');
    copy.append(el('h2', '', title), el('p', '', caption));
    heading.append(copy, emblem(iconName, tone, 'sm'));
    return heading;
  }

  function collectRefs(panel, recorderCard) {
    return {
      mic: panel.querySelector('#micButton'),
      calibrate: panel.querySelector('#calibrateButton'),
      fields: panel.querySelector('.fields'),
      processing: panel.querySelector('.processing-status'),
      helper: panel.querySelector('.helper'),
      division: panel.querySelector('#divisionSelect'),
      a4: panel.querySelector('#a4Input'),
      bpm: panel.querySelector('#bpmInput'),
      tolerance: panel.querySelector('#toleranceSelect'),
      noteValue: recorderCard.querySelector('#noteValueSelect'),
      recorderCopy: recorderCard.querySelector('.recorder-copy'),
      metronome: recorderCard.querySelector('.metronome'),
      noteValueBox: recorderCard.querySelector('.note-value-box'),
      recordingStatus: recorderCard.querySelector('#recordingStatus'),
      arm: recorderCard.querySelector('#armButton'),
      cancel: recorderCard.querySelector('#cancelButton')
    };
  }

  function buildUtilityButton(label, iconName, onClick) {
    const button = el('button', 'utility-button');
    button.type = 'button';
    button.append(emblem(iconName, 'gold', 'xs'), el('span', '', label));
    button.addEventListener('click', onClick || (() => {}));
    return button;
  }

  function buildHeader(app, topbar, openAdvanced) {
    const brand = topbar.querySelector('.brand');
    const version = topbar.querySelector('.version-stack');

    const utilities = el('nav', 'header-utilities');
    utilities.setAttribute('aria-label', 'أدوات التطبيق');
    utilities.append(
      buildUtilityButton('الإعدادات', 'tune', openAdvanced),
      buildUtilityButton('مساعدة', 'help', () => {
        const message = document.getElementById('message');
        if (!message) return;
        message.textContent = 'شغّل الميكروفون، انتظر انتهاء معايرة ضوضاء المكان، ثم اعزف نغمة ثابتة واضغط تجهيز التسجيل.';
        message.className = 'message show';
      })
    );

    const micStatus = el('button', 'header-mic-status');
    micStatus.type = 'button';
    micStatus.id = 'headerMicStatus';
    micStatus.append(
      el('span', 'header-mic-dot'),
      el('span', 'header-mic-copy', 'الميكروفون غير نشط'),
      emblem('mic', 'teal', 'xs')
    );
    micStatus.addEventListener('click', () => document.getElementById('micButton')?.click());

    topbar.innerHTML = '';
    topbar.append(utilities, brand, micStatus);
    if (version) topbar.append(version);

    const micButton = document.getElementById('micButton');
    if (micButton) {
      const sync = () => {
        const active = micButton.textContent.includes('إيقاف');
        micStatus.classList.toggle('is-active', active);
        micStatus.querySelector('.header-mic-copy').textContent =
          active ? 'الميكروفون نشط' : 'الميكروفون غير نشط';
      };
      new MutationObserver(sync).observe(micButton, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true
      });
      sync();
    }

    const rail = el('aside', 'ney-rail');
    rail.setAttribute('aria-label', 'هوية الناي');
    const image = document.createElement('img');
    image.src = './assets/ney-dokah-reference.webp';
    image.alt = 'ناي دوكاه عربي';
    image.loading = 'eager';
    rail.append(image, el('p', 'ney-quote', 'الناي روحٌ\nوالنغمةُ سِرّ'));
    app.prepend(rail);
  }

  function splitAnalysis(detector) {
    const status = detector.querySelector('.detector-status');
    const noteStage = detector.querySelector('.note-stage');
    const metrics = detector.querySelector('.metrics');
    const tuner = detector.querySelector('.tuner');
    const quality = detector.querySelector('.quality-line');
    const validation = detector.querySelector('.validation-grid');

    const grid = el('div', 'analysis-grid');

    const notePanel = el('article', 'premium-panel note-panel');
    const waveform = el('div', 'waveform-viz');
    for (let i = 0; i < 46; i += 1) {
      const bar = el('i');
      bar.style.setProperty('--h', `${16 + ((i * 17) % 58)}%`);
      bar.style.setProperty('--d', `${(i % 12) * -0.08}s`);
      waveform.appendChild(bar);
    }
    notePanel.append(
      panelHeading('النغمة المكتشفة', 'الاسم والطبقة والتردد الأساسي', 'music_note', 'gold'),
      noteStage,
      waveform,
      status
    );

    const tunerPanel = el('article', 'premium-panel tuner-panel');
    const qualityToggle = el('button', 'quality-toggle');
    qualityToggle.type = 'button';
    qualityToggle.setAttribute('aria-expanded', 'false');
    qualityToggle.append(icon('fact_check'), el('span', '', 'تفاصيل الجودة'), icon('expand_more'));

    const qualityDetails = el('div', 'quality-details');
    qualityDetails.append(validation);
    qualityToggle.addEventListener('click', () => {
      const open = qualityDetails.classList.toggle('is-open');
      qualityToggle.setAttribute('aria-expanded', String(open));
      qualityToggle.lastElementChild.textContent = open ? 'expand_less' : 'expand_more';
    });

    tunerPanel.append(
      panelHeading('المعيار اللحظي', 'الانحراف وجودة الإشارة لحظة بلحظة', 'speed', 'teal'),
      tuner,
      metrics,
      quality,
      qualityToggle,
      qualityDetails
    );

    grid.append(notePanel, tunerPanel);
    detector.innerHTML = '';
    detector.className = 'analysis-shell';
    detector.appendChild(grid);
  }

  function bindSegmentedControl(select, container, options) {
    if (!select) return;

    options.forEach(option => {
      const button = el('button', 'segment-button');
      button.type = 'button';
      button.dataset.value = option.value;
      if (option.icon) button.append(icon(option.icon));
      const copy = el('span', 'segment-copy');
      copy.append(el('strong', '', option.label));
      if (option.note) copy.append(el('small', '', option.note));
      button.append(copy);
      button.addEventListener('click', () => {
        select.value = option.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      });
      container.appendChild(button);
    });

    const sync = () => {
      container.querySelectorAll('.segment-button').forEach(button => {
        const active = button.dataset.value === select.value;
        button.classList.toggle('is-selected', active);
        button.setAttribute('aria-pressed', String(active));
      });
    };
    select.addEventListener('change', sync);
    sync();
  }

  function makeStepper(input) {
    const row = el('div', 'stepper-row');
    const minus = el('button', 'stepper-button');
    minus.type = 'button';
    minus.setAttribute('aria-label', 'خفض السرعة');
    minus.append(icon('remove'));
    const plus = el('button', 'stepper-button');
    plus.type = 'button';
    plus.setAttribute('aria-label', 'رفع السرعة');
    plus.append(icon('add'));
    row.append(minus, input, plus);

    const apply = delta => {
      const min = Number(input.min || -Infinity);
      const max = Number(input.max || Infinity);
      const step = Number(input.step || 1);
      const next = Math.min(max, Math.max(min, Number(input.value || 0) + delta * step));
      input.value = String(next);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    };
    minus.addEventListener('click', () => apply(-1));
    plus.addEventListener('click', () => apply(1));
    return row;
  }

  function makeControlCell(title, iconName, tone = 'teal') {
    const cell = el('section', 'control-cell');
    const label = el('div', 'control-cell-label');
    label.append(emblem(iconName, tone, 'xs'), el('span', '', title));
    cell.appendChild(label);
    return cell;
  }

  function rebuildControls(panel, refs, openAdvanced) {
    panel.innerHTML = '';
    panel.className = 'premium-panel controls-panel';

    const heading = el('header', 'controls-heading');
    const copy = el('div');
    copy.append(el('h2', '', 'التحكم السريع'), el('p', '', 'الإعدادات المستخدمة أثناء العزف فقط'));
    const advancedButton = el('button', 'advanced-button');
    advancedButton.type = 'button';
    advancedButton.append(icon('tune'), el('span', '', 'إعدادات متقدمة'));
    advancedButton.addEventListener('click', openAdvanced);
    heading.append(copy, advancedButton);

    const toolbar = el('div', 'controls-toolbar');

    const divisionCell = makeControlCell('التقسيم', 'piano', 'teal');
    const divisionSegments = el('div', 'division-segments');
    bindSegmentedControl(refs.division, divisionSegments, [
      { value: '12', label: '12‑TET', note: 'غربي' },
      { value: '24', label: '24‑TET', note: 'شرقي' }
    ]);
    divisionCell.appendChild(divisionSegments);

    const valueCell = makeControlCell('القيمة الموسيقية', 'music_note', 'gold');
    const noteSegments = el('div', 'note-segments');
    bindSegmentedControl(refs.noteValue, noteSegments, [
      { value: 'whole', label: 'روند', note: '4', icon: 'circle' },
      { value: 'half', label: 'بلانش', note: '2', icon: 'music_note' },
      { value: 'quarter', label: 'نوار', note: '1', icon: 'music_note' },
      { value: 'eighth', label: 'كروش', note: '½', icon: 'music_note' }
    ]);
    valueCell.appendChild(noteSegments);

    const bpmCell = makeControlCell('النبض BPM', 'tempo', 'coral');
    bpmCell.appendChild(makeStepper(refs.bpm));

    const referenceCell = makeControlCell('مرجع A4', 'fork_right', 'gold');
    const referenceBox = el('div', 'reference-box');
    referenceBox.append(el('span', '', 'A'), refs.a4, el('small', '', 'Hz'));
    referenceCell.appendChild(referenceBox);

    toolbar.append(divisionCell, valueCell, bpmCell, referenceCell);
    panel.append(heading, toolbar);

    refs.fields?.remove();
  }

  function buildAdvancedDrawer(refs) {
    const overlay = el('div', 'advanced-overlay');
    overlay.setAttribute('aria-hidden', 'true');

    const drawer = el('aside', 'advanced-drawer');
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-modal', 'true');
    drawer.setAttribute('aria-labelledby', 'advancedTitle');

    const header = el('header', 'advanced-header');
    const titleBox = el('div');
    titleBox.append(el('h2', '', 'الإعدادات المتقدمة'), el('p', '', 'تفاصيل القياس ومسار الميكروفون'));
    titleBox.querySelector('h2').id = 'advancedTitle';
    const close = el('button', 'drawer-close');
    close.type = 'button';
    close.setAttribute('aria-label', 'إغلاق الإعدادات');
    close.append(icon('close'));
    header.append(titleBox, close);

    const toleranceSection = el('section', 'advanced-section');
    toleranceSection.append(
      panelHeading('حساسية الضبط', 'هامش قبول الانحراف بالسنت', 'target', 'violet'),
      refs.tolerance
    );

    const calibrationSection = el('section', 'advanced-section');
    calibrationSection.append(
      panelHeading('معايرة المكان', 'أعد قياس ضوضاء الغرفة عند تغير الموقع', 'noise_control_off', 'gold'),
      refs.calibrate
    );

    const processingSection = el('section', 'advanced-section processing-advanced');
    processingSection.append(
      panelHeading('مسار الصوت', 'حالة الميكروفون والمعالجة الداخلية', 'settings_input_component', 'teal'),
      refs.processing,
      refs.helper
    );

    drawer.append(header, toleranceSection, calibrationSection, processingSection);
    overlay.appendChild(drawer);
    document.body.appendChild(overlay);

    let lastFocused = null;
    const open = () => {
      lastFocused = document.activeElement;
      overlay.classList.add('is-open');
      overlay.setAttribute('aria-hidden', 'false');
      document.body.classList.add('drawer-open');
      close.focus();
    };
    const dismiss = () => {
      overlay.classList.remove('is-open');
      overlay.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('drawer-open');
      lastFocused?.focus?.();
    };

    close.addEventListener('click', dismiss);
    overlay.addEventListener('click', event => {
      if (event.target === overlay) dismiss();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && overlay.classList.contains('is-open')) dismiss();
    });

    return { open, close: dismiss };
  }

  function buildLowerArea(recorderCard, library, refs) {
    if (refs.noteValueBox) refs.noteValueBox.remove();

    recorderCard.innerHTML = '';
    recorderCard.className = 'lower-grid';

    const metronomePanel = el('section', 'premium-panel metronome-panel');
    metronomePanel.append(
      panelHeading('الميزان الصامت', 'العدّ المرئي', 'graphic_eq', 'teal'),
      refs.metronome
    );

    const recordingPanel = el('section', 'premium-panel recording-panel');
    const micRow = el('div', 'recording-mic-row');
    micRow.append(refs.mic);
    refs.recorderCopy.classList.add('recorder-copy-compact');
    recordingPanel.append(
      panelHeading('التسجيل', 'ابدأ بعد استقرار النغمة', 'mic_external_on', 'coral'),
      micRow,
      refs.recorderCopy
    );

    enhanceLibrary(library);

    recorderCard.append(metronomePanel, recordingPanel, library);
  }

  function compactRecordItem(item) {
    if (item.dataset.compact === 'true') return;
    item.dataset.compact = 'true';

    const actions = item.querySelector('.record-actions');
    if (!actions) return;
    const buttons = [...actions.querySelectorAll('button')];
    const play = buttons.shift();
    if (play) play.classList.add('play-action');

    if (buttons.length) {
      const menu = el('details', 'record-more');
      const summary = el('summary', 'record-more-trigger');
      summary.setAttribute('aria-label', 'المزيد من الإجراءات');
      summary.append(icon('more_horiz'));
      const popover = el('div', 'record-more-menu');
      buttons.forEach(button => popover.appendChild(button));
      menu.append(summary, popover);
      actions.appendChild(menu);
    }
  }

  function enhanceLibrary(library) {
    library.classList.remove('card');
    library.classList.add('premium-panel', 'library-panel');

    const title = library.querySelector('.library-head h2');
    if (title) title.textContent = 'التسجيلات المحفوظة';
    const description = library.querySelector('.library-head p');
    if (description) description.textContent = 'آخر التسجيلات مع التمرير الداخلي.';

    const list = library.querySelector('#recordingsList');
    if (!list) return;

    const compactAll = () => list.querySelectorAll('.record-item').forEach(compactRecordItem);
    compactAll();
    new MutationObserver(compactAll).observe(list, { childList: true, subtree: false });
  }

  function addStatusFooter(footer) {
    footer.classList.add('status-footer');
    if (!footer.querySelector('.footer-center')) {
      const center = el('span', 'footer-center', 'مِعيار الناي — مسجل ومعيار النغم الشرقي');
      footer.insertBefore(center, footer.children[1] || null);
    }
  }

  function apply() {
    loadTheme();

    const app = document.querySelector('.app');
    const topbar = document.querySelector('.topbar');
    const detector = document.querySelector('.detector');
    const controls = document.querySelector('.control-panel');
    const recorder = document.querySelector('.recorder-card');
    const library = document.querySelector('.library');
    const footer = document.querySelector('.footer');

    if (!app || !topbar || !detector || !controls || !recorder || !library || !footer) return;
    if (app.dataset.redesigned === 'r4') return;

    const refs = collectRefs(controls, recorder);
    if (Object.values(refs).some(value => value === null)) {
      console.warn('Ney Meyar UI rebuild skipped: required UI reference missing.');
      return;
    }

    app.dataset.redesigned = 'r4';
    document.body.classList.add('oriental-interface', 'oriental-interface-r4');

    const drawer = buildAdvancedDrawer(refs);
    buildHeader(app, topbar, drawer.open);
    splitAnalysis(detector);
    rebuildControls(controls, refs, drawer.open);
    buildLowerArea(recorder, library, refs);
    addStatusFooter(footer);

    const mainContent = el('div', 'app-content');
    [
      topbar,
      document.getElementById('message'),
      detector,
      controls,
      recorder,
      footer
    ].filter(Boolean).forEach(node => mainContent.appendChild(node));

    app.appendChild(mainContent);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply, { once: true });
  } else {
    apply();
  }
})();
