// Replays the entrance each time the slide becomes current, and runs the craft demo (craft.js) while it is.
const craftReady = new Promise(done => document.head.appendChild(
  Object.assign(document.createElement('script'), { src: 'slides/standards/craft.js', onload: done })));
Deck.define('standards', {
  enter(el) {
    el.classList.remove('play'); void el.offsetWidth; el.classList.add('play');
    let stop = () => {}, live = true;
    craftReady.then(() => { if (live) stop = window.Craft.start(el); });   // may still be loading on a direct visit
    return () => { live = false; el.classList.remove('play'); stop(); };
  },
});
