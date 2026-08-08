(() => {
  'use strict';

  if (window.NeyFrequencyReference?.version === 2) return;

  const PITCHES_24 = Object.freeze([
    { ar: 'دو', en: 'C' },
    { ar: 'دو نصف دييز', en: 'C half-sharp' },
    { ar: 'دو دييز / ري بيمول', en: 'C♯ / D♭' },
    { ar: 'ري نصف بيمول', en: 'D half-flat' },
    { ar: 'ري', en: 'D' },
    { ar: 'ري نصف دييز', en: 'D half-sharp' },
    { ar: 'ري دييز / مي بيمول', en: 'D♯ / E♭' },
    { ar: 'مي نصف بيمول', en: 'E half-flat' },
    { ar: 'مي', en: 'E' },
    { ar: 'مي نصف دييز', en: 'E half-sharp' },
    { ar: 'فا', en: 'F' },
    { ar: 'فا نصف دييز', en: 'F half-sharp' },
    { ar: 'فا دييز / صول بيمول', en: 'F♯ / G♭' },
    { ar: 'صول نصف بيمول', en: 'G half-flat' },
    { ar: 'صول', en: 'G' },
    { ar: 'صول نصف دييز', en: 'G half-sharp' },
    { ar: 'صول دييز / لا بيمول', en: 'G♯ / A♭' },
    { ar: 'لا نصف بيمول', en: 'A half-flat' },
    { ar: 'لا', en: 'A' },
    { ar: 'لا نصف دييز', en: 'A half-sharp' },
    { ar: 'لا دييز / سي بيمول', en: 'A♯ / B♭' },
    { ar: 'سي نصف بيمول', en: 'B half-flat' },
    { ar: 'سي', en: 'B' },
    { ar: 'سي نصف دييز', en: 'B half-sharp' }
  ]);

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

  const CATEGORY_ORDER = ['eastern_identity', 'familiar_no_quarter', 'special_intervals'];
  const A4_INDEX_24 = 114;
  let mounted = false;
  let observer = null;
  let lastFocused = null;

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const maqamLibraryReady = window.NeyMaqamLibrary
    ? Promise.resolve(window.NeyMaqamLibrary)
    : import('./maqam-library.js?v=2026-08-08-1858')
      .then(() => window.NeyMaqamLibrary)
      .catch(error => {
        console.error('Frequency reference maqam library load failed', error);
        return null;
      });

  function settings() {
    const runtime = window.NeySettingsRuntime;
    if (runtime?.read) {
      const bundle = runtime.read();
      return {
        a4: Number(bundle.basic?.a4 || 440),
        division: Number(bundle.basic?.division || 24),
        minFrequency: Number(bundle.advanced?.minFrequency || 60),
        maxFrequency: Number(bundle.advanced?.maxFrequency || 1800)
      };
    }

    const activeDivision = $('#divisionControl .segment.is-active');
    return {
      a4: Number($('#a4Reference')?.value || 440),
      division: Number(activeDivision?.dataset.division || 24),
      minFrequency: Number($('#minFrequencyInput')?.value || 60),
      maxFrequency: Number($('#maxFrequencyInput')?.value || 1800)
    };
  }

  function formatHz(value) {
    return Number.isFinite(value) ? value.toFixed(2) : '—';
  }

  function normalizeIndex(index) {
    return ((index % 24) + 24) % 24;
  }

  function buildRows(config) {
    const a4 = clamp(Number(config.a4) || 440, 400, 480);
    const minHz = Math.max(1, Number(config.minFrequency) || 60);
    const maxHz = Math.max(minHz, Number(config.maxFrequency) || 1800);
    const division = Number(config.division) === 12 ? 12 : 24;
    const lower = Math.floor(A4_INDEX_24 + 24 * Math.log2(minHz / a4)) - 2;
    const upper = Math.ceil(A4_INDEX_24 + 24 * Math.log2(maxHz / a4)) + 2;
    const rows = [];

    for (let index = lower; index <= upper; index += 1) {
      const pitchClass = normalizeIndex(index);
      if (division === 12 && pitchClass % 2 !== 0) continue;
      const frequency = a4 * Math.pow(2, (index - A4_INDEX_24) / 24);
      if (frequency < minHz - 1e-7 || frequency > maxHz + 1e-7) continue;
      const octave = Math.floor(index / 24);
      const pitch = PITCHES_24[pitchClass];
      rows.push({ index, pitchClass, octave, frequency, ar: pitch.ar, en: pitch.en });
    }
    return rows;
  }

  function stripOctave(text) {
    return String(text || '').replace(/\s*-?\d+\s*$/, '').trim();
  }

  function currentView(dialog) {
    return $('[data-frequency-view].is-active', dialog)?.dataset.frequencyView || 'all';
  }

  function createButton() {
    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'frequencyReferenceButton';
    button.className = 'ney-frequency-reference-button';
    button.setAttribute('aria-haspopup', 'dialog');
    button.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V5"></path><path d="M8 16V8"></path><path d="M12 18V6"></path><path d="M16 14v-4"></path><path d="M20 17V7"></path></svg>
      <span>مرجع الترددات</span>`;
    return button;
  }

  function createDialog() {
    const dialog = document.createElement('dialog');
    dialog.id = 'frequencyReferenceDialog';
    dialog.className = 'ney-frequency-reference-dialog';
    dialog.setAttribute('aria-labelledby', 'frequencyReferenceTitle');
    dialog.innerHTML = `
      <div class="ney-frequency-reference-shell">
        <header class="ney-frequency-reference-head">
          <div>
            <span class="ney-frequency-reference-kicker">مرجع تعليمي سريع</span>
            <h2 id="frequencyReferenceTitle">ترددات النغمات</h2>
            <p>مرجع للنغمة والتردد الصحيح وفق إعدادات المعيار الحالية، دون تغيير القياس أو التسجيل.</p>
          </div>
          <button type="button" class="ney-frequency-reference-close" aria-label="إغلاق مرجع الترددات">×</button>
        </header>

        <div class="ney-frequency-reference-meta" aria-label="إعدادات المرجع الحالية">
          <span>مرجع الضبط <strong id="frequencyReferenceA4" dir="ltr">A4 = 440 Hz</strong></span>
          <span>التقسيم <strong id="frequencyReferenceDivision" dir="ltr">24-TET</strong></span>
          <span>النطاق <strong id="frequencyReferenceRange" dir="ltr">60–1800 Hz</strong></span>
        </div>

        <div class="ney-frequency-reference-view" role="group" aria-label="طريقة عرض مرجع الترددات">
          <button type="button" class="is-active" data-frequency-view="all" aria-pressed="true">كل النغمات</button>
          <button type="button" data-frequency-view="maqam" aria-pressed="false">حسب المقام</button>
        </div>

        <div class="ney-frequency-reference-tools" data-tools-view="all">
          <label>
            <span>بحث</span>
            <input id="frequencyReferenceSearch" type="search" placeholder="دو، ري، C, D♭, 440..." autocomplete="off">
          </label>
          <label>
            <span>الأوكتاف</span>
            <select id="frequencyReferenceOctave"><option value="all">كل الأوكتافات</option></select>
          </label>
        </div>

        <div class="ney-frequency-reference-maqam-tools" data-tools-view="maqam" hidden>
          <label>
            <span>المقام</span>
            <select id="frequencyReferenceMaqam" aria-label="اختيار المقام"></select>
          </label>
          <label>
            <span>جذر المقام</span>
            <select id="frequencyReferenceRoot" aria-label="اختيار جذر المقام"></select>
          </label>
          <label>
            <span>الأوكتاف</span>
            <select id="frequencyReferenceMaqamOctave" aria-label="اختيار أوكتاف جذر المقام"></select>
          </label>
        </div>

        <div class="ney-frequency-reference-note" id="frequencyReferenceNote"></div>

        <div class="ney-frequency-reference-table-wrap">
          <table class="ney-frequency-reference-table">
            <thead id="frequencyReferenceHead"></thead>
            <tbody id="frequencyReferenceBody"></tbody>
          </table>
          <p class="ney-frequency-reference-empty" id="frequencyReferenceEmpty" hidden>لا توجد نتائج مطابقة.</p>
        </div>

        <footer class="ney-frequency-reference-foot">
          <span id="frequencyReferenceCount">—</span>
          <small id="frequencyReferenceFootnote">24-TET هنا مرجع تقسيم متساوٍ نظري؛ الضبط الأدائي للمقامات العربية قد يتطلب فروق سنت مستقلة.</small>
        </footer>
      </div>`;
    return dialog;
  }

  function populateMaqamControls(dialog) {
    const library = window.NeyMaqamLibrary;
    const maqamSelect = $('#frequencyReferenceMaqam', dialog);
    const rootSelect = $('#frequencyReferenceRoot', dialog);
    const octaveSelect = $('#frequencyReferenceMaqamOctave', dialog);
    if (!library || !maqamSelect || !rootSelect || !octaveSelect) return;

    const maqams = library.getMaqams();
    const categories = library.getCategories();
    maqamSelect.innerHTML = CATEGORY_ORDER.map(categoryId => {
      const category = categories.find(item => item.id === categoryId);
      if (!category) return '';
      const options = category.maqams.map(id => {
        const maqam = maqams.find(item => item.id === id);
        return maqam ? `<option value="${maqam.id}">${maqam.ar} · ${maqam.en}</option>` : '';
      }).join('');
      return `<optgroup label="${category.ar}">${options}</optgroup>`;
    }).join('');

    rootSelect.innerHTML = TONIC_OPTIONS.map(item => `<option value="${item.value}">${item.ar} · ${item.en}</option>`).join('');
    octaveSelect.innerHTML = [2, 3, 4, 5, 6].map(value => `<option value="${value}">الأوكتاف ${value}</option>`).join('');
    maqamSelect.value = 'rast';
    rootSelect.value = 'C';
    octaveSelect.value = '4';
  }

  function buildMaqamRows(dialog, config) {
    const library = window.NeyMaqamLibrary;
    if (!library) return { rows: [], scale: null };
    const maqamId = $('#frequencyReferenceMaqam', dialog)?.value || 'rast';
    const root = $('#frequencyReferenceRoot', dialog)?.value || 'C';
    const octave = Number($('#frequencyReferenceMaqamOctave', dialog)?.value || 4);

    try {
      const scale = library.buildScale({
        maqamId,
        tonic: `${root}${octave}`,
        a4: Number(config.a4) || 440,
        direction: 'ascending'
      });
      const rows = scale.notes.map(note => ({
        degree: note.degree,
        ar: stripOctave(note.arabic),
        en: stripOctave(note.english),
        octave: note.octave,
        frequency: Number(note.frequency),
        abs24: note.abs24
      }));
      return { rows, scale };
    } catch (error) {
      console.error('Frequency reference maqam scale failed', error);
      return { rows: [], scale: null };
    }
  }

  function showDialog(dialog) {
    lastFocused = document.activeElement;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  function closeDialog(dialog) {
    if (typeof dialog.close === 'function' && dialog.open) dialog.close();
    else dialog.removeAttribute('open');
    if (lastFocused instanceof HTMLElement) lastFocused.focus({ preventScroll: true });
  }

  function renderAll(dialog, config) {
    const allRows = buildRows(config);
    const search = String($('#frequencyReferenceSearch', dialog)?.value || '').trim().toLowerCase();
    const octaveFilter = $('#frequencyReferenceOctave', dialog)?.value || 'all';
    const octaveSelect = $('#frequencyReferenceOctave', dialog);

    if (octaveSelect) {
      const current = octaveSelect.value || 'all';
      const octaves = [...new Set(allRows.map(row => row.octave))].sort((a, b) => a - b);
      const signature = octaves.join(',');
      if (octaveSelect.dataset.signature !== signature) {
        octaveSelect.innerHTML = '<option value="all">كل الأوكتافات</option>' + octaves.map(octave => `<option value="${octave}">الأوكتاف ${octave}</option>`).join('');
        octaveSelect.dataset.signature = signature;
        if (current === 'all' || octaves.includes(Number(current))) octaveSelect.value = current;
      }
    }

    const visible = allRows.filter(row => {
      if (octaveFilter !== 'all' && row.octave !== Number(octaveFilter)) return false;
      if (!search) return true;
      return `${row.ar} ${row.en} ${row.octave} ${formatHz(row.frequency)} hz`.toLowerCase().includes(search);
    });

    $('#frequencyReferenceHead', dialog).innerHTML = `<tr>
      <th scope="col">النغمة بالعربي</th>
      <th scope="col">English / Symbol</th>
      <th scope="col">الأوكتاف</th>
      <th scope="col">التردد</th>
    </tr>`;
    $('#frequencyReferenceBody', dialog).innerHTML = visible.map(row => `<tr>
      <td><strong>${row.ar}</strong></td>
      <td dir="ltr"><bdi>${row.en}</bdi></td>
      <td dir="ltr">${row.octave}</td>
      <td dir="ltr"><strong>${formatHz(row.frequency)}</strong> <span>Hz</span></td>
    </tr>`).join('');

    $('#frequencyReferenceCount', dialog).textContent = `عرض ${visible.length} من ${allRows.length} نغمة`;
    $('#frequencyReferenceNote', dialog).textContent = Number(config.division) === 24
      ? 'يعرض المرجع النغمات الأساسية ودرجات ربع التون ضمن نطاق التحليل الحالي.'
      : 'يعرض المرجع النغمات الاثنتي عشرة المتساوية ضمن نطاق التحليل الحالي.';
    $('#frequencyReferenceFootnote', dialog).textContent = '24-TET هنا مرجع تقسيم متساوٍ نظري؛ الضبط الأدائي للمقامات العربية قد يتطلب فروق سنت مستقلة.';
    return visible.length;
  }

  function renderMaqam(dialog, config) {
    const { rows, scale } = buildMaqamRows(dialog, config);
    $('#frequencyReferenceHead', dialog).innerHTML = `<tr>
      <th scope="col">الدرجة</th>
      <th scope="col">النغمة بالعربي</th>
      <th scope="col">English / Symbol</th>
      <th scope="col">الأوكتاف</th>
      <th scope="col">التردد</th>
    </tr>`;
    $('#frequencyReferenceBody', dialog).innerHTML = rows.map(row => `<tr>
      <td><span class="ney-frequency-degree">${row.degree}</span></td>
      <td><strong>${row.ar}</strong></td>
      <td dir="ltr"><bdi>${row.en}</bdi></td>
      <td dir="ltr">${row.octave}</td>
      <td dir="ltr"><strong>${formatHz(row.frequency)}</strong> <span>Hz</span></td>
    </tr>`).join('');

    $('#frequencyReferenceCount', dialog).textContent = scale ? `${scale.maqamAr} · ${rows.length} درجات` : 'تعذر تحميل درجات المقام';
    const hasQuarterTone = rows.some(row => Number(row.abs24) % 2 !== 0);
    const divisionWarning = Number(config.division) === 12 && hasQuarterTone
      ? ' يحتوي هذا المقام درجات ربع تون؛ لقياسها في المعيار بدقة اختر 24-TET.'
      : '';
    $('#frequencyReferenceNote', dialog).textContent = scale
      ? `مقام ${scale.maqamAr} · الجذر ${stripOctave(scale.notes[0]?.arabic || '')} ${scale.tonic.octave} · المسار المرجعي: ${scale.variantAr}.${divisionWarning}`
      : 'تعذر بناء درجات المقام من المكتبة الحالية.';
    $('#frequencyReferenceFootnote', dialog).textContent = 'درجات المقام مأخوذة مباشرة من مكتبة المقامات التشغيلية نفسها؛ 24-EDO مرجع نظري وقد يختلف الضبط الأدائي الفعلي بالسنت.';
    return rows.length;
  }

  function render(dialog) {
    const config = settings();
    const view = currentView(dialog);
    const allTools = $('[data-tools-view="all"]', dialog);
    const maqamTools = $('[data-tools-view="maqam"]', dialog);
    const a4 = $('#frequencyReferenceA4', dialog);
    const division = $('#frequencyReferenceDivision', dialog);
    const range = $('#frequencyReferenceRange', dialog);
    const empty = $('#frequencyReferenceEmpty', dialog);

    dialog.classList.toggle('is-maqam-view', view === 'maqam');
    if (allTools) allTools.hidden = view !== 'all';
    if (maqamTools) maqamTools.hidden = view !== 'maqam';

    if (a4) a4.textContent = `A4 = ${Number(config.a4).toFixed(Number(config.a4) % 1 ? 1 : 0)} Hz`;
    if (division) division.textContent = `${Number(config.division) === 12 ? 12 : 24}-TET`;
    if (range) range.textContent = `${Math.round(config.minFrequency)}–${Math.round(config.maxFrequency)} Hz`;

    const visibleCount = view === 'maqam' ? renderMaqam(dialog, config) : renderAll(dialog, config);
    if (empty) empty.hidden = visibleCount !== 0;
  }

  function setView(dialog, view) {
    $$('[data-frequency-view]', dialog).forEach(button => {
      const active = button.dataset.frequencyView === view;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    render(dialog);
  }

  function mount() {
    if (mounted) return true;
    const screen = $('.ney-screen--tuner');
    const heading = $('.ney-screen__heading', screen || document);
    if (!screen || !heading) return false;

    const button = createButton();
    const dialog = createDialog();
    heading.append(button);
    document.body.append(dialog);

    const close = $('.ney-frequency-reference-close', dialog);
    const search = $('#frequencyReferenceSearch', dialog);
    const octave = $('#frequencyReferenceOctave', dialog);
    const maqam = $('#frequencyReferenceMaqam', dialog);
    const root = $('#frequencyReferenceRoot', dialog);
    const maqamOctave = $('#frequencyReferenceMaqamOctave', dialog);

    button.addEventListener('click', async () => {
      await maqamLibraryReady;
      populateMaqamControls(dialog);
      setView(dialog, 'all');
      render(dialog);
      showDialog(dialog);
      window.setTimeout(() => search?.focus(), 0);
    });
    close?.addEventListener('click', () => closeDialog(dialog));
    dialog.addEventListener('cancel', event => {
      event.preventDefault();
      closeDialog(dialog);
    });
    dialog.addEventListener('click', event => {
      if (event.target === dialog) closeDialog(dialog);
      const viewButton = event.target.closest('[data-frequency-view]');
      if (viewButton) setView(dialog, viewButton.dataset.frequencyView);
    });
    search?.addEventListener('input', () => render(dialog));
    octave?.addEventListener('change', () => render(dialog));
    [maqam, root, maqamOctave].forEach(control => control?.addEventListener('change', () => render(dialog)));

    document.addEventListener('ney:settings-applied', () => {
      if (dialog.open || dialog.hasAttribute('open')) render(dialog);
    });
    document.addEventListener('click', event => {
      if (!event.target.closest('#divisionControl .segment')) return;
      window.setTimeout(() => { if (dialog.open || dialog.hasAttribute('open')) render(dialog); }, 0);
    });
    ['#a4Reference', '#minFrequencyInput', '#maxFrequencyInput'].forEach(selector => {
      $(selector)?.addEventListener('change', () => { if (dialog.open || dialog.hasAttribute('open')) render(dialog); });
    });

    mounted = true;
    observer?.disconnect();
    observer = null;
    window.NeyFrequencyReference = Object.freeze({ version: 2, open: () => button.click(), refresh: () => render(dialog), buildRows });
    return true;
  }

  function start() {
    if (mount()) return;
    observer = new MutationObserver(() => mount());
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.setTimeout(() => observer?.disconnect(), 15000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
