// Examples switcher: pill tabs (role="tab") swap between .ex-panel examples in the same visual.
// Click or arrow keys move between pills (roving tabindex, like a native tab list). Switching pauses the old
// panel's videos and starts the new one's (attaching their src if they haven't loaded yet), so only one
// example ever plays. video.js leaves videos in an inactive panel alone.
// Registered as a mount (see site.js); the cleanup removes the listeners.
(window.siteMounts ||= []).push(() => {
  const groups = [...document.querySelectorAll('.examples')];
  if (!groups.length) return;
  const offs = [];

  for (const group of groups) {
    const tabs = [...group.querySelectorAll('[role="tab"]')];
    const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
    panels.forEach((p) => p && p.removeAttribute('hidden'));   // visibility is handled by .is-active (crossfade)

    const select = (i, focus) => {
      tabs.forEach((t, n) => {
        const on = n === i;
        t.setAttribute('aria-selected', on);
        t.tabIndex = on ? 0 : -1;
        const p = panels[n];
        if (!p) return;
        p.classList.toggle('is-active', on);
        p.toggleAttribute('inert', !on);
        p.querySelectorAll('video').forEach((v) => {
          if (!on) { v.pause(); return; }
          if (!v.src && v.dataset.src) v.src = v.dataset.src;
          v.play().catch(() => {});
        });
      });
      if (focus) tabs[i].focus();
    };
    const onClick = (e) => { const i = tabs.indexOf(e.target.closest('[role="tab"]')); if (i > -1) select(i); };
    const onKey = (e) => {
      const i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (k) { e.preventDefault(); select((i + k + tabs.length) % tabs.length, true); }
      else if (e.key === 'Home') { e.preventDefault(); select(0, true); }
      else if (e.key === 'End') { e.preventDefault(); select(tabs.length - 1, true); }
    };
    // start on the pill marked selected (the first by default), without playing anything yet
    const start = Math.max(0, tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true'));
    tabs.forEach((t, n) => { t.tabIndex = n === start ? 0 : -1; });
    panels.forEach((p, n) => { if (p) { p.classList.toggle('is-active', n === start); p.toggleAttribute('inert', n !== start); } });

    const list = group.querySelector('[role="tablist"]');
    list.addEventListener('click', onClick);
    list.addEventListener('keydown', onKey);
    offs.push(() => { list.removeEventListener('click', onClick); list.removeEventListener('keydown', onKey); });
  }
  return () => offs.forEach((fn) => fn());
});
