import {createConveyor} from './measurement-conveyor.js';
import {createCat} from './cat-sprites/sprite.js';
const lesson = new URLSearchParams(location.search).get('lesson');
const tray = lesson === 'tray';
if (tray) document.body.classList.add('measurement-tray');
const reverse = lesson === 'reverse';
const mixed = lesson === 'mixed';
const sequence = tray ? [[['X',1]]] : mixed ? [[['X',1]],[['Y',2]],[['X',1],['Y',2]]] :
  (reverse ? [[1,2],[2],[1]] : [[1],[2],[1,2]]).map(terms => terms.map(n => ['X',n]));
const properties = tray ? [{X:-1,Y:-1,Z:-1},{X:1,Y:1,Z:1}] : reverse ? [{X:1,Y:1},{X:-1,Y:-1}] : [{X:-1,Y:1},{X:1,Y:-1}];
const pipeline = document.querySelector('.pipeline');
const parcels = document.querySelector('.line-parcels');
const timeline = document.querySelector('.knowledge-timeline');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const sign = value => value === 1 ? '+1' : '−1';
const math = terms => terms.map(([letter,n]) => `<i>${letter}</i><sub>${n}</sub>`).join('');
function labelOperator(station,terms) {
  const label=station.querySelector('.device-operator');
  // These fixed labels must be present immediately, without queued typesetting.
  label.innerHTML=terms.map(([letter,n])=>`<span class="math-variable">${letter}</span><sub class="math-text">${n}</sub>`).join('');
}
const outcome = terms => terms.reduce((p,[letter,n]) => p*properties[n-1][letter],1);
const markup = n => `<span class="qubit math-text">${n}</span><span class="seal">SEALED</span>`;
parcels.innerHTML = [1,2].map((n,i) => `<div class="parcel" style="left:${i*4.6}%" aria-label="Trinket ${n}, sealed">${markup(n)}</div>`).join('');
const boxes = [...parcels.children];
const stations = sequence.map((terms,i) => {
  const station = document.querySelector('#station-template').content.firstElementChild.cloneNode(true);
  station.style.setProperty('--station',i);
  station.style.setProperty('--station-count',sequence.length);
  station.dataset.phase = 'ready';
  const screen = station.querySelector('.crt-screen');
  const sizeAnswer = () => screen.style.setProperty('--screen-answer-size', Math.min(screen.clientWidth * .17, screen.clientHeight * .22) + 'px');
  new ResizeObserver(sizeAnswer).observe(screen);
  sizeAnswer();
  screen.setAttribute('aria-label',`Measurement ${terms.map(([letter,n])=>letter+n).join(' ')}: waiting`);
  station.querySelector('.screen-equation').innerHTML = math(terms)+' = ?';
  const world = station.querySelector('.window-world');
  world.insertAdjacentHTML('beforeend',[1,2].map(n => `<div class="parcel xray ${terms.some(term=>term[1]===n)?'active':'inactive'}" aria-hidden="true">${markup(n)}</div>`).join(''));
  pipeline.append(station);
  labelOperator(station,terms);
  return {station, screen, world, terms, cat:createCat(station.querySelector('.inspector-sprite')).stop(), target:terms[0][1]-1};
});
const conveyor = createConveyor(pipeline, boxes, stations);
const syncWindows = () => conveyor.sync();
const layoutConveyor = () => conveyor.layout();
const known = [{X:null,Y:null},{X:null,Y:null}];
function trinket(value,n) {
  const color = value.X === null ? 'unknown' : value.X === 1 ? 'teal' : 'orange';
  const shape = value.Y === null ? 'unknown' : value.Y === 1 ? 'circle' : 'square';
  const outline = shape === 'circle' ? '<circle class="unknown-outline known-shape" cx="50" cy="45" r="32"/>' : shape === 'square' ? '<rect class="unknown-outline known-shape" x="18" y="13" width="64" height="64"/>' : '<path class="unknown-outline" d="M22 14 Q38 3 53 13 T82 22 Q96 37 83 50 T72 76 Q55 89 42 77 T16 66 Q3 50 17 36 T22 14Z"/>';
  return `<figure class="knowledge-trinket" data-color="${color}" data-shape="${shape}" aria-label="Trinket ${n}: color ${color}, shape ${shape}, pattern unknown">
  <svg viewBox="0 0 100 90" aria-hidden="true">${outline}</svg>
  <figcaption><span class="trinket-number math-text">${n}</span><br>Shape ${shape === 'unknown' ? '<span class="math-text">?</span>' : shape}<br>Pattern <span class="math-text">?</span></figcaption></figure>`;
}
sequence.forEach(() => timeline.insertAdjacentHTML('beforeend','<div class="knowledge-entry"><div class="knowledge-equation math-text"></div><div class="knowledge-pair"></div></div>'));
function reveal(index, animate = false) {
  const {station,screen,terms} = stations[index];
  station.classList.toggle('result-scan', animate && !reduced.matches);
  const value = outcome(terms);
  if (terms.length === 1) known[terms[0][1]-1][terms[0][0]] = value;
  const entry = timeline.children[index];
  entry.querySelector('.knowledge-equation').innerHTML = math(terms)+' = '+sign(value);
  entry.querySelector('.knowledge-pair').innerHTML = known.map((v,i) => trinket(v,i+1)).join('');
  entry.classList.add('revealed');
  station.querySelector('.screen-equation').innerHTML = math(terms)+' = '+sign(value);
  const result = station.querySelector('.screen-result');
  result.textContent = terms.length === 2 ? (terms[0][0] === terms[1][0] ? (value === 1 ? 'SAME ' : 'DIFFERENT ') + ({X:'COLORS',Y:'SHAPES',Z:'PATTERNS'}[terms[0][0]]) : (value === 1 ? 'SAME SIGNS' : 'DIFFERENT SIGNS')) : terms[0][0] === 'Y' ? (value === 1 ? 'CIRCLE' : 'SQUARE') : value === 1 ? 'TEAL' : 'ORANGE';
  const words = result.textContent.split(' ');
  result.dataset.lines = words.length;
  result.replaceChildren(...words.map(word => {
    const line = document.createElement('span');
    line.textContent = word;
    return line;
  }));
  result.style.color = terms.length === 1 && terms[0][0] === 'X' ? value === 1 ? '#50e4d6' : '#ffad64' : '';
  screen.setAttribute('aria-label',`${terms.map(([letter,n])=>letter+n).join(' ')} = ${sign(value)}`);
  station.classList.remove('scanning');
  station.dataset.phase = 'done';
}
function reset(step) {
  known.forEach(value => {value.X=null; value.Y=null;});
  pipeline.classList.remove('moving');
  stations.forEach(({station,screen,terms,cat},i) => {
    cat.stop(); station.classList.remove('scanning', 'result-scan'); station.dataset.phase='ready';
    station.querySelectorAll('.xray').forEach((box,n) => {
      const active=terms.some(term=>term[1]===n+1);
      box.classList.toggle('active',active); box.classList.toggle('inactive',!active);
    });
    station.querySelector('.screen-result').textContent='';
    station.querySelector('.screen-result').style.color='';
    station.querySelector('.screen-equation').innerHTML=math(terms)+' = ?';
    timeline.children[i].classList.remove('revealed');
    timeline.children[i].querySelector('.knowledge-equation').textContent='';
    timeline.children[i].querySelector('.knowledge-pair').replaceChildren();
    screen.setAttribute('aria-label',`Measurement ${terms.map(([letter,n])=>letter+n).join(' ')}: waiting`);
  });
  for(let i=0;i<step;i++) reveal(i);
  conveyor.position=step;
  layoutConveyor();
}
function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    signal.throwIfAborted();
    const abort = () => {clearTimeout(timer); reject(signal.reason);};
    const timer=setTimeout(() => {signal.removeEventListener('abort',abort); resolve();},ms);
    signal.addEventListener('abort',abort,{once:true});
  });
}
async function run(index, signal) {
  const item=stations[index];
  item.target=item.terms[0][1]-1;
  syncWindows();
  // Every operator shares a 2500 ms budget, including travel and answer reveal.
  const scanDuration = reduced.matches ? 0 : parseFloat(getComputedStyle(item.station).getPropertyValue('--result-scan-duration'));
  const travelDuration = reduced.matches ? 80 : 600;
  const inspectionDuration = reduced.matches ? 160 : 2500 - travelDuration - scanDuration;
  const pace = inspectionDuration / (2100 * item.terms.length + 600 * (item.terms.length - 1));
  item.station.style.setProperty('--inspection-walk-duration', `${600 * pace}ms`);
  await conveyor.moveTo(index+1,{duration:travelDuration,signal});
  signal.throwIfAborted();
  item.station.classList.add('scanning'); item.station.dataset.phase='scanning';
  item.station.querySelector('.screen-result').textContent='Checking…';
  for (const [step,[,n]] of item.terms.entries()) {
    item.target=n-1;
    if (step) {
      item.cat.play('walk',{playbackRate:1/pace});
      syncWindows();
      await wait(600*pace,signal);
    }
    item.world.querySelectorAll('.xray').forEach((box,i) => {
      box.classList.toggle('active',i===item.target); box.classList.toggle('inactive',i!==item.target);
    });
    syncWindows(); item.cat.play('poke',{loop:false,playbackRate:1/pace}); await wait(900*pace,signal);
    item.cat.play('think',{playbackRate:1/pace}); await wait(600*pace,signal);
    item.cat.play('announce',{loop:false,playbackRate:1/pace}); await wait(600*pace,signal);
    item.cat.stop();
  }
  signal.throwIfAborted(); reveal(index, true);
  if (!reduced.matches) {
    try { await wait(scanDuration, signal); }
    finally { item.station.classList.remove('result-scan'); }
  }
}
let completed=0, desired=0, running=false, controller=null, restoreRequested=false, skipRequested=false;
function skipAnimation() {
  if (!controller || controller.signal.aborted) return;
  skipRequested = true;
  controller.abort();
}
function tellBusy(busy) { parent.postMessage({type:'measurement-line-busy',busy},location.origin); }
async function update() {
  if(running) return;
  running=true; tellBusy(true);
  try {
    while(completed !== desired || restoreRequested) {
      if(restoreRequested || desired<completed) {
        reset(desired); completed=desired; restoreRequested=false;
      } else {
        controller=new AbortController();
        try {await run(completed,controller.signal); completed++;}
        catch(error) {
          if(!controller.signal.aborted) throw error;
          const skipping = skipRequested && !restoreRequested && desired > completed;
          completed = skipping ? completed + 1 : Math.min(completed,desired);
          reset(completed);
          if (skipping) pipeline.getAnimations({subtree:true}).forEach(animation => {
            if (Number.isFinite(animation.effect.getComputedTiming().endTime)) animation.finish();
          });
        } finally {controller=null; skipRequested=false;}
      }
    }
  } finally {running=false; tellBusy(false);}
}
window.addEventListener('message',event => {
  if(event.source!==parent || event.origin!==location.origin) return;
  if(event.data?.type==='measurement-line-skip') { skipAnimation(); return; }
  if(event.data?.type!=='measurement-line-step') return;
  if (tray) return;
  const step=event.data.step;
  if(!Number.isInteger(step)||step<0||step>stations.length) return;
  desired=step;
  if(event.data.restore || event.data.active===false) restoreRequested=true;
  if(controller && (restoreRequested || desired<=completed)) controller.abort();
  update();
});
window.addEventListener('keydown',event => {
  if (tray) {
    if(event.key==='ArrowRight' && running) { event.preventDefault(); skipAnimation(); }
    return;
  }
  const previous=['ArrowLeft','ArrowUp','PageUp','p','P'].includes(event.key) || event.key===' ' && event.shiftKey;
  const next=['ArrowRight','ArrowDown','PageDown','n','N'].includes(event.key) || event.key===' ' && !event.shiftKey;
  if(previous||next) {
    event.preventDefault(); parent.postMessage({type:'measurement-line-navigate',direction:previous?'previous':'next'},location.origin);
  }
});
layoutConveyor();
parent.postMessage({type:'measurement-line-ready'},location.origin);

// The tray is a one-device sequence using the same renderer and animation.
// Its operator picker supplies the measurement; no separate prototype engine.
if (tray) {
  const operators = [
    [['X',1]], [['X',2]], [['X',1],['X',2]],
    [['Y',2]], [['Y',1]], [['Y',1],['Y',2]],
    [['X',1],['Y',2]], [['Y',1],['X',2]], [['Z',1],['Z',2]]
  ];
  window.addEventListener('message', async event => {
    if(event.source!==parent || event.origin!==location.origin || event.data?.type!=='tray-measure') return;
    const terms=operators[event.data.index];
    if(!terms || running) return;
    sequence[0]=terms; labelOperator(stations[0].station,terms); stations[0].terms=terms; stations[0].target=terms[0][1]-1;
    reset(0); completed=0; desired=1;
    await update();
    parent.postMessage({type:'tray-ready'},location.origin);
  });
}
