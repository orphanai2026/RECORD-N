(() => {
  'use strict';

  function installResearchNote() {
    const host = document.querySelector('#aboutDialog .information-content');
    if (!host || document.getElementById('aboutResearchNote')) return;

    const section = document.createElement('section');
    section.id = 'aboutResearchNote';
    section.className = 'about-research-note';
    section.setAttribute('aria-labelledby', 'aboutResearchNoteTitle');
    section.innerHTML = `
      <div class="about-research-note__heading">
        <span class="about-research-note__badge">منهجية القياس</span>
        <h3 id="aboutResearchNoteTitle">ملاحظة علمية حول معيار قبول العينة</h3>
      </div>
      <p>
        يعتمد <strong>Ney Auto-Capture</strong> في هذا الإصدار نافذة مرجعية عندما تكون
        <strong>90% على الأقل من القراءات</strong> داخل هامش الضبط المختار، مع بقاء متوسط جودة الإشارة
        <strong>≥ 90%</strong> واستمرار استبعاد الفبراتو الواضح من العينة المرجعية الصافية.
      </p>
      <p>
        نسبة 90% ليست معيارًا عالميًا منشورًا خاصًا بالناي، بل <strong>معايرة هندسية تجريبية</strong>
        مستندة إلى أدبيات تبين أن تمييز الدرجة يتأثر بطبيعة طيف الآلة والتيمبر وبالفروق الفردية والتدريب،
        وأن بدايات النغمات والزخارف مثل الفبراتو والانحناء قد تربك خوارزميات التحليل إذا اشترط التطابق الكامل لكل إطار زمني.
        الهدف هو السماح بقراءة عابرة محدودة دون تخفيف بقية شروط الدقة.
      </p>
      <div class="about-research-note__sources">
        <strong>مراجع استند إليها القرار:</strong>
        <ul>
          <li><a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC3774646/" target="_blank" rel="noopener">Zarate et al. (2013) — The Effect of Instrumental Timbre on Interval Discrimination</a></li>
          <li><a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC5705722/" target="_blank" rel="noopener">Smith et al. (2017) — Factors affecting pitch discrimination performance</a></li>
          <li><a href="https://arxiv.org/abs/2408.13734" target="_blank" rel="noopener">Joysingh et al. (2024) — Onset Detection in Instruments with Fast Attack</a></li>
        </ul>
      </div>
    `;
    host.append(section);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installResearchNote, { once: true });
  else installResearchNote();
})();

/* Tuner-only learning reference: frequency table reuses the current A4, division,
   analysis range and the shared maqam library without introducing another source. */
if (!document.querySelector('link[data-frequency-reference]')) {
  const frequencyReferenceStyles = document.createElement('link');
  frequencyReferenceStyles.rel = 'stylesheet';
  frequencyReferenceStyles.href = './frequency-reference.css?v=2026-08-08-1958';
  frequencyReferenceStyles.dataset.frequencyReference = 'true';
  document.head.append(frequencyReferenceStyles);
}
if (!document.querySelector('link[data-frequency-reference-maqam-layout]')) {
  const maqamLayoutStyles = document.createElement('link');
  maqamLayoutStyles.rel = 'stylesheet';
  maqamLayoutStyles.href = './frequency-reference-maqam-layout.css?v=2026-08-08-1958';
  maqamLayoutStyles.dataset.frequencyReferenceMaqamLayout = 'true';
  document.head.append(maqamLayoutStyles);
}
if (!document.querySelector('link[data-tuner-safe-area]')) {
  const tunerSafeAreaStyles = document.createElement('link');
  tunerSafeAreaStyles.rel = 'stylesheet';
  tunerSafeAreaStyles.href = './tuner-safe-area.css?v=2026-08-08-1958';
  tunerSafeAreaStyles.dataset.tunerSafeArea = 'true';
  document.head.append(tunerSafeAreaStyles);
}
import('./frequency-reference.js?v=2026-08-08-1958')
  .catch(error => console.error('Frequency reference load failed', error));

/* Keep automatic settings restoration silent. The user-facing save toast remains
   reserved for an actual, trusted press on the settings save button. */
import('./settings-restore-toast-guard.js?v=2026-08-08-1958')
  .catch(error => console.error('Settings restore toast guard load failed', error));

/* More → Music information: visual reference library. It is intentionally loaded
   as an isolated module so closed tuner/recording/settings screens remain untouched. */
if (!document.querySelector('link[data-music-library-premium]')) {
  const premiumStyles = document.createElement('link');
  premiumStyles.rel = 'stylesheet';
  premiumStyles.href = './music-library-premium.css?v=2026-08-08-2208';
  premiumStyles.dataset.musicLibraryPremium = 'true';
  document.head.append(premiumStyles);
}
if (!document.querySelector('link[data-music-library-compact]')) {
  const compactStyles = document.createElement('link');
  compactStyles.rel = 'stylesheet';
  compactStyles.href = './music-library-compact.css?v=2026-08-08-2208';
  compactStyles.dataset.musicLibraryCompact = 'true';
  document.head.append(compactStyles);
}
if (!document.querySelector('link[data-music-library-detail-compact]')) {
  const detailCompactStyles = document.createElement('link');
  detailCompactStyles.rel = 'stylesheet';
  detailCompactStyles.href = './music-library-detail-compact.css?v=2026-08-08-2208';
  detailCompactStyles.dataset.musicLibraryDetailCompact = 'true';
  document.head.append(detailCompactStyles);
}
import('./music-library.js?v=2026-08-08-2208')
  .catch(error => console.error('Music library load failed', error));
import('./music-library-navigation-guard.js?v=2026-08-08-2208')
  .catch(error => console.error('Music library navigation guard load failed', error));
import('./music-library-quartertones.js?v=2026-08-08-2208')
  .catch(error => console.error('Music library quarter-tone accidentals load failed', error));