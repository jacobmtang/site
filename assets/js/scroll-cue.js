// Scroll cue (case study), fixed at the bottom centre: a bobbing chevron above the first slide, then progress
// ("03 / 06") in its place for the slide crossing the middle of the screen. The total is counted from the page, so it never goes stale.
// The whole cue fades out once the end of the story ("More from this project") is in view, and returns on the
// way back up. Registered as a mount (see site.js); the cleanup disconnects both observers.
(window.siteMounts ||= []).push(() => {
  const cue = document.querySelector('.scroll-cue');
  const end = document.querySelector('.case-study .more') || document.querySelector('.more');
  if (!cue || !end) return;
  const count = cue.querySelector('.cue-count');
  const slides = [...document.querySelectorAll('.case-study .slide')];
  const pad = (n) => String(n).padStart(2, '0');

  const endIo = new IntersectionObserver(([e]) => {
    cue.classList.toggle('is-done', e.isIntersecting || e.boundingClientRect.top < 0);
  });
  endIo.observe(end);

  // a zero-height line across the middle of the viewport: whichever slide it crosses is the current one
  const slideIo = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        count.textContent = `${pad(slides.indexOf(e.target) + 1)} / ${pad(slides.length)}`;
        cue.classList.add('has-count');
      } else if (e.target === slides[0] && e.boundingClientRect.top > 0) cue.classList.remove('has-count');   // back above slide 01: chevron
    });
  }, { rootMargin: '-50% 0px -50% 0px' });
  if (count) slides.forEach((s) => slideIo.observe(s));

  return () => { endIo.disconnect(); slideIo.disconnect(); cue.classList.remove('has-count'); };
});
