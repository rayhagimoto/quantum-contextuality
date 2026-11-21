(() => {
  const machine = document.querySelector('.recurrent-machine');
  const measurementModel = document.body.classList.contains('measurement-model');
  const compatibleExample = measurementModel && new URLSearchParams(location.search).get('example') === 'compatible';
  if (compatibleExample) document.body.classList.add('compatible-example');
  const belt = machine.querySelector('.recurrent-belt');
  const memory = machine.querySelector('.recurrent-memory');
  const readout = memory.querySelector('.recurrent-state');
  const cat = machine.querySelector('.recurrent-cat');
  const dust = machine.querySelector('.recurrent-dust');
  const input = machine.querySelector('[data-token="input"]');
  const output = machine.querySelector('[data-token="output"]');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const poses = Object.fromEntries(['idle', 'pick-up', 'lift', 'craft-up', 'craft-down', 'place-down'].map(pose => {
    const image = pose === 'idle' ? cat.firstElementChild : new Image();
    image.alt = '';
    if (pose !== 'idle') image.src = `cat/${pose}.png`;
    return [pose, image];
  }));
  const clouds = { center: dust.firstElementChild };
  for (const frame of ['left', 'right']) {
    const image = new Image();
    image.alt = '';
    image.src = `cat/dust-cloud-${frame}.png`;
    clouds[frame] = image;
  }

  const messages = ['I bought a phone yesterday', '... filler text ...', 'Which of the three items did you not buy...'];
  const message = machine.querySelector('.recurrent-message');
  const outputWord = output.querySelector('.recurrent-token-word');
  const history = document.querySelector('.measurement-history');
  const queue = document.querySelector('.measurement-queue-items');
  let queueInstant = true;
  let queueRun = -1;
  let reportedQueueComplete;
  let requested = 0;
  const inputSymbol = input.querySelector('.measurement-symbol');
  const outputSymbol = output.querySelector('.measurement-symbol');
  const observables = [
    { label: 'X1', latex: 'X_1' }, { label: 'X2', latex: 'X_2' }, { label: 'X1 X2', latex: 'X_1X_2' },
    { label: 'Y2', latex: 'Y_2' }, { label: 'X1 Y2', latex: 'X_1Y_2' }
  ];
  const runDefinitions = compatibleExample ? [
    [{ inputIndex: 0 }, { inputIndex: 3 }, { inputIndex: 4 }],
    [{ inputIndex: 4, nextBits: '01' }, { inputIndex: 0 }, { inputIndex: 1, sign: '−1' }]
  ] : [
    [{ inputIndex: 0 }, { inputIndex: 1 }, { inputIndex: 2, impossible: true }],
    [{ inputIndex: 0, nextBits: '01' }, { inputIndex: 1, bits: '01', impossible: true }]
  ];
  const measurementRuns = runDefinitions.map(run => {
    let bits = '00';
    return run.map(request => {
      const inputBits = request.bits ?? bits;
      bits = request.nextBits ?? inputBits;
      return { ...request, bits: inputBits };
    });
  });
  const outcome = request => request.sign ?? (request.impossible ? '−1' : '+1');
  const historyRuns = measurementRuns.map(run => run.map(request => ({
    operator: observables[request.inputIndex].latex, bits: request.bits,
    showState: compatibleExample, sign: outcome(request), impossible: request.impossible
  })));
  const requests = measurementModel
    ? measurementRuns.flatMap((run, runIndex) => run.map((request, row) => ({ ...request, runIndex, row })))
    : messages.map((_, inputIndex) => ({ inputIndex }));
  const outputs = { '00': 'phone', '01': 'computer', '10': 'printer' };
  const odometerRollMs = 350;
  const initial = { position: 'entry', tokens: 'input', pose: 'idle', active: false, dust: 0, cloud: 'center', seen: 0, bits: '00', outputBits: '00', inputIndex: 0, runIndex: 0, row: 0, labelProgress: 1, resultReady: false, resultProgress: 0, sign: '+1', nextMeasurement: 0 };
  const blank = { ...initial, tokens: 'none', historyBlank: true, queueVisible: false };
  const queued = { ...blank, queueVisible: true };
  const timelines = [...(compatibleExample ? [[{ time: 0, state: blank }], [{ time: 0, state: queued }]] : [[{ time: 0, state: initial }]]), ...requests.flatMap((request, index) => {
    const { inputIndex, impossible, runIndex, row, bits = index === 0 || measurementModel ? '00' : '01' } = request;
    const nextBits = request.nextBits ?? (measurementModel ? bits : '01');
    let state = {
      ...initial, inputIndex, runIndex, row, labelProgress: row ? 0 : 1,
      seen: measurementModel ? row : index, bits, outputBits: bits, impossible, sign: outcome(request),
      nextMeasurement: inputIndex
    };
    const action = [
      [360, { labelProgress: 1 }],
      [650, { position: 'pickupBelt', pose: 'pick-up' }],
      [850, { position: 'pickup' }],
      [1100, { position: 'lift', pose: 'lift' }],
      [1300, { pose: 'craft-up' }],
      [1500, { position: 'craft', pose: 'craft-down', dust: 1, cloud: 'left' }],
      [1700, { tokens: 'output', pose: 'craft-up', cloud: 'right' }],
      [1900, { dust: 0, cloud: 'center' }],
      [2200, { position: 'release', pose: 'place-down' }],
      [2500, { position: 'released', pose: 'idle' }],
      [3000, { position: 'exit', resultReady: true }],
      // The emitted output retains the old state's value after memory changes.
      [3000 + odometerRollMs, {
        seen: state.seen + 1, bits: nextBits, active: true, resultProgress: 1, nextMeasurement: requests[index + 1]?.inputIndex ?? null
      }],
      [3900, { active: false }]
    ];
    const timeline = [{ time: 0, state }, ...action.map(([time, change]) => {
      state = { ...state, ...change };
      return { time, state };
    })];
    return compatibleExample && request.runIndex === 1 && request.row === 0
      ? [[{ time: 0, state: { ...queued, runIndex: 1 } }], timeline] : [timeline];
  })];

  function positions() {
    const stage = machine.getBoundingClientRect();
    const track = belt.getBoundingClientRect();
    const workstation = cat.getBoundingClientRect();
    if (!stage.width || !stage.height) return null;
    const point = (x, y) => [(x - stage.left) / stage.width * 100, (y - stage.top) / stage.height * 100];
    const tokenHeight = parseFloat(getComputedStyle(input).height);
    const onBelt = x => point(x, track.top - tokenHeight / 2);
    // Source coordinates are shared with the sprite placement guide.
    const catX = x => workstation.left + workstation.width * x / 512;
    const nearCat = (x, y) => point(catX(x),
      workstation.top + workstation.height * y / 512);
    return {
      entry: onBelt(measurementModel ? track.left + stage.width * .05 : stage.left + stage.width * .06),
      pickupBelt: onBelt(catX(measurementModel ? 155 : 252)),
      pickup: nearCat(measurementModel ? 155 : 252, measurementModel ? 355 : 317),
      lift: nearCat(measurementModel ? 250 : 345, measurementModel ? 320 : 303), craft: nearCat(242, 376),
      release: nearCat(measurementModel ? 365 : 345, measurementModel ? 375 : 326), released: onBelt(catX(measurementModel ? 365 : 345)),
      exit: onBelt(measurementModel ? track.right - stage.width * .05 : stage.right - stage.width * .06),
    };
  }

  const mix = (from, to, progress) => from + (to - from) * progress;
  const ease = progress => progress * progress * (3 - 2 * progress);
  const readoutState = state => ({ index: String(state.seen), bits: state.bits, next: measurementModel ? state.nextMeasurement : null });
  const sameReadouts = (from, to) => from.index === to.index && from.bits === to.bits && from.next === to.next;
  const visibleReadouts = ({ from, to, progress }) => progress < .5 ? from : to;
  let readoutFrame;
  function seekReadouts(from, to = from, progress = 1, direction = 1) {
    if (sameReadouts(from, to)) progress = 1;
    readoutFrame = { from, to, progress, direction };
    readout.dispatchEvent(new CustomEvent('recurrent-memory-seek', { detail: readoutFrame }));
  }
  seekReadouts(readoutState(initial));

  function drawHistory(from, to, progress) {
    history.classList.toggle('is-blank', Boolean(from.historyBlank));
    history.dispatchEvent(new CustomEvent('recurrent-history-seek', { detail: {
      run: historyRuns[from.runIndex], row: from.row, resultReady: from.resultReady,
      progress: mix(from.labelProgress, to.labelProgress, ease(progress)),
      resultProgress: mix(from.resultProgress, to.resultProgress, ease(progress))
    } }));
    const run = measurementRuns[from.runIndex];
    if (queueRun !== from.runIndex) {
      queueRun = from.runIndex;
      queue.replaceChildren(...run.map(request => {
        const item = document.createElement('span');
        item.className = 'measurement-queue-item';
        const token = document.createElement('span');
        token.className = 'measurement-queue-token';
        window.katex.render(observables[request.inputIndex].latex, token);
        item.append(token);
        return item;
      }));
    }
    queue.classList.toggle('is-instant', queueInstant);
    [...queue.children].forEach((item, index) => {
      item.classList.toggle('is-consumed', index < from.seen);
      item.classList.toggle('is-next', index === from.seen);
      item.setAttribute('aria-hidden', String(index < from.seen));
    });
    const key = from.queueVisible === false ? '' : run.slice(from.seen).map(request => observables[request.inputIndex].label).join(',');
    queue.parentElement.classList.toggle('is-blank', from.queueVisible === false);
    queue.setAttribute('aria-label', key ? `Remaining measurements: ${key}` : 'No remaining measurements');
    const complete = !key;
    queue.parentElement.classList.toggle('is-complete', complete);
    if (complete !== reportedQueueComplete && parent !== window) {
      reportedQueueComplete = complete;
      parent.postMessage({ type: 'recurrent-queue-state', complete, step: requested, instant: queueInstant }, location.origin);
    }
  }
  if (measurementModel && new URLSearchParams(location.search).has('empty')) {
    input.hidden = true;
    output.hidden = true;
    drawHistory(initial, initial, 0);
    queue.replaceChildren();
    queue.setAttribute('aria-label', 'No remaining measurements');
    return;
  }
  if (compatibleExample) input.hidden = true;
  if (measurementModel) drawHistory(compatibleExample ? blank : initial, compatibleExample ? blank : initial, 0);

  let displayedInput;
  function draw(from, to, progress, anchors) {
    machine.dataset.seen = String(from.seen);
    machine.dataset.bits = from.bits;
    if (measurementModel) {
      if (from.inputIndex !== displayedInput) {
        displayedInput = from.inputIndex;
        const { label } = observables[displayedInput];
        inputSymbol.innerHTML = label.split(' ').map(value => `<i class="math-variable">${value[0]}</i><sub>${value[1]}</sub>`).join('');
        input.setAttribute('aria-label', `Measurement ${label}`);
      }
      outputSymbol.textContent = from.sign;
      output.dataset.impossible = String(Boolean(from.impossible));
      output.setAttribute('aria-label', from.impossible ? 'Impossible outcome: minus one' : from.sign === '−1' ? 'Outcome minus one' : 'Outcome plus one');
      drawHistory(from, to, progress);
    } else {
      for (const token of [input, output]) token.querySelector('sub').textContent = String(from.inputIndex + 1);
      output.setAttribute('aria-label', `Output y ${from.inputIndex + 1}: ${outputs[from.outputBits]}`);
      message.textContent = `“${messages[from.inputIndex]}”`;
      input.setAttribute('aria-label', `Input ${from.inputIndex + 1}: ${messages[from.inputIndex]}`);
      outputWord.textContent = `“${outputs[from.outputBits]}”`;
    }
    memory.dataset.active = from.active;
    const dustOpacity = mix(from.dust, to.dust, progress);
    dust.style.opacity = dustOpacity;
    if (message) message.style.opacity = 1 - dustOpacity;
    const cloud = clouds[from.cloud].naturalWidth ? clouds[from.cloud] : clouds.center;
    if (dust.firstElementChild !== cloud) dust.replaceChildren(cloud);
    if (cat.firstElementChild !== poses[from.pose]) cat.replaceChildren(poses[from.pose]);

    function place(token, visible, position) {
      token.hidden = !visible;
      if (!visible) return;
      const start = anchors[from[position]], end = anchors[to[position]];
      const motion = measurementModel ? ease(progress) : progress;
      const x = mix(start[0], end[0], motion);
      const y = mix(start[1], end[1], motion) - (measurementModel && start[0] !== end[0] && start[1] !== end[1] ? Math.sin(Math.PI * progress) * 1.5 : 0);
      token.style.left = `${x}%`;
      token.style.top = `${y}%`;
    }
    place(input, from.tokens === 'input', 'position');
    place(output, from.tokens === 'output', 'position');
  }

  let pending;

  function rewindReadouts(target) {
    let { from, to, progress, direction } = readoutFrame;
    const canRetrace = progress < 1 && (sameReadouts(target, from) || sameReadouts(target, to));
    if (!canRetrace) {
      from = visibleReadouts(readoutFrame);
      to = target;
      progress = 0;
      direction = -1;
    }
    const end = sameReadouts(from, target) ? 0 : 1;
    const duration = odometerRollMs * Math.abs(end - progress);
    if (!duration) {
      seekReadouts(target);
      return;
    }
    const start = performance.now();
    function tick(now) {
      const elapsed = Math.min(1, (now - start) / duration);
      if (elapsed === 1) seekReadouts(target);
      else {
        seekReadouts(from, to, mix(progress, end, elapsed), direction);
        pending = requestAnimationFrame(tick);
      }
    }
    tick(start);
  }

  function setStep(step, animate) {
    if (step === requested && animate) return;
    cancelAnimationFrame(pending);
    queueInstant = !animate || reducedMotion.matches;
    reportedQueueComplete = undefined;
    const previous = requested;
    requested = step;
    const anchors = positions();
    if (!anchors) return;
    const timeline = timelines[step];
    const last = timeline.at(-1);
    const highlight = index => {
      if (measurementModel && parent !== window) parent.postMessage({ type: 'recurrent-measurement-active', index }, location.origin);
    };
    if (!animate || reducedMotion.matches) {
      highlight(null);
      draw(last.state, last.state, 0, anchors);
      seekReadouts(readoutState(last.state));
      return;
    }
    if (step < previous) {
      highlight(null);
      draw(last.state, last.state, 0, anchors);
      rewindReadouts(readoutState(last.state));
      return;
    }

    const entering = visibleReadouts(readoutFrame);
    highlight(step ? timeline[0].state.inputIndex : null);
    const first = readoutState(timeline[0].state);
    let start;
    function tick(now) {
      start ??= now;
      const elapsed = Math.max(0, now - start);
      const next = timeline.findIndex(frame => frame.time > elapsed);
      if (next === -1) {
        highlight(null);
        draw(last.state, last.state, 0, anchors);
        seekReadouts(readoutState(last.state));
        return;
      }
      const from = timeline[next - 1];
      const to = timeline[next];
      const progress = (elapsed - from.time) / (to.time - from.time);
      draw(from.state, to.state, progress, anchors);
      if (!sameReadouts(entering, first) && elapsed < odometerRollMs) {
        seekReadouts(entering, first, elapsed / odometerRollMs);
      } else {
        seekReadouts(readoutState(from.state), readoutState(to.state), progress);
      }
      pending = requestAnimationFrame(tick);
    }
    // Reconcile the prior step before animating a newly requested step.
    tick(performance.now());
  }

  window.addEventListener('message', event => {
    if (event.source !== parent || event.origin !== location.origin || event.data?.type !== 'recurrent-step') return;
    const { step, animate } = event.data;
    if (Number.isInteger(step) && step >= 0 && step < timelines.length) setStep(step, animate);
  });
})();
