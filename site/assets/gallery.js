// Live thumbnails for every <canvas data-thumb="slug"> on the page, plus the gallery's tag filter.
// The build injects window.__thumbs = { slug: glslSource } from each example's thumb.glsl.
//
// Browsers only allow ~16 live WebGL contexts per page, so the thumbnails don't get one each. Every shader is
// a paused ShaderMate instance on ONE hidden canvas; a single loop steps the visible ones and copies each frame
// into its card's plain 2D canvas. That is also a handy pattern for your own pages.
import { createShader } from '../lib/shadermate.esm.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const W = 480, H = 300, FPS = 30;

const shared = document.createElement('canvas');
const thumbs = [];

for (const c of document.querySelectorAll('canvas[data-thumb]')) {
   const src = (window.__thumbs || {})[c.dataset.thumb];
   if (!src) continue;
   c.width = W; c.height = H;
   const sm = createShader({
      canvas: shared, shader: src, size: [W, H],
      autoplay: false, pointer: false, pauseWhenHidden: false, errorOverlay: false, preserveDrawingBuffer: true,
   });
   sm.setFixedDelta(1 / FPS);
   sm.time = Math.random() * 10;                      // every card starts at a different moment
   const thumb = { sm, ctx: c.getContext('2d'), visible: false, ready: false };
   sm.ready.then(() => { thumb.ready = true; draw(thumb); });
   thumbs.push(thumb);
   new IntersectionObserver(([e]) => { thumb.visible = e.isIntersecting; }, { rootMargin: '120px' }).observe(c);
}

function draw(t) {
   t.sm.step();                                       // advance 1/FPS and render into the shared canvas
   t.ctx.drawImage(shared, 0, 0, W, H);               // copy that frame into the card
}

if (thumbs.length && !reduced) {
   let last = 0;
   (function loop(now) {
      requestAnimationFrame(loop);
      if (now - last < 1000 / FPS - 1 || document.hidden) return;
      last = now;
      for (const t of thumbs) if (t.ready && t.visible) draw(t);
   })(0);
}

// ── tag filter (gallery page) ───────────────────────────────────────
const chips = [...document.querySelectorAll('[data-filter]')];
if (chips.length) {
   const cards = [...document.querySelectorAll('.ex-card')];
   const count = document.querySelector('[data-count]');
   const apply = tag => {
      let shown = 0;
      cards.forEach(c => { const on = !tag || c.dataset.tag === tag; c.hidden = !on; if (on) shown++; });
      chips.forEach(ch => { const on = ch.dataset.filter === tag; ch.classList.toggle('is-on', on); ch.setAttribute('aria-pressed', String(on)); });
      if (count) count.textContent = `${shown} ${shown === 1 ? 'example' : 'examples'}`;
   };
   chips.forEach(ch => ch.addEventListener('click', () => { apply(ch.dataset.filter); history.replaceState(null, '', ch.dataset.filter ? '#' + encodeURIComponent(ch.dataset.filter) : location.pathname); }));
   const initial = decodeURIComponent(location.hash.slice(1));
   apply(chips.some(c => c.dataset.filter === initial) ? initial : '');
}
