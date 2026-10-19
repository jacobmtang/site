// Craft demo loop (craft.css): an empty phone → the card assembles outside it, off-grid → snaps to the real
// values → redlines → drops into the gap → holds → fades and resets. Started by slide.js on enter; the
// returned stop() ends it on leave.
window.Craft = {
  start(el) {
    const box = el.querySelector('.craft');
    if (!box) return () => {};
    const START = ['is-out', 'is-messy'];
    const reset = () => {   // back to the start (empty phone, card waiting outside, off-grid) with no motion
      box.classList.add('is-instant');
      box.classList.remove('is-shown', 'is-lines');
      box.classList.add(...START);
      void box.offsetWidth;
      box.classList.remove('is-instant');
    };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {   // no loop: show the finished card in place
      box.classList.add('is-shown'); return () => box.classList.remove('is-shown');
    }
    reset();
    let timer = 0, live = true, i = 0;
    const steps = [
      [900, () => box.classList.add('is-shown')],          // the empty phone, then the card arrives outside
      [1500, () => box.classList.remove('is-messy')],      // hold the mess, then snap to the grid
      [800, () => box.classList.add('is-lines')],          // let it land, then the redlines
      [4000, () => box.classList.remove('is-lines')],      // read them
      [450, () => box.classList.remove('is-out')],         // drop into the gap
      [2000, () => box.classList.remove('is-shown')],      // hold it in place, then fade
      [500, reset],
    ];
    const tick = () => {
      if (!live) return;
      const [wait, act] = steps[i];
      timer = setTimeout(() => { act(); i = (i + 1) % steps.length; tick(); }, wait);
    };
    tick();
    return () => { live = false; clearTimeout(timer); reset(); };
  },
};
