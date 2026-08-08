(() => {
  'use strict';

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  function makeCard(title, description) {
    const section = document.createElement('section');
    section.className = 'ney-settings-card';
    const heading = document.createElement('div');
    heading.innerHTML = `<h3>${title}</h3><p class="ney-settings-card__intro">${description}</p>`;
    const body = document.createElement('div');
    body.className = 'ney-settings-card__body';
    section.append(heading, body);
    return { section, body };
  }

  function movableFor(id, root) {
    const control = $(`#${id}`, root);
    if (!control) return null;
    return control.closest('label') || control.parentElement;
  }

  function appendUnique(target, nodes) {
    const seen = new Set();
    nodes.filter(Boolean).forEach(node => {
      if (seen.has(node)) return;
      seen.add(node);
      target.append(node);
    });
  }

  function addFieldError(input, text) {
    if (!input || input.dataset.neyValidationReady === 'true') return;
    input.dataset.neyValidationReady = 'true';
    const message = document.createElement('span');
    message.className = 'ney-field-error';
    message.id = `${input.id}Error`;
    message.textContent = text;
    input.setAttribute('aria-describedby', message.id);
    const host = input.closest('label') || input.parentElement;
    host?.append(message);
  }

  function initializeSettingsEnhancement() {
    const screen = $('.ney-screen--settings');
    const quickControls = $('.quick-controls', screen || document);
    const form = $('#advancedSettingsForm');
    if (!screen || !quickControls || !form) return false;
    if (form.dataset.neyOrganized === 'true') return true;
    form.dataset.neyOrganized = 'true';

    /* Approved basic order: A4, division, duration, BPM. Move the same live nodes. */
    const basicGrid = $('.controls-grid', quickControls);
    if (basicGrid) {
      basicGrid.classList.add('ney-settings-basic-grid');
      const a4 = $('.reference-group', basicGrid);
      const division = $('.division-group', basicGrid);
      const duration = $('.duration-group', basicGrid);
      const bpm = $('.bpm-group', basicGrid);
      [a4, division, duration, bpm].filter(Boolean).forEach(card => {
        card.classList.add('ney-settings-basic-card');
        basicGrid.append(card);
      });
    }

    const quickTitle = $('#quickControlsTitle', quickControls);
    if (quickTitle) quickTitle.textContent = 'الإعدادات الأساسية';
    const quickDescription = $('.quick-controls__header p', quickControls);
    if (quickDescription) quickDescription.textContent = 'إعدادات العزف اليومية؛ تطبق مباشرة وتبقى في متناول المستخدم.';

    const formHeaderTitle = $('header h2', form);
    const formHeaderDescription = $('header p', form);
    if (formHeaderTitle) formHeaderTitle.textContent = 'الإعدادات المتقدمة';
    if (formHeaderDescription) formHeaderDescription.textContent = 'الجودة والصوت والتصدير، مع إدارة تقنية منفصلة للإجراءات غير اليومية.';

    const grid = $('.advanced-settings-grid', form);
    if (!grid) return true;

    const originalSections = $$('.settings-section', grid);
    const calibrationSection = originalSections.find(section => section.querySelector('#sensitivityRange'));
    const exportSection = originalSections.find(section => section.querySelector('#defaultExportFormat'));
    const adminSection = originalSections.find(section => section.classList.contains('settings-section--admin'));

    const quality = makeCard('التسجيل والجودة', 'شروط دقة النغمة وجودة التسجيل المقبول قبل الحفظ.');
    appendUnique(quality.body, [
      movableFor('toleranceRange', calibrationSection || form),
      movableFor('recordingQualityRange', exportSection || form)
    ]);

    const sound = makeCard('الميكروفون والصوت', 'حساسية الالتقاط ومعالجة الإشارة والنطاق الترددي المستخدم في التحليل.');
    const frequencyPair = $('#minFrequencyInput', calibrationSection || form)?.closest('.inline-settings');
    appendUnique(sound.body, [
      movableFor('sensitivityRange', calibrationSection || form),
      movableFor('noiseGateRange', calibrationSection || form),
      movableFor('smoothingRange', calibrationSection || form),
      frequencyPair
    ]);

    const storage = makeCard('التخزين والتصدير', 'صيغة الملفات وجودة التصدير وطريقة حفظ إعدادات الأداة على الجهاز.');
    appendUnique(storage.body, [
      movableFor('defaultExportFormat', exportSection || form),
      movableFor('exportSampleRate', exportSection || form),
      movableFor('wavBitDepth', exportSection || form),
      movableFor('mp3Bitrate', exportSection || form),
      movableFor('fileNamePattern', exportSection || form),
      movableFor('persistSettings', exportSection || form)
    ]);

    const admin = document.createElement('details');
    admin.className = 'ney-settings-admin';
    admin.innerHTML = `
      <summary>
        <span class="ney-settings-admin__copy"><strong>الإدارة التقنية</strong><small>استيراد وتصدير الإعدادات والتشخيص والإجراءات الحساسة.</small></span>
        <span class="ney-settings-admin__chevron" aria-hidden="true">⌄</span>
      </summary>
    `;
    const adminBody = document.createElement('div');
    adminBody.className = 'ney-settings-admin__body';
    if (adminSection) {
      while (adminSection.firstChild) adminBody.append(adminSection.firstChild);
      adminSection.remove();
    }
    admin.append(adminBody);

    calibrationSection?.remove();
    exportSection?.remove();
    grid.append(quality.section, sound.section, storage.section, admin);

    const footer = $('.advanced-footer', form);
    const saveButton = $('#saveAdvancedButton', form);
    if (saveButton) saveButton.textContent = 'حفظ التغييرات';
    let saveStatus = $('.ney-settings-save-status', footer || form);
    if (!saveStatus) {
      saveStatus = document.createElement('span');
      saveStatus.className = 'ney-settings-save-status';
      saveStatus.setAttribute('role', 'status');
      saveStatus.setAttribute('aria-live', 'polite');
      saveStatus.textContent = 'لا توجد تغييرات غير محفوظة';
      footer?.append(saveStatus);
    }

    const minFrequency = $('#minFrequencyInput', form);
    const maxFrequency = $('#maxFrequencyInput', form);
    const a4 = $('#a4Reference');
    addFieldError(minFrequency, 'أدخل ترددًا أدنى صالحًا وأقل من التردد الأعلى.');
    addFieldError(maxFrequency, 'أدخل ترددًا أعلى صالحًا وأكبر من التردد الأدنى.');
    addFieldError(a4, 'مرجع A4 يجب أن يكون بين 400 و480 Hz.');

    function mark(input, invalid) {
      if (!input) return;
      input.setAttribute('aria-invalid', String(invalid));
      const error = $(`#${input.id}Error`);
      error?.classList.toggle('is-visible', invalid);
    }

    function validate() {
      const min = Number(minFrequency?.value);
      const max = Number(maxFrequency?.value);
      const minInvalid = Boolean(minFrequency) && (!minFrequency.validity.valid || !Number.isFinite(min) || min >= max);
      const maxInvalid = Boolean(maxFrequency) && (!maxFrequency.validity.valid || !Number.isFinite(max) || max <= min);
      const a4Invalid = Boolean(a4) && !a4.validity.valid;
      mark(minFrequency, minInvalid);
      mark(maxFrequency, maxInvalid);
      mark(a4, a4Invalid);
      if (saveButton) saveButton.disabled = minInvalid || maxInvalid;
      return !(minInvalid || maxInvalid || a4Invalid);
    }

    function setPending() {
      if (!saveStatus) return;
      saveStatus.dataset.state = 'pending';
      saveStatus.textContent = 'تغييرات غير محفوظة';
    }

    function setSaved(message = 'تم الحفظ') {
      if (!saveStatus) return;
      saveStatus.dataset.state = 'saved';
      saveStatus.textContent = message;
    }

    $$('input, select', form).forEach(control => {
      if (control.type === 'file') return;
      control.addEventListener('input', () => { setPending(); validate(); });
      control.addEventListener('change', () => { setPending(); validate(); });
    });
    a4?.addEventListener('input', validate);
    a4?.addEventListener('change', validate);

    saveButton?.addEventListener('click', () => {
      if (!validate()) return;
      window.setTimeout(() => setSaved('تم حفظ التغييرات'), 0);
    });

    $('#resetSettingsButton', form)?.addEventListener('click', () => window.setTimeout(() => { validate(); setSaved('تمت استعادة الإعدادات'); }, 0));
    $('#settingsImportInput', form)?.addEventListener('change', () => window.setTimeout(() => { validate(); setSaved('تم استيراد الإعدادات'); }, 0));

    validate();
    return true;
  }

  function start() {
    if (initializeSettingsEnhancement()) return;
    const observer = new MutationObserver(() => {
      if (initializeSettingsEnhancement()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 12000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
