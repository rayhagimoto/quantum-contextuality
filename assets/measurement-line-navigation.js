window.addEventListener('load', () => {
  const frames = [...document.querySelectorAll('iframe[data-measurement-line], iframe.tray-example')];
  const busy = new WeakMap();
  const current = () => Reveal.getCurrentSlide()?.querySelector('iframe[data-measurement-line], iframe.tray-example');
  function sync(frame, restore = false, active = frame === current()) {
    if (!frame.matches('[data-measurement-line]')) return;
    const step = frame.closest('section').querySelectorAll('.line-steps .fragment.visible').length;
    frame.contentWindow.postMessage({type:'measurement-line-step', step, restore, active}, location.origin);
  }
  frames.forEach(frame => frame.addEventListener('load', () => sync(frame, true)));
  ['fragmentshown','fragmenthidden'].forEach(name => Reveal.on(name, () => {
    if (current()) sync(current());
  }));
  Reveal.on('slidechanged', event => {
    const previous = event.previousSlide?.querySelector('iframe[data-measurement-line], iframe.tray-example');
    if (previous) sync(previous, true, false);
    if (current()) sync(current(), true);
  });
  // A forward press finishes the active measurement without consuming another fragment.
  function finish(frame) {
    frame.contentWindow.postMessage({type:'measurement-line-skip'}, location.origin);
  }
  document.addEventListener('keydown', event => {
    if (event.altKey || event.metaKey || event.ctrlKey || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
    const forward = ['ArrowRight','ArrowDown','PageDown','n','N'].includes(event.key) || event.key === ' ' && !event.shiftKey;
    if (forward && busy.get(current())) { event.preventDefault(); event.stopImmediatePropagation(); finish(current()); }
  }, true);
  document.addEventListener('click', event => {
    if (event.target.closest('.navigate-right, .navigate-down') && busy.get(current())) { event.preventDefault(); event.stopImmediatePropagation(); finish(current()); }
  }, true);
  window.addEventListener('message', event => {
    if (event.origin !== location.origin) return;
    const frame = frames.find(f => f.contentWindow === event.source);
    if (!frame) return;
    if (event.data?.type === 'measurement-line-ready') sync(frame, true);
    if (event.data?.type === 'measurement-line-busy') busy.set(frame, event.data.busy);
    if (event.data?.type === 'measurement-line-navigate' && frame === current()) {
      if (event.data.direction === 'previous') Reveal.prev();
      else if (event.data.direction === 'next') {
        if (busy.get(frame)) finish(frame); else Reveal.next();
      }
    }
  });
  if (current()) sync(current(), true);
});
