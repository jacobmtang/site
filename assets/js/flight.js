// Swap the banner text each time the plane finishes a crossing.
(() => {
  const path = document.querySelector('.flight-path');
  const text = document.querySelector('.banner-text');
  if (!path || !text) return;
  const messages = text.dataset.messages.split('|');
  let i = 0;
  path.addEventListener('animationiteration', (e) => {
    if (e.animationName !== 'fly') return;
    i = (i + 1) % messages.length;
    text.textContent = messages[i];
  });
})();
