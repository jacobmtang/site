// Replays the entrance each time the slide becomes current. Step 0 runs the session loop: each step lights on the
// track (the rail fills up to it) while the fake terminal types it out; after "compact" it clears and starts over.
// Step 1 (the docs map) stops it. Reduced motion: every step lit and the whole script printed at once.
const AI_SCRIPT = [   // [kind, English, 中文]; paths and commands stay as typed
  [['cmd', 'Tighten the spacing on the meal card', '收紧餐食卡片的间距']],
  [['act', 'Read CLAUDE.md', '读取 CLAUDE.md'], ['act', 'Read docs/reference/design-tokens.md', '读取 docs/reference/design-tokens.md'], ['act', 'Read docs/reference/traps-native-header-and-edges.md', '读取 docs/reference/traps-native-header-and-edges.md']],
  [['act', 'Update src/components/MealCard.tsx', '更新 src/components/MealCard.tsx'], ['sub', 'photo inset 6 → 8, on the 4pt grid', '照片内边距 6 → 8，对齐 4pt 网格']],
  [['act', 'Update docs/reference/design-tokens.md', '更新 docs/reference/design-tokens.md'], ['sub', '1 line: 8 is the meal card photo inset', '新增 1 行：8 为餐食卡片的照片内边距']],
  [['cmd', 'Checked it in the simulator. Looks right, commit it', '已在模拟器里检查过，没问题，提交吧']],
  [['act', 'git commit -m "Meal card: photo inset on the 4pt grid"', 'git commit -m "餐食卡片：照片内边距对齐 4pt 网格"'], ['sub', '2 files changed', '2 个文件已更改']],
  [['cmd', '/compact', '/compact'], ['sub', 'Context compacted. The docs carry the rules to the next task', '上下文已压缩，规则由文档带入下一个任务']],
];
// The terminal follows the language toggle: English, 中文, or (EN + 中文) English with the Chinese as a dim comment.
const aiLang = () => document.body.dataset.lang || 'en';
const aiText = (kind, en, zh) => { const l = aiLang(); return l === 'zh' ? [zh, ''] : l === 'both' && kind !== 'act' && en !== zh ? [en, zh] : [en, '']; };

function aiLoop(el) {
  aiStop(el);
  const lines = el.querySelector('.al-lines'), track = el.querySelector('.al-track');
  const steps = [...el.querySelectorAll('.al-step')], n = steps.length;
  const timers = []; const at = (ms, f) => timers.push(setTimeout(f, ms));
  el._aiStop = () => timers.forEach(clearTimeout);
  const light = k => {
    steps.forEach((s, j) => { s.classList.toggle('is-on', j === k); s.classList.toggle('is-done', j < k); });
    track.style.setProperty('--prog', k < 0 ? 0 : k / (n - 1));
  };
  const add = (kind, text, note) => {
    const d = document.createElement('div'); d.className = kind;
    const t = document.createElement('span'); t.textContent = text; d.append(t);
    if (note) { const c = document.createElement('span'); c.className = 'note'; c.textContent = note; d.append(c); }
    lines.append(d);
    while (lines.children.length > 12) lines.firstElementChild.remove();
    return d;
  };
  lines.textContent = ''; light(-1);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    AI_SCRIPT.flat().slice(-10).forEach(([k, en, zh]) => add(k, ...aiText(k, en, zh))); steps.forEach(s => s.classList.add('is-done')); light(n - 1); return;
  }
  let t = 900;
  AI_SCRIPT.forEach((step, k) => {
    at(t, () => light(k)); t += 420;
    step.forEach(([kind, en, zh]) => {
      if (kind === 'cmd') {   // typed, a character at a time, with a caret; the Chinese comment (EN + 中文) lands after
        let d, text, note;
        at(t, () => { [text, note] = aiText(kind, en, zh); d = add('cmd is-typing', ''); });
        const len = Math.max(en.length, zh.length * 2);   // a fixed duration per line, whichever language types
        for (let c = 1; c <= 40; c++) at(t + c * len * 0.8, () => { d.firstChild.textContent = text.slice(0, Math.ceil(text.length * c / 40)); });
        t += len * 32 + 260;
        at(t, () => { d.classList.remove('is-typing'); if (note) { const c = document.createElement('span'); c.className = 'note'; c.textContent = note; d.append(c); } });
        t += 200;
      } else { at(t, () => add(kind, ...aiText(kind, en, zh))); t += kind === 'sub' ? 260 : 420; }
    });
    t += 900;
  });
  at(t + 900, () => aiLoop(el));   // and repeat
}
function aiStop(el) { if (el._aiStop) { el._aiStop(); el._aiStop = null; } }

Deck.define('ai', {
  enter(el, step) {
    el.classList.remove('play'); void el.offsetWidth; el.classList.add('play');
    if (!step) aiLoop(el);
    return () => { aiStop(el); el.classList.remove('play'); };
  },
  step(el, i) { if (i === 0) aiLoop(el); else aiStop(el); },
});
