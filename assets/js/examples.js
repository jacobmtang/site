// Examples switcher: pill tabs (role="tab") swap between .ex-panel examples in the same visual.
// Click or arrow keys move between pills (roving tabindex, like a native tab list). Switching pauses the old
// panel's videos and starts the new one's (attaching their src if they haven't loaded yet), so only one
// example ever plays, and only while the switcher is on screen. video.js leaves inactive panels alone.
//
// data-autoplay on .examples: the examples play through on their own. Each video plays once, then the next
// pill takes over (wrapping to the first); a panel without video stays for 6s. The active pill fills with a
// light sweep as its video plays (--p). Tapping or keying a pill skips to that tool (from the start) and
// cycling carries on from there, so there's never a stuck state. Reduced motion: no cycling.
// Registered as a mount (see site.js); the cleanup removes listeners, observers and timers.
(window.siteMounts ||= []).push(() => {
  const groups = [...document.querySelectorAll('.examples')];
  if (!groups.length) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const offs = [];

  for (const group of groups) {
    const tabs = [...group.querySelectorAll('[role="tab"]')];
    const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
    // a panel's "lead" video sets its length in auto mode (the longest clip, marked data-lead); any other
    // clips in the panel just loop alongside it
    const videoOf = (n) => panels[n] && (panels[n].querySelector('video[data-lead]') || panels[n].querySelector('video'));
    panels.forEach((p) => p && p.removeAttribute('hidden'));   // visibility is handled by .is-active (crossfade)

    let current = Math.max(0, tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true'));
    let visible = false, timer = 0;
    let auto = group.hasAttribute('data-autoplay') && tabs.length > 1 && !reduce;
    group.classList.toggle('is-auto', auto);

    const setProgress = (n, pct, instant) => {
      const t = tabs[n];
      if (instant) { t.style.transition = 'none'; t.style.setProperty('--p', pct + '%'); void t.offsetWidth; t.style.transition = ''; }
      else t.style.setProperty('--p', pct + '%');
    };
    const play = (v) => { if (!v.src && v.dataset.src) v.src = v.dataset.src; v.play().catch(() => {}); };
    const arm = () => {   // in auto mode, a panel without video moves on after 6s
      clearTimeout(timer);
      if (auto && visible && !videoOf(current)) timer = setTimeout(() => select((current + 1) % tabs.length, false, true), 6000);
    };

    function select(i, focus, fromAuto) {
      if (fromAuto && panels[i]) panels[i].querySelectorAll('video').forEach((v) => { try { v.currentTime = 0; } catch {} });   // the whole panel starts together
      tabs.forEach((t, n) => {
        const on = n === i;
        t.setAttribute('aria-selected', on);
        t.tabIndex = on ? 0 : -1;
        if (!on) setProgress(n, 0, true);
        const p = panels[n];
        if (!p) return;
        p.classList.toggle('is-active', on);
        p.toggleAttribute('inert', !on);
        p.querySelectorAll('video').forEach((v) => { if (!on) v.pause(); else if (visible) play(v); });
      });
      current = i;
      arm();
      if (focus) tabs[i].focus({ preventScroll: true });
      // keep the chosen pill in view when the row scrolls sideways (phones), without moving the page
      const list = tabs[i].parentElement, t = tabs[i];
      if (list.scrollWidth > list.clientWidth) {
        const left = t.offsetLeft - list.offsetLeft, right = left + t.offsetWidth;
        if (left < list.scrollLeft || right > list.scrollLeft + list.clientWidth)
          list.scrollTo({ left: left - (list.clientWidth - t.offsetWidth) / 2, behavior: 'smooth' });
      }
    }

    const onClick = (e) => {
      const i = tabs.indexOf(e.target.closest('[role="tab"]'));
      if (i < 0 || i === current) return;   // tapping the pill that's already showing changes nothing
      // auto mode: jump to that tool from the start, then keep cycling from there (tap = skip, not stop)
      if (auto) select(i, false, true); else select(i);
    };
    const onKey = (e) => {
      const i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      let to = -1;
      if (k) to = (i + k + tabs.length) % tabs.length;
      else if (e.key === 'Home') to = 0;
      else if (e.key === 'End') to = tabs.length - 1;
      if (to > -1) { e.preventDefault(); if (auto) select(to, true, true); else select(to, true); }
    };

    // video events: progress sweep while playing, and advance when a video finishes (auto mode only)
    const vOffs = [];
    tabs.forEach((_, n) => {
      const v = videoOf(n);
      if (!v) return;
      if (auto) v.loop = false;
      const onTime = () => { if (auto && n === current && v.duration) setProgress(n, Math.min(100, (v.currentTime / v.duration) * 100)); };
      const onEnded = () => { if (auto && n === current) select((n + 1) % tabs.length, false, true); };
      v.addEventListener('timeupdate', onTime);
      v.addEventListener('ended', onEnded);
      vOffs.push(() => { v.removeEventListener('timeupdate', onTime); v.removeEventListener('ended', onEnded); v.loop = true; });
    });

    // only play (and cycle) while the switcher is on screen
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) { const v = videoOf(current); if (v) play(v); arm(); }
      else { clearTimeout(timer); panels.forEach((p) => p && p.querySelectorAll('video').forEach((v) => v.pause())); }
    }, { threshold: 0.25 });
    io.observe(group);

    // start on the pill marked selected (the first by default), without playing anything yet
    tabs.forEach((t, n) => { t.tabIndex = n === current ? 0 : -1; });
    panels.forEach((p, n) => { if (p) { p.classList.toggle('is-active', n === current); p.toggleAttribute('inert', n !== current); } });

    const list = group.querySelector('[role="tablist"]');
    // fade the row's edge only while there's more to scroll (see .is-overflowing in case-study.css)
    const edge = () => {
      list.classList.toggle('is-overflowing', list.scrollWidth > list.clientWidth + 1);
      list.classList.toggle('is-at-end', list.scrollLeft + list.clientWidth >= list.scrollWidth - 1);
      list.classList.toggle('is-at-start', list.scrollLeft <= 1);
    };
    edge();
    list.addEventListener('scroll', edge, { passive: true });
    window.addEventListener('resize', edge);
    list.addEventListener('click', onClick);
    list.addEventListener('keydown', onKey);
    offs.push(() => {
      list.removeEventListener('click', onClick); list.removeEventListener('keydown', onKey);
      list.removeEventListener('scroll', edge); window.removeEventListener('resize', edge);
      io.disconnect(); clearTimeout(timer); vOffs.forEach((fn) => fn());
    });
  }
  return () => offs.forEach((fn) => fn());
});
