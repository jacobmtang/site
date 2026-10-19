// Deck preview (case study, after the last slide): a live, scaled-down first slide of the case study deck.
// The deck renders at its own 1512 x 982 frame inside an iframe (?embed hides its chrome, see the deck copy's
// index.html), scaled to the card's width here, so it keeps its desktop layout at any size. The iframe only
// loads once a quarter of the card is on screen, so the slide's entrance plays where it's seen and the page
// doesn't pay for the deck until then. Registered as a mount (see site.js); the cleanup disconnects both observers and the pageshow listener.
(window.siteMounts ||= []).push(() => {
  const box = document.querySelector('.deck-frame');
  if (!box) return;
  const frame = box.querySelector('iframe');
  const W = 1512;
  const fit = () => box.style.setProperty('--deck-scale', box.clientWidth / W);
  const ro = new ResizeObserver(fit);
  ro.observe(box);
  fit();
  const io = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    if (!frame.src) frame.src = frame.dataset.src;
    io.disconnect();
  }, { threshold: 0.25 });
  io.observe(box);
  // Back from the deck (or any page) can restore this page from the back/forward cache, iframe and all, and Safari
  // can leave the restored slide frozen; reload the preview so it starts fresh.
  const onShow = (e) => {
    if (!e.persisted || !frame.src) return;
    try { frame.contentWindow.location.reload(); } catch (err) { frame.src = frame.dataset.src; }
  };
  addEventListener('pageshow', onShow);
  return () => { ro.disconnect(); io.disconnect(); removeEventListener('pageshow', onShow); };
});
