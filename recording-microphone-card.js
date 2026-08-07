(() => {
  'use strict';

  const $ = selector => document.querySelector(selector);
  let installed = false;
  let sourceResolved = false;

  function percentageFromText(value) {
    const match = String(value || '').match(/\d+(?:\.\d+)?/);
    if (!match) return null;
    return Math.max(0, Math.min(100, Number(match[0])));
  }

  function microphoneActive() {
    return String($('#headerMicText')?.textContent || '').includes('نشط');
  }

  async function resolveMicrophoneSource() {
    const source = $('#neyMicrophoneSource');
    if (!source || !microphoneActive()) return;
    try {
      const devices = await navigator.mediaDevices?.enumerateDevices?.();
      const inputs = (devices || []).filter(device => device.kind === 'audioinput');
      const activeLabel = inputs.find(device => device.label)?.label;
      source.textContent = activeLabel || 'ميكروفون الجهاز';
      source.title = source.textContent;
      sourceResolved = Boolean(activeLabel);
    } catch (_) {
      source.textContent = 'ميكروفون الجهاز';
    }
  }

  function syncCard() {
    const card = $('#neyMicrophoneCard');
    const status = $('#neyMicrophoneStatus');
    const statusDot = $('#neyMicrophoneStatusDot');
    const meter = $('#neyMicrophoneMeterFill');
    const quality = $('#neyMicrophoneQuality');
    const source = $('#neyMicrophoneSource');
    const claritySource = $('#clarityValue');
    const signalSource = $('#signalValue');
    if (!card || !status || !statusDot || !meter || !quality || !source) return;

    const active = microphoneActive();
    card.dataset.state = active ? 'active' : 'idle';
    status.textContent = active ? 'الميكروفون نشط' : 'الميكروفون غير نشط';
    statusDot.dataset.state = active ? 'active' : 'idle';

    const clarity = percentageFromText(claritySource?.textContent);
    const signal = percentageFromText(signalSource?.textContent);
    const value = clarity ?? signal ?? 0;
    meter.style.width = `${active ? value : 0}%`;
    quality.textContent = active && (clarity !== null || signal !== null) ? `${Math.round(value)}%` : '—';

    if (!active) {
      source.textContent = 'بانتظار التشغيل';
      sourceResolved = false;
    } else if (!sourceResolved) {
      resolveMicrophoneSource();
    }
  }

  function install() {
    if (installed) return true;
    const screen = $('.ney-screen--recording');
    const actions = screen?.querySelector('.recording-actions-stack');
    const micButton = $('#micButton');
    const autoCapture = $('#neyAutoCapturePanel');
    if (!screen || !actions || !micButton || !autoCapture) return false;

    const card = document.createElement('section');
    card.id = 'neyMicrophoneCard';
    card.className = 'ney-microphone-card';
    card.dataset.state = 'idle';
    card.setAttribute('aria-label', 'حالة الميكروفون وجودة الإشارة');
    card.innerHTML = `
      <div class="ney-microphone-card__identity">
        <span class="ney-microphone-card__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><rect x="9" y="2" width="6" height="12" rx="3"></rect><path d="M5 10a7 7 0 0 0 14 0"></path><path d="M12 17v5"></path><path d="M8 22h8"></path></svg>
        </span>
        <div class="ney-microphone-card__copy">
          <div class="ney-microphone-card__status-row">
            <i id="neyMicrophoneStatusDot" data-state="idle" aria-hidden="true"></i>
            <strong id="neyMicrophoneStatus">الميكروفون غير نشط</strong>
          </div>
          <span id="neyMicrophoneSource">بانتظار التشغيل</span>
        </div>
      </div>
      <div class="ney-microphone-card__quality" aria-label="جودة إشارة الميكروفون">
        <div><span>جودة الإشارة</span><strong id="neyMicrophoneQuality">—</strong></div>
        <span class="ney-microphone-card__meter" aria-hidden="true"><i id="neyMicrophoneMeterFill"></i></span>
      </div>
      <div class="ney-microphone-card__action"></div>
    `;

    actions.insertBefore(card, autoCapture);
    card.querySelector('.ney-microphone-card__action').appendChild(micButton);

    const observer = new MutationObserver(syncCard);
    [$('#headerMicText'), $('#clarityValue'), $('#signalValue')].filter(Boolean).forEach(node => {
      observer.observe(node, { childList: true, subtree: true, characterData: true });
    });

    micButton.addEventListener('click', () => window.setTimeout(syncCard, 200));
    navigator.mediaDevices?.addEventListener?.('devicechange', () => {
      sourceResolved = false;
      if (microphoneActive()) resolveMicrophoneSource();
    });

    syncCard();
    installed = true;
    return true;
  }

  function initialize() {
    if (install()) return;
    const observer = new MutationObserver(() => {
      if (install()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 12000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
