(() => {
  'use strict';

  const HALF_SHARP_SRC = 'https://upload.wikimedia.org/wikipedia/commons/e/e3/Arabic_music_notation_half_sharp.svg';
  const HALF_FLAT_SRC = 'https://upload.wikimedia.org/wikipedia/commons/1/1b/Arabic_music_notation_half_flat.svg';

  function ensureStyles() {
    if (document.querySelector('style[data-music-quartertones]')) return;
    const style = document.createElement('style');
    style.dataset.musicQuartertones = 'true';
    style.textContent = `
      .ney-screen--music-library .ney-accidental-grid.is-complete {
        grid-template-columns: repeat(6, minmax(0, 1fr));
        gap: 14px;
      }
      .ney-screen--music-library .ney-accidental-grid.is-complete > .ney-accidental-card {
        grid-column: span 2;
      }
      .ney-screen--music-library .ney-accidental-grid.is-complete > .ney-accidental-card:nth-child(4) {
        grid-column: 2 / span 2;
      }
      .ney-screen--music-library .ney-accidental-grid.is-complete > .ney-accidental-card:nth-child(5) {
        grid-column: 4 / span 2;
      }
      .ney-screen--music-library .ney-accidental-card--quarter {
        border-color: rgba(85,216,205,.18);
        background:
          radial-gradient(circle at 50% 25%, rgba(85,216,205,.10), transparent 31%),
          linear-gradient(180deg, rgba(85,216,205,.025), rgba(255,255,255,.015));
      }
      .ney-screen--music-library .ney-quarter-accidental-symbol {
        display: grid !important;
        place-items: center;
        width: 78px;
        height: 78px;
        margin-bottom: 5px;
        border: 1px solid rgba(226,191,107,.2);
        border-radius: 50%;
        background: rgba(0,28,31,.45);
        color: var(--ml-gold, #e2bf6b) !important;
        box-shadow: 0 0 0 7px rgba(226,191,107,.022), inset 0 0 20px rgba(85,216,205,.045);
      }
      .ney-screen--music-library .ney-quarter-accidental-symbol img {
        display: block;
        width: 31px;
        height: 58px;
        object-fit: contain;
        filter: invert(78%) sepia(35%) saturate(608%) hue-rotate(358deg) brightness(96%) contrast(88%);
      }
      .ney-screen--music-library .ney-quarter-accidental-fallback {
        display: none;
        color: var(--ml-gold, #e2bf6b);
        font-family: "Noto Music", "Segoe UI Symbol", serif;
        font-size: 2.2rem;
        line-height: 1;
      }
      .ney-screen--music-library .ney-accidental-card__cents {
        display: inline-flex !important;
        width: fit-content;
        margin-top: 10px !important;
        padding: 4px 9px;
        border: 1px solid rgba(85,216,205,.15);
        border-radius: 999px;
        background: rgba(85,216,205,.05);
        color: #67ddd3 !important;
        font-size: .7rem !important;
        direction: ltr;
      }
      @media (max-width: 1180px) {
        .ney-screen--music-library .ney-accidental-grid.is-complete {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .ney-screen--music-library .ney-accidental-grid.is-complete > .ney-accidental-card,
        .ney-screen--music-library .ney-accidental-grid.is-complete > .ney-accidental-card:nth-child(4) {
          grid-column: auto;
        }
        .ney-screen--music-library .ney-accidental-grid.is-complete > .ney-accidental-card:nth-child(5) {
          grid-column: 1 / -1;
          width: min(100%, calc(50% - 7px));
          justify-self: center;
        }
      }
      @media (max-width: 760px) {
        .ney-screen--music-library .ney-accidental-grid.is-complete {
          grid-template-columns: 1fr;
        }
        .ney-screen--music-library .ney-accidental-grid.is-complete > .ney-accidental-card,
        .ney-screen--music-library .ney-accidental-grid.is-complete > .ney-accidental-card:nth-child(4),
        .ney-screen--music-library .ney-accidental-grid.is-complete > .ney-accidental-card:nth-child(5) {
          grid-column: auto;
          width: 100%;
        }
      }
    `;
    document.head.append(style);
  }

  function makeQuarterCard({ type, arabic, english, cents, description, src, fallback }) {
    const card = document.createElement('div');
    card.className = 'ney-accidental-card ney-accidental-card--quarter';
    card.dataset.quarterAccidental = type;
    card.innerHTML = `
      <span class="ney-quarter-accidental-symbol" aria-hidden="true">
        <img src="${src}" alt="" loading="eager" decoding="async">
        <span class="ney-quarter-accidental-fallback">${fallback}</span>
      </span>
      <strong>${arabic}</strong>
      <span dir="ltr">${english}</span>
      <span>${description}</span>
      <span class="ney-accidental-card__cents">${cents}</span>
    `;
    const img = card.querySelector('img');
    const fallbackNode = card.querySelector('.ney-quarter-accidental-fallback');
    img?.addEventListener('error', () => {
      img.hidden = true;
      if (fallbackNode) fallbackNode.style.display = 'block';
    }, { once: true });
    return card;
  }

  function enhanceAccidentals() {
    const screen = document.querySelector('.ney-screen--music-library');
    const grid = screen?.querySelector('.ney-accidental-grid');
    if (!grid || grid.dataset.quartertonesReady === 'true') return;

    grid.dataset.quartertonesReady = 'true';
    grid.classList.add('is-complete');

    grid.append(
      makeQuarterCard({
        type: 'half-sharp',
        arabic: 'نصف دييز',
        english: 'Half Sharp',
        cents: '+50 cents · 24-TET',
        description: 'يرفع الدرجة ربع صوت في مرجع 24-TET المتساوي.',
        src: HALF_SHARP_SRC,
        fallback: '𝄲'
      }),
      makeQuarterCard({
        type: 'half-flat',
        arabic: 'نصف بيمول',
        english: 'Half Flat',
        cents: '−50 cents · 24-TET',
        description: 'يخفض الدرجة ربع صوت في مرجع 24-TET المتساوي.',
        src: HALF_FLAT_SRC,
        fallback: '𝄳'
      })
    );

    const note = grid.closest('.ney-music-info-panel')?.querySelector('.ney-music-reference-note');
    if (note) {
      note.textContent = 'في مرجع 24-TET المتساوي: نصف الدييز = +50 سنت، ونصف البيمول = −50 سنت. أمّا الضبط المقامي العربي الفعلي فقد يختلف عن هذه القيمة النظرية بحسب المقام والمدرسة والأداء.';
    }
  }

  function initialize() {
    ensureStyles();
    enhanceAccidentals();

    const host = document.querySelector('.ney-screen--music-library');
    if (!host) {
      window.setTimeout(initialize, 120);
      return;
    }

    const observer = new MutationObserver(enhanceAccidentals);
    observer.observe(host, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
