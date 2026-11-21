/* Interactions for the classical opening. */
window.addEventListener('load', () => {
  // Hit areas follow the rendered KaTeX rules.
  function alignTable(grid) {
    const table = grid.querySelector('.tray-table .katex-html');
    if (!table) return;
    const bounds = grid.getBoundingClientRect();
    if (!bounds.width) return;
    const scale = grid.clientWidth / bounds.width;
    const rect = table.getBoundingClientRect();
    const vertical = [...table.querySelectorAll('.vertical-separator')].map(line => line.getBoundingClientRect()).sort((a,b) => a.left-b.left);
    const horizontal = [...table.querySelectorAll('.katex-hline')].map(line => line.getBoundingClientRect()).sort((a,b) => a.top-b.top);
    if (vertical.length < 2 || horizontal.length < 2) return;
    const xs = [rect.left, vertical[0].left, vertical[1].left, vertical[2]?.left ?? rect.right];
    const ys = [rect.top, horizontal[0].top, horizontal[1].top, horizontal[2]?.top ?? rect.bottom];
    // Fit the whole table once; unequal column widths must not change type size.
    const symbolSize = Math.min(
      ...xs.slice(0,3).map((x,i) => (xs[i+1]-x)*.28),
      ...ys.slice(0,3).map((y,i) => (ys[i+1]-y)*.65)
    )*scale;
    grid.querySelectorAll('.tray-device').forEach((button,i) => {
      const row = Math.floor(i/3), col = i%3;
      const symbol = button.querySelector('.tray-symbol');
      if (symbol) symbol.style.fontSize = symbolSize+'px';
      Object.assign(button.style, {left:(xs[col]-bounds.left)*scale+'px', top:(ys[row]-bounds.top)*scale+'px', width:(xs[col+1]-xs[col])*scale+'px', height:(ys[row+1]-ys[row])*scale+'px'});
    });
  }
  const ready = setInterval(() => {
    const grids = [...document.querySelectorAll('.device-tray')];
    if (!grids.every(grid => grid.querySelector('.tray-table .katex-html .tray-entry'))) return;
    clearInterval(ready);
    syncNotation();
    grids.forEach(grid => { alignTable(grid); new ResizeObserver(() => alignTable(grid)).observe(grid); });
    window.Reveal?.on('slidechanged', () => grids.forEach(alignTable));
    window.addEventListener('resize', () => grids.forEach(alignTable));
  }, 100);
  const tray = document.querySelector('#measurements .device-tray');
  const frame = document.querySelector('.tray-example');
  let measuring = false;
  tray?.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', () => {
      if (measuring) return;
      measuring = true;
      tray.querySelectorAll('button').forEach(b => {
        b.disabled = true;
        b.setAttribute('aria-pressed', String(b === button));
      });
      frame.contentWindow.postMessage({type: 'tray-measure', index: Number(button.dataset.device)}, location.origin);
    });
  });
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== frame?.contentWindow || event.data?.type !== 'tray-ready') return;
    measuring = false;
    tray.querySelectorAll('button').forEach(b => b.disabled = false);
  });

  // Fade the rendered labels when notation is introduced.
  function syncNotation() {
    document.querySelectorAll('.device-tray').forEach(grid => {
      const marker = grid.closest('section').querySelector('.notation-step');
      grid.classList.toggle('symbols', Boolean(marker?.classList.contains('visible')));
    });
  }
  const setup = document.querySelector('#setup');
  const setupStage = setup?.querySelector('.setup-stage');
  let setupGenerations = [];
  let setupSvg = null;
  if (setupStage) {
    const teal = '#18b3b1', orange = '#ee8322';
    const piece = (x, y, size, color, shape, pattern, fromX, fromY, fromSize, fromColor, fromShape) =>
      ({x, y, size, color, shape, pattern, fromX, fromY, fromSize, fromColor, fromShape});
    const generations = [
      [piece(300, 145, 154, teal, 'circle', 'plain', 300, 450, 70, teal, 'circle')],
      [piece(210, 245, 128, orange, 'circle', 'plain', 300, 145, 154, teal, 'circle'),
       piece(390, 245, 128, teal, 'circle', 'plain', 300, 145, 154, teal, 'circle')],
      [piece(90, 290, 108, orange, 'square', 'plain', 210, 245, 128, orange, 'circle'),
       piece(230, 290, 108, orange, 'circle', 'plain', 210, 245, 128, orange, 'circle'),
       piece(370, 290, 108, teal, 'square', 'plain', 390, 245, 128, teal, 'circle'),
       piece(510, 290, 108, teal, 'circle', 'plain', 390, 245, 128, teal, 'circle')],
      [190, 405].flatMap((y, row) => [
        piece(90, y, 94, orange, 'square', row ? 'striped' : 'plain', 90, 290, 108, orange, 'square'),
        piece(230, y, 94, orange, 'circle', row ? 'striped' : 'plain', 230, 290, 108, orange, 'circle'),
        piece(370, y, 94, teal, 'square', row ? 'striped' : 'plain', 370, 290, 108, teal, 'square'),
        piece(510, y, 94, teal, 'circle', row ? 'striped' : 'plain', 510, 290, 108, teal, 'circle')
      ])
    ];
    setupGenerations = generations;
    setupSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    setupSvg.setAttribute('viewBox', '0 0 600 650');
    setupSvg.classList.add('setup-liquid-overlay');
    setupStage.append(setupSvg);
  }
  let previousSetupPhase = null;
  let setupMorphFrame = 0;
  function cancelSetupMorph() {
    cancelAnimationFrame(setupMorphFrame);
  }
  function showFirstTrinket(forward, animate) {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('fill', '#18b3b1');
    setupSvg.replaceChildren(circle);
    const draw = fraction => {
      const eased = fraction * fraction * (3 - 2 * fraction);
      const progress = forward ? eased : 1 - eased;
      circle.setAttribute('cx', '300');
      circle.setAttribute('cy', String(450 - 305 * progress));
      circle.setAttribute('r', String(35 + 42 * progress));
      circle.setAttribute('opacity', String(Math.min(1, progress * 4)));
    };
    draw(animate ? 0 : 1);
    if (!animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      draw(forward ? 1 : 0);
      if (!forward) setupSvg.replaceChildren();
      return;
    }
    const started = performance.now();
    function tick(now) {
      const fraction = Math.min((now - started) / 900, 1);
      draw(fraction);
      if (fraction < 1) setupMorphFrame = requestAnimationFrame(tick);
      else if (!forward) setupSvg.replaceChildren();
    }
    setupMorphFrame = requestAnimationFrame(tick);
  }
  function startSetupMorph(generation, forward, animate = true) {
    const pieces = setupGenerations[generation - 1];
    const groups = generation === 4
      ? [0, 1, 2, 3].map(index => [pieces[index], pieces[index + 4]])
      : Array.from({length: pieces.length / 2}, (_, index) => pieces.slice(index * 2, index * 2 + 2));
    const ns = 'http://www.w3.org/2000/svg';
    const svg = setupSvg;
    svg.replaceChildren();
    const make = (name, attributes = {}) => {
      const element = document.createElementNS(ns, name);
      Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
      return element;
    };
    const drawings = groups.map(([first, second], index) => {
      const defs = make('defs');
      const filter = make('filter', {
        id: `setup-liquid-filter-${index}`, x: '-30%', y: '-30%', width: '160%', height: '160%',
        'color-interpolation-filters': 'sRGB'
      });
      const blur = make('feGaussianBlur', {in: 'SourceGraphic', stdDeviation: 0, result: 'blur'});
      const choke = make('feColorMatrix', {in: 'blur', type: 'matrix'});
      filter.append(blur, choke);
      defs.append(filter);
      let pattern = null;
      if (second.pattern === 'striped') {
        pattern = make('pattern', {
          id: `setup-liquid-stripes-${index}`, width: 21, height: 21,
          patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(-45)'
        });
        pattern.append(make('rect', {width: 9, height: 21, fill: '#131a5d', opacity: '.73'}));
        defs.append(pattern);
      }
      const group = make('g');
      const liquid = make('g', {filter: `url(#${filter.id})`});
      const left = make('path', {class: 'setup-liquid-left'});
      const right = make('path', {class: 'setup-liquid-right'});
      const stripes = pattern ? make('path', {class: 'setup-liquid-stripes', fill: `url(#${pattern.id})`}) : null;
      liquid.append(left, right);
      group.append(liquid);
      if (stripes) group.append(stripes);
      svg.append(defs, group);
      return {first, second, group, left, right, stripes, blur, choke};
    });
    const mixColor = (start, end, fraction) => {
      const colors = [0, 2, 4].map(offset => Math.round(
        parseInt(start.slice(offset + 1, offset + 3), 16) * (1 - fraction) +
        parseInt(end.slice(offset + 1, offset + 3), 16) * fraction
      ));
      return `rgb(${colors.join(',')})`;
    };
    const roundedPath = (radius, corner) => {
      const r = radius, h = r - corner, k = .55228475 * corner;
      return `M ${-r} 0 L ${-r} ${-h} C ${-r} ${-h-k} ${-h-k} ${-r} ${-h} ${-r} ` +
        `L ${h} ${-r} C ${h+k} ${-r} ${r} ${-h-k} ${r} ${-h} ` +
        `L ${r} ${h} C ${r} ${h+k} ${h+k} ${r} ${h} ${r} ` +
        `L ${-h} ${r} C ${-h-k} ${r} ${-r} ${h+k} ${-r} ${h} Z`;
    };
    const draw = fraction => {
      const eased = fraction * fraction * (3 - 2 * fraction);
      const split = forward ? eased : 1 - eased;
      const liquid = Math.sin(Math.PI * split);
      drawings.forEach(({first, second, group, left, right, stripes, blur, choke}) => {
        const x = first.fromX + ((first.x + second.x) / 2 - first.fromX) * split;
        const y = first.fromY + ((first.y + second.y) / 2 - first.fromY) * split;
        const distance = Math.hypot(second.x - first.x, second.y - first.y) * split;
        const angle = Math.atan2(second.y - first.y, second.x - first.x) * 180 / Math.PI;
        const radius = (first.fromSize + (first.size - first.fromSize) * split) / 2;
        const corner = item => {
          const from = item.fromShape === 'square' ? 10 : item.fromSize / 2;
          const to = item.shape === 'square' ? 10 : item.size / 2;
          return from + (to - from) * split;
        };
        const leftShape = roundedPath(radius, corner(first));
        const rightShape = roundedPath(radius, corner(second));
        const leftColor = mixColor(first.fromColor, first.color, split);
        const rightColor = mixColor(second.fromColor, second.color, split);
        group.setAttribute('transform', `translate(${x} ${y}) rotate(${angle})`);
        [left, right].forEach((shape, index) => {
          shape.setAttribute('d', index ? rightShape : leftShape);
          shape.setAttribute('transform', `translate(${(index ? 1 : -1) * distance / 2} 0)`);
          shape.setAttribute('fill', index ? rightColor : leftColor);
        });
        blur.setAttribute('stdDeviation', String(8 * liquid));
        choke.setAttribute('values', `1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${1 + 19 * liquid} ${-9 * liquid}`);
        if (stripes) {
          stripes.setAttribute('d', rightShape);
          stripes.setAttribute('transform', `translate(${distance / 2} 0)`);
          stripes.setAttribute('opacity', String(split));
        }
      });
    };
    draw(animate ? 0 : 1);
    if (!animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      draw(forward ? 1 : 0);
      return;
    }
    const started = performance.now();
    function tick(now) {
      const fraction = Math.min((now - started) / 900, 1);
      draw(fraction);
      if (fraction < 1) setupMorphFrame = requestAnimationFrame(tick);
    }
    setupMorphFrame = requestAnimationFrame(tick);
  }
  function syncSetup() {
    if (!setupStage) return;
    const phase = setup.querySelectorAll('.setup-step.visible').length;
    const priorPhase = previousSetupPhase;
    cancelSetupMorph();
    setupStage.classList.toggle('has-generation-2', phase >= 2);
    const table = setup.querySelector('.setup-properties');
    table.classList.toggle('is-visible', phase >= 2);
    ['color', 'shape', 'pattern', 'sign'].forEach((name, index) => {
      table.querySelector(`[data-setup-row="${name}"]`).classList.toggle('is-visible', phase >= index + 2);
    });
    previousSetupPhase = phase;
    const adjacent = priorPhase !== null && Math.abs(phase - priorPhase) === 1 && Reveal.getCurrentSlide() === setup;
    if (adjacent && Math.max(phase, priorPhase) === 1) showFirstTrinket(phase > priorPhase, true);
    else if (adjacent && Math.min(phase, priorPhase) >= 1 && Math.max(phase, priorPhase) <= 4)
      startSetupMorph(Math.max(phase, priorPhase), phase > priorPhase);
    else if (phase === 0) setupSvg.replaceChildren();
    else if (phase === 1) showFirstTrinket(true, false);
    else if (phase <= 4 || !setupSvg.children.length) startSetupMorph(Math.min(phase, 4), true, false);
  }
  ['fragmentshown','fragmenthidden'].forEach(name => Reveal.on(name, event => {
    if (event.fragment.classList.contains('notation-step')) syncNotation();
    if (event.fragment.classList.contains('setup-step')) syncSetup();
  }));
  Reveal.on('slidechanged', syncNotation);
  Reveal.on('slidechanged', syncSetup);
  syncSetup();
});
