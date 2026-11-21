import { Animation, Timeline, ValueTracker } from 'manim-web';
import './recurrent-model/memory-math.js';
import './recurrent-model/measurement-math.js';
import './proof-square.js';

// Animate the existing KaTeX glyphs so every frame retains the deck's math font.
// ManimWeb supplies easing, parallel scheduling, and deterministic timeline seeks.
class GlyphTransfer extends Animation {
  constructor(tile, source, target, index, reorder) {
    super(new ValueTracker(0), { duration: reorder ? 0.85 : 0.5 });
    this.tile = tile;
    this.source = source;
    this.target = target;
    this.delay = reorder ? 0 : index * 0.025;
    this.reorder = reorder;
  }

  interpolate(alpha) {
    const { source, target, tile } = this;
    const progress = this.reorder ? alpha : Math.max(0, (alpha - this.delay) / (1 - this.delay));
    const x = (target.left - source.left) * progress;
    const lift = Math.sign(target.left - source.left) * -12 * Math.sin(Math.PI * progress);
    const y = (target.top - source.top) * progress + (this.reorder ? lift : 10 * (1 - progress));
    tile.style.transform = `translate(${x}px, ${y}px)`;
    tile.style.opacity = this.reorder ? '1' : String(progress);
  }
}

window.addEventListener('load', () => {
  const slide = document.querySelector('#sign-proof');
  if (!slide || !window.Reveal) return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const source = slide.querySelector('.proof-equations-source');
  const target = slide.querySelector('.proof-equations-target');
  let frame;
  let layer;
  let timeline;

  function cancel() {
    cancelAnimationFrame(frame);
    timeline?.pause();
    timeline = undefined;
    layer?.remove();
    layer = undefined;
    slide.querySelectorAll('.manim-target-hidden').forEach(node => node.classList.remove('manim-target-hidden'));
    delete slide.dataset.mathAnimating;
  }

  function tileFor(atom) {
    const bounds = atom.getBoundingClientRect();
    const formula = atom.closest('.katex');
    const tile = document.createElement('span');
    tile.className = 'proof-manim-glyph';
    Object.assign(tile.style, { left: `${bounds.left}px`, top: `${bounds.top}px`, width: `${bounds.width}px`, height: `${bounds.height}px`, color: getComputedStyle(atom).color });
    const copy = formula.cloneNode(true);
    copy.querySelector('.katex-mathml')?.remove();
    Object.assign(copy.style, { position: 'absolute', margin: '0', fontSize: `${parseFloat(getComputedStyle(formula).fontSize) * Reveal.getScale()}px`, whiteSpace: 'nowrap' });
    tile.append(copy);
    layer.append(tile);
    // Measure the copied atom to preserve the exact original baseline/subscripts.
    const identity = [...atom.classList].find(name => /^proof-[ab]-/.test(name));
    const copiedBounds = copy.querySelector(`.${identity}`).getBoundingClientRect();
    copy.style.left = `${bounds.left - copiedBounds.left}px`;
    copy.style.top = `${bounds.top - copiedBounds.top}px`;
    return { tile, bounds };
  }

  function animate(reorder) {
    cancel();
    if (motion.matches || Reveal.getCurrentSlide() !== slide) return;
    layer = document.createElement('div');
    layer.className = 'proof-manim-layer';
    layer.setAttribute('aria-hidden', 'true');
    document.body.append(layer);
    const destination = reorder ? target : source;
    const atoms = [...destination.querySelectorAll('.katex-html .proof-atom')];
    timeline = new Timeline();
    const animations = atoms.map((atom, index) => {
      const identity = [...atom.classList].find(name => /^proof-[ab]-/.test(name));
      const origin = reorder ? source.querySelector(`.katex-html .${identity}`) : atom;
      const { tile, bounds } = tileFor(origin);
      const destinationBounds = atom.getBoundingClientRect();
      // Start in the destination equation's row, never fly through the prose.
      if (reorder) {
        tile.style.top = `${destinationBounds.top}px`;
      }
      return new GlyphTransfer(tile, { left: bounds.left, top: reorder ? destinationBounds.top : bounds.top }, destinationBounds, index, reorder);
    });
    atoms.forEach(atom => atom.classList.add('manim-target-hidden'));
    timeline.addParallel(animations);
    timeline.seek(0);
    slide.dataset.mathAnimating = reorder ? 'reorder' : 'equations';
    const start = performance.now();
    function tick(now) {
      timeline.seek(Math.min((now - start) / 1000, timeline.getDuration()));
      if (timeline.getCurrentTime() >= timeline.getDuration()) cancel();
      else frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
  }

  Reveal.on('fragmentshown', event => {
    if (event.fragment === source) animate(false);
    else if (event.fragment === target) animate(true);
    else cancel();
  });
  Reveal.on('fragmenthidden', cancel);
  Reveal.on('slidechanged', cancel);
  Reveal.on('resize', cancel);
  window.addEventListener('resize', cancel);
  motion.addEventListener('change', cancel);
  document.addEventListener('visibilitychange', cancel);
  slide.dataset.mathEngine = 'manim-web';
});
