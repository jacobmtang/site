// Swap the banner text each time the plane finishes a crossing.
//
// The flight starts at translate(-100%), i.e. one full box-width off the left edge. Some browsers
// (Safari, in particular) resolve that percentage once, when the crossing starts, and the text is
// swapped just AFTER it starts, so a longer message made the box wider than the distance it was
// hidden by, and the plane's nose flashed on screen. Fix: give the box one fixed width, that of the
// LONGEST message (the banner sits flush against the plane, any spare room is on the left), so the
// -100% never changes between crossings.
//
// Registered as a mount (see site.js): runs on pages with the plane; the cleanup removes the window
// listener and the path listener, and stops a pending font re-measure from touching a removed page.
(window.siteMounts ||= []).push(() => {
  const path = document.querySelector('.flight-path');
  const text = document.querySelector('.banner-text');
  if (!path || !text) return;
  const messages = text.dataset.messages.split('|');
  let i = 0, active = true;

  const fit = () => {
    if (!active) return;
    const current = text.textContent;
    path.style.width = 'max-content';
    let widest = 0;
    for (const m of messages) { text.textContent = m; widest = Math.max(widest, path.getBoundingClientRect().width); }
    text.textContent = current;
    path.style.width = Math.ceil(widest) + 'px';
  };
  const onIteration = (e) => {
    if (e.animationName !== 'fly') return;
    i = (i + 1) % messages.length;
    text.textContent = messages[i];
  };

  fit();
  document.fonts?.ready.then(fit);   // re-measure once the font has loaded
  let lastW = innerWidth;
  const onResize = () => { if (innerWidth !== lastW) { lastW = innerWidth; fit(); } };   // width only: iOS fires resize as its toolbar shows and hides while scrolling
  addEventListener('resize', onResize);   // sizes are fluid (plane width, type)
  path.addEventListener('animationiteration', onIteration);

  return () => {
    active = false;
    removeEventListener('resize', onResize);
    path.removeEventListener('animationiteration', onIteration);
  };
});
