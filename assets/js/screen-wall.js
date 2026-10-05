// Screen wall (slide 05): the screenshots in <template class="wall-screens"> go into the row named by their
// data-row (0-based; otherwise they're dealt round-robin) across the rows (2: light on top, dark below), each row's set is repeated until it fills the
// wall and then doubled, so the drift loops seamlessly, and each row's speed is set so every row moves at the same ~20px/s. The wall stays hidden
// until there are screens. Drifting pauses whenever the wall is off screen. Reduced motion: static.
// Registered as a mount (see site.js); the cleanup disconnects the observer.
(window.siteMounts ||= []).push(() => {
  const walls = [...document.querySelectorAll('.screen-wall')];
  if (!walls.length) return;
  const offs = [];
  for (const wall of walls) {
    const tpl = wall.querySelector('template.wall-screens');
    const rows = [...wall.querySelectorAll('.wall-row')];
    const shots = tpl ? [...tpl.content.querySelectorAll('img')] : [];
    if (!shots.length || !rows.length) continue;
    wall.hidden = false;   // visible first, so the wall can be measured
    if (!rows[0].children.length) {
      shots.forEach((img, n) => {
        const row = rows[(img.dataset.row ? +img.dataset.row : n) % rows.length];   // data-row pins a screen to a row
        img.loading = 'lazy'; img.decoding = 'async'; img.alt = img.alt || '';
        row.appendChild(document.importNode(img, true));
      });
      // each row's set is repeated until it's wider than the wall (so a short row never leaves a gap), then
      // doubled so the drift can loop by exactly one set; copies are hidden from screen readers. Then pace it.
      const shot = rows[0].firstElementChild ? rows[0].firstElementChild.getBoundingClientRect().width : 150;
      const gap = parseFloat(getComputedStyle(rows[0]).columnGap) || 16;
      rows.forEach((row) => {
        const originals = [...row.children];
        const one = originals.length * (shot + gap);
        const reps = Math.max(1, Math.ceil((wall.clientWidth * 1.4) / one));
        const copy = (img) => { const c = img.cloneNode(true); c.alt = ''; c.setAttribute('aria-hidden', 'true'); row.appendChild(c); };
        for (let r = 1; r < reps * 2; r++) originals.forEach(copy);
        const setWidth = reps * one;
        row.style.setProperty('--wall-dur', Math.max(30, setWidth / 20) + 's');
      });
    }
    wall.classList.add('is-paused');
    const io = new IntersectionObserver(([e]) => wall.classList.toggle('is-paused', !e.isIntersecting));
    io.observe(wall);
    offs.push(() => io.disconnect());
  }
  return () => offs.forEach((fn) => fn());
});
