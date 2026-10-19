// Replays the entrance each time the slide becomes current; each step's section rises in as it appears
// (data-until / data-from in slide.html; display: none → shown restarts its CSS animation).
Deck.define('perf', {
  enter(el) {
    el.classList.remove('play'); void el.offsetWidth; el.classList.add('play');
    return () => el.classList.remove('play');
  },
});
