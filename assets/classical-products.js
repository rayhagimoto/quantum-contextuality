/* Outer-cell hit areas follow the rendered KaTeX cells. */
window.addEventListener('load', () => {
  const board=document.querySelector('.classical-products');
  if(!board || board.dataset.interactive) return;
  board.dataset.interactive="true";
  const products=[['r1','First row'],['r2','Second row'],['c1','First column'],['c2','Second column']];
  const buttons=products.map(([key,label])=>{
    const button=document.createElement('button');
    button.type='button'; button.className='product-reveal'; button.dataset.product=key;
    button.setAttribute('aria-label',`Reveal ${label.toLowerCase()} product: positive one`);
    button.setAttribute('aria-pressed','false');
    button.addEventListener('click',()=>{
      const shown=button.getAttribute('aria-pressed')!=='true';
      board.querySelector('.katex-html .product-'+key)?.classList.toggle('revealed',shown);
      button.setAttribute('aria-pressed',String(shown));
      button.setAttribute('aria-label',`${shown?'Hide':'Reveal'} ${label.toLowerCase()} product: positive one`);
    });
    button.addEventListener('keydown',event=>{
      if(event.key===' '||event.key==='Enter')event.stopPropagation();
    });
    board.append(button); return button;
  });
  function align() {
    const rect=board.getBoundingClientRect();
    if(!rect.width) return;
    const scale=board.clientWidth/rect.width;
    buttons.forEach(button=>{
      const slot=board.querySelector('.katex-html .product-'+button.dataset.product);
      if(!slot) return;
      const r=slot.getBoundingClientRect();
      Object.assign(button.style,{left:(r.left-rect.left)*scale-10+'px',top:(r.top-rect.top)*scale-10+'px',width:r.width*scale+20+'px',height:r.height*scale+20+'px'});
    });
  }
  align();
  new ResizeObserver(align).observe(board);
  Reveal.on('slidechanged',align);
  window.addEventListener('resize',align);
});
