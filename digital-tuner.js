(() => {
  'use strict';

  function initializeDigitalTuner() {
    const root = document.getElementById('tunerDigital');
    const source = {
      cents: document.getElementById('tunerNeedleValue'),
      state: document.getElementById('tuningStateText'),
      metric: document.getElementById('deviationMetric'),
      target: document.getElementById('targetValue'),
      frequency: document.getElementById('frequencyValue')
    };
    const output = {
      cents: document.getElementById('digitalCentsValue'),
      state: document.getElementById('digitalStateText'),
      target: document.getElementById('digitalTargetValue'),
      frequency: document.getElementById('digitalFrequencyValue')
    };

    if (!root || Object.values(source).some(item => !item) || Object.values(output).some(item => !item)) return;

    const update = () => {
      const state = source.metric.dataset.state || 'idle';
      root.dataset.state = state;
      output.cents.textContent = state === 'idle' ? '— — —' : source.cents.textContent.trim();
      output.state.textContent = state === 'idle' ? 'بانتظار النغمة' : source.state.textContent.trim();
      output.target.textContent = `الهدف ${source.target.textContent.trim()}`;
      output.frequency.textContent = source.frequency.textContent.trim();
    };

    const observer = new MutationObserver(update);
    Object.values(source).forEach(element => observer.observe(element, {
      attributes: true,
      childList: true,
      subtree: true
    }));
    update();
  }

  function ensureDialogStyles() {
    if (document.querySelector('link[data-modal-content-styles]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'modal-content.css?v=2026-08-06-r1';
    link.dataset.modalContentStyles = 'true';
    document.head.append(link);
  }

  function helpDialogMarkup() {
    return `
      <form method="dialog" class="info-dialog-form">
        <header class="info-dialog-header">
          <div class="info-dialog-heading">
            <span class="info-dialog-kicker">دليل الاستخدام</span>
            <h2>طريقة استخدام معيار الناي</h2>
            <p>دليل مختصر وواضح لفهم المعيار، تسجيل النغمات، واستخدام السلم الكروماتك والتصدير.</p>
          </div>
          <button class="info-dialog-close" value="cancel" aria-label="إغلاق نافذة طريقة الاستخدام">×</button>
        </header>

        <div class="info-dialog-body">
          <div class="guide-tabs" role="tablist" aria-label="أقسام طريقة الاستخدام">
            <button class="guide-tab" type="button" role="tab" aria-selected="true" data-guide-tab="start">البدء</button>
            <button class="guide-tab" type="button" role="tab" aria-selected="false" data-guide-tab="single">التسجيل المنفصل</button>
            <button class="guide-tab" type="button" role="tab" aria-selected="false" data-guide-tab="chromatic">السلم الكروماتك</button>
            <button class="guide-tab" type="button" role="tab" aria-selected="false" data-guide-tab="export">التصدير</button>
            <button class="guide-tab" type="button" role="tab" aria-selected="false" data-guide-tab="limits">النصائح والحدود</button>
          </div>

          <section class="guide-panel" role="tabpanel" data-guide-panel="start">
            <h3 class="info-section-title">البدء وقراءة المعيار</h3>
            <p class="info-lead">شغّل الميكروفون ثم اعزف نغمة طويلة وثابتة. ستعرض الأداة اسم النغمة وطبقتها والتردد والانحراف وجودة الإشارة لحظة بلحظة.</p>
            <div class="steps-grid">
              <article class="step-card"><span class="step-number">1</span><strong>تشغيل الميكروفون</strong><p>اضغط زر تشغيل الميكروفون واسمح للمتصفح باستخدامه.</p></article>
              <article class="step-card"><span class="step-number">2</span><strong>عزف نغمة ثابتة</strong><p>اعزف في مكان هادئ وحافظ على مسافة وزاوية ثابتتين.</p></article>
              <article class="step-card"><span class="step-number">3</span><strong>قراءة النتيجة</strong><p>راقب النغمة والتردد والانحراف وجودة الإشارة والثبات.</p></article>
            </div>
            <div class="tuning-legend">
              <div class="tuning-chip tuning-chip--flat"><i></i><div><strong>منخفض</strong><span>التردد أقل من الهدف</span></div></div>
              <div class="tuning-chip tuning-chip--tuned"><i></i><div><strong>مضبوط</strong><span>داخل هامش السنت</span></div></div>
              <div class="tuning-chip tuning-chip--sharp"><i></i><div><strong>مرتفع</strong><span>التردد أعلى من الهدف</span></div></div>
            </div>
            <div class="info-callout">القيمة السالبة تعني أن النغمة منخفضة، والقيمة الموجبة تعني أنها مرتفعة. يمكن تعديل هامش السنت من الإعدادات المتقدمة.</div>
          </section>

          <section class="guide-panel" role="tabpanel" data-guide-panel="single" hidden>
            <h3 class="info-section-title">تسجيل نغمة منفصلة</h3>
            <ol class="info-list">
              <li>اختر وضع <strong>منفصل</strong> وحدد التقسيم والقيمة الموسيقية ومرجع A4.</li>
              <li>اضغط <strong>تجهيز تسجيل النغمة</strong> لتدخل الأداة في حالة انتظار.</li>
              <li>يبدأ التسجيل بعد ثلاث قراءات صحيحة متتالية للنغمة نفسها، وبجودة بداية لا تقل عن 65%.</li>
              <li>تستمر مراقبة الدقة والثبات والجودة طوال مدة التسجيل.</li>
              <li>يحفظ التسجيل عند بلوغ دقة 90% أو أكثر، ومتوسط انحراف داخل الهامش، ومتوسط جودة يحقق الحد المحدد.</li>
              <li>عند الرفض تظهر الأسباب بالأرقام وتعود الأداة تلقائيًا لانتظار محاولة جديدة.</li>
            </ol>
            <div class="info-callout">التسجيل المرفوض لا يضاف إلى المكتبة ولا يدخل ضمن التصدير.</div>
          </section>

          <section class="guide-panel" role="tabpanel" data-guide-panel="chromatic" hidden>
            <h3 class="info-section-title">تسجيل سلم كروماتك</h3>
            <div class="steps-grid">
              <article class="step-card"><span class="step-number">1</span><strong>حدد النطاق</strong><p>اختر نغمة البداية والنهاية واتجاه السلم صاعدًا أو هابطًا.</p></article>
              <article class="step-card"><span class="step-number">2</span><strong>جهّز الجلسة</strong><p>تنشئ الأداة قائمة النغمات وفق 12-TET أو 24-TET.</p></article>
              <article class="step-card"><span class="step-number">3</span><strong>تابع التقدم</strong><p>تعرض الأداة النغمة الحالية والتالية ولا تتجاوز نغمة غير معتمدة.</p></article>
            </div>
            <ul class="info-list">
              <li>عند نجاح التسجيل تنتقل الأداة تلقائيًا إلى النغمة التالية.</li>
              <li>عند الرفض تبقى الجلسة على النغمة نفسها وتعيد انتظارها.</li>
              <li>يمكن إيقاف الجلسة مؤقتًا أو إنهاؤها مع الاحتفاظ بالتسجيلات الناجحة.</li>
              <li>لا تغيّر مرجع A4 أو التقسيم أو القيمة الموسيقية أثناء الجلسة.</li>
            </ul>
          </section>

          <section class="guide-panel" role="tabpanel" data-guide-panel="export" hidden>
            <h3 class="info-section-title">المكتبة والتصدير</h3>
            <div class="feature-grid">
              <article class="feature-card"><span class="feature-icon">▶</span><strong>الاستماع</strong><p>استمع إلى كل تسجيل مع عرض النغمة والتردد وبياناته.</p></article>
              <article class="feature-card"><span class="feature-icon">✎</span><strong>إدارة التسجيل</strong><p>أعد تسمية التسجيل أو احذفه أو نزّله بصورة منفردة.</p></article>
              <article class="feature-card"><span class="feature-icon">W</span><strong>WAV عالي الدقة</strong><p>مناسب للأرشفة والمعالجة الصوتية والتعليم.</p></article>
              <article class="feature-card"><span class="feature-icon">M</span><strong>MP3 وJSON</strong><p>MP3 للمشاركة وJSON لحفظ بيانات القياس والتوثيق.</p></article>
            </div>
            <div class="info-callout">يمكن اختيار صيغة التصدير من مكتبة التسجيلات ثم تصدير تسجيل واحد أو جميع التسجيلات.</div>
          </section>

          <section class="guide-panel" role="tabpanel" data-guide-panel="limits" hidden>
            <h3 class="info-section-title">نصائح للحصول على أفضل نتيجة</h3>
            <ul class="info-list">
              <li>استخدم ميكروفونًا واضحًا وابتعد عن المراوح والتلفاز والضوضاء.</li>
              <li>حافظ على مسافة ثابتة من الميكروفون واعزف نغمة طويلة دون اهتزاز مفرط.</li>
              <li>راقب جودة الإشارة قبل تجهيز التسجيل وتجنب تغيير زاوية الناي أثناءه.</li>
              <li>قد تطبق بعض الهواتف والمتصفحات معالجة تلقائية تؤثر في القياس.</li>
              <li>الأداة تقيس التردد والثبات والجودة، لكنها لا تستبدل التقييم الموسيقي الكامل.</li>
              <li>وضع 24-TET شبكة أرباع تون متساوية، ولا يمثل جميع فروق الأداء في المقامات العربية.</li>
              <li>أبق الصفحة مفتوحة أثناء التسجيل أو جلسة السلم الكروماتك.</li>
            </ul>
          </section>
        </div>

        <footer class="info-dialog-footer">
          <small>يمكن العودة إلى هذا الدليل في أي وقت من رأس الصفحة.</small>
          <button class="info-dialog-action" value="default">ابدأ استخدام الأداة</button>
        </footer>
      </form>`;
  }

  function aboutDialogMarkup(version) {
    const versionText = version ? `الإصدار ${version}` : 'الإصدار غير متاح';
    return `
      <form method="dialog" class="info-dialog-form">
        <header class="info-dialog-header">
          <div class="info-dialog-heading">
            <span class="info-dialog-kicker">عن المشروع</span>
            <h2>عن معيار الناي</h2>
            <p>مشروع رقمي عربي يربط دقة القياس الصوتي باحتياجات الناي والموسيقى الشرقية.</p>
          </div>
          <button class="info-dialog-close" value="cancel" aria-label="إغلاق نافذة من نحن">×</button>
        </header>

        <div class="info-dialog-body">
          <div class="about-hero">
            <section class="about-story">
              <h3 class="info-section-title">الفكرة والرسالة</h3>
              <p><strong>معيار الناي</strong> أداة عربية متخصصة لقياس نغمات الناي والآلات الشرقية وتحليلها وتسجيلها. تعرض التردد والانحراف وجودة الإشارة والثبات لحظيًا، وتساعد على إنتاج تسجيلات مرجعية دقيقة يمكن الاعتماد عليها في التدريب وصناعة المحتوى الموسيقي التعليمي.</p>
            </section>
            <aside class="about-signature">
              <strong>تطوير وإشراف</strong>
              <span>محمد الزهراني</span>
              <span>مشروع عربي مستقل لتقنيات تعليم الناي</span>
            </aside>
          </div>

          <div class="about-pillars">
            <article class="about-pillar"><span class="pillar-icon">◎</span><strong>قياس لحظي</strong><p>قراءة التردد والانحراف وجودة الإشارة والثبات بصورة مباشرة.</p></article>
            <article class="about-pillar"><span class="pillar-icon">♫</span><strong>دعم شرقي</strong><p>دعم شبكتي 12-TET و24-TET مع مرجع A4 قابل للتعديل.</p></article>
            <article class="about-pillar"><span class="pillar-icon">●</span><strong>تسجيل موثوق</strong><p>تسجيل تلقائي مع شروط قبول دقيقة ورفض التسجيل غير المطابق.</p></article>
          </div>

          <section class="about-features">
            <h3 class="info-section-title">ما الذي تقدمه الأداة؟</h3>
            <div class="feature-grid">
              <article class="feature-card"><span class="feature-icon">12</span><strong>12-TET و24-TET</strong><p>قياس أنصاف التون وأرباع التون المتساوية ضمن واجهة واحدة.</p></article>
              <article class="feature-card"><span class="feature-icon">A</span><strong>مرجع A4 مرن</strong><p>تعديل مرجع الضبط بحسب التسجيل أو البيئة الموسيقية.</p></article>
              <article class="feature-card"><span class="feature-icon">✓</span><strong>اعتماد تلقائي</strong><p>حفظ التسجيل فقط بعد تحقق الدقة والثبات وجودة الإشارة.</p></article>
              <article class="feature-card"><span class="feature-icon">↗</span><strong>سلم كروماتك</strong><p>تسجيل تتابعي منظم مع تقدم واضح وانتقال تلقائي بين النغمات.</p></article>
              <article class="feature-card"><span class="feature-icon">⇩</span><strong>تصدير متعدد</strong><p>تصدير WAV عالي الدقة وMP3 وJSON للتوثيق والمعالجة.</p></article>
              <article class="feature-card"><span class="feature-icon">▣</span><strong>واجهة متجاوبة</strong><p>تصميم عربي يعمل على الكمبيوتر والتابلت والجوال.</p></article>
            </div>
          </section>

          <div class="info-callout"><strong>ملاحظة علمية:</strong> يعرض وضع 24-TET شبكة أرباع تون متساوية لأغراض القياس والتدريب، لكنه لا يدّعي تمثيل جميع تفاصيل الضبط والأداء في المقامات العربية؛ فقد تختلف بعض الدرجات بحسب المقام والمدرسة والأسلوب الأدائي.</div>

          <div class="project-meta">
            <div>الإصدار<strong id="aboutVersion">${versionText}</strong></div>
            <div>حالة المشروع<strong>نسخة تجريبية قيد التطوير</strong></div>
            <div>المستودع<a href="https://github.com/orphanai2026/RECORD-N" target="_blank" rel="noopener">orphanai2026/RECORD-N</a></div>
          </div>
        </div>

        <footer class="info-dialog-footer">
          <small>© 2026 محمد الزهراني. جميع الحقوق محفوظة.</small>
          <button class="info-dialog-action" value="default">العودة إلى الأداة</button>
        </footer>
      </form>`;
  }

  function bindGuideTabs(dialog) {
    const tabs = [...dialog.querySelectorAll('[data-guide-tab]')];
    const panels = [...dialog.querySelectorAll('[data-guide-panel]')];
    tabs.forEach(tab => tab.addEventListener('click', () => {
      const target = tab.dataset.guideTab;
      tabs.forEach(item => item.setAttribute('aria-selected', String(item === tab)));
      panels.forEach(panel => { panel.hidden = panel.dataset.guidePanel !== target; });
    }));
  }

  async function rebuildInformationDialogs() {
    ensureDialogStyles();
    const helpDialog = document.getElementById('helpDialog');
    const aboutDialog = document.getElementById('aboutDialog');
    if (!helpDialog || !aboutDialog) return;

    let version = '';
    try {
      const response = await fetch('VERSION.json', { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        version = data.version || '';
      }
    } catch {
      version = '';
    }

    helpDialog.className = 'info-dialog';
    aboutDialog.className = 'info-dialog';
    helpDialog.innerHTML = helpDialogMarkup();
    aboutDialog.innerHTML = aboutDialogMarkup(version);
    bindGuideTabs(helpDialog);
  }

  document.addEventListener('DOMContentLoaded', () => {
    initializeDigitalTuner();
    rebuildInformationDialogs();
  });
})();

(()=>{"use strict";const r=document.getElementById("a4Reference"),b=document.getElementById("brandReferenceValue");if(!r||!b)return;const u=()=>{const v=Number(r.value||440);b.textContent=`A4 = ${Number.isInteger(v)?v.toFixed(0):v.toFixed(1)} Hz`};r.addEventListener("input",u);r.addEventListener("change",u);u()})();
