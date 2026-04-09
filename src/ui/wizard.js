import { $ } from '../utils.js';
import { toast } from '../nav.js';

// ══════════════════════════════════════════════════════
// ═══ REUSABLE WIZARD / STEPPER COMPONENT ═══
// ══════════════════════════════════════════════════════

/**
 * createWizard({ containerId, steps, onComplete, color })
 *
 * steps: [{ id, label, icon?, render(bodyEl), validate?() => true|string }]
 * color: CSS var suffix e.g. 'cyn', 'blu'
 *
 * Returns: { next(), prev(), goTo(idx), getCurrentStep(), destroy() }
 */
export function createWizard(config) {
  const { containerId, steps, onComplete, color = 'cyn' } = config;
  const container = $(containerId);
  if (!container) return null;

  let current = 0;

  function render() {
    container.innerHTML = '';

    // Step indicator
    const indicator = document.createElement('div');
    indicator.className = 'wizard-steps';
    steps.forEach((step, i) => {
      if (i > 0) {
        const line = document.createElement('div');
        line.className = 'wz-line' + (i <= current ? ' done' : '');
        indicator.appendChild(line);
      }
      const stepEl = document.createElement('div');
      stepEl.className = 'wz-step';
      const circle = document.createElement('div');
      circle.className = 'wz-circle' + (i === current ? ' active' : i < current ? ' done' : '');
      circle.textContent = i < current ? '\u2713' : String(i + 1);
      circle.onclick = () => { if (i <= current) goTo(i); };
      const label = document.createElement('div');
      label.className = 'wz-label' + (i === current ? ' active' : i < current ? ' done' : '');
      label.textContent = step.label;
      stepEl.appendChild(circle);
      stepEl.appendChild(label);
      indicator.appendChild(stepEl);
    });
    container.appendChild(indicator);

    // Body
    const body = document.createElement('div');
    body.className = 'wz-body';
    body.id = containerId + '-body';
    container.appendChild(body);
    steps[current].render(body);

    // Navigation
    const nav = document.createElement('div');
    nav.className = 'wz-nav';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'b bo bs';
    prevBtn.textContent = '\u2190 Zur\u00fcck';
    prevBtn.style.visibility = current === 0 ? 'hidden' : 'visible';
    prevBtn.onclick = prev;

    const nextBtn = document.createElement('button');
    const isLast = current === steps.length - 1;
    nextBtn.className = isLast ? `b bg` : `b bcyn`;
    nextBtn.textContent = isLast ? '\u2713 Fertig' : 'Weiter \u2192';
    nextBtn.onclick = isLast ? finish : next;

    nav.appendChild(prevBtn);
    nav.appendChild(nextBtn);
    container.appendChild(nav);
  }

  function next() {
    const step = steps[current];
    if (step.validate) {
      const result = step.validate();
      if (result !== true) {
        toast(typeof result === 'string' ? result : 'Bitte Schritt abschlie\u00dfen');
        return;
      }
    }
    if (current < steps.length - 1) {
      current++;
      render();
    }
  }

  function prev() {
    if (current > 0) {
      current--;
      render();
    }
  }

  function goTo(idx) {
    if (idx >= 0 && idx <= current) {
      current = idx;
      render();
    }
  }

  function finish() {
    const step = steps[current];
    if (step.validate) {
      const result = step.validate();
      if (result !== true) {
        toast(typeof result === 'string' ? result : 'Bitte Schritt abschlie\u00dfen');
        return;
      }
    }
    if (onComplete) onComplete();
  }

  function getCurrentStep() { return current; }

  function destroy() {
    if (container) container.innerHTML = '';
  }

  // Initial render
  render();

  return { next, prev, goTo, getCurrentStep, destroy, render };
}
