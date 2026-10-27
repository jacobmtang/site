// Infographic lightbox (home, student projects row). A click on an infographic card (.ig-open) opens the dialog
// with that card's video, full size over a blurred page. Where the browser has view transitions, the card's
// thumbnail grows into place (and shrinks back on close): the thumbnail and the dialog's video take turns holding
// the view-transition-name ig-media. Closes on the × button, Esc or a click outside the video. With reduced
// motion there's no grow, and the video shows paused with controls instead of looping on its own.
// Registered as a mount (see site.js); the cleanup removes the listeners and closes the dialog.
(window.siteMounts ||= []).push(() => {
  const dlg = document.querySelector('.ig-lightbox');
  const cards = [...document.querySelectorAll('.ig-open')];
  if (!dlg || !cards.length) return;
  const media = dlg.querySelector('.ig-media');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canMorph = !!document.startViewTransition && !still;
  let from = null;   // the card's thumbnail the dialog grew out of

  const swapName = (a, b) => { if (a) a.style.viewTransitionName = ''; if (b) b.style.viewTransitionName = 'ig-media'; };

  // A gallery card (data-gallery) opens its own dialog with every page at once; no morph, just the dialog's grow-in.
  const openGallery = (card) => {
    const g = document.getElementById('gallery-' + card.dataset.gallery);
    if (g) g.showModal();
  };

  const open = (card) => {
    if (card.dataset.gallery) return openGallery(card);
    const thumb = card.querySelector('.yt-thumb');
    const v = card.querySelector('video');
    const src = v.dataset.full || v.dataset.src;   // the card plays a lighter copy; full size gets the original
    if (media.getAttribute('src') !== src) media.src = src;
    media.poster = card.querySelector('video').poster;
    media.controls = still;
    from = thumb;
    const show = () => {
      swapName(thumb, media);
      dlg.showModal();
      if (!still) { media.currentTime = 0; media.play().catch(() => {}); }
    };
    if (canMorph) {
      dlg.classList.add('vt');
      thumb.style.viewTransitionName = 'ig-media';
      document.startViewTransition(show).finished.finally(() => { media.style.viewTransitionName = ''; });
    } else show();
  };

  const close = () => {
    if (!dlg.open) return;
    const hide = () => { dlg.close(); media.pause(); swapName(media, from); };
    if (canMorph && from) {
      media.style.viewTransitionName = 'ig-media';
      document.startViewTransition(hide).finished.finally(() => { if (from) from.style.viewTransitionName = ''; });
    } else hide();
  };

  const onCard = (e) => open(e.currentTarget);
  const onCancel = (e) => { e.preventDefault(); close(); };   // Esc
  const onClick = (e) => { if (e.target === dlg) close(); };  // the backdrop: a click on the dialog itself, outside the video
  const btn = dlg.querySelector('.ig-close');
  cards.forEach((c) => c.addEventListener('click', onCard));
  dlg.addEventListener('cancel', onCancel);
  dlg.addEventListener('click', onClick);
  btn.addEventListener('click', close);
  // galleries: the × button, Esc and a click on the backdrop all close the same way, through a view transition where
  // there is one, so the page fades back into focus instead of snapping.
  const galleries = [...document.querySelectorAll('.ig-gallery')];
  const closeGallery = (g) => {
    if (!g.open) return;
    const hide = () => g.close();
    if (canMorph) document.startViewTransition(hide); else hide();
  };
  const onGalleryClick = (e) => { const g = e.currentTarget; if (e.target === g || e.target.closest('.ig-close')) closeGallery(g); };
  const onGalleryCancel = (e) => { e.preventDefault(); closeGallery(e.currentTarget); };
  galleries.forEach((g) => { g.addEventListener('click', onGalleryClick); g.addEventListener('cancel', onGalleryCancel); });

  return () => {
    cards.forEach((c) => c.removeEventListener('click', onCard));
    dlg.removeEventListener('cancel', onCancel);
    dlg.removeEventListener('click', onClick);
    btn.removeEventListener('click', close);
    if (dlg.open) dlg.close();
    media.pause();
    galleries.forEach((g) => { g.removeEventListener('click', onGalleryClick); g.removeEventListener('cancel', onGalleryCancel); if (g.open) g.close(); });
  };
});
