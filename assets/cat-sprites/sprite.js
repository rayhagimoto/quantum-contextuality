// The atlas is four columns by five rows. Durations are milliseconds.
export const animations = {
  idle: { row: 0, frames: [[0,1100],[1,300],[0,700],[2,120],[0,900],[3,240]] },
  walk: { row: 1, frames: [[0,140],[1,140],[2,140],[3,140]] },
  poke: { row: 2, frames: [[0,300],[1,150],[2,250],[3,200]] },
  think: { row: 3, frames: [[0,350],[1,220],[2,180],[3,180],[2,180],[3,220]] },
  announce: { row: 4, frames: [[0,220],[1,300],[2,600],[3,300]] }
};

// Mount on any empty element. It remains independent of the CRT effects.
export function createCat(element) {
  element.classList.add('cat-sprite');
  element.setAttribute('role', 'img');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let timer;
  let pose = 'idle';
  let playing = false;
  let loop = true;
  let playbackRate = 1;
  let index = 0;
  function render(column) {
    element.style.backgroundPosition = `${column * 100 / 3}% ${animations[pose].row * 25}%`;
    element.style.maskPosition = element.style.backgroundPosition;
    element.dataset.pose = pose;
    element.setAttribute('aria-label', `Cat: ${pose}`);
  }
  function tick() {
    const sequence = animations[pose].frames;
    render(sequence[index][0]);
    timer = setTimeout(() => {
      if (index === sequence.length - 1 && !loop) {
        playing = false;
        element.dispatchEvent(new CustomEvent('spriteend', {detail: {pose}}));
        return;
      }
      index = (index + 1) % sequence.length;
      tick();
    }, sequence[index][1] / playbackRate);
  }
  function restart() {
    clearTimeout(timer);
    index = 0;
    if (playing && !reduced.matches && !document.hidden) tick();
    else {
      render(reduced.matches && pose !== 'idle' ? 2 : 0);
      if (playing && reduced.matches && !loop) timer = setTimeout(() => {
        playing = false;
        element.dispatchEvent(new CustomEvent('spriteend', {detail: {pose}}));
      }, 0);
    }
  }
  reduced.addEventListener('change', restart);
  document.addEventListener('visibilitychange', restart);
  const api = {
    play(next = 'idle', options = {}) {
      if (!animations[next]) throw new RangeError(`Unknown cat pose: ${next}`);
      pose = next;
      loop = options.loop ?? true;
      playbackRate = options.playbackRate ?? 1;
      playing = true;
      restart();
      return api;
    },
    stop() { playing = false; clearTimeout(timer); return api; },
    face(direction) { element.dataset.facing = direction; return api; },
    destroy() {
      clearTimeout(timer);
      reduced.removeEventListener('change', restart);
      document.removeEventListener('visibilitychange', restart);
    }
  };
  return api.play('idle');
}
