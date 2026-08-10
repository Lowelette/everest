(() => {
  if (window.__lwsSignInit) return;
  window.__lwsSignInit = true;

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const glitchChars = '▓▒█<>/#─┼·';

  document.querySelectorAll('.lws-sign').forEach(sign => {
    const txt = sign.querySelector('.lws-txt');
    if (!txt || reducedMotion) return;

    const original = txt.dataset.txt || txt.textContent;
    let busy = false;

    const burst = () => {
      if (busy) return;
      busy = true;
      sign.classList.add('lws-glitching');

      let frame = 0;
      const interval = setInterval(() => {
        const output = original.split('');
        const replacements = 2 + (Math.random() * 3 | 0);

        for (let i = 0; i < replacements; i += 1) {
          output[Math.random() * output.length | 0] =
            glitchChars[Math.random() * glitchChars.length | 0];
        }

        txt.textContent = output.join('');

        if (++frame > 2) {
          clearInterval(interval);
          txt.textContent = original;
          sign.classList.remove('lws-glitching');
          busy = false;
        }
      }, 70);
    };

    const schedule = () => {
      setTimeout(() => {
        burst();
        schedule();
      }, 2600 + Math.random() * 3400);
    };

    schedule();
    sign.addEventListener('mouseenter', burst);
  });
})();
