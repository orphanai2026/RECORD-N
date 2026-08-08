(() => {
  'use strict';

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const icon = path => `<svg viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;

  const categoryData = [
    {
      id: 'notes',
      title: 'النغمات الموسيقية',
      description: 'الأسماء الأساسية والكروماتيكية والدرجات الشرقية بطريقة بصرية مبسطة.',
      icon: icon('<path d="M9 18V5l9-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="15" cy="16" r="3"></circle>')
    },
    {
      id: 'accidentals',
      title: 'العلامات والتحويلات',
      description: 'الدييز والبيمول والبيكار وعلامات الربع تون مع شرح موجز.',
      icon: icon('<path d="M8 3v18M16 3v18M5 9l14-2M5 16l14-2"></path>')
    },
    {
      id: 'durations',
      title: 'القيم الزمنية',
      description: 'شكل النوتة واسمها وقيمتها الزمنية في بطاقات تعليمية واضحة.',
      icon: icon('<path d="M9 4v12a3 3 0 1 1-2-2.83V6l9-2v10a3 3 0 1 1-2-2.83V2"></path>')
    },
    {
      id: 'meters',
      title: 'الموازين والإيقاع',
      description: 'موازين بسيطة ومركبة وغير منتظمة مع تصور للنبضات القوية والضعيفة.',
      icon: icon('<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path>')
    },
    {
      id: 'octaves',
      title: 'الأوكتافات والطبقات',
      description: 'فهم انتقال النغمة بين الأوكتافات وعلاقة القرار بالجواب بصريًا.',
      icon: icon('<path d="M5 18 12 6l7 12"></path><path d="M8 14h8"></path>')
    },
    {
      id: 'tet',
      title: '12-TET و24-TET',
      description: 'مقارنة بصرية بين تقسيم الأوكتاف إلى 12 و24 خطوة متساوية.',
      icon: icon('<path d="M4 7h16M4 12h16M4 17h16"></path><path d="M8 5v14M16 5v14"></path>')
    },
    {
      id: 'maqamat',
      title: 'المقامات الشرقية',
      description: 'خريطة بصرية للمقامات الأساسية المعتمدة في الأداة.',
      icon: icon('<path d="M4 18c4-8 12-8 16 0"></path><path d="M6 13c3-5 9-5 12 0"></path><circle cx="12" cy="8" r="2"></circle>')
    },
    {
      id: 'terms',
      title: 'المصطلحات الموسيقية',
      description: 'قاموس مصغر قابل للبحث للمفاهيم الأساسية في النغم والإيقاع والأداء.',
      icon: icon('<path d="M5 4h14v16H5z"></path><path d="M8 8h8M8 12h6M8 16h5"></path>')
    }
  ];

  function noteIcon(type = 'quarter') {
    if (type === 'whole') return '<svg viewBox="0 0 64 80" aria-hidden="true"><ellipse cx="32" cy="54" rx="16" ry="10"></ellipse></svg>';
    if (type === 'half') return '<svg viewBox="0 0 64 80" aria-hidden="true"><ellipse cx="25" cy="57" rx="13" ry="9"></ellipse><path d="M38 57V14"></path></svg>';
    if (type === 'eighth') return '<svg viewBox="0 0 64 80" aria-hidden="true"><ellipse class="filled" cx="23" cy="58" rx="12" ry="9"></ellipse><path d="M35 58V14"></path><path d="M35 14c12 2 16 9 14 18"></path></svg>';
    if (type === 'sixteenth') return '<svg viewBox="0 0 64 80" aria-hidden="true"><ellipse class="filled" cx="23" cy="58" rx="12" ry="9"></ellipse><path d="M35 58V12"></path><path d="M35 12c12 2 16 8 14 16"></path><path d="M35 23c11 2 15 8 13 15"></path></svg>';
    return '<svg viewBox="0 0 64 80" aria-hidden="true"><ellipse class="filled" cx="24" cy="58" rx="12" ry="9"></ellipse><path d="M36 58V14"></path></svg>';
  }

  function renderNotes() {
    const natural = [['دو','C'],['ري','D'],['مي','E'],['فا','F'],['صول','G'],['لا','A'],['سي','B']];
    const chromatic = [['دو','C'],['دو♯ / ري♭','C♯ / D♭'],['ري','D'],['ري♯ / مي♭','D♯ / E♭'],['مي','E'],['فا','F'],['فا♯ / صول♭','F♯ / G♭'],['صول','G'],['صول♯ / لا♭','G♯ / A♭'],['لا','A'],['لا♯ / سي♭','A♯ / B♭'],['سي','B']];
    const renderGrid = list => `<div class="ney-note-grid">${list.map(([ar,en]) => `<div class="ney-note-chip"><strong>${ar}</strong><span>${en}</span></div>`).join('')}</div>`;
    return `
      <section class="ney-music-info-panel">
        <div class="ney-music-segments" role="group" aria-label="تقسيم النغمات">
          <button type="button" data-note-mode="natural" aria-pressed="true">النغمات الأساسية</button>
          <button type="button" data-note-mode="12tet" aria-pressed="false">12-TET</button>
          <button type="button" data-note-mode="24tet" aria-pressed="false">24-TET</button>
        </div>
        <div data-note-panel="natural">${renderGrid(natural)}</div>
        <div data-note-panel="12tet" hidden>${renderGrid(chromatic)}</div>
        <div data-note-panel="24tet" hidden>
          <p>سيُعرض هنا تقسيم 24-TET بصريًا مع درجات الربع تون بعد مراجعة الرموز والأسماء علميًا قبل اعتماد النص النهائي.</p>
          <p class="ney-music-reference-note">24-TET مرجع رياضي متساوي التقسيم، ولا يمثل وحده جميع تفاصيل الضبط المقامي العربي الفعلي.</p>
        </div>
      </section>`;
  }

  function renderAccidentals() {
    const cards = [
      ['♯','دييز','Sharp','يرفع الدرجة نصف صوت في نظام 12-TET.'],
      ['♭','بيمول','Flat','يخفض الدرجة نصف صوت في نظام 12-TET.'],
      ['♮','بيكار','Natural','يلغي أثر علامة التحويل السابقة على الدرجة.']
    ];
    return `<section class="ney-music-info-panel"><div class="ney-accidental-grid">${cards.map(([symbol,ar,en,desc]) => `<div class="ney-accidental-card"><span class="ney-accidental-card__symbol">${symbol}</span><strong>${ar}</strong><span>${en}</span><span>${desc}</span></div>`).join('')}</div><p class="ney-music-reference-note">علامتا نصف الدييز ونصف البيمول ستضافان بعد تثبيت الرمز الطباعي المعتمد ومراجعتهما علميًا. القيمة النظرية في 24-TET هي 50 سنت، بينما الأداء المقامي قد يختلف.</p></section>`;
  }

  function renderDurations() {
    const values = [
      ['whole','الروند','Whole Note','4 أزمنة'],
      ['half','البلانش','Half Note','زمنان'],
      ['quarter','النوار','Quarter Note','زمن واحد'],
      ['eighth','الكروش','Eighth Note','نصف زمن'],
      ['sixteenth','الدبل كروش','Sixteenth Note','ربع زمن']
    ];
    return `<section class="ney-music-info-panel"><div class="ney-duration-grid">${values.map(([type,ar,en,beats]) => `<div class="ney-duration-card">${noteIcon(type)}<strong>${ar}</strong><span>${en}</span><span class="ney-duration-card__beats">${beats}</span></div>`).join('')}</div><p class="ney-music-reference-note">القيم الزمنية أعلاه تُفهم بالنسبة إلى نبضة مرجعية يكون فيها النوار = زمن واحد.</p></section>`;
  }

  function pulse(count) {
    return `<span class="ney-meter-card__pulse">${Array.from({length: count}, () => '<i></i>').join('')}</span>`;
  }

  function renderMeters() {
    const groups = [
      ['بسيطة',[['2 / 4',2,'نبضتان'],['3 / 4',3,'ثلاث نبضات'],['4 / 4',4,'أربع نبضات']]],
      ['مركبة',[['6 / 8',2,'نبضتان مركبتان'],['9 / 8',3,'ثلاث نبضات مركبة'],['12 / 8',4,'أربع نبضات مركبة']]],
      ['غير منتظمة',[['5 / 8',5,'تجميع غير منتظم'],['7 / 8',7,'تجميع غير منتظم']]]
    ];
    return groups.map(([title,items]) => `<section class="ney-music-info-panel"><h4>موازين ${title}</h4><div class="ney-meter-grid">${items.map(([meter,count,desc]) => `<div class="ney-meter-card"><span class="ney-meter-card__fraction">${meter}</span><strong>${desc}</strong>${pulse(count)}</div>`).join('')}</div></section>`).join('');
  }

  function renderOctaves() {
    return `<section class="ney-music-info-panel"><h4>النغمة نفسها عبر الأوكتافات</h4><p>يتكرر اسم النغمة في طبقات أعلى أو أدنى، بينما يتضاعف التردد عند الصعود أوكتافًا كاملًا.</p><div class="ney-octave-lane"><div class="ney-octave-step"><strong>C3</strong><span>طبقة أخفض</span></div><div class="ney-octave-arrow">←</div><div class="ney-octave-step"><strong>C4</strong><span>طبقة وسطى</span></div><div class="ney-octave-arrow">←</div><div class="ney-octave-step"><strong>C5</strong><span>طبقة أعلى</span></div></div><p class="ney-music-reference-note">ربط هذه المفاهيم بتقسيمات طبقات الناي في المنهج سيبقى منفصلًا عن الأصابعية في هذا الإصدار.</p></section>`;
  }

  function steps(count) { return Array.from({length: count}, () => '<i></i>').join(''); }
  function renderTet() {
    return `<section class="ney-music-info-panel"><div class="ney-tet-grid"><div class="ney-tet-card"><span class="ney-tet-card__number">12-TET</span><strong>12 خطوة متساوية في الأوكتاف</strong><span>كل خطوة = 100 سنت</span><span class="ney-tet-card__steps">${steps(12)}</span></div><div class="ney-tet-card ney-tet-card--24"><span class="ney-tet-card__number">24-TET</span><strong>24 خطوة متساوية في الأوكتاف</strong><span>كل خطوة = 50 سنت</span><span class="ney-tet-card__steps">${steps(24)}</span></div></div><p class="ney-music-reference-note">24-TET نموذج مرجعي رياضي. الضبط المقامي العربي والأداء العملي قد يستخدمان مواقع نغمية لا تختزل دائمًا في 50 سنت ثابتة.</p></section>`;
  }

  function renderMaqamat() {
    const groups = [
      ['مقامات الربع تون الأساسية',['راست','بياتي','سيكا']],
      ['المقامات الخالية من الربع تون',['عجم','نهاوند','كرد']],
      ['المقامات ذات الأبعاد الخاصة',['حجاز','صبا']]
    ];
    return `<section class="ney-music-info-panel"><div class="ney-maqam-groups">${groups.map(([title,items]) => `<div class="ney-maqam-group"><h5>${title}</h5><ul>${items.map(item => `<li>${item}</li>`).join('')}</ul></div>`).join('')}</div><p class="ney-music-reference-note">الأبعاد والأجناس والنغمات التفصيلية لكل مقام ستُثبت بعد مراجعتها من المصدر الموسيقي المعتمد، ولن تُملأ بالتخمين.</p></section>`;
  }

  const terms = [
    ['Pitch','الدرجة الصوتية','النغم'],
    ['Cent','السنت','القياس'],
    ['Octave','الأوكتاف','النغم'],
    ['Tempo','السرعة الإيقاعية','الإيقاع'],
    ['Beat','النبضة','الإيقاع'],
    ['Measure','المازورة / الميزان','الإيقاع'],
    ['Maqam','المقام','المقام'],
    ['Jins','الجنس','المقام'],
    ['Tonic','درجة الأساس','النغم'],
    ['Vibrato','الفبراتو','الأداء']
  ];
  function termCards(filter = '') {
    const q = filter.trim().toLocaleLowerCase('ar');
    const matched = terms.filter(row => row.join(' ').toLocaleLowerCase('ar').includes(q));
    if (!matched.length) return '<div class="ney-music-empty-filter">لا توجد نتيجة مطابقة.</div>';
    return matched.map(([en,ar,category]) => `<div class="ney-term-card"><strong>${ar}</strong><span dir="ltr">${en}</span><span class="ney-term-card__category">${category}</span></div>`).join('');
  }
  function renderTerms() {
    return `<section class="ney-music-info-panel"><div class="ney-term-search"><input type="search" data-term-search placeholder="ابحث عن مصطلح عربي أو إنجليزي" aria-label="بحث المصطلحات الموسيقية"></div><div class="ney-term-grid" data-term-grid>${termCards()}</div></section>`;
  }

  const detailRenderers = { notes: renderNotes, accidentals: renderAccidentals, durations: renderDurations, meters: renderMeters, octaves: renderOctaves, tet: renderTet, maqamat: renderMaqamat, terms: renderTerms };

  function install() {
    if (!window.NeyAppShell || document.querySelector('.ney-screen--music-library')) return;
    const moreScreen = document.querySelector('.ney-screen--more');
    const host = moreScreen?.parentElement;
    const moreGrid = moreScreen?.querySelector('.ney-more-grid');
    if (!moreScreen || !host || !moreGrid) return;

    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = './music-library.css?v=2026-08-08-2116';
    css.dataset.musicLibrary = 'true';
    document.head.append(css);

    const musicCard = document.createElement('button');
    musicCard.type = 'button';
    musicCard.className = 'ney-more-card';
    musicCard.dataset.moreCard = 'music-library';
    musicCard.innerHTML = `<span class="ney-more-card__icon" aria-hidden="true">${icon('<path d="M9 18V5l9-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="15" cy="16" r="3"></circle>')}</span><span class="ney-more-card__text"><strong>معلومات موسيقية</strong><span>مكتبة مرجعية بصرية للنغمات والإيقاع والمقامات والمصطلحات.</span></span><span class="ney-more-card__arrow" aria-hidden="true">‹</span>`;
    const aboutCard = [...moreGrid.children].find(card => card.textContent.includes('من نحن'));
    if (aboutCard) moreGrid.insertBefore(musicCard, aboutCard); else moreGrid.append(musicCard);

    const screen = document.createElement('section');
    screen.className = 'ney-screen ney-screen--music-library';
    screen.dataset.screen = 'music-library';
    screen.hidden = true;
    screen.setAttribute('aria-hidden', 'true');
    screen.innerHTML = `
      <header class="ney-screen__heading ney-music-library__heading">
        <div class="ney-screen__identity">
          <span class="ney-screen__icon" aria-hidden="true">${icon('<path d="M9 18V5l9-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="15" cy="16" r="3"></circle>')}</span>
          <div class="ney-screen__copy"><h2>معلومات موسيقية</h2><p>مكتبة بصرية مبسطة للمفاهيم الموسيقية التي تدعم استخدام الأداة والتعلّم.</p></div>
        </div>
        <button type="button" class="ney-music-library__back">${icon('<path d="m9 18 6-6-6-6"></path>')}<span>العودة إلى المزيد</span></button>
      </header>
      <div class="ney-music-library__home">
        <section class="ney-music-library__hero">
          <div><span class="ney-music-library__eyebrow">مرجع تعليمي بصري</span><h3>المعلومة الموسيقية في مكانها الصحيح، بدون ازدحام أو تكرار وظائف الأداة.</h3><p>اختر موضوعًا لعرضه داخل نفس الشاشة. المحتوى العلمي الدقيق الذي يحتاج توثيقًا سيبقى معلّمًا بوضوح حتى تتم مراجعته قبل الاعتماد النهائي.</p></div>
          <div class="ney-music-library__hero-meta"><div class="ney-music-library__stat"><strong>8</strong><span>أقسام رئيسية</span></div><div class="ney-music-library__stat"><strong>RTL</strong><span>مصمم للعربية أولًا</span></div></div>
        </section>
        <div class="ney-music-library__section-title"><h3>استكشف المكتبة</h3><span>افتح أي قسم للتفاصيل</span></div>
        <div class="ney-music-library__grid">${categoryData.map(item => `<button type="button" class="ney-music-category" data-music-category="${item.id}"><span class="ney-music-category__icon" aria-hidden="true">${item.icon}</span><span><h4>${item.title}</h4><p>${item.description}</p></span><span class="ney-music-category__open">عرض القسم <b aria-hidden="true">‹</b></span></button>`).join('')}</div>
      </div>
      <div class="ney-music-library__detail" hidden>
        <div class="ney-music-detail__topbar"><button type="button" class="ney-music-library__detail-back">${icon('<path d="m9 18 6-6-6-6"></path>')}<span>العودة إلى المكتبة</span></button><span class="ney-music-detail__trail">المزيد / معلومات موسيقية</span></div>
        <section class="ney-music-detail__hero"><span class="ney-music-detail__hero-icon" data-detail-icon></span><div><h3 data-detail-title></h3><p data-detail-description></p></div></section>
        <div class="ney-music-detail__body" data-detail-body></div>
      </div>`;
    host.append(screen);

    const home = $('.ney-music-library__home', screen);
    const detail = $('.ney-music-library__detail', screen);
    const title = $('[data-detail-title]', screen);
    const description = $('[data-detail-description]', screen);
    const detailIcon = $('[data-detail-icon]', screen);
    const body = $('[data-detail-body]', screen);

    function showLibraryHome() {
      detail.hidden = true;
      home.hidden = false;
      window.scrollTo({ top: 0, behavior: 'auto' });
    }

    function showCategory(id) {
      const item = categoryData.find(category => category.id === id);
      if (!item) return;
      title.textContent = item.title;
      description.textContent = item.description;
      detailIcon.innerHTML = item.icon;
      body.innerHTML = detailRenderers[id]();
      home.hidden = true;
      detail.hidden = false;
      wireDynamicControls(id);
      window.scrollTo({ top: 0, behavior: 'auto' });
    }

    function wireDynamicControls(id) {
      if (id === 'notes') {
        $$('[data-note-mode]', body).forEach(button => button.addEventListener('click', () => {
          const mode = button.dataset.noteMode;
          $$('[data-note-mode]', body).forEach(b => b.setAttribute('aria-pressed', String(b === button)));
          $$('[data-note-panel]', body).forEach(panel => { panel.hidden = panel.dataset.notePanel !== mode; });
        }));
      }
      if (id === 'terms') {
        const input = $('[data-term-search]', body);
        const grid = $('[data-term-grid]', body);
        input?.addEventListener('input', () => { grid.innerHTML = termCards(input.value); });
      }
    }

    function showMusicScreen(updateHash = true) {
      showLibraryHome();
      [...host.querySelectorAll('.ney-screen')].forEach(candidate => {
        const active = candidate === screen;
        candidate.hidden = !active;
        candidate.setAttribute('aria-hidden', String(!active));
      });
      $$('.ney-shell-nav__item').forEach(button => {
        if (button.dataset.screenTarget === 'more') button.setAttribute('aria-current', 'page');
        else button.removeAttribute('aria-current');
      });
      if (updateHash && history.replaceState) history.replaceState(null, '', '#music-library');
      window.scrollTo({ top: 0, behavior: 'auto' });
      window.dispatchEvent(new CustomEvent('ney:screenchange', { detail: { screen: 'music-library' } }));
    }

    musicCard.addEventListener('click', () => showMusicScreen(true));
    $('.ney-music-library__back', screen)?.addEventListener('click', () => window.NeyAppShell.show('more'));
    $('.ney-music-library__detail-back', screen)?.addEventListener('click', showLibraryHome);
    $$('.ney-music-category', screen).forEach(button => button.addEventListener('click', () => showCategory(button.dataset.musicCategory)));

    window.addEventListener('hashchange', () => {
      if (location.hash === '#music-library') showMusicScreen(false);
    });
    if (location.hash === '#music-library') showMusicScreen(false);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(install), { once: true });
  else requestAnimationFrame(install);
})();
