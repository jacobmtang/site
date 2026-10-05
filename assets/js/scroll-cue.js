// Scroll cue: hides the bobbing chevron once the end of the story ("More from this project") is in view,
// and shows it again when scrolling back up. Registered as a mount (see site.js).
(window.siteMounts ||= []).push(() => {
  const cue = document.querySelector('.scroll-cue');
  const end = document.querySelector('.case-study .more') || document.querySelector('.more');
  if (!cue || !end) return;
  const io = new IntersectionObserver(([e]) => {
    cue.classList.toggle('is-done', e.isIntersecting || e.boundingClientRect.top < 0);
  });
  io.observe(end);
  return () => io.disconnect();
});
