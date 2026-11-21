import { Animation, Timeline, ValueTracker } from 'manim-web';

class DrawOutline extends Animation {
  constructor(path) {
    super(new ValueTracker(0), { duration: 0.6 });
    this.path = path;
  }

  interpolate(alpha) {
    this.path.style.strokeDashoffset = String(1 - alpha);
  }
}

class MoveOutline extends Animation {
  constructor(place, from, to) {
    super(new ValueTracker(0), { duration: 0.45 });
    this.place = place;
    this.from = from;
    this.to = to;
  }

  interpolate(alpha) {
    this.place(this.from.map((value, i) => value + (this.to[i] - value) * alpha));
  }
}

/* Reveal owns each square state and the outline follows its active context. */
window.addEventListener('load', () => {
  const slide = document.querySelector('#contextuality-square');
  if (!slide || !window.Reveal) return;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let strokeAnimation;
  const outline = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  outline.classList.add('proof-context-outline');
  outline.setAttribute('viewBox', '0 0 100 100');
  outline.setAttribute('preserveAspectRatio', 'none');
  outline.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(outline.namespaceURI, 'path');
  path.setAttribute('d', 'M 1 1 H 99 V 99 H 1 Z');
  path.setAttribute('pathLength', '1');
  outline.append(path);
  let outlineFrame;
  let outlineTimeline;
  let outlineBounds;
  outline.style.display = 'none';
  const board = slide.querySelector('.proof-table');
  board.append(outline);

  function stopOutline() {
    cancelAnimationFrame(outlineFrame);
    outlineTimeline?.pause();
    outlineTimeline = undefined;
  }

  function placeOutline(bounds) {
    outlineBounds = bounds;
    const [left, top, width, height] = bounds.map(value => `${value}px`);
    Object.assign(outline.style, { left, top, width, height });
  }

  function positionOutline(state, animate = false) {
    stopOutline();
    if (Reveal.getCurrentSlide() !== slide || !['row', 'column'].includes(state)) {
      outline.style.display = 'none';
      outlineBounds = undefined;
      return;
    }
    const table = slide.querySelector(state === 'column' ? '.proof-negative-table' : '.proof-number-table');
    const slots = state === 'row' ? [8, 9, 10, 11] : [2, 6, 10, 14];
    const bounds = slots.map(i => {
      const slot = table.querySelector(`.katex-html .proof-slot-${i}`);
      const range = document.createRange();
      range.selectNodeContents(slot);
      return range.getBoundingClientRect();
    });
    const origin = board.getBoundingClientRect();
    const scale = Reveal.getScale();
    const padding = 12;
    const left = Math.min(...bounds.map(rect => rect.left));
    const right = Math.max(...bounds.map(rect => rect.right));
    const top = Math.min(...bounds.map(rect => rect.top));
    const bottom = Math.max(...bounds.map(rect => rect.bottom));
    const target = [
      (left - origin.left) / scale - padding,
      (top - origin.top) / scale - padding,
      (right - left) / scale + 2 * padding,
      (bottom - top) / scale + 2 * padding
    ];
    outline.style.display = 'block';
    path.style.strokeDashoffset = '0';
    path.style.strokeDasharray = 'none';
    if (!animate || reducedMotion.matches) {
      placeOutline(target);
      return;
    }
    let animation;
    if (outlineBounds) {
      animation = new MoveOutline(placeOutline, outlineBounds, target);
    } else {
      placeOutline(target);
      path.style.strokeDasharray = '1';
      animation = new DrawOutline(path);
    }
    outlineTimeline = new Timeline();
    outlineTimeline.add(animation);
    outlineTimeline.seek(0);
    const start = performance.now();
    function tick(now) {
      if (!outlineTimeline) return;
      outlineTimeline.seek(Math.min((now - start) / 1000, outlineTimeline.getDuration()));
      if (outlineTimeline.getCurrentTime() < outlineTimeline.getDuration()) outlineFrame = requestAnimationFrame(tick);
      else path.style.strokeDasharray = 'none';
    }
    outlineFrame = requestAnimationFrame(tick);
  }

  function desiredState() {
    if (slide.querySelector('.proof-column-step.visible')) return 'column';
    if (slide.querySelector('.proof-row-step.visible')) return 'row';
    if (slide.querySelector('.proof-fill-step.visible')) return 'ones';
    return 'symbols';
  }

  function stopStroke() {
    strokeAnimation?.cancel();
    strokeAnimation = undefined;
    slide.querySelectorAll('.proof-unsatisfied svg line').forEach(line => {
      line.style.strokeDasharray = '';
      line.style.strokeDashoffset = '';
    });
  }

  function sync(allowAnimation = true) {
    const state = desiredState();
    const previous = slide.dataset.squareState;
    if (state === previous) {
      if (!allowAnimation) {
        stopStroke();
        positionOutline(state);
      }
      return;
    }
    stopStroke();
    slide.dataset.squareState = state;
    const order = ['symbols', 'ones', 'row', 'column'];
    const forward = order.indexOf(state) > order.indexOf(previous);
    positionOutline(state, allowAnimation);
    if (!allowAnimation || !forward || reducedMotion.matches || Reveal.getCurrentSlide() !== slide || state === 'symbols' || state === 'row') return;

    const table = state === 'column' ? '.proof-negative-table' : '.proof-number-table';
    const stroke = slide.querySelector(`${table} .proof-unsatisfied svg line`);
    if (!stroke) return;
    const length = stroke.getTotalLength();
    stroke.style.strokeDasharray = `${length}`;
    stroke.style.strokeDashoffset = `${length}`;
    const animation = stroke.animate([
      { strokeDashoffset: length },
      { strokeDashoffset: 0 }
    ], { duration: 320, easing: 'cubic-bezier(.2, .7, .3, 1)', fill: 'forwards' });
    strokeAnimation = animation;
    animation.finished.then(() => {
      if (strokeAnimation !== animation) return;
      strokeAnimation = undefined;
      stroke.style.strokeDasharray = '';
      stroke.style.strokeDashoffset = '';
      animation.cancel();
    }).catch(() => {});
  }

  sync(false);
  Reveal.on('fragmentshown', () => sync());
  Reveal.on('fragmenthidden', () => sync());
  Reveal.on('slidechanged', () => sync(false));
  Reveal.on('resize', () => sync(false));
  reducedMotion.addEventListener('change', () => sync(false));
});
