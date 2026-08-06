(() => {
  'use strict';

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
})();
