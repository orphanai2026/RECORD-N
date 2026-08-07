(() => {
  'use strict';

  const $ = selector => document.querySelector(selector);
  let installed = false;

  const state = {
    singleMode: 'general',
    maqamId: null,
    tonicPc: null,
    tonicOctave: 4,
    generatedScale: null
  };

  const CATEGORY_ORDER = ['eastern_identity', 'familiar_no_quarter', 'special_intervals'];
  const TONIC_OPTIONS = Object.freeze([
    { value: 'C', ar: 'دو', en: 'C' },
    { value: 'C hs', ar: 'دو نصف دييز', en: 'C half-sharp' },
    { value: 'C#', ar: 'دو دييز', en: 'C sharp' },
    { value: 'D hb', ar: 'ري نصف بيمول', en: 'D half-flat' },
    { value: 'D', ar: 'ري', en: 'D' },
    { value: 'D hs', ar: 'ري نصف دييز', en: 'D half-sharp' },
    { value: 'D#', ar: 'ري دييز', en: 'D sharp' },
    { value: 'E hb', ar: 'مي نصف بيمول', en: 'E half-flat' },
    { value: 'E', ar: 'مي', en: 'E' },
    { value: 'F hb', ar: 'فا نصف بيمول', en: 'F half-flat' },
    { value: 'F', ar: 'فا', en: 'F' },
    { value: 'F hs', ar: 'فا نصف دييز', en: 'F half-sharp' },
    { value: 'F#', ar: 'فا دييز', en: 'F sharp' },
    { value: 'G hb', ar: 'صول نصف بيمول', en: 'G half-flat' },
    { value: 'G', ar: 'صول', en: 'G' },
    { value: 'G hs', ar: 'صول نصف دييز', en: 'G half-sharp' },
    { value: 'G#', ar: 'صول دييز', en: 'G sharp' },
    { value: 'A hb', ar: 'لا نصف بيمول', en: 'A half-flat' },
    { value: 'A', ar: 'لا', en: 'A' },
    { value: 'A hs', ar: 'لا نصف دييز', en: 'A half-sharp' },
    { value: 'A#', ar: 'لا دييز', en: 'A sharp' },
    { value: 'B hb', ar: 'سي نصف بيمول', en: 'B half-flat' },
    { value: 'B', ar: 'سي', en: 'B' },
    { value: 'C hb', ar: 'دو نصف بيمول', en: 'C half-flat' }
  ]);

  function currentRecordingMode() {
    return $('#recordingModeControl .segment.is-active')?.dataset.recordingMode || 'single';
  }

  function currentA4() {
    return Number($('#a4Reference')?.value || 440) || 440;
  }

  function library() {
    return window.NeyMaqamLibrary || null;
  }

  function generator() {
    return window.NeyRecordingGenerator || null;
  }

  function categoryLabel(id) {
    return ({
      eastern_identity: 'مقامات الربع تون · الهوية الشرقية',
      familiar_no_quarter: 'المقامات الخالية من الربع تون',
      special_intervals: 'المقامات ذات الأبعاد الخاصة'
    })[id] || id;
  }

  function loadPreference() {
    try {
      state.singleMode = localStorage.getItem('ney-single-recording-mode') === 'maqam' ? 'maqam' : 'general';
      state.maqamId = localStorage.getItem('ney-single-recording-maqam') || null;
      state.tonicPc = localStorage.getItem('ney-maqam-tonic-pc') || null;
      const savedOctave = Number(localStorage.getItem('ney-maqam-tonic-octave'));
      state.tonicOctave = Number.isInteger(savedOctave) && savedOctave >= 1 && savedOctave <= 7 ? savedOctave : 4;
    } catch (_) {}
  }

  function savePreference() {
    try {
      localStorage.setItem('ney-single-recording-mode', state.singleMode);
      if (state.maqamId) localStorage.setItem('ney-single-recording-maqam', state.maqamId);
      else localStorage.removeItem('ney-single-recording-maqam');
      if (state.tonicPc) localStorage.setItem('ney-maqam-tonic-pc', state.tonicPc);
      else localStorage.removeItem('ney-maqam-tonic-pc');
      localStorage.setItem('ney-maqam-tonic-octave', String(state.tonicOctave));
    } catch (_) {}
  }

  function tonicNotation() {
    return state.tonicPc ? `${state.tonicPc}${state.tonicOctave}` : null;
  }

  function emitContext() {
    document.dispatchEvent(new CustomEvent('ney:maqam-recording-context-change', {
      detail: {
        recordingMode: currentRecordingMode(),
        singleMode: state.singleMode,
        maqamId: state.maqamId,
        tonic: tonicNotation(),
        scale: state.generatedScale
      }
    }));
  }

  function generateScale() {
    state.generatedScale = null;
    if (!state.maqamId || !state.tonicPc || !generator()?.maqamScale) return null;

    try {
      state.generatedScale = generator().maqamScale({
        maqamId: state.maqamId,
        tonic: tonicNotation(),
        a4: currentA4(),
        direction: 'ascending'
      });
    } catch (error) {
      console.error('Maqam scale generation failed', error);
      state.generatedScale = null;
    }
    return state.generatedScale;
  }

  function applyMaqamSelection(root, maqamId) {
    if (!maqamId) return;
    state.maqamId = maqamId;
    savePreference();
    root.dataset.selectedMaqam = maqamId;

    root.querySelectorAll('[data-maqam-id]').forEach(button => {
      const active = button.dataset.maqamId === maqamId;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    generateScale();
    sync(root);
    emitContext();
  }

  function renderMaqams(container, root) {
    const lib = library();
    if (!lib) {
      container.innerHTML = '<p class="recording-maqam-selector__unavailable">تعذر تحميل مكتبة المقامات.</p>';
      return;
    }

    const maqams = lib.getMaqams();
    const categories = lib.getCategories();
    container.innerHTML = '';

    CATEGORY_ORDER.forEach(categoryId => {
      const category = categories.find(item => item.id === categoryId);
      if (!category) return;

      const section = document.createElement('section');
      section.className = 'recording-maqam-group';
      section.dataset.category = categoryId;
      section.innerHTML = `<h5>${categoryLabel(categoryId)}</h5><div class="recording-maqam-group__options"></div>`;
      const options = section.querySelector('.recording-maqam-group__options');

      category.maqams.forEach(maqamId => {
        const maqam = maqams.find(item => item.id === maqamId);
        if (!maqam) return;

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'recording-maqam-option';
        button.dataset.maqamId = maqam.id;
        button.setAttribute('aria-label', `اختيار مقام ${maqam.ar}`);
        button.setAttribute('aria-pressed', state.maqamId === maqam.id ? 'true' : 'false');
        button.classList.toggle('is-active', state.maqamId === maqam.id);
        button.innerHTML = `<span aria-hidden="true"></span><strong>${maqam.ar}</strong><small>${maqam.en}</small>`;
        button.addEventListener('click', event => {
          event.preventDefault();
          event.stopPropagation();
          applyMaqamSelection(root, maqam.id);
        });
        options.append(button);
      });

      container.append(section);
    });
  }

  function installTonicControls(root) {
    const panel = root.querySelector('.recording-maqam-tonic');
    const pitch = root.querySelector('#recordingMaqamTonicPitch');
    const octave = root.querySelector('#recordingMaqamTonicOctave');
    if (!panel || !pitch || !octave) return;

    pitch.innerHTML = '<option value="">اختر نغمة الجذر</option>' + TONIC_OPTIONS.map(item =>
      `<option value="${item.value}">${item.ar} · ${item.en}</option>`
    ).join('');
    octave.innerHTML = [2,3,4,5,6].map(value => `<option value="${value}">الأوكتاف ${value}</option>`).join('');

    if (state.tonicPc) pitch.value = state.tonicPc;
    octave.value = String(state.tonicOctave);

    const update = () => {
      state.tonicPc = pitch.value || null;
      state.tonicOctave = Number(octave.value) || 4;
      savePreference();
      generateScale();
      sync(root);
      emitContext();
    };

    pitch.addEventListener('change', update);
    octave.addEventListener('change', update);
  }

  function renderScaleDegrees(root) {
    const section = root.querySelector('.recording-maqam-scale-preview');
    const grid = root.querySelector('.recording-maqam-scale-preview__grid');
    const meta = root.querySelector('.recording-maqam-scale-preview__meta');
    if (!section || !grid || !meta) return;

    const showForSingle = currentRecordingMode() === 'single' && state.singleMode === 'maqam';
    const showForScale = currentRecordingMode() === 'maqam-scale';
    const relevant = showForSingle || showForScale;
    section.hidden = !relevant || !state.maqamId;
    if (section.hidden) return;

    if (!state.tonicPc) {
      meta.textContent = 'اختر نغمة الجذر والأوكتاف لعرض درجات المقام.';
      grid.innerHTML = '';
      return;
    }

    const scale = generateScale();
    if (!scale) {
      meta.textContent = 'تعذر توليد درجات المقام بهذه الإعدادات.';
      grid.innerHTML = '';
      return;
    }

    const maqam = library()?.getMaqam?.(state.maqamId);
    const tonicLabel = TONIC_OPTIONS.find(item => item.value === state.tonicPc)?.ar || state.tonicPc;
    meta.textContent = `${maqam?.ar || scale.maqamAr} من ${tonicLabel} ${state.tonicOctave} · ${scale.variantAr || 'المسار الافتراضي'} · A4=${currentA4()} Hz`;

    grid.innerHTML = scale.notes.map(note => `
      <article class="recording-maqam-degree" data-degree="${note.degree}">
        <span class="recording-maqam-degree__number">${note.degree}</span>
        <div class="recording-maqam-degree__copy">
          <strong>${note.arabic}</strong>
          <small>${note.english}</small>
        </div>
        <span class="recording-maqam-degree__frequency">${note.frequency.toFixed(2)} Hz</span>
      </article>
    `).join('');
  }

  function sync(root) {
    const mode = currentRecordingMode();
    const single = mode === 'single';
    const maqamScale = mode === 'maqam-scale';
    const relevant = single || maqamScale;
    root.hidden = !relevant;
    if (!relevant) return;

    root.dataset.context = maqamScale ? 'scale' : 'single';
    root.dataset.singleMode = state.singleMode;
    if (state.maqamId) root.dataset.selectedMaqam = state.maqamId;
    else delete root.dataset.selectedMaqam;

    const headTitle = root.querySelector('.recording-maqam-selector__head h4');
    const headCopy = root.querySelector('.recording-maqam-selector__head p');
    const modes = root.querySelector('.recording-maqam-selector__modes');
    const panel = root.querySelector('.recording-maqam-selector__panel');
    const summary = root.querySelector('.recording-maqam-selector__summary');
    const tonicPanel = root.querySelector('.recording-maqam-tonic');

    if (maqamScale) {
      modes.hidden = true;
      panel.hidden = false;
      tonicPanel.hidden = !state.maqamId;
      headTitle.textContent = 'مقام السلم الشرقي';
      headCopy.textContent = 'اختر المقام ثم جذر السلم لعرض درجاته الكاملة.';

      if (!state.maqamId) {
        summary.innerHTML = '<strong>سلم مقام شرقي كامل</strong><span>اختر المقام أولًا.</span>';
      } else if (!state.tonicPc) {
        const maqam = library()?.getMaqam?.(state.maqamId);
        summary.innerHTML = `<strong>سلم مقام ${maqam?.ar || state.maqamId}</strong><span>اختر الآن نغمة الجذر والأوكتاف.</span>`;
      } else {
        const maqam = library()?.getMaqam?.(state.maqamId);
        summary.innerHTML = `<strong>سلم مقام ${maqam?.ar || state.maqamId}</strong><span>تم توليد درجات السلم من الجذر المختار وفق المسار الافتراضي المعتمد.</span>`;
      }
      renderScaleDegrees(root);
      return;
    }

    modes.hidden = false;
    headTitle.textContent = 'نوع التسجيل المنفرد';
    headCopy.textContent = 'سجّل نغمة عامة أو اربط التسجيل بمقام شرقي محدد.';

    root.querySelectorAll('[data-single-mode]').forEach(button => {
      const active = button.dataset.singleMode === state.singleMode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    panel.hidden = state.singleMode !== 'maqam';
    tonicPanel.hidden = state.singleMode !== 'maqam' || !state.maqamId;

    if (state.singleMode === 'general') {
      summary.innerHTML = '<strong>نغمة منفردة عامة</strong><span>التقاط أي نغمة صافية دون تقييدها بمقام محدد.</span>';
    } else if (!state.maqamId) {
      summary.innerHTML = '<strong>نغمات مقام شرقي</strong><span>اختر المقام المطلوب لتسجيل نغماته منفصلة.</span>';
    } else if (!state.tonicPc) {
      const maqam = library()?.getMaqam?.(state.maqamId);
      summary.innerHTML = `<strong>المقام المختار: ${maqam?.ar || state.maqamId}</strong><span>اختر نغمة الجذر والأوكتاف لعرض درجات المقام.</span>`;
    } else {
      const maqam = library()?.getMaqam?.(state.maqamId);
      summary.innerHTML = `<strong>المقام المختار: ${maqam?.ar || state.maqamId}</strong><span>تم توليد درجات المقام من الجذر المختار لتجهيز التسجيل المنفصل.</span>`;
    }
    renderScaleDegrees(root);
  }

  function install() {
    if (installed) return true;
    const summary = $('#recordingModeSummary');
    const modeControl = $('#recordingModeControl');
    if (!summary || !modeControl || !library() || !generator()) return false;

    loadPreference();

    const root = document.createElement('section');
    root.id = 'recordingMaqamSelector';
    root.className = 'recording-maqam-selector';
    root.setAttribute('aria-label', 'اختيار المقام للتسجيل');
    root.innerHTML = `
      <div class="recording-maqam-selector__head">
        <div><h4>نوع التسجيل المنفرد</h4><p>سجّل نغمة عامة أو اربط التسجيل بمقام شرقي محدد.</p></div>
        <div class="recording-maqam-selector__modes" role="group" aria-label="نوع التسجيل المنفرد">
          <button type="button" data-single-mode="general" aria-pressed="true">نغمة عامة</button>
          <button type="button" data-single-mode="maqam" aria-pressed="false">نغمات مقام شرقي</button>
        </div>
      </div>
      <div class="recording-maqam-selector__summary" aria-live="polite"></div>
      <div class="recording-maqam-selector__panel" hidden>
        <div class="recording-maqam-selector__panel-head">
          <strong>اختر المقام</strong>
          <span>المقامات الأساسية المعتمدة لهذا الإصدار.</span>
        </div>
        <div class="recording-maqam-selector__groups"></div>
      </div>
      <section class="recording-maqam-tonic" hidden aria-label="جذر المقام">
        <div class="recording-maqam-tonic__head">
          <strong>جذر المقام</strong>
          <span>حدد نغمة الأساس والأوكتاف؛ لا يفرض النظام جذرًا افتراضيًا.</span>
        </div>
        <div class="recording-maqam-tonic__controls">
          <label>نغمة الجذر<select id="recordingMaqamTonicPitch"></select></label>
          <label>الأوكتاف<select id="recordingMaqamTonicOctave"></select></label>
        </div>
      </section>
      <section class="recording-maqam-scale-preview" hidden aria-label="درجات المقام">
        <div class="recording-maqam-scale-preview__head">
          <strong>درجات المقام</strong>
          <span class="recording-maqam-scale-preview__meta"></span>
        </div>
        <div class="recording-maqam-scale-preview__grid"></div>
      </section>`;

    summary.after(root);
    renderMaqams(root.querySelector('.recording-maqam-selector__groups'), root);
    installTonicControls(root);
    generateScale();

    root.addEventListener('click', event => {
      const modeButton = event.target.closest('[data-single-mode]');
      if (!modeButton) return;

      state.singleMode = modeButton.dataset.singleMode === 'maqam' ? 'maqam' : 'general';
      savePreference();
      sync(root);
      emitContext();
    });

    const resync = () => setTimeout(() => sync(root), 0);
    modeControl.addEventListener('click', resync);
    document.addEventListener('ney:recording-mode-ui-change', resync);
    $('#a4Reference')?.addEventListener('change', () => {
      generateScale();
      sync(root);
      emitContext();
    });
    sync(root);

    window.NeySingleRecordingContext = Object.freeze({
      getMode: () => state.singleMode,
      getMaqamId: () => state.maqamId,
      getTonic: tonicNotation,
      getScale: () => state.generatedScale,
      getContext: () => ({ mode: state.singleMode, maqamId: state.maqamId, tonic: tonicNotation(), scale: state.generatedScale })
    });
    window.NeyMaqamRecordingContext = Object.freeze({
      getMaqamId: () => state.maqamId,
      getTonic: tonicNotation,
      getScale: () => state.generatedScale,
      getContext: () => ({ recordingMode: currentRecordingMode(), singleMode: state.singleMode, maqamId: state.maqamId, tonic: tonicNotation(), scale: state.generatedScale })
    });

    installed = true;
    return true;
  }

  function initialize() {
    if (install()) return;
    const observer = new MutationObserver(() => {
      if (install()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 15000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
