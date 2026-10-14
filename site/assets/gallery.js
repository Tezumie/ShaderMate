// Live thumbnails for every <canvas data-thumb="slug"> on the page, plus the gallery's tag filter.
// The build injects window.__thumbs = { slug: glslSource } from each example's thumb.glsl.
import { createShader } from '../lib/shadermate.esm.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

for (const c of document.querySelectorAll('canvas[data-thumb]')) {
   const src = (window.__thumbs || {})[c.dataset.thumb];
   if (!src) continue;
   const sm = createShader({ canvas: c, shader: src, scale: 0.6, maxPixelRatio: 1.5, maxFps: 30, pointer: false, autoplay: !reduced, errorOverlay: false });
   if (reduced) sm.ready.then(() => { sm.time = 4; sm.render(); });
}

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
