(() => {
  'use strict';

  const $ = selector => document.querySelector(selector);
  let installed = false;

  const state = {
    singleMode: 'general',
    maqamId: null
  };

  const CATEGORY_ORDER = ['eastern_identity', 'familiar_no_quarter', 'special_intervals'];

  function currentRecordingMode() {
    return $('#recordingModeControl .segment.is-active')?.dataset.recordingMode || 'single';
  }

  function library() {
    return window.NeyMaqamLibrary || null;
  }

  function categoryLabel(id) {
    const labels = {
      eastern_identity: 'مقامات الربع تون · الهوية الشرقية',
      familiar_no_quarter: 'المقامات الخالية من الربع تون',
      special_intervals: 'المقامات ذات الأبعاد الخاصة'
    };
    return labels[id] || id;
  }

  function loadPreference() {
    try {
      const mode = localStorage.getItem('ney-single-recording-mode');
      const maqam = localStorage.getItem('ney-single-recording-maqam');
      state.singleMode = mode === 'maqam' ? 'maqam' : 'general';
      state.maqamId = maqam || null;
    } catch (_) {}
  }

  function savePreference() {
    try {
      localStorage.setItem('ney-single-recording-mode', state.singleMode);
      if (state.maqamId) localStorage.setItem('ney-single-recording-maqam', state.maqamId);
      else localStorage.removeItem('ney-single-recording-maqam');
    } catch (_) {}
  }

  function renderMaqams(container) {
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
        button.setAttribute('aria-pressed', state.maqamId === maqam.id ? 'true' : 'false');
        button.classList.toggle('is-active', state.maqamId === maqam.id);
        button.innerHTML = `<span aria-hidden="true"></span><strong>${maqam.ar}</strong><small>${maqam.en}</small>`;
        options.append(button);
      });

      container.append(section);
    });
  }

  function sync(root) {
    const single = currentRecordingMode() === 'single';
    root.hidden = !single;
    if (!single) return;

    root.dataset.singleMode = state.singleMode;
    root.querySelectorAll('[data-single-mode]').forEach(button => {
      const active = button.dataset.singleMode === state.singleMode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    const maqamPanel = root.querySelector('.recording-maqam-selector__panel');
    maqamPanel.hidden = state.singleMode !== 'maqam';

    const summary = root.querySelector('.recording-maqam-selector__summary');
    if (state.singleMode === 'general') {
      summary.innerHTML = '<strong>نغمة منفردة عامة</strong><span>التقاط أي نغمة صافية دون تقييدها بمقام محدد.</span>';
    } else if (!state.maqamId) {
      summary.innerHTML = '<strong>نغمات مقام شرقي</strong><span>اختر المقام المطلوب لتسجيل نغماته منفصلة.</span>';
    } else {
      const maqam = library()?.getMaqam?.(state.maqamId);
      summary.innerHTML = `<strong>المقام المختار: ${maqam?.ar || state.maqamId}</strong><span>سيُستخدم هذا الاختيار لتحديد درجات المقام بعد اعتماد جذر المقام في الخطوة التالية.</span>`;
    }
  }

  function install() {
    if (installed) return true;
    const workflow = $('.ney-screen--recording .recording-workflow');
    const summary = $('#recordingModeSummary');
    const modeControl = $('#recordingModeControl');
    if (!workflow || !summary || !modeControl || !library()) return false;

    loadPreference();

    const root = document.createElement('section');
    root.id = 'recordingMaqamSelector';
    root.className = 'recording-maqam-selector';
    root.setAttribute('aria-label', 'نوع تسجيل النغمة المنفردة');
    root.innerHTML = `
      <div class="recording-maqam-selector__head">
        <div>
          <h4>نوع التسجيل المنفرد</h4>
          <p>سجّل نغمة عامة أو اربط التسجيل بمقام شرقي محدد.</p>
        </div>
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
      </div>`;

    summary.after(root);
    renderMaqams(root.querySelector('.recording-maqam-selector__groups'));

    root.addEventListener('click', event => {
      const modeButton = event.target.closest('[data-single-mode]');
      if (modeButton) {
        state.singleMode = modeButton.dataset.singleMode === 'maqam' ? 'maqam' : 'general';
        savePreference();
        sync(root);
        document.dispatchEvent(new CustomEvent('ney:single-recording-context-change', {
          detail: { mode: state.singleMode, maqamId: state.maqamId }
        }));
        return;
      }

      const maqamButton = event.target.closest('[data-maqam-id]');
      if (!maqamButton) return;
      state.maqamId = maqamButton.dataset.maqamId;
      savePreference();
      root.querySelectorAll('[data-maqam-id]').forEach(button => {
        const active = button.dataset.maqamId === state.maqamId;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      sync(root);
      document.dispatchEvent(new CustomEvent('ney:single-recording-context-change', {
        detail: { mode: state.singleMode, maqamId: state.maqamId }
      }));
    });

    modeControl.addEventListener('click', () => setTimeout(() => sync(root), 0));
    sync(root);

    window.NeySingleRecordingContext = Object.freeze({
      getMode: () => state.singleMode,
      getMaqamId: () => state.maqamId,
      getContext: () => ({ mode: state.singleMode, maqamId: state.maqamId })
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
