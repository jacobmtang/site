// Word rotator in the Work heading: designing > building > developing > iterating.
// Toggles is-on / is-off; CSS does the motion (drift + fade, muse.ai-style). Holds 3.25s on the first word, 2.5s after.
// Pauses while the tab is hidden; off under reduced motion (the first word just stays).
// Registered as a mount (see site.js): runs on pages that have the rotator; the cleanup stops the timer and
// removes the document listener, so nothing keeps running after Swup swaps the page.
(window.siteMounts ||= []).push(() => {
  const words = [...document.querySelectorAll('.rotator-word')];
  if (words.length < 2 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let i = 0, timer;
  const next = () => {
    words.forEach((w) => w.classList.remove('is-off'));
    words[i].classList.replace('is-on', 'is-off');
    i = (i + 1) % words.length;
    words[i].classList.add('is-on');
    timer = setTimeout(next, 2500);
  };
  const start = (delay) => { clearTimeout(timer); timer = setTimeout(next, delay); };
  const onVisibility = () => (document.hidden ? clearTimeout(timer) : start(2500));

  start(3250);
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    clearTimeout(timer);
    document.removeEventListener('visibilitychange', onVisibility);
  };
});
