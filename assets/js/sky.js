// Slide skies (case study), after caddy.app's gradient sections: a fixed layer behind the page holds one soft
// gradient per slide, stacked in order. As a slide crosses the middle of the screen, its gradient fades in OVER
// the previous ones (and those after it fade out on the way back up), so the tint shifts without ever passing
// through blank. The whole layer is clear above slide 01 and fades out again once "More from this project" is
// in view, so the hero, header and footer are untouched. Opacity only.
// Registered as a mount (see site.js); the cleanup removes the layer and both observers.
(window.siteMounts ||= []).push(() => {
  const main = document.querySelector('main.case-study');
  const slides = main ? [...main.querySelectorAll('.slide')] : [];
  if (!slides.length) return;
  const end = main.querySelector('.more') || document.querySelector('.site-footer');   // the story's end: the deep-dive links, or the footer

  const sky = document.createElement('div');
  sky.className = 'slide-sky';
  sky.setAttribute('aria-hidden', 'true');
  const layers = slides.map((_, i) => {
    const l = document.createElement('div');
    l.className = `sky-layer sky-${i + 1}`;
    return sky.appendChild(l);
  });
  main.prepend(sky);

  let current = -1, atEnd = false;
  const paint = () => {
    sky.classList.toggle('is-on', current >= 0 && !atEnd);
    layers.forEach((l, i) => l.classList.toggle('is-on', i <= current));
  };

  // a zero-height line across the middle of the viewport: whichever slide it crosses is the current one
  const slideIo = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) current = slides.indexOf(e.target);
      else if (e.target === slides[0] && e.boundingClientRect.top > 0) current = -1;   // back above slide 01
    });
    paint();
  }, { rootMargin: '-50% 0px -50% 0px' });
  slides.forEach((s) => slideIo.observe(s));

  const endIo = end && new IntersectionObserver(([e]) => {
    atEnd = e.isIntersecting || e.boundingClientRect.top < 0;
    paint();
  });
  if (end) endIo.observe(end);

  return () => { slideIo.disconnect(); if (endIo) endIo.disconnect(); sky.remove(); };
});
