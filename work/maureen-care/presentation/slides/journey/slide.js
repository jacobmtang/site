// Replays the entrance each time the slide becomes current.
Deck.define('journey', {
  enter(el) {
    el.classList.remove('play'); void el.offsetWidth; el.classList.add('play');
    return () => el.classList.remove('play');
  },
});
