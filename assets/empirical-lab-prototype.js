/* Prototype question: can a fixed fork, permuted devices, and repeated product
 * deposits make the two empirical correlations legible at presentation scale?
 * Runs and permutations are precomputed by scripts/precompute-empirical.mjs.
 */
const slide=document.querySelector('#empirical-correlations');
const lab=slide.querySelector('.empirical-lab');
const factory=slide.querySelector('.empirical-factory');
const data=await fetch(new URL('./empirical-runs.json',import.meta.url)).then(r=>r.json());
const ns='http://www.w3.org/2000/svg';
const svg=(name,attrs={})=>{const el=document.createElementNS(ns,name);for(const [k,v]of Object.entries(attrs))el.setAttribute(k,v);return el;};
const scene=svg('svg',{viewBox:'0 0 980 650',role:'img','aria-label':'Pairs enter a fork: third-column measurements upwards, third-row measurements straight ahead.'});
factory.append(scene);
const tracks=['M35 500H930','M220 500V12'];
for(const d of tracks)for(const cls of ['empirical-belt-rim','empirical-belt','empirical-treads'])scene.append(svg('path',{d,class:cls}));
const pairsLayer=svg('g');scene.append(pairsLayer);
const deviceLayer=svg('g');scene.append(deviceLayer);
const positions={row:[[430,500],[640,500],[850,500]],column:[[220,370],[220,220],[220,70]]};
const labels={row:['X₁Y₂','Y₁X₂','Z₁Z₂'],column:['X₁X₂','Y₁Y₂','Z₁Z₂']};
const labelHTML=text=>[...text].map(c=>'₁₂'.includes(c)?`<sub>${c==='₁'?'1':'2'}</sub>`:`<i class="math-variable">${c}</i>`).join('');
const machines={};
for(const context of ['row','column'])machines[context]=labels[context].map((label,id)=>{
  const group=svg('g',{class:'empirical-machine','data-context':context,'data-device':id});
  const fo=svg('foreignObject',{x:-64,y:-52,width:140,height:116});
  const el=document.createElement('div');el.className='empirical-case';
  el.innerHTML=`<div class="crt-screen"><div class="device-name math-text">${labelHTML(label)}</div><div class="device-value math-text"></div></div><div class="case-lamp"></div>`;
  fo.append(el);group.append(fo);deviceLayer.append(group);
  return {group,value:el.querySelector('.device-value')};
});
const noteObject=svg('foreignObject',{x:490,y:85,width:330,height:280});
const notes=document.createElement('div');notes.className='empirical-notes';
notes.innerHTML='<div class="empirical-note-cat" role="img" aria-label="Cat scribbling measurement results with increasing stress, with an atom beside it"><span class="empirical-scribble-sheet"></span></div>';
noteObject.append(notes);scene.append(noteObject);
const catSheet=notes.querySelector('.empirical-scribble-sheet');
// Load all approved breathing poses before the recovery transition reaches them.
const sleepingFrames=['sleep-exhaled.png','sleep-mid-inhale.png','sleep-full-inhale.png'].map(file=>{
  const image=document.createElement('img');
  image.className='empirical-sleep-frame';image.alt='';image.hidden=true;
  image.src=new URL(`./cat-scribbling/${file}`,import.meta.url).href;
  notes.firstElementChild.append(image);return image;
});
// Use the conveyor's actual speed changes to select a fixed-rate three-pose loop.
// Deriving every pose from elapsed time also makes pause, reset and replay exact.
const catStages=[{start:0,level:0,fps:3}];
const catRecoveryStart=Math.max(...data.runs.map(run=>run.start));
const catInitialTravel=data.runs[0].duration;
const catSpeedRange=Math.log(catInitialTravel/Math.min(...data.runs.map(run=>run.duration)));
for(const run of data.runs){
  const progress=catSpeedRange>0?Math.log(catInitialTravel/run.duration)/catSpeedRange:0;
  const level=progress>=2/3?2:progress>=1/3?1:0;
  if(level>catStages.at(-1).level)catStages.push({start:run.start,level,fps:[3,15,30][level]});
}
function renderCat(time){
  const recovering=time>=catRecoveryStart;
  const stage=catStages.findLast(stage=>time>=stage.start);
  const pose=reduced.matches?0:Math.floor((time-stage.start)*stage.fps/1000)%3;
  const recoveryStep=Math.floor(Math.max(0,time-catRecoveryStart)*3/1000);
  const frame=recovering?(reduced.matches?8:recoveryStep<6?recoveryStep:6+(recoveryStep-6)%3):stage.level*3+pose;
  const sleeping=recovering&&(recoveryStep>=6||reduced.matches);
  catSheet.hidden=sleeping;
  sleepingFrames.forEach((image,index)=>image.hidden=!sleeping||index!==frame-6);
  catSheet.classList.toggle('recovering',recovering);
  catSheet.style.backgroundPosition=`${frame%3*50}% ${Math.floor(frame/3)*50}%`;
  notes.dataset.frame=String(frame+1);
  notes.dataset.stress=recovering?'relieved':String(stage.level);
  notes.dataset.fps=String(recovering?3:stage.fps);
  notes.dataset.phase=recovering?(recoveryStep<6&&!reduced.matches?'pickup':'breathing'):'writing';
  notes.firstElementChild.setAttribute('aria-label',sleeping?'Sleeping cat hugging the atom, gently inflating as its blue snooze bubble shrinks on inhalation':recovering?'Relieved cat putting down its notebook and pencil and picking up the atom':'Cat scribbling measurement results with increasing stress, with an atom beside it');
}
const sign=v=>v===1?'+1':'−1';
function makePair(){
  const pair=svg('g',{'class':'empirical-pair'});
  for(let i=0;i<2;i++){
    const box=svg('g',{class:'empirical-box'});
    box.append(svg('rect',{x:-11,y:-10,width:22,height:20,rx:2}),svg('rect',{class:'lid',x:-12,y:-12,width:24,height:5,rx:1}));
    const number=svg('text',{class:'math-text',x:-4,y:5});number.textContent=i+1;box.append(number);pair.append(box);
  }
  pairsLayer.append(pair);return pair;
}
const actors=data.runs.map(run=>({run,pair:makePair(),flight:null}));
function route(context,p){
  if(context==='row')return [35+895*p,500,false];
  const d=673*p;return d<185?[35+d,500,false]:[220,500-(d-185),true];
}
const threshold={row:positions.row.map(([x])=>(x-35)/895),column:positions.column.map(([,y])=>(185+500-y)/673)};
let raf=0,start=0,elapsed=0,active=false,complete=false;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const resultNodes=()=>({row:slide.querySelector('.katex-html .empirical-result-row'),column:slide.querySelector('.katex-html .empirical-result-column')});
const count=slide.querySelector('.empirical-counters');
function setObservation(context,on){
  slide.querySelectorAll(`.empirical-products .katex-html .empirical-${context}`).forEach(el=>el.classList.toggle('observed',on));
  // The shared bottom-right operator belongs to both contexts.
  const shared=slide.querySelector('.empirical-products .katex-html .empirical-shared');
  shared?.classList.toggle('observed',Boolean(slide.querySelector('.empirical-products .katex-html .empirical-answer.observed')));
}
function flightToCell(actor,p){
  const target=resultNodes()[actor.run.context];if(!target)return;
  if(!actor.flight){actor.flight=document.createElement('span');actor.flight.className='empirical-flight math-text';actor.flight.textContent=sign(actor.run.product);lab.append(actor.flight);}
  const rect=lab.getBoundingClientRect(),r=target.getBoundingClientRect(),scale=lab.clientWidth/rect.width;
  const [x,y]=route(actor.run.context,.98);
  const from=new DOMPoint(x,y).matrixTransform(scene.getScreenCTM());
  const to={x:r.left+r.width/2,y:r.top+r.height/2};
  const t=p*p*(3-2*p),arc=90*Math.sin(Math.PI*t);
  actor.flight.style.transform=`translate(${((from.x+(to.x-from.x)*t-rect.left)*scale)}px,${((from.y+(to.y-from.y)*t-rect.top)*scale-arc)}px) translate(-50%,-50%) scale(${1-.75*p*p})`;
  actor.flight.style.opacity=String(1-p**5);actor.flight.hidden=false;
}
function render(time){
  renderCat(time);
  time=Math.min(time,data.duration);
  // Device order is a function of elapsed time, so reset/replay has no stale state.
  let order=[0,1,2],swap=null;
  for(const event of data.swaps){if(time>=event.start+event.duration)order=event.to;else if(time>=event.start){order=event.from;swap=event;break;}else break;}
  for(const context of ['row','column'])machines[context].forEach((machine,id)=>{
    let [x,y]=positions[context][order.indexOf(id)];
    if(swap){const from=swap.from.indexOf(id),to=swap.to.indexOf(id);if(from!==to){const t=Math.min(1,(time-swap.start)/swap.duration),e=t*t*(3-2*t),direction=to>from?1:-1;const dest=positions[context][to];x+=(dest[0]-x)*e;y+=(dest[1]-y)*e;const arc=(context==='row'?100:150)*Math.sin(Math.PI*e)*direction;if(context==='row')y+=arc;else x+=arc;machine.group.style.filter=`blur(${Math.sin(Math.PI*t)*1.8}px)`;}else machine.group.style.filter='';}else machine.group.style.filter='';
    machine.group.setAttribute('transform',`translate(${x} ${y})`);machine.value.textContent='';
  });
  scene.querySelectorAll('.empirical-treads').forEach(el=>el.style.strokeDashoffset=String(-time*.025));
  const deposits={row:-Infinity,column:-Infinity};
  const counts={row:0,column:0},latest={row:[-1,-1,-1],column:[-1,-1,-1]};
  for(const actor of actors){
    const r=actor.run,p=(time-r.start)/r.duration;
    actor.pair.style.display=p>=0&&p<1?'':'none';if(actor.flight)actor.flight.hidden=true;
    if(p<0)continue;
    if(p<1){const [x,y,vertical]=route(r.context,p);actor.pair.setAttribute('transform',`translate(${x} ${y})`);[...actor.pair.children].forEach((box,i)=>box.setAttribute('transform',vertical?`translate(0 ${i?16:-16})`:`translate(${i?16:-16} 0)`));actor.pair.style.filter=r.duration<500?'blur(.5px)':'';}
    r.order.forEach((id,slot)=>{const at=r.start+r.duration*threshold[r.context][slot];if(time>=at&&at>latest[r.context][id]){machines[r.context][id].value.textContent=sign(r.values[slot]);latest[r.context][id]=at;}});
    const fly=(time-r.start-r.duration)/data.flightDuration;
    if(fly>=0&&fly<1&&!reduced.matches)flightToCell(actor,fly);
    if(fly>=1){counts[r.context]++;deposits[r.context]=r.start+r.duration+data.flightDuration;}
  }
  setObservation('row',counts.row>0);setObservation('column',counts.column>0);
  for(const [context,node]of Object.entries(resultNodes()))node?.classList.toggle('empirical-result-hit',time-deposits[context]<220);
  count.innerHTML=`<span class="math-text count-number">${counts.row+counts.column}</span> ${counts.row+counts.column===1?'pair':'pairs'}<br><span class="math-text">${counts.row}</span> row · <span class="math-text">${counts.column}</span> column`;
  lab.dataset.completed=counts.row+counts.column;
  lab.dataset.elapsed=String(time);
  lab.dataset.permutation=order.join('');
}
function stop(reset=false){cancelAnimationFrame(raf);raf=0;active=false;if(reset){elapsed=0;complete=false;render(0);}}
function play(){
  if(active)return;
  if(reduced.matches){elapsed=data.duration;render(elapsed);complete=true;return;}
  active=true;start=performance.now()-elapsed;
  function tick(now){elapsed=now-start;if(!complete){render(elapsed);complete=elapsed>=data.duration;}else renderCat(elapsed);raf=requestAnimationFrame(tick);}
  raf=requestAnimationFrame(tick);
}
function sync(){
  if(!slide.querySelector('.empirical-step').classList.contains('visible')){stop(true);return;}
  if(Reveal.getCurrentSlide()!==slide){stop();return;}
  if(!document.hidden)play();
}
function init(){
  // Reconcile the rendered table if KaTeX finishes after playback begins.
  new MutationObserver(()=>requestAnimationFrame(()=>render(elapsed))).observe(slide.querySelector('.empirical-products'),{childList:true,subtree:true});
  Reveal.on('fragmentshown',e=>{if(e.fragment.classList.contains('empirical-step'))sync();});Reveal.on('fragmenthidden',e=>{if(e.fragment.classList.contains('empirical-step'))sync();});Reveal.on('slidechanged',sync);document.addEventListener('visibilitychange',()=>document.hidden?stop():sync());render(0);sync();}
if(window.Reveal?.isReady())init();else window.addEventListener('load',init,{once:true});
