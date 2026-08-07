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
      badge: 'جلسة متتابعة',
      description: 'سجّل سلسلة نغمات ضمن جلسة واحدة. ابدأ تلقائيًا من أول نغمة صافية، أو انتقل إلى التحديد اليدوي إذا أردت نطاقًا محددًا.'
    }
  };

  function activeMode() {
    return $('#recordingModeControl .segment.is-active')?.dataset.recordingMode || 'single';
  }

  function activeStartMode() {
    return $('#autoSessionStartController [data-start-mode].is-active')?.dataset.startMode || 'auto';
  }

  function enhanceModeButtons(control) {
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

    const ids = ['chromaticStart', 'chromaticEnd', 'chromaticDirection'];
    ids.forEach(id => {
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

    const startMode = activeStartMode();
    settings.dataset.startMode = startMode;
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

    const observer = new MutationObserver(resync);
    observer.observe(control, { subtree: true, attributes: true, attributeFilter: ['class', 'aria-pressed'] });
    observer.observe(settings, { subtree: true, attributes: true, attributeFilter: ['class', 'hidden', 'aria-pressed'] });

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
