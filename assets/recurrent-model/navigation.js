window.addEventListener('load', () => {
  document.querySelectorAll('iframe.recurrent-frame').forEach(frame => {
  const slide = frame.closest('section');
  const steps = slide.querySelector(frame.hasAttribute('data-encoding-measurements') ? '.encoding-steps' : '.recurrent-steps');
  const table = ['classical-square-simulation', 'classical-encoding-pairings'].includes(slide.id) ? slide.querySelector('.proof-symbol-table') : null;
  let queueComplete = true;
  let currentMeasurementStep = 0;
  let highlight;
  if (table) {
    highlight = document.createElement('span');
    highlight.className = 'measurement-cell-highlight';
    highlight.setAttribute('aria-hidden', 'true');
    table.prepend(highlight);
  }
  const showMeasurement = (step, animate) => {
    if (!highlight) return;
    const index = queueComplete ? null : frame.hasAttribute('data-encoding-measurements') ? [null, null, 0, 4, 8, null, 8, 0, 1][step] : [null, 0, 1, 2, 0, 1][step];
    highlight.classList.toggle('is-instant', !animate);
    if (index == null) {
      highlight.classList.remove('is-visible');
      return;
    }
    const math = table.querySelector('.katex-html');
    if (!math) return;
    const bounds = math.querySelector('.mtable')?.getBoundingClientRect();
    const rules = [...math.querySelectorAll('.vertical-separator')].map(node => node.getBoundingClientRect());
    const lines = [...math.querySelectorAll('.katex-hline')].map(node => node.getBoundingClientRect()).sort((a, b) => a.top - b.top);
    if (!bounds || rules.length < 3 || lines.length < 2) return;
    const origin = table.getBoundingClientRect();
    const scale = Reveal.getScale();
    const column = index % 4, row = Math.floor(index / 4);
    const left = column ? rules[column - 1].right : bounds.left;
    const right = rules[column].left;
    const height = lines[1].top - lines[0].top;
    const top = lines[0].top + (row - 1) * height;
    Object.assign(highlight.style, {
      left: `${(left - origin.left) / scale}px`, top: `${(top - origin.top) / scale}px`,
      width: `${(right - left) / scale}px`, height: `${height / scale}px`
    });
    highlight.classList.add('is-visible');
  };
  const sync = animate => {
    const visible = steps?.querySelectorAll('.fragment.visible').length ?? 0;
    const step = frame.hasAttribute('data-encoding-measurements') ? Math.max(0, Math.min(8, visible - 5)) : frame.dataset.fixedStep === undefined ? visible : Number(frame.dataset.fixedStep);
    currentMeasurementStep = step;
    showMeasurement(step, animate);
    frame.contentWindow.postMessage({ type: 'recurrent-step', step, animate }, location.origin);
  };

  frame.addEventListener('load', () => sync(false));
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== frame.contentWindow || event.data?.type !== 'recurrent-queue-state' || event.data.step !== currentMeasurementStep) return;
    queueComplete = event.data.complete;
    showMeasurement(currentMeasurementStep, !event.data.instant);
  });
  window.addEventListener('resize', () => showMeasurement(currentMeasurementStep, false));
  Reveal.on('fragmentshown', event => {
    if (steps?.contains(event.fragment)) sync(true);
  });
  Reveal.on('fragmenthidden', event => {
    if (steps?.contains(event.fragment)) sync(true);
  });
  Reveal.on('slidechanged', event => {
    if (event.currentSlide === slide || event.previousSlide === slide) sync(false);
  });
  if (Reveal.getCurrentSlide() === slide) sync(false);
  });
  const pairingSlide = document.querySelector('#classical-encoding-pairings');
  if (pairingSlide) {
    const steps = pairingSlide.querySelector('.encoding-steps');
    const pairings = pairingSlide.querySelector('.encoding-pairings');
    const rows = [...pairings.querySelectorAll('.encoding-y-row')];
    const square = pairingSlide.querySelector('.proof-symbol-table');
    const columnHighlight = document.createElement('span');
    columnHighlight.className = 'encoding-column-highlight';
    columnHighlight.setAttribute('aria-hidden', 'true');
    square.prepend(columnHighlight);
    const replacements = ['x_1^{\\lambda}', 'x_2^{\\lambda}', 'x_1^{\\lambda} \\cdot x_2^{\\lambda}', 'y_2^{\\lambda}', 'y_1^{\\lambda}', 'y_1^{\\lambda} \\cdot y_2^{\\lambda}'];
    const slots = [0, 1, 2, 4, 5, 6];
    slots.forEach((slot, index) => {
      const symbol = pairingSlide.querySelector(`.proof-symbol-table .katex-html .proof-slot-${slot}`);
      const original = document.createElement('span');
      original.className = 'encoding-original-symbol';
      original.append(...symbol.childNodes);
      const replacement = document.createElement('span');
      replacement.className = 'encoding-classical-symbol';
      replacement.setAttribute('aria-hidden', 'true');
      window.katex.render(replacements[index], replacement);
      const specific = document.createElement('span');
      specific.className = 'encoding-specific-value';
      specific.setAttribute('aria-hidden', 'true');
      window.katex.render('+1', specific);
      symbol.append(original, replacement, specific);
    });
    const products = ['x_1^{\\lambda} \\cdot y_2^{\\lambda}', 'x_2^{\\lambda} \\cdot y_1^{\\lambda}', 'x_1^{\\lambda} \\cdot x_2^{\\lambda} \\cdot y_1^{\\lambda} \\cdot y_2^{\\lambda}'];
    [8, 9, 10].forEach((slot, index) => {
      const symbol = square.querySelector(`.katex-html .proof-slot-${slot}`);
      const original = document.createElement('span');
      original.className = 'encoding-product-original';
      original.append(...symbol.childNodes);
      const spacer = document.createElement('span');
      spacer.className = 'encoding-product-spacer';
      spacer.setAttribute('aria-hidden', 'true');
      window.katex.render(products[index], spacer);
      const replacement = spacer.cloneNode(true);
      replacement.className = 'encoding-product-replacement';
      const one = document.createElement('span');
      one.className = 'encoding-one-value';
      one.setAttribute('aria-hidden', 'true');
      window.katex.render('+1', one);
      symbol.append(spacer, original, replacement, one);
    });
    const equalProduct = document.createElement('span');
    equalProduct.className = 'encoding-equal-product';
    equalProduct.setAttribute('aria-hidden', 'true');
    window.katex.render('x_1^{\\lambda} \\cdot x_2^{\\lambda}', equalProduct);
    square.querySelector('.katex-html .proof-slot-6').append(equalProduct);
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    let permutation;
    let currentStep = 0;
    const animations = new Map();
    function highlightColumn(step, animate) {
      columnHighlight.classList.toggle('is-instant', !animate);
      columnHighlight.classList.toggle('is-conflict', step === 19 || step === 25);
      if (![19, 22, 23, 25].includes(step)) {
        columnHighlight.classList.remove('is-visible');
        return;
      }
      const math = square.querySelector('.katex-html');
      const bounds = math.querySelector('.mtable').getBoundingClientRect();
      const rules = [...math.querySelectorAll('.vertical-separator')].map(node => node.getBoundingClientRect());
      const origin = square.getBoundingClientRect();
      const scale = Reveal.getScale();
      if (!bounds.width || rules.length < 3) return;
      const column = step === 19 || step === 25 ? 2 : step - 22;
      const left = column === 0 ? bounds.left : rules[column - 1].right;
      const right = rules[column].left;
      Object.assign(columnHighlight.style, { left: `${(left - origin.left) / scale}px`, top: `${(bounds.top - origin.top) / scale}px`, width: `${(right - left) / scale}px`, height: `${bounds.height / scale}px` });
      columnHighlight.classList.add('is-visible');
    }
    function shuffle() {
      let next;
      do {
        next = rows.map((_, index) => index);
        for (let i = next.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [next[i], next[j]] = [next[j], next[i]];
        }
      } while (next.some((position, index) => position === index) || (permutation && next.every((value, index) => value === permutation[index])));
      permutation = next;
    }
    function moveRows(step, animate) {
      rows.forEach((row, index) => {
        const matrix = new DOMMatrixReadOnly(getComputedStyle(row).transform);
        animations.get(row)?.cancel();
        animations.delete(row);
        const endY = step === 2 ? (permutation[index] - index) * row.offsetHeight : 0;
        const end = `translate(0px, ${endY}px)`;
        row.style.transform = end;
        if (!animate || reducedMotion.matches || (matrix.m41 === 0 && Math.abs(matrix.m42 - endY) < .01)) return;
        const bow = (index % 2 ? 1 : -1) * row.offsetHeight * .8;
        const animation = row.animate([
          { transform: `translate(${matrix.m41}px, ${matrix.m42}px)` },
          { transform: `translate(${matrix.m41 / 2 + bow}px, ${(matrix.m42 + endY) / 2}px)`, offset: .5 },
          { transform: end }
        ], { duration: 336, delay: index * 100, fill: 'backwards', easing: 'cubic-bezier(.65, 0, .35, 1)' });
        animations.set(row, animation);
        animation.onfinish = () => { if (animations.get(row) === animation) animations.delete(row); };
      });
    }
    function syncPairings(animate = true) {
      const step = steps.querySelectorAll('.fragment.visible').length;
      if (step === 2 && currentStep !== 2 && (currentStep !== 3 || !permutation)) shuffle();
      if (step !== currentStep || !animate) moveRows(step, animate && step > 0 && currentStep > 0);
      pairings.dataset.step = String(step);
      pairingSlide.dataset.encodingStep = String(step);
      pairingSlide.dataset.classical = String(step >= 4);
      pairingSlide.dataset.products = String(step >= 5);
      pairingSlide.dataset.specific = String(step === 18 || step === 19);
      pairingSlide.dataset.specificConflict = String(step === 19);
      pairingSlide.dataset.general = String(step >= 20);
      pairingSlide.dataset.ones = String(step === 18 || step === 19 || step >= 21);
      pairingSlide.dataset.equalProduct = String(step >= 24);
      pairingSlide.dataset.conflict = String(step === 19 || step >= 25);
      highlightColumn(step, animate);
      if (step >= 4) {
        square.setAttribute('role', 'math');
        const specific = step === 18 || step === 19;
        const thirdRow = specific || step >= 21 ? 'plus 1, plus 1, plus 1' : step >= 5 ? 'x 1 lambda times y 2 lambda, x 2 lambda times y 1 lambda, x 1 lambda times x 2 lambda times y 1 lambda times y 2 lambda' : 'X 1 Y 2, Y 1 X 2, Z 1 Z 2';
        const firstRow = specific ? 'plus 1, plus 1, plus 1' : 'x 1 lambda, x 2 lambda, x 1 lambda times x 2 lambda';
        const secondRow = specific ? 'plus 1, plus 1, plus 1' : `y 2 lambda, y 1 lambda, ${step >= 24 ? 'x 1 lambda times x 2 lambda' : 'y 1 lambda times y 2 lambda'}`;
        square.setAttribute('aria-label', `First row: ${firstRow}, equals plus 1. Second row: ${secondRow}, equals plus 1. Third row: ${thirdRow}, equals plus 1. Column products: plus 1, plus 1, minus 1.`);
      } else {
        square.removeAttribute('role');
        square.removeAttribute('aria-label');
      }
      currentStep = step;
    }
    Reveal.on('fragmentshown', event => { if (steps.contains(event.fragment)) syncPairings(); });
    Reveal.on('fragmenthidden', event => { if (steps.contains(event.fragment)) syncPairings(); });
    Reveal.on('slidechanged', () => syncPairings(false));
    Reveal.on('resize', () => highlightColumn(currentStep, false));
    reducedMotion.addEventListener('change', () => syncPairings(false));
    syncPairings(false);
  }
});
