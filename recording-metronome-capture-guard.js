(() => {
  'use strict';

  const $ = selector => document.querySelector(selector);
  const guard = {
    active: false,
    previousSound: null,
    previousFlash: null,
    note: null
  };

  function setCheckbox(control, checked) {
    if (!control || control.checked === checked) return;
    control.checked = checked;
    control.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function ensureGuardIndicator() {
    const mini = $('.ney-mini-metronome');
    if (!mini) return null;
    let indicator = mini.querySelector('.ney-mini-metronome__capture-guard');
    if (!indicator) {
      indicator = document.createElement('span');
      indicator.className = 'ney-mini-metronome__capture-guard';
      indicator.hidden = true;
      indicator.setAttribute('role', 'status');
      indicator.setAttribute('aria-live', 'polite');
      const title = mini.querySelector('.ney-mini-metronome__title');
      if (title) title.append(indicator);
      else mini.prepend(indicator);
    }
    return indicator;
  }

  function enterProtection(noteText) {
    if (guard.active) return;
    const sound = $('#trainingSoundEnabled');
    const flash = $('#trainingFlashEnabled');
    if (!sound || !flash) return;

    guard.active = true;
    guard.previousSound = sound.checked;
    guard.previousFlash = flash.checked;
    guard.note = noteText || '';

    // The clean reference must not contain audible metronome clicks.
    // Keep visual guidance available regardless of the user's normal mode.
    setCheckbox(sound, false);
    setCheckbox(flash, true);

    const mini = $('.ney-mini-metronome');
    mini?.classList.add('is-capture-protected');
    const indicator = ensureGuardIndicator();
    if (indicator) {
      indicator.hidden = false;
      indicator.textContent = 'حماية التسجيل: الصوت مكتوم مؤقتًا';
    }

    document.dispatchEvent(new CustomEvent('ney:metronome-capture-protection', {
      detail: { active: true, note: guard.note }
    }));
  }

  function leaveProtection(reason = 'note-end') {
    if (!guard.active) return;
    const sound = $('#trainingSoundEnabled');
    const flash = $('#trainingFlashEnabled');

    setCheckbox(sound, Boolean(guard.previousSound));
    setCheckbox(flash, Boolean(guard.previousFlash));

    guard.active = false;
    guard.previousSound = null;
    guard.previousFlash = null;
    guard.note = null;

    const mini = $('.ney-mini-metronome');
    mini?.classList.remove('is-capture-protected');
    const indicator = ensureGuardIndicator();
    if (indicator) {
      indicator.hidden = true;
      indicator.textContent = '';
    }

    document.dispatchEvent(new CustomEvent('ney:metronome-capture-protection', {
      detail: { active: false, reason }
    }));
  }

  function noteIsActive(noteElement) {
    const value = String(noteElement?.textContent || '').trim();
    return Boolean(value && value !== '—' && !value.includes('بانتظار'));
  }

  function evaluate(noteElement) {
    if (noteIsActive(noteElement)) {
      enterProtection(String(noteElement.textContent || '').trim());
    } else {
      leaveProtection('note-end');
    }
  }

  function install() {
    const note = $('#neyCaptureNote');
    if (!note) return false;
    ensureGuardIndicator();

    const observer = new MutationObserver(() => evaluate(note));
    observer.observe(note, { childList: true, subtree: true, characterData: true });
    evaluate(note);

    // Defensive restoration if the microphone/capture engine is stopped abruptly.
    const micButton = $('#micButton');
    micButton?.addEventListener('click', () => {
      window.setTimeout(() => {
        if (!noteIsActive(note)) leaveProtection('microphone-state-change');
      }, 250);
    });

    window.addEventListener('pagehide', () => leaveProtection('pagehide'), { once: true });
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
