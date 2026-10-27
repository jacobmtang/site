// Home page: the TikTok card (media-bleed phone) is always the same height as Maureen's. The two descriptions wrap to different line
// counts, so the TikTok card's media area (the phone) takes up the difference: its --mh is nudged by however many px the cards differ.
// Re-measures on resize and once the fonts are in; the cleanup disconnects the observer. Registered as a mount (see site.js).
(window.siteMounts ||= []).push(() => {
  const media = document.querySelector('.card-media.media-bleed');
  const stacks = [...document.querySelectorAll('.work-grid .card-stack')];
  if (!media || stacks.length < 2) return;
  const mine = media.closest('.card-stack'), ref = stacks.find((s) => s !== mine);
  const base = 'calc(var(--phone-w) * 1233 / 880 + var(--pad-card))';
  const match = () => {
    media.style.removeProperty('--mh');
    const d = Math.round(mine.getBoundingClientRect().height - ref.getBoundingClientRect().height);
    if (d) media.style.setProperty('--mh', `calc(${base} - ${Math.max(-96, Math.min(96, d))}px)`);
  };
  const ro = new ResizeObserver(match);
  ro.observe(mine); ro.observe(ref);
  document.fonts && document.fonts.ready.then(match);
  match();
  return () => ro.disconnect();
});
