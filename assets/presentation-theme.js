(() => {
  const key = 'contextuality-presentation-theme';
  const root = document.documentElement;
  const themedFrames = 'iframe.sign-game-frame, iframe.lesson-frame, iframe.tray-example, iframe.device-preview-frame';
  let toggle;
  let saved = 'light';
  try { saved = localStorage.getItem(key) || saved; } catch {}

  function apply(theme) {
    root.dataset.theme = theme === 'dark' ? 'dark' : 'light';
    root.style.colorScheme = root.dataset.theme;
    document.querySelectorAll('.slide-logo').forEach(logo => {
      logo.src = `assets/themes/infleqtion/logo-rgb-${root.dataset.theme === 'dark' ? 'white-teal' : 'color'}.svg`;
    });
    if (toggle) {
      const dark = root.dataset.theme === 'dark';
      const icon = dark
        ? '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'
        : '<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"/>';
      toggle.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${icon}</svg>`;
      toggle.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} mode`);
      toggle.setAttribute('aria-pressed', String(dark));
    }
    document.querySelectorAll(themedFrames).forEach(frame => {
      const child = frame.contentDocument?.documentElement;
      if (child) {
        child.dataset.theme = root.dataset.theme;
        child.style.colorScheme = root.dataset.theme;
      }
    });
  }

  apply(saved);
  window.addEventListener('storage', event => {
    if (event.key === key) apply(event.newValue);
  });
  document.addEventListener('DOMContentLoaded', () => {
    if (!document.querySelector('.reveal')) return;
    toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'theme-toggle';
    toggle.addEventListener('keydown', event => {
      if (event.key === ' ' || event.key === 'Enter') event.stopPropagation();
    });
    toggle.addEventListener('click', () => {
      apply(root.dataset.theme === 'dark' ? 'light' : 'dark');
      try { localStorage.setItem(key, root.dataset.theme); } catch {}
    });
    document.body.append(toggle);
    window.addEventListener('load', () => {
      if (typeof Reveal?.on !== 'function') return;
      Reveal.on('slidechanged', event => {
        const previous = event.previousSlide;
        if (!previous) return;
        const from = Reveal.getIndices(previous);
        const to = Reveal.getIndices(event.currentSlide);
        const backward = from.h > to.h || (from.h === to.h && from.v > to.v);
        if (!backward || (previous.id !== 'sign-game' && event.currentSlide.id !== 'sign-game')) return;
        gameValues = null;
        gameFrames.forEach(frame => {
          frame.contentWindow.postMessage({ type: 'sign-game-state', values: null }, location.origin);
        });
      });
    });
    let gameValues = null;
    const gameFrames = [...document.querySelectorAll('iframe.sign-game-frame')].filter(frame => !frame.getAttribute('src').includes('?classical'));
    window.addEventListener('message', event => {
      if (event.origin !== location.origin || !gameFrames.some(frame => frame.contentWindow === event.source) || event.data?.type !== 'sign-game-state') return;
      gameValues = event.data.values;
      gameFrames.forEach(frame => {
        if (frame.contentWindow !== event.source) frame.contentWindow.postMessage({ type: 'sign-game-state', values: gameValues }, location.origin);
      });
    });
    gameFrames.forEach(frame => frame.addEventListener('load', () => {
      frame.contentWindow.postMessage({ type: 'sign-game-state', values: gameValues }, location.origin);
    }));
    document.querySelectorAll(themedFrames).forEach(frame => {
      frame.addEventListener('load', () => apply(root.dataset.theme));
    });
    apply(root.dataset.theme);
  });
})();
