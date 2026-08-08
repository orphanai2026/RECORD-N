(() => {
  'use strict';

  // Scientific references used for this content layer:
  // MaqamWorld: Arabic maqam/jins structure and terminology.
  // Open Music Theory: rhythmic values and meter classification.
  // Equal-temperament references: 12-TET = 100 cents per semitone; 24-TET = 50 cents per step.

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  const tet24 = [
    ['دو', 'C', '0¢'],
    ['دو نصف دييز', 'C half-sharp', '50¢'],
    ['دو♯ / ري♭', 'C♯ / D♭', '100¢'],
    ['ري نصف بيمول', 'D half-flat', '150¢'],
    ['ري', 'D', '200¢'],
    ['ري نصف دييز', 'D half-sharp', '250¢'],
    ['ري♯ / مي♭', 'D♯ / E♭', '300¢'],
    ['مي نصف بيمول', 'E half-flat', '350¢'],
    ['مي', 'E', '400¢'],
    ['مي نصف دييز / فا نصف بيمول', 'E half-sharp / F half-flat', '450¢'],
    ['فا', 'F', '500¢'],
    ['فا نصف دييز', 'F half-sharp', '550¢'],
    ['فا♯ / صول♭', 'F♯ / G♭', '600¢'],
    ['صول نصف بيمول', 'G half-flat', '650¢'],
    ['صول', 'G', '700¢'],
    ['صول نصف دييز', 'G half-sharp', '750¢'],
    ['صول♯ / لا♭', 'G♯ / A♭', '800¢'],
    ['لا نصف بيمول', 'A half-flat', '850¢'],
    ['لا', 'A', '900¢'],
    ['لا نصف دييز', 'A half-sharp', '950¢'],
    ['لا♯ / سي♭', 'A♯ / B♭', '1000¢'],
    ['سي نصف بيمول', 'B half-flat', '1050¢'],
    ['سي', 'B', '1100¢'],
    ['سي نصف دييز / دو نصف بيمول', 'B half-sharp / C half-flat', '1150¢']
  ];

  const maqamat = [
    {
      name: 'راست',
      family: 'عائلة الراست',
      root: 'جنس راست على القرار.',
      upper: 'على الدرجة الخامسة: راست أعلى أو نهاوند.',
      note: 'من أكثر المقامات شيوعًا في الموسيقى العربية.'
    },
    {
      name: 'بياتي',
      family: 'عائلة البياتي',
      root: 'جنس بياتي على القرار.',
      upper: 'على الدرجة الرابعة: نهاوند أو راست.',
      note: 'مقام أساسي واسع الاستعمال في الريبرتوار العربي.'
    },
    {
      name: 'سيكا',
      family: 'عائلة السيكا',
      root: 'جنس سيكا على القرار.',
      upper: 'راست أعلى على الدرجة الثالثة، ثم راست على الدرجة السادسة.',
      note: 'يُعد مقامًا أساسيًا في عائلة السيكا، واستعماله مستقلًا أقل شيوعًا.'
    },
    {
      name: 'عجم',
      family: 'عائلة العجم',
      root: 'جنس عجم على القرار.',
      upper: 'على الدرجة الخامسة: عجم أعلى أو نهاوند.',
      note: 'يعرف أيضًا باسم العجم المصري في بعض المراجع.'
    },
    {
      name: 'نهاوند',
      family: 'عائلة النهاوند',
      root: 'جنس نهاوند على القرار.',
      upper: 'على الدرجة الخامسة: حجاز أو كرد.',
      note: 'من المقامات الأساسية ذات البنية القابلة لتعدد الجنس الأعلى.'
    },
    {
      name: 'كرد',
      family: 'عائلة الكرد',
      root: 'جنس كرد على القرار.',
      upper: 'جنس نهاوند على الدرجة الرابعة.',
      note: 'هو المقام الأساسي في عائلة الكرد.'
    },
    {
      name: 'حجاز',
      family: 'عائلة الحجاز',
      root: 'جنس حجاز على القرار.',
      upper: 'على الدرجة الرابعة: نهاوند أو راست.',
      note: 'هو المقام الأساسي في عائلة الحجاز.'
    },
    {
      name: 'صبا',
      family: 'مقام مستقل عن العائلات',
      root: 'جنس صبا على القرار، ويتداخل معه حجاز على الدرجة الثالثة.',
      upper: 'على الدرجة السادسة: عجم أو نكريز.',
      note: 'لا ينتمي مقام صبا إلى عائلة مقامية في تصنيف MaqamWorld.'
    }
  ];

  const terms = [
    ['Pitch', 'الدرجة / الحِدّة الصوتية', 'النغم', 'الإحساس بارتفاع الصوت أو انخفاضه، ويرتبط أساسًا بتردد الموجة الصوتية.'],
    ['Frequency', 'التردد', 'القياس', 'عدد دورات الموجة الصوتية في الثانية ويُقاس بالهرتز Hz.'],
    ['Cent', 'السنت', 'القياس', 'وحدة لوغاريتمية صغيرة لقياس المسافات الموسيقية؛ نصف الصوت في 12-TET يساوي 100 سنت.'],
    ['Octave', 'الأوكتاف', 'النغم', 'مسافة تتضاعف فيها نسبة التردد 2:1، وتعود فيها النغمة إلى الاسم نفسه في طبقة أعلى.'],
    ['Semitone', 'نصف الصوت', 'النغم', 'أصغر خطوة في 12-TET وتساوي 100 سنت.'],
    ['Quarter Tone', 'ربع الصوت', 'النغم', 'خطوة نظرية مقدارها 50 سنت في 24-TET المتساوي.'],
    ['Tuning', 'الضبط / الدوزان', 'القياس', 'تحديد الترددات المرجعية المستهدفة للنغمات أو الآلة.'],
    ['Intonation', 'دقة الضبط النغمي', 'الأداء', 'مدى مطابقة النغمة المؤداة للموقع النغمي المقصود ضمن السياق الموسيقي.'],
    ['Accidental', 'علامة التحويل', 'التدوين', 'رمز يرفع أو يخفض أو يعيد الدرجة المكتوبة، مثل الدييز والبيمول والبيكار.'],
    ['Tempo', 'السرعة الإيقاعية', 'الإيقاع', 'سرعة جريان النبض الموسيقي، وغالبًا تُقاس بعدد النبضات في الدقيقة BPM.'],
    ['Beat', 'النبضة', 'الإيقاع', 'نبض دوري منتظم يُستخدم كأساس للعد وتنظيم الزمن الموسيقي.'],
    ['Rhythm', 'الإيقاع الزمني', 'الإيقاع', 'ترتيب القيم الزمنية والسكتات وتعاقبها عبر الزمن.'],
    ['Meter', 'الميزان', 'الإيقاع', 'تنظيم النبضات في مجموعات دورية مع تقسيمات داخلية بسيطة أو مركبة أو غير منتظمة.'],
    ['Time Signature', 'علامة الميزان', 'الإيقاع', 'رمزان عدديان يصفان تنظيم الزمن؛ دلالتهما التفصيلية تختلف بين الميزان البسيط والمركب.'],
    ['Measure', 'المازورة', 'الإيقاع', 'مجموعة من النبضات تفصلها خطوط المازورة وفق الميزان المستخدم.'],
    ['Rest', 'السكتة', 'التدوين', 'رمز يمثل مدة صمت موسيقية لها قيمة زمنية محددة.'],
    ['Tie', 'الرباط', 'التدوين', 'قوس يصل نغمتين متتاليتين من الدرجة نفسها ليجمع مدتيهما في صوت مستمر.'],
    ['Dotted Note', 'النغمة المنقوطة', 'التدوين', 'النقطة بعد النغمة تضيف نصف قيمتها الأصلية إلى مدتها.'],
    ['Maqam', 'المقام', 'المقام', 'نظام لحني يجمع السلم والجمل المعتادة وإمكانات الانتقال والزخرفة والسير والجماليات.'],
    ['Jins', 'الجنس', 'المقام', 'قطعة سُلّمية من 3 أو 4 أو 5 نغمات تُعد وحدة أساسية في بناء المقام العربي.'],
    ['Tonic', 'القرار / درجة الأساس', 'المقام', 'الدرجة الرئيسية التي يرتكز عليها المقام أو الجنس ويستقر عندها اللحن.'],
    ['Ghammaz', 'الغمّاز', 'المقام', 'درجة ارتكاز مهمة بعد القرار، وغالبًا تكون نقطة بدء جنس جديد أو انتقال مقامي.'],
    ['Sayr', 'السير', 'المقام', 'المسار أو السلوك اللحني للمقام في الصعود والنزول والارتكاز والانتقال.'],
    ['Modulation', 'الانتقال المقامي', 'المقام', 'التحول اللحني من جنس أو مقام إلى آخر ضمن الأداء أو التأليف.'],
    ['Vibrato', 'الفبراتو', 'الأداء', 'تذبذب دوري صغير حول الدرجة النغمية يُستخدم كتلوين تعبيري.'],
    ['Ornamentation', 'الزخرفة اللحنية', 'الأداء', 'إضافات وحركات لحنية تزيّن النغمة أو الجملة دون تغيير بنيتها الأساسية.']
  ];

  function fact(title, text, accent = false) {
    return `<div class="ney-content-fact${accent ? ' ney-content-fact--accent' : ''}"><strong>${title}</strong><span>${text}</span></div>`;
  }

  function enhanceNotes(body) {
    const panel = $('[data-note-panel="24tet"]', body);
    if (!panel) return;
    panel.innerHTML = `
      <div class="ney-note-grid ney-note-grid--24">
        ${tet24.map(([ar,en,cents]) => `<div class="ney-note-chip"><strong>${ar}</strong><span>${en}</span><span class="ney-note-chip__cents">${cents}</span></div>`).join('')}
      </div>
      <p class="ney-music-reference-note">هذه الدرجات تمثل 24-TET المتساوي: الأوكتاف 1200 سنت مقسّم إلى 24 خطوة، كل خطوة 50 سنت. هذا مرجع رياضي ولا يختزل الضبط المقامي العربي الفعلي.</p>`;

    const info = $('.ney-music-info-panel', body);
    if (info && !$('.ney-content-facts', info)) {
      info.insertAdjacentHTML('beforeend', `<div class="ney-content-facts">
        ${fact('الأساسية', 'سبعة أسماء نغمية تتكرر عبر الأوكتافات.')}
        ${fact('12-TET', 'اثنتا عشرة خطوة متساوية؛ كل نصف صوت = 100 سنت.')}
        ${fact('24-TET', 'أربع وعشرون خطوة متساوية؛ كل ربع خطوة = 50 سنت.', true)}
      </div>`);
    }
  }

  function enhanceAccidentals(body) {
    const panel = $('.ney-music-info-panel', body);
    if (!panel || $('.ney-content-facts', panel)) return;
    panel.insertAdjacentHTML('beforeend', `<div class="ney-content-facts">
      ${fact('♯ دييز', 'يرفع الدرجة 100 سنت في 12-TET.')}
      ${fact('♭ بيمول', 'يخفض الدرجة 100 سنت في 12-TET.')}
      ${fact('♮ بيكار', 'يلغي أثر التحويل السابق على الدرجة.')}
      ${fact('نصف دييز', 'رفع نظري +50 سنت في مرجع 24-TET.', true)}
      ${fact('نصف بيمول', 'خفض نظري −50 سنت في مرجع 24-TET.', true)}
    </div>`);
  }

  function enhanceDurations(body) {
    const panel = $('.ney-music-info-panel', body);
    if (!panel || $('.ney-content-facts', panel)) return;
    panel.insertAdjacentHTML('beforeend', `<div class="ney-content-facts">
      ${fact('العلاقة بين القيم', 'كل قيمة زمنية في السلسلة المعروضة تساوي نصف القيمة التي قبلها.')}
      ${fact('النقطة', 'تضيف إلى النغمة نصف مدتها الأصلية؛ النوار المنقوط = نوار + كروش.')}
      ${fact('الرباط', 'يجمع مدتي نغمتين متتاليتين من الدرجة نفسها في صوت واحد مستمر.')}
      ${fact('السكتات', 'لكل قيمة زمنية رمز سكتة مقابل يمثل المدة نفسها من الصمت.')}
    </div>`);
  }

  function enhanceMeters(body) {
    if (!$('.ney-meter-grid', body)) return;
    if (!$('[data-meter-guide]', body)) {
      body.insertAdjacentHTML('afterbegin', `<section class="ney-music-info-panel" data-meter-guide>
        <h4>كيف تُقرأ علامة الميزان؟</h4>
        <div class="ney-content-facts">
          ${fact('الميزان البسيط', 'النبضة تنقسم إلى جزأين متساويين؛ مثل 2/4 و3/4 و4/4.')}
          ${fact('الميزان المركب', 'النبضة تنقسم إلى ثلاثة أجزاء متساوية؛ مثل 6/8 و9/8 و12/8.', true)}
          ${fact('غير المنتظم', 'يجمع عددًا غير متماثل من الوحدات، مثل 5/8 و7/8، ويعتمد تجميعه على القطعة.')}
        </div>
      </section>`);
    }

    const details = {
      '2 / 4': 'نبضتان؛ النوار وحدة النبض.',
      '3 / 4': 'ثلاث نبضات؛ النوار وحدة النبض.',
      '4 / 4': 'أربع نبضات؛ النوار وحدة النبض.',
      '6 / 8': 'نبضتان مركبتان؛ كل نبضة = نوار منقوط = 3 كروش.',
      '9 / 8': 'ثلاث نبضات مركبة؛ كل نبضة = 3 كروش.',
      '12 / 8': 'أربع نبضات مركبة؛ كل نبضة = 3 كروش.',
      '5 / 8': 'تجميع شائع: 2+3 أو 3+2، بحسب القطعة.',
      '7 / 8': 'تجميعات شائعة مثل 2+2+3 أو 3+2+2، بحسب القطعة.'
    };
    $$('.ney-meter-card', body).forEach(card => {
      if ($('.ney-meter-card__detail', card)) return;
      const meter = $('.ney-meter-card__fraction', card)?.textContent.trim();
      if (details[meter]) card.insertAdjacentHTML('beforeend', `<span class="ney-meter-card__detail">${details[meter]}</span>`);
    });
  }

  function enhanceOctaves(body) {
    const panel = $('.ney-music-info-panel', body);
    if (!panel || $('.ney-layer-grid', panel)) return;
    panel.insertAdjacentHTML('beforeend', `
      <div class="ney-content-facts">
        ${fact('الصعود أوكتافًا', 'يضاعف التردد ×2 مع بقاء اسم النغمة نفسه.')}
        ${fact('النزول أوكتافًا', 'يخفض التردد إلى النصف ÷2.')}
        ${fact('مثال', 'إذا كانت A4 = 440 Hz فإن A5 = 880 Hz وA3 = 220 Hz.', true)}
      </div>
      <div class="ney-layer-grid" aria-label="مصطلحات طبقات الناي">
        <div class="ney-layer-chip"><strong>قرار القرار</strong><span>الطبقة الأخفض ضمن تقسيم المنهج.</span></div>
        <div class="ney-layer-chip"><strong>القرار</strong><span>الطبقة الأساسية المنخفضة.</span></div>
        <div class="ney-layer-chip"><strong>الجواب</strong><span>طبقة أعلى من القرار.</span></div>
        <div class="ney-layer-chip"><strong>جواب الجواب</strong><span>طبقة أعلى تلي الجواب.</span></div>
      </div>
      <p class="ney-content-source-note">هذه أسماء طبقات تعليمية في منهج الناي هنا، ولا تربط في هذا الإصدار بأصابعية محددة.</p>`);
  }

  function enhanceTet(body) {
    const panel = $('.ney-music-info-panel', body);
    if (!panel || $('.ney-content-facts', panel)) return;
    panel.insertAdjacentHTML('beforeend', `<div class="ney-content-facts">
      ${fact('الأوكتاف', '1200 سنت في القياس اللوغاريتمي للمسافات الموسيقية.')}
      ${fact('12-TET', '12 خطوة × 100 سنت؛ مناسب للمرجع الكروماتيكي الغربي المتساوي.')}
      ${fact('24-TET', '24 خطوة × 50 سنت؛ مرجع نظري لتمثيل أرباع الصوت.', true)}
      ${fact('حدود النموذج', 'المقام العربي يتضمن سيرًا وأجناسًا وزخرفة ومواقع نغمية قد لا تختزل في 24-TET.')}
    </div>`);
  }

  function enhanceMaqamat(body) {
    if ($('.ney-maqam-reference', body)) return;
    body.insertAdjacentHTML('beforeend', `<section class="ney-music-info-panel ney-maqam-reference">
      <h4>البنية المرجعية للمقامات الثمانية</h4>
      <p>المقام العربي ليس سلّمًا فقط؛ بل إطار لحني يشمل الأجناس والسير والارتكاز والانتقالات والزخارف. البطاقات التالية تلخص بنية الأجناس الأساسية دون تثبيت مقام على درجة واحدة.</p>
      <div class="ney-maqam-detail-grid">
        ${maqamat.map(item => `<article class="ney-maqam-detail-card">
          <h5>${item.name}</h5>
          <dl>
            <div><dt>التصنيف</dt><dd>${item.family}</dd></div>
            <div><dt>جنس الأصل</dt><dd>${item.root}</dd></div>
            <div><dt>الجنس الأعلى / الغمّاز</dt><dd>${item.upper}</dd></div>
            <div><dt>ملاحظة</dt><dd>${item.note}</dd></div>
          </dl>
        </article>`).join('')}
      </div>
      <p class="ney-music-reference-note">المرجع البنيوي: MaqamWorld. لا تُعرض هنا قيم سنت ثابتة للمقامات؛ لأن الأداء والضبط المقامي لا يساويان بالضرورة تقسيم 24-TET النظري.</p>
    </section>`);
  }

  function renderTerms(filter = '') {
    const q = filter.trim().toLocaleLowerCase('ar');
    const matched = terms.filter(row => row.join(' ').toLocaleLowerCase('ar').includes(q));
    if (!matched.length) return '<div class="ney-music-empty-filter">لا توجد نتيجة مطابقة.</div>';
    return matched.map(([en,ar,category,definition]) => `<article class="ney-term-card ney-term-card--defined">
      <strong>${ar}</strong>
      <span dir="ltr">${en}</span>
      <p>${definition}</p>
      <span class="ney-term-card__category">${category}</span>
    </article>`).join('');
  }

  function enhanceTerms(body) {
    if (body.dataset.completeTerms === 'true') return;
    body.dataset.completeTerms = 'true';
    body.innerHTML = `<section class="ney-music-info-panel">
      <div class="ney-term-search"><input type="search" data-complete-term-search placeholder="ابحث عن مصطلح عربي أو إنجليزي" aria-label="بحث المصطلحات الموسيقية"></div>
      <div class="ney-term-grid ney-term-grid--complete" data-complete-term-grid>${renderTerms()}</div>
      <p class="ney-content-source-note">تُعرض التعريفات بصياغة تعليمية مختصرة، مع اعتماد مصطلحات المقام والجنس والسير والغمّاز على مرجع MaqamWorld.</p>
    </section>`;
    const input = $('[data-complete-term-search]', body);
    const grid = $('[data-complete-term-grid]', body);
    input?.addEventListener('input', () => { grid.innerHTML = renderTerms(input.value); });
  }

  function enhanceCurrent() {
    const screen = $('.ney-screen--music-library');
    const detail = $('.ney-music-library__detail', screen);
    const body = $('[data-detail-body]', detail);
    const title = $('[data-detail-title]', detail)?.textContent.trim();
    if (!screen || !detail || detail.hidden || !body || !title) return;
    if (body.dataset.contentCompleteFor === title && title !== 'المصطلحات الموسيقية') return;

    if (title !== 'المصطلحات الموسيقية') body.dataset.contentCompleteFor = title;

    switch (title) {
      case 'النغمات الموسيقية': enhanceNotes(body); break;
      case 'العلامات والتحويلات': enhanceAccidentals(body); break;
      case 'القيم الزمنية': enhanceDurations(body); break;
      case 'الموازين والإيقاع': enhanceMeters(body); break;
      case 'الأوكتافات والطبقات': enhanceOctaves(body); break;
      case '12-TET و24-TET': enhanceTet(body); break;
      case 'المقامات الشرقية': enhanceMaqamat(body); break;
      case 'المصطلحات الموسيقية': enhanceTerms(body); break;
    }
  }

  function install() {
    const screen = $('.ney-screen--music-library');
    if (!screen) {
      window.setTimeout(install, 100);
      return;
    }

    const observer = new MutationObserver(() => requestAnimationFrame(enhanceCurrent));
    observer.observe(screen, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
    window.addEventListener('ney:screenchange', () => requestAnimationFrame(enhanceCurrent));
    requestAnimationFrame(enhanceCurrent);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
