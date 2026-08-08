(() => {
  'use strict';

  if (window.NeyFrequencyReference?.version === 1) return;

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

  const A4_INDEX_24 = 114; // C0 = 0, A4 = 4*24 + 18.
  let mounted = false;
  let observer = null;
  let lastFocused = null;

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

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
    if (!Number.isFinite(value)) return '—';
    if (value >= 1000) return value.toFixed(2);
    return value.toFixed(2);
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

        <div class="ney-frequency-reference-tools">
          <label>
            <span>بحث</span>
            <input id="frequencyReferenceSearch" type="search" placeholder="دو، ري، C, D♭, 440..." autocomplete="off">
          </label>
          <label>
            <span>الأوكتاف</span>
            <select id="frequencyReferenceOctave"><option value="all">كل الأوكتافات</option></select>
          </label>
        </div>

        <div class="ney-frequency-reference-note" id="frequencyReferenceNote"></div>

        <div class="ney-frequency-reference-table-wrap">
          <table class="ney-frequency-reference-table">
            <thead>
              <tr>
                <th scope="col">النغمة بالعربي</th>
                <th scope="col">English / Symbol</th>
                <th scope="col">الأوكتاف</th>
                <th scope="col">التردد</th>
              </tr>
            </thead>
            <tbody id="frequencyReferenceBody"></tbody>
          </table>
          <p class="ney-frequency-reference-empty" id="frequencyReferenceEmpty" hidden>لا توجد نتائج مطابقة.</p>
        </div>

        <footer class="ney-frequency-reference-foot">
          <span id="frequencyReferenceCount">—</span>
          <small>24-TET هنا مرجع تقسيم متساوٍ نظري؛ الضبط الأدائي للمقامات العربية قد يتطلب فروق سنت مستقلة.</small>
        </footer>
      </div>`;
    return dialog;
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

  function render(dialog) {
    const config = settings();
    const allRows = buildRows(config);
    const search = String($('#frequencyReferenceSearch', dialog)?.value || '').trim().toLowerCase();
    const octaveFilter = $('#frequencyReferenceOctave', dialog)?.value || 'all';
    const body = $('#frequencyReferenceBody', dialog);
    const empty = $('#frequencyReferenceEmpty', dialog);
    const count = $('#frequencyReferenceCount', dialog);
    if (!body) return;

    const octaveSelect = $('#frequencyReferenceOctave', dialog);
    if (octaveSelect) {
      const current = octaveSelect.value || 'all';
      const octaves = [...new Set(allRows.map(row => row.octave))].sort((a, b) => a - b);
      const signature = octaves.join(',');
      if (octaveSelect.dataset.signature !== signature) {
        octaveSelect.innerHTML = '<option value="all">كل الأوكتافات</option>' + octaves.map(octave => `<option value="${octave}">Octave ${octave}</option>`).join('');
        octaveSelect.dataset.signature = signature;
        if (current === 'all' || octaves.includes(Number(current))) octaveSelect.value = current;
      }
    }

    const visible = allRows.filter(row => {
      if (octaveFilter !== 'all' && row.octave !== Number(octaveFilter)) return false;
      if (!search) return true;
      const haystack = `${row.ar} ${row.en} ${row.octave} ${formatHz(row.frequency)} hz`.toLowerCase();
      return haystack.includes(search);
    });

    body.innerHTML = visible.map(row => `
      <tr>
        <td><strong>${row.ar}</strong></td>
        <td dir="ltr"><bdi>${row.en}</bdi></td>
        <td dir="ltr">${row.octave}</td>
        <td dir="ltr"><strong>${formatHz(row.frequency)}</strong> <span>Hz</span></td>
      </tr>`).join('');

    if (empty) empty.hidden = visible.length !== 0;
    if (count) count.textContent = `عرض ${visible.length} من ${allRows.length} نغمة`;

    const a4 = $('#frequencyReferenceA4', dialog);
    const division = $('#frequencyReferenceDivision', dialog);
    const range = $('#frequencyReferenceRange', dialog);
    const note = $('#frequencyReferenceNote', dialog);
    if (a4) a4.textContent = `A4 = ${Number(config.a4).toFixed(Number(config.a4) % 1 ? 1 : 0)} Hz`;
    if (division) division.textContent = `${Number(config.division) === 12 ? 12 : 24}-TET`;
    if (range) range.textContent = `${Math.round(config.minFrequency)}–${Math.round(config.maxFrequency)} Hz`;
    if (note) note.textContent = Number(config.division) === 24
      ? 'يعرض المرجع النغمات الأساسية ودرجات ربع التون ضمن نطاق التحليل الحالي.'
      : 'يعرض المرجع النغمات الاثنتي عشرة المتساوية ضمن نطاق التحليل الحالي.';
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

    button.addEventListener('click', () => {
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
    });
    search?.addEventListener('input', () => render(dialog));
    octave?.addEventListener('change', () => render(dialog));

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
    window.NeyFrequencyReference = Object.freeze({ version: 1, open: () => button.click(), refresh: () => render(dialog), buildRows });
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
