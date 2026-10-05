// "Designing with restraint": a pill cloud of every feature prototyped for the MVP, on a loop while it's in view.
// Forward: the cut ones strike through, then pop out; the rest slide together (FLIP: measure, change, measure
// again, animate the difference) and turn teal; the count drops 17 → 11 and the label swaps (rotator-style drift
// and fade) from "features prototyped" to "shipped". Hold. Back: the exact reverse, so the loop never jumps.
// The card keeps its full height with every pill throughout. Reduced motion: shows the shipped state, no loop.
// Registered as a mount (see site.js); the cleanup clears every timer and removes the observer and resize listener.
(window.siteMounts ||= []).push(() => {
  const figs = [...document.querySelectorAll('.cloud')];
  if (!figs.length) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const offs = [];

  for (const fig of figs) {
    const pills = [...fig.querySelectorAll('.cloud-list li')];
    const keeps = pills.filter((p) => p.dataset.fate === 'keep');
    const cuts = pills.filter((p) => p.dataset.fate === 'cut');
    const count = fig.querySelector('.cloud-count');
    const [wordBefore, wordAfter] = fig.querySelectorAll('.cloud-label .swap-word');
    const list = fig.querySelector('.cloud-list');
    const total = pills.length;
    let timers = [];
    const at = (ms, fn) => timers.push(setTimeout(fn, ms));
    const clearAll = () => { timers.forEach(clearTimeout); timers = []; };

    // lock the list to its height with every pill showing, so the card never changes size
    const lockHeight = () => {
      const gone = cuts.filter((p) => p.classList.contains('is-gone'));
      list.style.minHeight = '';
      gone.forEach((p) => p.classList.remove('is-gone'));
      list.style.minHeight = list.getBoundingClientRect().height + 'px';
      gone.forEach((p) => p.classList.add('is-gone'));
    };
    // FLIP the kept pills across a layout change, so they glide instead of jumping
    const flip = (change) => {
      const before = new Map(keeps.map((p) => [p, p.getBoundingClientRect()]));
      change();
      keeps.forEach((p) => {
        const a = before.get(p), b = p.getBoundingClientRect();
        p.style.transition = 'none';
        p.style.transform = `translate(${a.left - b.left}px, ${a.top - b.top}px)`;
      });
      void fig.offsetWidth;   // flush, then let them transition home (no rAF, so background tabs can't freeze it)
      keeps.forEach((p) => { p.style.transition = ''; p.style.transform = ''; });
    };
    const swapLabel = (toShipped) => {
      const [out, inn] = toShipped ? [wordBefore, wordAfter] : [wordAfter, wordBefore];
      inn.className = 'swap-word is-on';
      out.className = 'swap-word is-off';
    };
    const reset = () => {
      pills.forEach((p) => { p.className = ''; p.style.transform = ''; });
      count.textContent = total;
      wordBefore.className = 'swap-word is-on'; wordAfter.className = 'swap-word';
    };
    const shipped = () => {
      cuts.forEach((p) => { p.className = 'is-gone'; });
      keeps.forEach((p) => { p.className = 'is-shipped'; });
      count.textContent = keeps.length;
      wordBefore.className = 'swap-word'; wordAfter.className = 'swap-word is-on';
    };

    const cycle = () => {
      let t = 700;
      // forward
      cuts.forEach((p, i) => at(t + i * 140, () => p.classList.add('is-struck')));       // strike what goes
      t += cuts.length * 140 + 900;
      cuts.forEach((p, i) => at(t + i * 90, () => {                                     // pop them out, counting down
        p.classList.add('is-popping'); count.textContent = total - i - 1;
      }));
      t += cuts.length * 90 + 220;
      at(t, () => flip(() => cuts.forEach((p) => p.classList.add('is-gone'))));          // close the gaps
      at(t + 350, () => { keeps.forEach((p) => p.classList.add('is-shipped')); swapLabel(true); });
      t += 350 + 2600;                                                                  // hold on "11 shipped"
      // back: the exact reverse
      at(t, () => { keeps.forEach((p) => p.classList.remove('is-shipped')); swapLabel(false); });
      at(t + 300, () => flip(() => cuts.forEach((p) => p.classList.remove('is-gone'))));  // open the gaps
      t += 300 + 350;
      [...cuts].reverse().forEach((p, i) => at(t + i * 90, () => {                       // pop them back in, counting up
        p.classList.remove('is-popping'); count.textContent = keeps.length + i + 1;
      }));
      t += cuts.length * 90 + 250;
      cuts.forEach((p, i) => at(t + i * 100, () => p.classList.remove('is-struck')));    // un-strike
      t += cuts.length * 100 + 300;
      at(t, cycle);                                                                     // and again
    };
    const start = () => { clearAll(); reset(); lockHeight(); if (reduce) { shipped(); return; } cycle(); };
    const stop = () => { clearAll(); };

    const io = new IntersectionObserver((entries) => {
      const visible = entries.some((e) => e.isIntersecting);
      visible ? start() : stop();   // only loops while you can see it
    }, { threshold: 0.4 });
    io.observe(fig);
    addEventListener('resize', lockHeight);   // pills rewrap at a new width, so re-measure
    lockHeight();
    offs.push(() => { clearAll(); io.disconnect(); removeEventListener('resize', lockHeight); });
  }
  return () => offs.forEach((off) => off());
});
