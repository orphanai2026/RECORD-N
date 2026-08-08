(() => {
  'use strict';

  const REFERENCE = Object.freeze({
    title: 'دليل المقامات وإصبعيات ناي الدوكاه',
    version: 'v0.1',
    status: 'مرجع معتمد مبدئيًا وقابل لتصحيح الخبير'
  });

  const LABELS = Object.freeze({
    closed: 'مغلق',
    open: 'مفتوح',
    half: 'نصف فتحة / تغطية جزئية',
    optional: 'اختياري وفق مخطط المرجع'
  });

  const CONFIDENCE = Object.freeze({
    B: 'B · عملي موثق ويحتاج تأكيد الخبير',
    C: 'C · يحتاج تحقق الخبير قبل الاعتماد النهائي'
  });

  // مرجع الإصبعيات الحالي من الدليل v0.1. ترتيب الحالات في كل سجل: الثقوب 1 إلى 7.
  // لا نشتق إصبعية غير موجودة من اسم النغمة أو من أوكتاف آخر.
  const FINGERINGS = Object.freeze({
    C4: Object.freeze({ confidence: 'B', holes: Object.freeze(['closed','closed','closed','closed','closed','closed','closed']) }),
    D4: Object.freeze({ confidence: 'B', holes: Object.freeze(['open','closed','closed','closed','closed','closed','closed']) }),
    Eb4: Object.freeze({ confidence: 'B', holes: Object.freeze(['open','open','closed','closed','closed','closed','closed']) }),
    Ehb4: Object.freeze({ confidence: 'C', holes: Object.freeze(['open','optional','open','closed','closed','closed','closed']) }),
    E4: Object.freeze({ confidence: 'C', holes: Object.freeze(['open','optional','open','half','closed','closed','closed']) }),
    F4: Object.freeze({ confidence: 'B', holes: Object.freeze(['open','optional','open','open','closed','closed','closed']) }),
    'F#4': Object.freeze({ confidence: 'C', holes: Object.freeze(['open','optional','open','optional','open','closed','closed']) }),
    G4: Object.freeze({ confidence: 'C', holes: Object.freeze(['open','optional','open','open','closed','open','closed']) }),
    Ab4: Object.freeze({ confidence: 'C', holes: Object.freeze(['half','closed','closed','closed','closed','closed','closed']) }),
    A4: Object.freeze({ confidence: 'B', holes: Object.freeze(['open','closed','closed','closed','closed','closed','closed']) }),
    Bb4: Object.freeze({ confidence: 'B', holes: Object.freeze(['open','open','closed','closed','closed','closed','closed']) }),
    Bhb4: Object.freeze({ confidence: 'C', holes: Object.freeze(['open','optional','open','closed','closed','closed','closed']) }),
    B4: Object.freeze({ confidence: 'C', holes: Object.freeze(['open','optional','open','half','closed','closed','closed']) }),
    C5: Object.freeze({ confidence: 'B', holes: Object.freeze(['open','optional','open','open','closed','closed','closed']) }),
    'C#5': Object.freeze({ confidence: 'C', holes: Object.freeze(['open','optional','open','open','open','closed','closed']) }),
    D5: Object.freeze({ confidence: 'C', holes: Object.freeze(['open','optional','open','open','optional','open','closed']) })
  });

  const ALIASES = Object.freeze({
    Db5: 'C#5',
    Gb4: 'F#4',
    'G#4': 'Ab4',
    'A#4': 'Bb4',
    'D#4': 'Eb4'
  });

  let dialog = null;
  let targetTrigger = null;
  let observer = null;
  let refreshQueued = false;

  function parseEnglishNote(raw) {
    const text = String(raw || '').trim().replace(/\s+/g, ' ');
    const match = text.match(/^([A-Ga-g])(?:\s+(half-flat|half-sharp|flat|sharp))?(-?\d+)$/i);
    if (!match) return null;
    const accidental = ({
      'half-flat': 'hb',
      'half-sharp': 'hs',
      flat: 'b',
      sharp: '#'
    })[(match[2] || '').toLowerCase()] || '';
    return `${match[1].toUpperCase()}${accidental}${match[3]}`;
  }

  function resolveFingering(note) {
    const parsed = parseEnglishNote(note?.english);
    if (!parsed) return { key: null, entry: null };
    const key = ALIASES[parsed] || parsed;
    return { key, entry: FINGERINGS[key] || null };
  }

  function holeState(entry, number) {
    return entry?.holes?.[number - 1] || null;
  }

  function stateClass(state) {
    return ['closed','open','half','optional'].includes(state) ? state : 'unknown';
  }

  function holeSvg(number, x, y, entry, compact, uid) {
    const state = holeState(entry, number);
    const radius = compact ? 4.4 : 9;
    const cls = `ney-fingering-hole ney-fingering-hole--${stateClass(state)}`;
    const label = compact ? '' : `<text x="${x + 18}" y="${y + 4}" class="ney-fingering-hole-label">${number}</text>`;
    if (state === 'half') {
      return `
        <g aria-label="الثقب ${number}: ${LABELS.half}">
          <circle cx="${x}" cy="${y}" r="${radius}" class="ney-fingering-hole ney-fingering-hole--open"></circle>
          <path d="M ${x} ${y-radius} A ${radius} ${radius} 0 0 0 ${x} ${y+radius} Z" class="ney-fingering-half-fill"></path>
          ${label}
        </g>`;
    }
    if (state === 'optional') {
      return `
        <g aria-label="الثقب ${number}: ${LABELS.optional}">
          <circle cx="${x}" cy="${y}" r="${radius}" class="${cls}"></circle>
          <circle cx="${x}" cy="${y}" r="${Math.max(1.6, radius * .28)}" class="ney-fingering-optional-dot"></circle>
          ${label}
        </g>`;
    }
    return `
      <g aria-label="الثقب ${number}: ${LABELS[state] || 'غير محدد'}">
        <circle cx="${x}" cy="${y}" r="${radius}" class="${cls}"></circle>
        ${label}
      </g>`;
  }

  function neySvg(entry, compact = false) {
    const uid = `fing-${Math.random().toString(36).slice(2, 8)}`;
    const width = compact ? 42 : 190;
    const height = compact ? 58 : 330;
    const bodyX = compact ? 18 : 92;
    const frontX = compact ? 22 : 105;
    const rearX = compact ? 9 : 54;
    const ys = compact ? [13,21,29,37,45,53] : [52,94,136,178,220,262];
    const bodyTop = compact ? 5 : 24;
    const bodyBottom = compact ? 57 : 300;
    return `
      <svg class="ney-fingering-ney ${compact ? 'is-compact' : ''}" viewBox="0 0 ${width} ${height}" role="img" aria-label="رسم إصبعية ناي الدوكاه">
        <rect x="${bodyX - (compact ? 7 : 22)}" y="${bodyTop}" width="${compact ? 16 : 46}" height="${bodyBottom-bodyTop}" rx="${compact ? 7 : 16}" class="ney-fingering-body"></rect>
        ${holeSvg(7, rearX, ys[0], entry, compact, uid)}
        ${holeSvg(6, frontX, ys[0], entry, compact, uid)}
        ${holeSvg(5, frontX, ys[1], entry, compact, uid)}
        ${holeSvg(4, frontX, ys[2], entry, compact, uid)}
        ${holeSvg(3, frontX, ys[3], entry, compact, uid)}
        ${holeSvg(2, frontX, ys[4], entry, compact, uid)}
        ${holeSvg(1, frontX, ys[5], entry, compact, uid)}
      </svg>`;
  }

  function listByState(entry, state) {
    const values = [];
    for (let number = 1; number <= 7; number += 1) {
      if (holeState(entry, number) === state) values.push(number);
    }
    return values;
  }

  function instructionText(entry) {
    if (!entry) return 'لا توجد إصبعية مثبتة لهذه الطبقة في الدليل الحالي.';
    const chunks = [];
    const closed = listByState(entry, 'closed');
    const open = listByState(entry, 'open');
    const half = listByState(entry, 'half');
    const optional = listByState(entry, 'optional');
    if (closed.length) chunks.push(`أغلق: ${closed.join('، ')}`);
    if (open.length) chunks.push(`افتح: ${open.join('، ')}`);
    if (half.length) chunks.push(`تغطية جزئية: ${half.join('، ')}`);
    if (optional.length) chunks.push(`اختياري وفق المرجع: ${optional.join('، ')}`);
    return chunks.join(' · ');
  }

  function contextText(note) {
    const context = window.NeyMaqamRecordingContext?.getContext?.() || {};
    const maqam = window.NeyMaqamLibrary?.getMaqam?.(context.maqamId);
    const phase = window.NeyMaqamScaleCaptureFlow?.getPhase?.();
    const parts = [];
    if (maqam?.ar) parts.push(`مقام ${maqam.ar}`);
    if (Number.isFinite(Number(note?.degree))) parts.push(`الدرجة ${note.degree}`);
    if (phase && document.querySelector('#recordingModeControl .segment.is-active')?.dataset.recordingMode === 'maqam-scale') {
      parts.push(phase === 'descending' ? 'هبوط' : 'صعود');
    }
    return parts.join(' · ');
  }

  function ensureDialog() {
    if (dialog?.isConnected) return dialog;
    dialog = document.createElement('dialog');
    dialog.id = 'neyFingeringDialog';
    dialog.className = 'ney-fingering-dialog';
    dialog.setAttribute('aria-labelledby', 'neyFingeringDialogTitle');
    dialog.innerHTML = `
      <section class="ney-fingering-sheet">
        <header class="ney-fingering-sheet__header">
          <div>
            <span class="ney-fingering-sheet__eyebrow">إرشاد العازف · ناي الدوكاه</span>
            <h3 id="neyFingeringDialogTitle">وضع الأصابع</h3>
            <p id="neyFingeringDialogContext"></p>
          </div>
          <button type="button" class="ney-fingering-sheet__close" aria-label="إغلاق">×</button>
        </header>
        <div id="neyFingeringDialogBody" class="ney-fingering-sheet__body"></div>
      </section>`;
    document.body.append(dialog);
    dialog.querySelector('.ney-fingering-sheet__close')?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      if (event.target === dialog) dialog.close();
    });
    return dialog;
  }

  function openFor(note) {
    if (!note) return;
    const host = ensureDialog();
    const body = host.querySelector('#neyFingeringDialogBody');
    const context = host.querySelector('#neyFingeringDialogContext');
    const { key, entry } = resolveFingering(note);
    const noteAr = note.arabic || 'النغمة المطلوبة';
    const noteEn = note.english || key || '—';
    const frequency = Number(note.frequency);
    context.textContent = contextText(note);

    if (!entry) {
      body.innerHTML = `
        <div class="ney-fingering-note-head">
          <div><strong>${noteAr}</strong><span dir="ltr">${noteEn}</span></div>
          ${Number.isFinite(frequency) ? `<bdi dir="ltr">${frequency.toFixed(2)} Hz</bdi>` : ''}
        </div>
        <div class="ney-fingering-unavailable">
          <strong>لا توجد إصبعية مثبتة لهذه الطبقة في ${REFERENCE.version}</strong>
          <p>لن يكرر النظام إصبعية أوكتاف آخر أو يستنتج وضع الأصابع من اسم النغمة. تُضاف هذه الدرجة بعد توثيقها أو اعتمادها من الخبير.</p>
        </div>
        <div class="ney-fingering-source"><span>${REFERENCE.title} · ${REFERENCE.version}</span><small>${REFERENCE.status}</small></div>`;
    } else {
      const confidenceLabel = CONFIDENCE[entry.confidence] || entry.confidence;
      body.innerHTML = `
        <div class="ney-fingering-note-head">
          <div><strong>${noteAr}</strong><span dir="ltr">${noteEn}</span></div>
          ${Number.isFinite(frequency) ? `<bdi dir="ltr">${frequency.toFixed(2)} Hz</bdi>` : ''}
        </div>
        <div class="ney-fingering-layout">
          <div class="ney-fingering-visual">${neySvg(entry, false)}</div>
          <div class="ney-fingering-copy">
            <h4>وضع الثقوب</h4>
            <p class="ney-fingering-instruction">${instructionText(entry)}</p>
            <div class="ney-fingering-legend" aria-label="مفتاح الرموز">
              <span><i class="is-closed"></i>مغلق</span>
              <span><i class="is-open"></i>مفتوح</span>
              <span><i class="is-half"></i>جزئي</span>
              <span><i class="is-optional"></i>اختياري</span>
            </div>
            <div class="ney-fingering-performance-note">قد تتطلب الطبقة الصوتية تعديل ضغط الهواء أو زاوية النفخ حتى مع ثبات نموذج الإصبع.</div>
          </div>
        </div>
        <div class="ney-fingering-source" data-confidence="${entry.confidence}">
          <span>${REFERENCE.title} · ${REFERENCE.version}</span>
          <strong>${confidenceLabel}</strong>
          <small>${REFERENCE.status}</small>
        </div>`;
    }
    if (!host.open) host.showModal();
  }

  function ensureTargetTrigger() {
    const target = document.querySelector('#recordingMaqamScaleCaptureTarget');
    if (!target) return null;
    if (targetTrigger?.isConnected) return targetTrigger;

    targetTrigger = document.createElement('button');
    targetTrigger.type = 'button';
    targetTrigger.id = 'neyCurrentFingeringButton';
    targetTrigger.className = 'ney-fingering-trigger';
    targetTrigger.hidden = true;
    targetTrigger.innerHTML = `<span class="ney-fingering-trigger__visual" aria-hidden="true"></span><span><strong>وضع الأصابع</strong><small>عرض إصبعية النغمة المطلوبة</small></span><b aria-hidden="true">‹</b>`;
    target.after(targetTrigger);
    targetTrigger.addEventListener('click', () => openFor(window.NeyMaqamScaleCaptureFlow?.getExpected?.()));
    return targetTrigger;
  }

  function refreshTargetTrigger() {
    const trigger = ensureTargetTrigger();
    if (!trigger) return;
    const note = window.NeyMaqamScaleCaptureFlow?.getExpected?.();
    trigger.hidden = !note;
    if (!note) return;
    const { entry } = resolveFingering(note);
    const visual = trigger.querySelector('.ney-fingering-trigger__visual');
    if (visual) visual.innerHTML = neySvg(entry, true);
    const small = trigger.querySelector('small');
    if (small) small.textContent = entry ? `${note.arabic} · اضغط لشرح الثقوب` : `${note.arabic} · يحتاج توثيق إصبعية`;
    trigger.classList.toggle('is-unverified', !entry || entry.confidence === 'C');
  }

  function enhanceDegreeCards() {
    const scale = window.NeyMaqamRecordingContext?.getScale?.();
    if (!scale?.notes?.length) return;
    document.querySelectorAll('.recording-maqam-degree').forEach(card => {
      const degree = Number(card.dataset.degree);
      const note = scale.notes.find(item => Number(item.degree) === degree);
      if (!note) return;
      let button = card.querySelector('.ney-degree-fingering-button');
      if (!button) {
        button = document.createElement('button');
        button.type = 'button';
        button.className = 'ney-degree-fingering-button';
        button.setAttribute('aria-label', `عرض وضع الأصابع للدرجة ${degree}`);
        button.innerHTML = '<span aria-hidden="true">◉</span><span>الأصابع</span>';
        button.addEventListener('click', event => {
          event.preventDefault();
          event.stopPropagation();
          const latestScale = window.NeyMaqamRecordingContext?.getScale?.();
          const latestNote = latestScale?.notes?.find(item => Number(item.degree) === Number(card.dataset.degree));
          openFor(latestNote || note);
        });
        card.append(button);
      }
      const { entry } = resolveFingering(note);
      button.dataset.referenceState = entry ? entry.confidence : 'missing';
      button.title = entry ? `إصبعية ${note.arabic} · مرجع ${REFERENCE.version}` : `لا توجد إصبعية مثبتة لـ ${note.arabic} في ${REFERENCE.version}`;
    });
  }

  function refresh() {
    refreshQueued = false;
    ensureDialog();
    refreshTargetTrigger();
    enhanceDegreeCards();
  }

  function queueRefresh() {
    if (refreshQueued) return;
    refreshQueued = true;
    window.setTimeout(refresh, 0);
  }

  function initialize() {
    refresh();
    ['ney:maqam-recording-context-change','ney:recording-mode-ui-change','ney:educational-duration-saved','ney:educational-duration-retained','ney:educational-duration-rejected','ney:maqam-scale-session-complete']
      .forEach(name => document.addEventListener(name, queueRefresh));

    const host = document.querySelector('.recording-panel') || document.body;
    observer = new MutationObserver(queueRefresh);
    observer.observe(host, { childList: true, subtree: true, characterData: true });

    window.NeyFingeringGuide = Object.freeze({
      openFor,
      getReference: () => ({ ...REFERENCE }),
      resolve: note => {
        const result = resolveFingering(note);
        return result.entry ? { key: result.key, confidence: result.entry.confidence, holes: [...result.entry.holes] } : null;
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
