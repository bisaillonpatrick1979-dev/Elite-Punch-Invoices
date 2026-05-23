(() => {
  let raf = 0;
  const update = (event) => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const shell = document.querySelector('.app-shell');
      if (!shell) return;
      shell.style.setProperty('--pointer-x', `${event.clientX}px`);
      shell.style.setProperty('--pointer-y', `${event.clientY}px`);
    });
  };
  window.addEventListener('pointermove', update, { passive: true });
})();
