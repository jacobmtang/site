// Page lifecycle + Swup page transitions.
//
// Each page script registers a "mount" in window.siteMounts: a function that sets the script up for the
// current page and returns a cleanup (or nothing, when the page doesn't have that feature). Mounts run on
// the first load and again after every Swup page swap; before Swup replaces the content, every cleanup
// runs, so timers stop and global listeners (window, document, matchMedia) are removed, never stacked.
//
// Swup fetches only the next page's HTML and swaps the #swup container, so the header, stylesheet and
// scripts stay loaded. The preload plugin fetches a page on hover / touch, so most clicks feel instant.
// Without JS (or if the CDN fails) links are ordinary page loads.
(() => {
  const mounts = window.siteMounts || [];
  let cleanups = [];

  const mountAll = () => {
    cleanups = mounts.map((mount) => mount()).filter((fn) => typeof fn === 'function');
  };
  const unmountAll = () => {
    cleanups.forEach((fn) => fn());
    cleanups = [];
  };

  mountAll();

  if (!window.Swup) return;
  const plugins = window.SwupPreloadPlugin ? [new window.SwupPreloadPlugin()] : [];
  // native: use the browser's View Transitions where supported (Chrome, Edge, Safari 18+), so elements that
  // share a view-transition-name on both pages (the Maureen phone: home card <-> case study hero) glide
  // between their positions. Other browsers fall back to the CSS fade.
  const swup = new window.Swup({ containers: ['#swup'], plugins, native: true });
  swup.hooks.before('content:replace', unmountAll);
  swup.hooks.on('page:view', mountAll);
})();
