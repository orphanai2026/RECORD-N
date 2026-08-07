(() => {
  'use strict';

  const $ = selector => document.querySelector(selector);
  let installed = false;

  const modeContent = {
    single: {
      title: 'منفصل',
      subtitle: 'نغمة واحدة في كل مرة',
      badge: 'التقاط مستقل',
      description: 'اعزف أي نغمة صافية؛ Ney Auto-Capture ينتقي أفضل نافذة ويحفظها كعينة مستقلة بعد اجتياز شروط الجودة.'
    },
    chromatic: {
      title: 'سلم كروماتك',
      subtitle: 'جلسة نغمات متتابعة',
      badge: 'جلسة كروماتية',
      description: 'سجّل سلسلة نغمات كروماتية ضمن جلسة واحدة. ابدأ تلقائيًا من أول نغمة صافية، أو استخدم تحديدًا يدويًا لنطاق السلم.'
    },
    'maqam-scale': {
      title: 'سلم مقام شرقي',
      subtitle: 'السلم الكامل للمقام',
      badge: 'سلم شرقي كامل',
      description: 'اختر مقامًا شرقيًا ثم جذر المقام لتجهيز درجاته الصحيحة وتسجيل السلم كاملًا وفق مرجع الضبط المعتمد.'
    }
  };

  function activeMode() {
    return $('#recordingModeControl .segment.is-active')?.dataset.recordingMode || 'single';
  }

  function activeStartMode() {
    return $('#autoSessionStartController [data-start-mode].is-active')?.dataset.startMode || 'auto';
  }

  function ensureMaqamScaleButton(control) {
    let button = control.querySelector('[data-recording-mode="maqam-scale"]');
    if (button) return button;

    button = document.createElement('button');
    button.type = 'button';
    button.className = 'segment';
    button.dataset.recordingMode = 'maqam-scale';
    button.setAttribute('aria-pressed', 'false');
    button.textContent = 'سلم مقام شرقي';
    control.append(button);

    button.addEventListener('click', event => {
      event.preventDefault();

      /* Keep the existing engine in a safe non-chromatic state while the maqam-scale UI path is selected. */
      const singleButton = control.querySelector('[data-recording-mode="single"]');
      if (singleButton && !singleButton.classList.contains('is-active')) singleButton.click();

      queueMicrotask(() => {
        control.querySelectorAll('[data-recording-mode]').forEach(item => {
          const active = item === button;
          item.classList.toggle('is-active', active);
          item.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        const settings = $('#chromaticSettings');
        if (settings && !settings.hidden) settings.hidden = true;
        document.dispatchEvent(new CustomEvent('ney:recording-mode-ui-change', {
          detail: { mode: 'maqam-scale', engineFallback: 'single' }
        }));
      });
    });

    return button;
  }

  function enhanceModeButtons(control) {
    ensureMaqamScaleButton(control);
    control.querySelectorAll('[data-recording-mode]').forEach(button => {
      if (button.dataset.flowEnhanced === 'true') return;
      const info = modeContent[button.dataset.recordingMode] || modeContent.single;
      button.classList.add('recording-mode-option');
      button.innerHTML = `
        <span class="recording-mode-option__mark" aria-hidden="true"></span>
        <span class="recording-mode-option__copy">
          <strong>${info.title}</strong>
          <small>${info.subtitle}</small>
        </span>
      `;
      button.dataset.flowEnhanced = 'true';
    });
  }

  function ensureSummary(workflow) {
    let summary = $('#recordingModeSummary');
    if (summary) return summary;
    summary = document.createElement('div');
    summary.id = 'recordingModeSummary';
    summary.className = 'recording-mode-summary';
    summary.setAttribute('aria-live', 'polite');
    const header = workflow.querySelector('.recording-workflow__header');
    header?.after(summary);
    return summary;
  }

  function ensureManualRange(settings) {
    let wrapper = settings.querySelector('.recording-manual-range');
    if (wrapper) return wrapper;

    wrapper = document.createElement('section');
    wrapper.className = 'recording-manual-range';
    wrapper.setAttribute('aria-label', 'النطاق اليدوي للسلم الكروماتي');

    const heading = document.createElement('div');
    heading.className = 'recording-manual-range__head';
    heading.innerHTML = '<strong>نطاق الجلسة اليدوي</strong><span>حدد البداية والنهاية والاتجاه ثم جهّز السلم.</span>';
    wrapper.append(heading);

    const controls = document.createElement('div');
    controls.className = 'recording-manual-range__controls';
    wrapper.append(controls);

    ['chromaticStart', 'chromaticEnd', 'chromaticDirection'].forEach(id => {
      const label = $(`#${id}`)?.closest('label');
      if (label) controls.append(label);
    });

    const buildButton = $('#buildChromaticButton');
    if (buildButton) controls.append(buildButton);
    settings.append(wrapper);
    return wrapper;
  }

  function sync(workflow, settings, summary) {
    const mode = activeMode();
    const info = modeContent[mode] || modeContent.single;
    workflow.dataset.recordingFlowMode = mode;

    summary.innerHTML = `
      <span class="recording-mode-summary__badge">${info.badge}</span>
      <div>
        <strong>${info.title}</strong>
        <span>${info.description}</span>
      </div>
    `;

    if (mode !== 'chromatic') {
      settings.dataset.startMode = 'none';
      return;
    }

    settings.dataset.startMode = activeStartMode();
  }

  function install() {
    if (installed) return true;
    const workflow = $('.ney-screen--recording .recording-workflow');
    const control = $('#recordingModeControl');
    const settings = $('#chromaticSettings');
    if (!workflow || !control || !settings) return false;

    enhanceModeButtons(control);
    const summary = ensureSummary(workflow);
    ensureManualRange(settings);

    const resync = () => queueMicrotask(() => sync(workflow, settings, summary));
    control.addEventListener('click', resync);
    settings.addEventListener('click', event => {
      if (event.target.closest('[data-start-mode]')) resync();
    });
    document.addEventListener('ney:recording-mode-ui-change', resync);

    const observer = new MutationObserver(resync);
    observer.observe(control, { subtree: true, attributes: true, attributeFilter: ['class', 'aria-pressed'] });
    observer.observe(settings, { subtree: true, attributes: true, attributeFilter: ['class', 'aria-pressed'] });

    sync(workflow, settings, summary);
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
