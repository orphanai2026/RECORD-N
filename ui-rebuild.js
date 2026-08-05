(() => {
  'use strict';

  const THEME_VERSION = '2026-08-05-r2';

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function icon(name) {
    const span = el('span', 'material-symbols-rounded');
    span.setAttribute('aria-hidden', 'true');
    span.textContent = name;
    return span;
  }

  function loadTheme() {
    if (document.querySelector('link[data-oriental-theme]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `./theme-oriental-r2.css?v=${THEME_VERSION}`;
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

  function buildUtilityButton(label, iconName, onClick) {
    const button = el('button', 'utility-button');
    button.type = 'button';
    button.append(icon(iconName), el('span', '', label));
    button.addEventListener('click', onClick || (() => {}));
    return button;
  }

  function buildHeader(app, topbar) {
    const brand = topbar.querySelector('.brand');
    const version = topbar.querySelector('.version-stack');

    const utilities = el('nav', 'header-utilities');
    utilities.setAttribute('aria-label', 'أدوات التطبيق');
    utilities.append(
      buildUtilityButton('الإعدادات', 'tune', () => document.querySelector('.controls-panel')?.scrollIntoView({ behavior: 'smooth' })),
      buildUtilityButton('مساعدة', 'help', () => {
        const message = document.getElementById('message');
        if (!message) return;
        message.textContent = 'شغّل الميكروفون، انتظر انتهاء معايرة الضوضاء، ثم اعزف نغمة ثابتة وجهّز التسجيل.';
        message.className = 'message show';
      }),
      buildUtilityButton('المعايرة', 'graphic_eq', () => document.getElementById('calibrateButton')?.click())
    );

    const micStatus = el('button', 'header-mic-status');
    micStatus.type = 'button';
    micStatus.id = 'headerMicStatus';
    micStatus.append(el('span', 'header-mic-dot'), el('span', 'header-mic-label', 'الميكروفون غير نشط'), icon('mic'));
    micStatus.addEventListener('click', () => document.getElementById('micButton')?.click());

    topbar.innerHTML = '';
    topbar.append(utilities, brand, micStatus);
    if (version) topbar.append(version);

    const micButton = document.getElementById('micButton');
    if (micButton) {
      const sync = () => {
        const active = micButton.textContent.includes('إيقاف');
        micStatus.classList.toggle('is-active', active);
        micStatus.querySelector('.header-mic-label').textContent = active ? 'الميكروفون نشط' : 'الميكروفون غير نشط';
      };
      new MutationObserver(sync).observe(micButton, { childList: true, subtree: true, characterData: true, attributes: true });
      sync();
    }

    const rail = el('aside', 'ney-rail');
    rail.setAttribute('aria-label', 'هوية الناي');
    const neyImage = document.createElement('img');
    neyImage.src = './assets/ney-dokah-reference.webp';
    neyImage.alt = 'ناي دوكاه عربي';
    neyImage.loading = 'eager';
    rail.append(neyImage, el('p', 'ney-quote', 'الناي روحٌ\nوالنغمةُ سِرّ'));
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
    const noteHeader = el('header', 'panel-heading');
    noteHeader.append(el('h2', '', 'النغمة المكتشفة'), el('span', 'panel-kicker', 'تحليل مباشر'));
    const waveform = el('div', 'waveform-viz');
    for (let i = 0; i < 44; i += 1) {
      const bar = el('i');
      bar.style.setProperty('--h', `${16 + ((i * 19) % 52)}%`);
      bar.style.setProperty('--d', `${(i % 11) * -0.08}s`);
      waveform.appendChild(bar);
    }
    notePanel.append(noteHeader, noteStage, waveform, status);

    const tunerPanel = el('article', 'premium-panel tuner-panel');
    const tunerHeader = el('header', 'panel-heading');
    tunerHeader.append(el('h2', '', 'المعيار اللحظي'), el('span', 'panel-kicker', 'Cent'));
    tunerPanel.append(tunerHeader, tuner, metrics, quality, validation);

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
      button.append(el('span', '', option.label));
      if (option.note) button.append(el('small', '', option.note));
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

  function makeStepper(input, labelText) {
    const wrap = el('div', 'stepper-control');
    const label = el('span', 'control-label', labelText);
    const row = el('div', 'stepper-row');
    const minus = el('button', 'stepper-button');
    minus.type = 'button';
    minus.append(icon('remove'));
    const plus = el('button', 'stepper-button');
    plus.type = 'button';
    plus.append(icon('add'));
    input.parentElement?.classList.add('source-field-hidden');
    row.append(minus, input, plus);
    wrap.append(label, row);

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
    return wrap;
  }

  function rebuildControls(panel, recorderCard) {
    const mic = panel.querySelector('#micButton');
    const calibrate = panel.querySelector('#calibrateButton');
    const fields = panel.querySelector('.fields');
    const processing = panel.querySelector('.processing-status');
    const helper = panel.querySelector('.helper');
    const divisionSelect = panel.querySelector('#divisionSelect');
    const a4Input = panel.querySelector('#a4Input');
    const bpmInput = panel.querySelector('#bpmInput');
    const toleranceSelect = panel.querySelector('#toleranceSelect');
    const noteValueSelect = recorderCard.querySelector('#noteValueSelect');

    panel.innerHTML = '';
    panel.className = 'premium-panel controls-panel';

    const heading = el('header', 'controls-heading');
    const headingText = el('div');
    headingText.append(el('h2', '', 'عناصر التحكم'), el('p', '', 'إعدادات القياس والقيمة الموسيقية والتسجيل'));
    heading.append(headingText, icon('tune'));

    const controls = el('div', 'controls-grid');

    const referenceGroup = el('section', 'control-group reference-control');
    referenceGroup.append(el('span', 'control-label', 'مرجع A4'));
    if (a4Input?.parentElement) a4Input.parentElement.classList.add('source-field-hidden');
    const referenceBox = el('div', 'reference-box');
    referenceBox.append(el('strong', '', 'A440'), a4Input, el('small', '', 'Hz'));
    referenceGroup.appendChild(referenceBox);

    const bpmGroup = makeStepper(bpmInput, 'النبض (BPM)');

    const valuesGroup = el('section', 'control-group note-values-control');
    valuesGroup.append(el('span', 'control-label', 'القيمة الموسيقية'));
    const noteSegments = el('div', 'note-segments');
    bindSegmentedControl(noteValueSelect, noteSegments, [
      { value: 'whole', label: 'روند', note: '4', icon: 'circle' },
      { value: 'half', label: 'بلانش', note: '2', icon: 'music_note' },
      { value: 'quarter', label: 'نوار', note: '1', icon: 'music_note' },
      { value: 'eighth', label: 'كروش', note: '½', icon: 'music_note' }
    ]);
    valuesGroup.appendChild(noteSegments);

    const divisionGroup = el('section', 'control-group division-control');
    divisionGroup.append(el('span', 'control-label', 'نمط المقام / التقسيم'));
    const divisionSegments = el('div', 'division-segments');
    bindSegmentedControl(divisionSelect, divisionSegments, [
      { value: '12', label: '12‑TET' },
      { value: '24', label: '24‑TET' }
    ]);
    divisionGroup.appendChild(divisionSegments);

    const toleranceGroup = el('section', 'control-group tolerance-control');
    toleranceGroup.append(el('span', 'control-label', 'هامش الضبط'));
    if (toleranceSelect?.parentElement) toleranceSelect.parentElement.classList.add('source-field-hidden');
    toleranceGroup.appendChild(toleranceSelect);

    const actions = el('section', 'control-actions');
    actions.append(mic, calibrate);

    controls.append(referenceGroup, bpmGroup, valuesGroup, divisionGroup, toleranceGroup, actions);
    panel.append(heading, controls, fields, processing, helper);
    fields.classList.add('source-fields-container');
  }

  function rebuildRecorder(recorderCard) {
    const recorderCopy = recorderCard.querySelector('.recorder-copy');
    const metronome = recorderCard.querySelector('.metronome');
    if (!recorderCopy || !metronome) return;

    const noteValueBox = recorderCopy.querySelector('.note-value-box');
    if (noteValueBox) noteValueBox.classList.add('source-field-hidden');

    recorderCard.innerHTML = '';
    recorderCard.className = 'recording-layout';

    const metronomePanel = el('section', 'premium-panel metronome-panel');
    const metroHeading = el('header', 'compact-heading');
    metroHeading.append(el('h2', '', 'الميزان الصامت'), icon('graphic_eq'));
    metronomePanel.append(metroHeading, metronome);

    const recordingPanel = el('section', 'premium-panel recording-panel');
    const recordingHeading = el('header', 'compact-heading');
    recordingHeading.append(el('h2', '', 'التسجيل'), icon('mic_external_on'));
    recordingPanel.append(recordingHeading, recorderCopy);

    recorderCard.append(metronomePanel, recordingPanel);
  }

  function enhanceLibrary(library) {
    library.classList.remove('card');
    library.classList.add('premium-panel', 'library-panel');
    const title = library.querySelector('.library-head h2');
    if (title) title.textContent = 'التسجيلات المحفوظة';

    const list = library.querySelector('#recordingsList');
    if (list) {
      const header = el('div', 'recordings-table-head');
      ['تحديد', 'اسم النغمة', 'بيانات التسجيل', 'الإجراءات'].forEach(text => header.append(el('span', '', text)));
      library.insertBefore(header, list);
    }
  }

  function addStatusFooter(footer) {
    footer.classList.add('status-footer');
    const center = el('span', 'footer-center', 'مِعيار الناي — مسجل ومعيار النغم الشرقي');
    footer.insertBefore(center, footer.children[1] || null);
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
    if (app.dataset.redesigned === 'true') return;
    app.dataset.redesigned = 'true';
    document.body.classList.add('oriental-interface');

    buildHeader(app, topbar);
    splitAnalysis(detector);
    rebuildControls(controls, recorder);
    rebuildRecorder(recorder);
    enhanceLibrary(library);
    addStatusFooter(footer);

    const mainContent = el('div', 'app-content');
    [topbar, document.getElementById('message'), detector, controls, recorder, library, footer]
      .filter(Boolean)
      .forEach(node => mainContent.appendChild(node));
    app.appendChild(mainContent);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply, { once: true });
  } else {
    apply();
  }
})();
