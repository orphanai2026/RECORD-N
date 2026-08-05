(() => {
  'use strict';

  const THEME_VERSION = '2026-08-05-r3';

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
    const oldTheme = document.querySelector('link[data-oriental-theme]');
    if (oldTheme) oldTheme.remove();

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `./theme-oriental-r3.css?v=${THEME_VERSION}`;
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

  function buildUtilityButton(label, iconName, tone, onClick) {
    const button = el('button', `utility-button tone-${tone}`);
    button.type = 'button';
    button.append(emblem(iconName, tone, 'sm'), el('span', '', label));
    button.addEventListener('click', onClick || (() => {}));
    return button;
  }

  function buildHeader(app, topbar) {
    const brand = topbar.querySelector('.brand');
    const version = topbar.querySelector('.version-stack');

    const utilities = el('nav', 'header-utilities');
    utilities.setAttribute('aria-label', 'أدوات التطبيق');
    utilities.append(
      buildUtilityButton('الإعدادات', 'tune', 'teal', () => document.querySelector('.controls-panel')?.scrollIntoView({ behavior: 'smooth' })),
      buildUtilityButton('مساعدة', 'question_mark', 'gold', () => {
        const message = document.getElementById('message');
        if (!message) return;
        message.textContent = 'شغّل الميكروفون، انتظر انتهاء معايرة ضوضاء المكان، ثم اعزف نغمة ثابتة وجهّز التسجيل.';
        message.className = 'message show';
      }),
      buildUtilityButton('المعايرة', 'graphic_eq', 'coral', () => document.getElementById('calibrateButton')?.click())
    );

    const micStatus = el('button', 'header-mic-status');
    micStatus.type = 'button';
    micStatus.id = 'headerMicStatus';
    micStatus.append(
      el('span', 'header-mic-dot'),
      el('span', 'header-mic-copy', 'الميكروفون غير نشط'),
      emblem('mic', 'teal', 'sm')
    );
    micStatus.addEventListener('click', () => document.getElementById('micButton')?.click());

    const ornament = el('span', 'header-ornament');
    ornament.setAttribute('aria-hidden', 'true');

    topbar.innerHTML = '';
    topbar.append(utilities, brand, micStatus, ornament);
    if (version) topbar.append(version);

    const micButton = document.getElementById('micButton');
    if (micButton) {
      const sync = () => {
        const active = micButton.textContent.includes('إيقاف');
        micStatus.classList.toggle('is-active', active);
        micStatus.querySelector('.header-mic-copy').textContent = active ? 'الميكروفون نشط' : 'الميكروفون غير نشط';
      };
      new MutationObserver(sync).observe(micButton, { childList: true, subtree: true, characterData: true, attributes: true });
      sync();
    }

    const rail = el('aside', 'ney-rail');
    rail.setAttribute('aria-label', 'هوية الناي');
    const neyHalo = el('div', 'ney-halo');
    const neyImage = document.createElement('img');
    neyImage.src = './assets/ney-dokah-reference.webp';
    neyImage.alt = 'ناي دوكاه عربي';
    neyImage.loading = 'eager';
    neyHalo.appendChild(neyImage);
    rail.append(neyHalo, el('p', 'ney-quote', 'الناي روحٌ\nوالنغمةُ سِرّ'));
    app.prepend(rail);
  }

  function panelHeading(title, caption, iconName, tone) {
    const heading = el('header', 'panel-heading');
    const copy = el('div', 'panel-heading-copy');
    copy.append(el('h2', '', title), el('p', '', caption));
    heading.append(copy, emblem(iconName, tone, 'md'));
    return heading;
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
    const noteHalo = el('div', 'note-halo');
    noteHalo.setAttribute('aria-hidden', 'true');
    const waveform = el('div', 'waveform-viz');
    for (let i = 0; i < 56; i += 1) {
      const bar = el('i');
      bar.style.setProperty('--h', `${14 + ((i * 23) % 68)}%`);
      bar.style.setProperty('--d', `${(i % 14) * -0.075}s`);
      waveform.appendChild(bar);
    }
    notePanel.append(
      panelHeading('النغمة المكتشفة', 'قراءة مباشرة للصوت العربي الشرقي', 'music_note', 'gold'),
      noteHalo,
      noteStage,
      waveform,
      status
    );

    const tunerPanel = el('article', 'premium-panel tuner-panel');
    const spectrum = el('div', 'spectrum-ribbon');
    ['♭', '−25', '0', '+25', '♯'].forEach((label, index) => {
      const mark = el('span', index === 2 ? 'spectrum-center' : '', label);
      spectrum.appendChild(mark);
    });
    tunerPanel.append(
      panelHeading('المعيار اللحظي', 'توازن النغمة ودرجة الانحراف بالسنت', 'speed', 'teal'),
      spectrum,
      tuner,
      metrics,
      quality,
      validation
    );

    const bridge = el('div', 'analysis-bridge');
    bridge.setAttribute('aria-hidden', 'true');
    bridge.append(emblem('airwave', 'gold', 'sm'));

    grid.append(notePanel, bridge, tunerPanel);
    detector.innerHTML = '';
    detector.className = 'analysis-shell';
    detector.appendChild(grid);
  }

  function bindSegmentedControl(select, container, options) {
    if (!select) return;
    options.forEach(option => {
      const button = el('button', `segment-button ${option.className || ''}`.trim());
      button.type = 'button';
      button.dataset.value = option.value;
      if (option.icon) button.append(emblem(option.icon, option.tone || 'teal', 'xs'));
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

  function makeStepper(input, labelText) {
    const wrap = el('section', 'control-tile stepper-control tile-bpm');
    const top = el('div', 'control-tile-head');
    top.append(emblem('tempo', 'coral', 'xs'), el('span', 'control-label', labelText));
    const row = el('div', 'stepper-row');
    const minus = el('button', 'stepper-button');
    minus.type = 'button';
    minus.append(icon('remove'));
    const plus = el('button', 'stepper-button');
    plus.type = 'button';
    plus.append(icon('add'));
    input.parentElement?.classList.add('source-field-hidden');
    row.append(minus, input, plus);
    wrap.append(top, row, el('small', 'control-hint', 'سرعة العدّ المرئي والتسجيل'));

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
    headingText.append(el('h2', '', 'لوحة العازف'), el('p', '', 'اضبط الأداة كما تضبط الناي قبل بدء الجملة الموسيقية'));
    heading.append(headingText, emblem('tune', 'gold', 'md'));

    const controls = el('div', 'controls-grid');

    const referenceGroup = el('section', 'control-tile reference-control tile-reference');
    const referenceTop = el('div', 'control-tile-head');
    referenceTop.append(emblem('fork_right', 'gold', 'xs'), el('span', 'control-label', 'مرجع A4'));
    if (a4Input?.parentElement) a4Input.parentElement.classList.add('source-field-hidden');
    const referenceBox = el('div', 'reference-box');
    referenceBox.append(el('strong', '', 'A'), a4Input, el('small', '', 'Hz'));
    referenceGroup.append(referenceTop, referenceBox, el('small', 'control-hint', 'المرجع القياسي للدوزان'));

    const bpmGroup = makeStepper(bpmInput, 'النبض BPM');

    const valuesGroup = el('section', 'control-tile note-values-control tile-values');
    const valuesTop = el('div', 'control-tile-head');
    valuesTop.append(emblem('music_note', 'teal', 'xs'), el('span', 'control-label', 'القيمة الموسيقية'));
    const noteSegments = el('div', 'note-segments');
    bindSegmentedControl(noteValueSelect, noteSegments, [
      { value: 'whole', label: 'روند', note: '4 عدّات', icon: 'circle', tone: 'gold' },
      { value: 'half', label: 'بلانش', note: 'عدّتان', icon: 'music_note', tone: 'teal' },
      { value: 'quarter', label: 'نوار', note: 'عدّة', icon: 'music_note', tone: 'coral' },
      { value: 'eighth', label: 'كروش', note: '½ عدّة', icon: 'music_note', tone: 'violet' }
    ]);
    valuesGroup.append(valuesTop, noteSegments);

    const divisionGroup = el('section', 'control-tile division-control tile-division');
    const divisionTop = el('div', 'control-tile-head');
    divisionTop.append(emblem('piano', 'teal', 'xs'), el('span', 'control-label', 'نظام التقسيم'));
    const divisionSegments = el('div', 'division-segments');
    bindSegmentedControl(divisionSelect, divisionSegments, [
      { value: '12', label: '12‑TET', note: 'غربي' },
      { value: '24', label: '24‑TET', note: 'شرقي ربع تون' }
    ]);
    divisionGroup.append(divisionTop, divisionSegments);

    const toleranceGroup = el('section', 'control-tile tolerance-control tile-tolerance');
    const toleranceTop = el('div', 'control-tile-head');
    toleranceTop.append(emblem('target', 'violet', 'xs'), el('span', 'control-label', 'حساسية الضبط'));
    if (toleranceSelect?.parentElement) toleranceSelect.parentElement.classList.add('source-field-hidden');
    toleranceGroup.append(toleranceTop, toleranceSelect, el('small', 'control-hint', 'مساحة قبول الانحراف بالسنت'));

    const actions = el('section', 'control-actions tile-actions');
    const actionHeading = el('div', 'control-tile-head');
    actionHeading.append(emblem('mic', 'coral', 'xs'), el('span', 'control-label', 'المصدر الصوتي'));
    actions.append(actionHeading, mic, calibrate);

    controls.append(valuesGroup, divisionGroup, referenceGroup, bpmGroup, toleranceGroup, actions);

    const statusStrip = el('section', 'processing-strip');
    const stripHeading = el('div', 'processing-strip-heading');
    stripHeading.append(emblem('settings_input_component', 'teal', 'xs'), el('strong', '', 'سلامة مسار الصوت'));
    statusStrip.append(stripHeading, processing, helper);

    panel.append(heading, controls, fields, statusStrip);
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
    metronomePanel.append(panelHeading('الميزان الصامت', 'إيقاع بصري لا يتداخل مع التسجيل', 'graphic_eq', 'teal'), metronome);

    const recordingPanel = el('section', 'premium-panel recording-panel');
    const recordAura = el('div', 'record-aura');
    recordAura.setAttribute('aria-hidden', 'true');
    recordingPanel.append(panelHeading('التسجيل', 'التقط نغمة صافية بالقيمة الموسيقية المحددة', 'mic_external_on', 'coral'), recordAura, recorderCopy);

    const qualityPanel = el('aside', 'premium-panel recording-quality-panel');
    const qualityTitle = el('div', 'quality-title');
    qualityTitle.append(emblem('verified', 'gold', 'sm'), el('div'));
    qualityTitle.lastChild.append(el('strong', '', 'بوابة الجودة'), el('span', '', 'الحفظ بعد اجتياز جميع الشروط'));
    const qualitySteps = el('div', 'quality-steps');
    [
      ['ضوضاء منخفضة', 'noise_control_off'],
      ['نغمة ثابتة', 'moving'],
      ['ضبط سليم', 'check_circle'],
      ['دون طقطقة', 'hearing_disabled']
    ].forEach(([label, iconName], index) => {
      const step = el('div', 'quality-step');
      step.append(emblem(iconName, index % 2 ? 'teal' : 'gold', 'xs'), el('span', '', label));
      qualitySteps.appendChild(step);
    });
    qualityPanel.append(qualityTitle, qualitySteps, el('p', '', 'يبقى الصوت الخام كما هو، وتُستخدم معايير الجودة لقبول التسجيل فقط.'));

    recorderCard.append(metronomePanel, recordingPanel, qualityPanel);
  }

  function enhanceLibrary(library) {
    library.classList.remove('card');
    library.classList.add('premium-panel', 'library-panel');
    const title = library.querySelector('.library-head h2');
    if (title) title.textContent = 'مكتبة النغمات';
    const description = library.querySelector('.library-head p');
    if (description) description.textContent = 'استمع، راجع الجودة، وحدد التسجيلات قبل تصديرها.';

    const list = library.querySelector('#recordingsList');
    if (list && !library.querySelector('.recordings-table-head')) {
      const header = el('div', 'recordings-table-head');
      ['اختيار', 'هوية النغمة', 'مؤشرات الجودة', 'التحكم والتصدير'].forEach(text => header.append(el('span', '', text)));
      library.insertBefore(header, list);
    }
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
    if (app.dataset.redesigned === 'r3') return;
    app.dataset.redesigned = 'r3';
    document.body.classList.add('oriental-interface', 'oriental-interface-r3');

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
