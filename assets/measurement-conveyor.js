// Devices expose their live glass and inspection target. A conveyor links any
// ordered list of these devices using one coordinate system for physical boxes,
// screen copies, and character anchors. Measurement outcomes stay in the lesson.
export function createConveyor(pipeline, boxes, stations) {
  function syncWindows() {
    stations.forEach(({station,screen,world,target}) => {
      const glass = screen.getBoundingClientRect();
      if (!glass.width) return;
      const scale = screen.clientWidth/glass.width;
      const rects = boxes.map(box => box.getBoundingClientRect());
      world.querySelectorAll('.xray').forEach((ghost,i) => {
        const b = rects[i];
        Object.assign(ghost.style,{left:(b.left-glass.left)*scale+'px',top:(b.top-glass.top)*scale+'px',width:b.width*scale+'px',height:b.height*scale+'px'});
      });
      world.querySelector('.window-belt').style.top = (rects[0].bottom-glass.top)*scale+'px';
      const inspector = station.querySelector('.inspector');
      const size = inspector.getBoundingClientRect().width*scale;
      inspector.style.top = (rects[0].top-glass.top)*scale-size*118/128+'px';
      inspector.style.left = (rects[target].left+rects[target].width/2-glass.left)*scale-size*23/128+'px';
    });
  }
  // One continuous conveyor position owns both the physical boxes and their
  // registered CRT copies. Endpoints come from the live glass geometry.
  let conveyorPosition = 0;
  function positions(step) {
    const track = pipeline.getBoundingClientRect();
    if (!track.width) return boxes.map(() => 0);
    const scale = pipeline.clientWidth / track.width;
    const widths = boxes.map(box => box.getBoundingClientRect().width);
    if (!step) return [0, (widths[0] + widths[1] * .75) * scale];
    const glass = stations[step - 1].screen.getBoundingClientRect();
    return widths.map((width, i) =>
      (glass.left - track.left + glass.width * (i + 1) / (boxes.length + 1) - width / 2) * scale);
  }
  function layoutConveyor() {
    // Put the belt at the foot of the inspection zone. Physical boxes and their
    // CRT copies share this baseline, including when the glass resizes.
    const track = pipeline.getBoundingClientRect();
    const glass = stations[0].screen.getBoundingClientRect();
    if (track.width) pipeline.style.setProperty('--conveyor-level',
      ((glass.top - track.top + glass.height * .67) * pipeline.clientWidth / track.width) + 'px');
    const before = Math.floor(conveyorPosition), after = Math.ceil(conveyorPosition);
    const t = conveyorPosition - before;
    const from = positions(before), to = positions(after);
    boxes.forEach((box, i) => box.style.left = (from[i] + (to[i] - from[i]) * t) + 'px');
    syncWindows();
  }
  const geometryObserver = new ResizeObserver(layoutConveyor);
  [pipeline, ...boxes, ...stations.map(item => item.screen)].forEach(element => geometryObserver.observe(element));
  async function moveTo(step, {duration=1400, signal}={}) {
    const origin=conveyorPosition;
    signal?.throwIfAborted();
    pipeline.classList.add('moving');
    try {
      await new Promise((resolve,reject) => {
        const start=performance.now();
        let frame;
        function abort() { cancelAnimationFrame(frame); reject(signal.reason); }
        signal?.addEventListener('abort',abort,{once:true});
        function tick(now) {
          const progress=Math.min(1,(now-start)/duration);
          const eased=progress*progress*(3-2*progress);
          conveyorPosition=origin+(step-origin)*eased;
          layoutConveyor();
          if(progress<1) frame=requestAnimationFrame(tick);
          else { signal?.removeEventListener('abort',abort); resolve(); }
        }
        frame=requestAnimationFrame(tick);
      });
    } finally { pipeline.classList.remove('moving'); }
  }
  return {
    moveTo,
    sync: syncWindows,
    layout: layoutConveyor,
    set position(value) { conveyorPosition=value; layoutConveyor(); },
    get position() { return conveyorPosition; },
    destroy() { geometryObserver.disconnect(); }
  };
}
