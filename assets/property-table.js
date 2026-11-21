/* One presentation-wide reference, mounted outside the slide stack. */
(() => {
  document.addEventListener('DOMContentLoaded', () => {
    if (!document.querySelector('.reveal')) return;
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'property-table-trigger';
    trigger.textContent = 'property table';
    trigger.setAttribute('aria-controls', 'property-table');
    trigger.setAttribute('aria-expanded', 'false');
    const panel = document.createElement('div');
    panel.id = 'property-table';
    panel.className = 'property-table-panel';
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', 'Property encoding');
    panel.setAttribute('aria-hidden', 'true');
    panel.inert = true;
    const sample = (label, content) => `<svg viewBox="0 0 100 64" role="img" aria-label="${label}">${content}</svg>`;
    const swatch = color => `<rect x="10" y="13" width="80" height="38" rx="7" fill="${color}"/>`;
    const groups = [
      ['Color', 'X', sample('Teal',swatch('#18b3b1')), sample('Orange',swatch('#ef8424'))],
      ['Shape', 'Y', sample('Circle','<circle cx="50" cy="32" r="23" fill="none" stroke="currentColor" stroke-width="2"/>'), sample('Square','<rect x="27" y="9" width="46" height="46" fill="none" stroke="currentColor" stroke-width="2"/>')],
      ['Pattern', 'Z', sample('Striped','<defs><pattern id="property-table-stripes" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V10" stroke="currentColor" stroke-width="2"/></pattern></defs><rect x="10" y="13" width="80" height="38" fill="url(#property-table-stripes)" stroke="currentColor" stroke-width="2"/>'), sample('Plain','<rect x="10" y="13" width="80" height="38" fill="none" stroke="currentColor" stroke-width="2"/>')]
    ];
    panel.innerHTML = groups.map(([name,symbol,positive,negative]) => String.raw`
      <div class="property-group"><span>\(\mathbf{${name}}\;(${symbol})\)</span>
        <span class="property-value">${positive}<span>\(=+1\)</span></span>
        <span class="property-value">${negative}<span>\(=-1\)</span></span>
      </div>`).join('');
    document.body.append(trigger, panel);
    let typeset = false;
    function show(open) {
      panel.classList.toggle('is-open',open);
      panel.inert = !open;
      panel.setAttribute('aria-hidden',String(!open));
      trigger.setAttribute('aria-expanded',String(open));
      if (open && !typeset && window.renderMathInElement) {
        renderMathInElement(panel, { delimiters: [{left:'\\(', right:'\\)', display:false}], throwOnError:false });
        typeset = true;
      }
    }
    trigger.addEventListener('click', () => show(!panel.classList.contains('is-open')));
    // The reference is non-modal: slide navigation and activities remain usable.
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && panel.classList.contains('is-open')) {
        event.preventDefault(); event.stopImmediatePropagation(); show(false);
      } else if (event.target === trigger && [' ', 'Enter'].includes(event.key)) {
        event.stopImmediatePropagation();
      }
    }, true);
  });
})();
