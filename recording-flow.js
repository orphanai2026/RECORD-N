(() => {
  'use strict';

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const panel = $('.recording-panel');
  const workflow = $('.recording-workflow');
  const phase = $('#recordingPhase');
  const qualification = $('#qualificationCount');
  const accuracy = $('#liveAccuracy');
  const clarity = $('#liveClarity');
  const micText = $('#headerMicText');
  const recordsList = $('#recordingsList');
  if (!panel || !workflow || !phase || panel.classList.contains('is-smart-recording')) return;

  panel.classList.add('is-smart-recording');

  const flow = document.createElement('section');
  flow.className = 'recording-smart-flow';
  flow.setAttribute('aria-label', 'مسار التسجيل التلقائي');
  flow.innerHTML = `
    <div class="recording-smart-flow__headline">
      <div>
        <strong>مسار التسجيل الذكي</strong>
        <span>تتابع آلي من جاهزية الميكروفون حتى اعتماد التسجيل وحفظه</span>
      </div>
      <span class="recording-smart-flow__state" id="smartRecordingState" data-tone="idle">جاهز</span>
    </div>
    <div class="recording-flow-steps" id="recordingFlowSteps">
      <div class="recording-flow-step" data-step="mic"><span class="recording-flow-step__marker">1</span><span class="recording-flow-step__label">الميكروفون</span><span class="recording-flow-step__detail">جاهزية الإدخال</span></div>
      <div class="recording-flow-step" data-step="wait"><span class="recording-flow-step__marker">2</span><span class="recording-flow-step__label">انتظار النغمة</span><span class="recording-flow-step__detail">نغمة واضحة ومضبوطة</span></div>
      <div class="recording-flow-step" data-step="qualify"><span class="recording-flow-step__marker">3</span><span class="recording-flow-step__label">3 قراءات صحيحة</span><span class="recording-flow-step__detail">تأكيد الثبات</span></div>
      <div class="recording-flow-step" data-step="record"><span class="recording-flow-step__marker">4</span><span class="recording-flow-step__label">التسجيل</span><span class="recording-flow-step__detail">تسجيل تلقائي</span></div>
      <div class="recording-flow-step" data-step="review"><span class="recording-flow-step__marker">5</span><span class="recording-flow-step__label">فحص الجودة</span><span class="recording-flow-step__detail">دقة وجودة وانحراف</span></div>
      <div class="recording-flow-step" data-step="save"><span class="recording-flow-step__marker">6</span><span class="recording-flow-step__label">الحفظ</span><span class="recording-flow-step__detail">اعتماد أو إعادة المحاولة</span></div>
    </div>
    <div class="recording-smart-flow__message">
      <p id="smartRecordingMessage">شغّل الميكروفون ثم جهّز التسجيل لبدء التحقق التلقائي.</p>
      <div class="recording-smart-flow__rules" aria-label="شروط الاعتماد">
        <span class="recording-rule-chip">بدء ≥ 65%</span>
        <span class="recording-rule-chip">3 قراءات</span>
        <span class="recording-rule-chip">اعتماد الدقة ≥ 90%</span>
        <span class="recording-rule-chip">الجودة ≥ 90%</span>
      </div>
    </div>
  `;
  workflow.parentNode.insertBefore(flow, workflow);

  const stateBadge = $('#smartRecordingState');
  const message = $('#smartRecordingMessage');
  const steps = [...flow.querySelectorAll('.recording-flow-step')];
  let lastRecordCount = recordsList?.children.length || 0;
  let savePulseTimer = null;

  function setSteps(active, completed = [], rejected = false) {
    steps.forEach(step => {
      const key = step.dataset.step;
      step.classList.toggle('is-active', key === active);
      step.classList.toggle('is-complete', completed.includes(key));
      step.classList.toggle('is-rejected', rejected && key === 'save');
    });
  }

  function micActive() {
    return micText?.textContent.includes('نشط') && !micText?.textContent.includes('غير نشط');
  }

  function qualificationValue() {
    const match = String(qualification?.textContent || '').match(/(\d+)\s*\/\s*3/);
    return match ? Number(match[1]) : 0;
  }

  function setBadge(text, tone = 'idle') {
    stateBadge.textContent = text;
    stateBadge.dataset.tone = tone;
  }

  function render() {
    const currentPhase = String(phase.textContent || 'جاهز').trim();
    const mic = micActive();
    const q = qualificationValue();
    const accuracyText = accuracy?.textContent || '—';
    const clarityText = clarity?.textContent || '—';

    if (!mic) {
      setBadge('الميكروفون متوقف');
      setSteps('mic');
      message.textContent = 'شغّل الميكروفون أولًا، ثم اضغط «تجهيز تسجيل النغمة».';
      return;
    }

    if (currentPhase === 'جاهز') {
      setBadge('جاهز');
      setSteps('wait', ['mic']);
      message.textContent = 'الميكروفون جاهز. اضغط «تجهيز تسجيل النغمة» ليبدأ الانتظار الذكي.';
      return;
    }

    if (currentPhase.includes('انتظار')) {
      setBadge('بانتظار النغمة');
      setSteps('wait', ['mic']);
      message.textContent = 'اعزف نغمة واضحة وثابتة داخل هامش الضبط الحالي.';
      return;
    }

    if (currentPhase.includes('التحقق')) {
      setBadge(`تأهيل ${q}/3`, 'recording');
      setSteps('qualify', ['mic','wait']);
      message.textContent = `تم التقاط النغمة. نحتاج ${Math.max(0, 3 - q)} قراءة صحيحة إضافية لبدء التسجيل.`;
      return;
    }

    if (currentPhase.includes('تسجيل')) {
      setBadge('جارٍ التسجيل', 'recording');
      setSteps('record', ['mic','wait','qualify']);
      message.textContent = `التسجيل يعمل الآن · الدقة ${accuracyText} · الجودة ${clarityText}.`;
      return;
    }

    if (currentPhase.includes('مرفوض')) {
      setBadge('مرفوض — إعادة المحاولة', 'danger');
      setSteps('save', ['mic','wait','qualify','record','review'], true);
      message.textContent = `لم يحقق التسجيل شروط الاعتماد · الدقة ${accuracyText} · الجودة ${clarityText}. ستعاد المحاولة تلقائيًا.`;
      return;
    }

    setBadge(currentPhase || 'متابعة');
    setSteps('review', ['mic','wait','qualify','record']);
    message.textContent = `فحص التسجيل الحالي · الدقة ${accuracyText} · الجودة ${clarityText}.`;
  }

  function showSaved() {
    clearTimeout(savePulseTimer);
    setBadge('تم الحفظ', 'success');
    setSteps('save', ['mic','wait','qualify','record','review','save']);
    message.textContent = 'تم اعتماد التسجيل وحفظه بنجاح في التسجيلات المحفوظة.';
    savePulseTimer = window.setTimeout(render, 2200);
  }

  const observer = new MutationObserver(render);
  [phase, qualification, accuracy, clarity, micText].forEach(node => node && observer.observe(node, { childList: true, subtree: true, characterData: true }));

  if (recordsList) {
    const recordsObserver = new MutationObserver(() => {
      const count = recordsList.children.length;
      if (count > lastRecordCount) showSaved();
      lastRecordCount = count;
    });
    recordsObserver.observe(recordsList, { childList: true });
  }

  render();
})();
