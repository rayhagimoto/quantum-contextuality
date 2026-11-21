(() => {
  const dialog = document.createElement('dialog');
  dialog.className = 'career-qr-dialog';
  dialog.setAttribute('aria-labelledby', 'career-qr-title');
  dialog.innerHTML = `
    <button class="career-qr-dialog-close" type="button" aria-label="Close enlarged QR code">×</button>
    <h2 id="career-qr-title"><a href="https://apply.workable.com/coldquanta/j/EB77DE8198/" target="_blank" rel="noopener noreferrer">Summer Internship Applications!</a></h2>
    <img src="assets/infleqtion-role-qr.svg" alt="QR code linking to an Infleqtion job opening">`;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let trigger, panelAnimation, titleAnimation, closing = false;
  const visibleImage = element => [...element.querySelectorAll('img')].find(image => image.getClientRects().length);
  const cancelAnimations = () => { panelAnimation?.cancel(); titleAnimation?.cancel(); panelAnimation = titleAnimation = null; };
  const transformFor = (source, image, panel) => {
    const xScale = source.width / image.width;
    const yScale = source.height / image.height;
    const x = source.left - panel.left - (image.left - panel.left) * xScale;
    const y = source.top - panel.top - (image.top - panel.top) * yScale;
    return `translate(${x}px, ${y}px) scale(${xScale}, ${yScale})`;
  };

  function open(button) {
    if (dialog.open) return;
    trigger = button;
    const source = visibleImage(trigger).getBoundingClientRect();
    dialog.classList.remove('is-closing');
    dialog.showModal();
    if (reducedMotion.matches) return;
    const image = visibleImage(dialog).getBoundingClientRect();
    const panel = dialog.getBoundingClientRect();
    panelAnimation = dialog.animate([
      { transform: transformFor(source, image, panel), opacity: .35 },
      { transform: 'none', opacity: 1 }
    ], { duration: 320, easing: 'cubic-bezier(.16, 1, .3, 1)' });
    titleAnimation = dialog.querySelector('h2').animate([{ opacity: 0 }, { opacity: 1 }],
      { delay: 240, duration: 80, fill: 'backwards' });
  }

  function close() {
    if (!dialog.open || closing) return;
    if (reducedMotion.matches) { cancelAnimations(); dialog.close(); return; }
    closing = true;
    const currentTransform = getComputedStyle(dialog).transform;
    const currentOpacity = getComputedStyle(dialog).opacity;
    // Retarget from the visible position if the entrance is still in progress.
    cancelAnimations();
    const image = visibleImage(dialog).getBoundingClientRect();
    const panel = dialog.getBoundingClientRect();
    const source = visibleImage(trigger).getBoundingClientRect();
    dialog.classList.add('is-closing');
    panelAnimation = dialog.animate([
      { transform: currentTransform, opacity: currentOpacity },
      { transform: transformFor(source, image, panel), opacity: 0 }
    ], { duration: 150, easing: 'cubic-bezier(.7, 0, .84, 0)' });
    panelAnimation.finished.then(() => { dialog.close(); cancelAnimations(); closing = false; }).catch(() => { closing = false; });
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.body.append(dialog);
    document.querySelectorAll('.career-qr').forEach(button => button.addEventListener('click', () => open(button)));
    dialog.querySelector('.career-qr-dialog-close').addEventListener('click', close);
    dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
    dialog.addEventListener('keydown', event => {
      event.stopPropagation();
      if (event.key === 'Escape') { event.preventDefault(); close(); }
    });
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    dialog.addEventListener('close', () => trigger?.focus());
  });
})();
