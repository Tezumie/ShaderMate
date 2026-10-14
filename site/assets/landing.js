// Landing page: the shader-masked hero, its live uniform sliders, and the editable demo.
import { createShader, glsl } from '../lib/shadermate.esm.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s);

/* ─────────────────────────────────────────────────────────────────
   Hero. The real <h1> is drawn into a 2D canvas, and that canvas is the shader's channel 0.
   The shader reads the glyph shape as a height map and refracts a flow field through it,
   lit by the pointer. The DOM text stays in place (transparent) for readers and search engines.
   ───────────────────────────────────────────────────────────────── */
// Separable gaussian blur of the glyph mask. Four of these run as passes (horizontal + vertical, at two radii).
const BLUR = glsl`
#ifndef SIGMA
#define SIGMA 0.011
#endif
void mainImage(out vec4 o, in vec2 fc) {
  vec2 R = iResolution.xy;
  vec2 uv = fc / R;
#ifdef HORIZ
  vec2 dir = vec2(1.0, 0.0) / R;
#else
  vec2 dir = vec2(0.0, 1.0) / R;
#endif
  float sigma = SIGMA * R.y;
  float stp = max(1.0, sigma * 0.5);
  float acc = 0.0, wsum = 0.0;
  for (int i = -8; i <= 8; i++) {
    float x = float(i) * stp;
    float w = exp(-0.5 * x * x / (sigma * sigma));
    acc += w * texture(iChannel0, uv + dir * x).a;
    wsum += w;
  }
  o = vec4(0.0, 0.0, 0.0, acc / wsum);
}`;

const HERO = glsl`
uniform float u_speed;
uniform float u_warp;
uniform float u_hue;
uniform float u_intro;     // 0 → 1 once, on load
uniform float u_lit;       // 0 until the pointer moves, then 1

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 4; i++) { s += a * noise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p; a *= 0.5; }
  return s;
}
// The brand colours, blended in a loop.
vec3 spectrum(float t) {
  t = fract(t) * 5.0;
  vec3 a = vec3(0.486, 0.361, 1.0), b = vec3(0.29, 0.64, 1.0), c = vec3(0.18, 0.9, 0.84), d = vec3(1.0, 0.82, 0.4), e = vec3(1.0, 0.48, 0.72);
  vec3 col = mix(a, b, smoothstep(0.0, 1.0, t));
  col = mix(col, c, smoothstep(1.0, 2.0, t));
  col = mix(col, d, smoothstep(2.0, 3.0, t));
  col = mix(col, e, smoothstep(3.0, 4.0, t));
  return mix(col, a, smoothstep(4.0, 5.0, t));
}

void mainImage(out vec4 o, in vec2 fc) {
  vec2 R = iResolution.xy;
  vec2 uv = fc / R;
  vec2 px = 1.0 / R;
  float asp = R.x / R.y;
  vec2 p = (fc - 0.5 * R) / R.y;
  float t = iTime * 0.08 * u_speed;

  float m = texture(iChannel0, uv).a;          // sharp glyph coverage
  float thick = texture(iChannel1, uv).a;      // narrow blur: acts as the glass thickness
  float halo = texture(iChannel2, uv).a;       // wide blur: light bleeding off the glyphs

  // the light wanders on its own until the pointer moves
  vec2 auto = vec2(0.5 + 0.32 * sin(iTime * 0.31), 0.56 + 0.18 * cos(iTime * 0.47));
  vec2 lw = (mix(auto, u_mouseUV, u_lit) - 0.5) * vec2(asp, 1.0);

  // surface normal from the blurred thickness
  vec2 e = vec2(2.0, 0.0) * px * 1.5;
  vec2 g = vec2(texture(iChannel1, uv + e.xy).a - texture(iChannel1, uv - e.xy).a,
                texture(iChannel1, uv + e.yx).a - texture(iChannel1, uv - e.yx).a) * 14.0;
  vec3 n = normalize(vec3(-g, 1.0));

  // iridescent flow, bent by the surface like refraction
  vec2 q = p * 1.35 + g * 0.22 * u_warp + vec2(t, -t * 0.6);
  float w1 = fbm(q);
  float w2 = fbm(q * 1.7 + vec2(w1, -w1) * 1.4 * u_warp + vec2(-t * 0.7, t * 0.3));
  float f = w1 * 0.6 + w2 * 0.8;
  vec3 col = spectrum(f * 0.9 + u_hue + t * 0.4);

  // glass lighting
  vec3 Ld = normalize(vec3(lw - p, 0.4));
  float diff = clamp(dot(n, Ld), 0.0, 1.0);
  vec3 hv = normalize(Ld + vec3(0.0, 0.0, 1.0));
  float spec = pow(clamp(dot(n, hv), 0.0, 1.0), 48.0);
  float rim = pow(1.0 - n.z, 1.5);
  float edge = 1.0 - smoothstep(0.55, 0.98, thick);
  vec3 glass = col * (0.42 + 0.75 * diff) + vec3(0.95, 0.97, 1.0) * (spec * 0.85 + rim * 0.6);
  glass = mix(glass, glass * 1.25 + 0.08, edge * 0.5);
  glass *= 0.7 + 0.5 * exp(-length(lw - p) * 1.4);

  // outside the letters: ink, a faint echo of the field, and bloom
  float vig = smoothstep(1.3, 0.1, length(p * vec2(0.75, 1.0)));
  float near = exp(-length(lw - p) * 2.2);
  vec3 bg = vec3(0.027, 0.03, 0.045) + col * (0.02 + 0.04 * vig)
          + col * halo * (0.28 + 0.5 * near) * (1.0 - m)
          + vec3(0.55, 0.62, 1.0) * near * 0.035;

  // one reveal on load: a soft sweep from left to right
  float reveal = smoothstep(0.0, 0.3, u_intro * 1.55 - uv.x * 0.9);
  vec3 c = mix(bg, glass, m * reveal);
  c += (hash(fc + fract(iTime) * 97.0) - 0.5) * 0.02;
  o = vec4(c, 1.0);
}`;

const hero = $('.hero'), heroCanvas = $('.hero-canvas'), title = $('.hero-title');
const text = document.createElement('canvas');

function drawTitle(sm) {
   const cw = sm.canvas.width, ch = sm.canvas.height;
   if (!cw || !ch) return;
   text.width = cw; text.height = ch;
   const ctx = text.getContext('2d');
   const hr = heroCanvas.getBoundingClientRect(), tr = title.getBoundingClientRect();
   const sx = cw / hr.width, sy = ch / hr.height;
   const cs = getComputedStyle(title);
   const fs = parseFloat(cs.fontSize) * sx;
   ctx.clearRect(0, 0, cw, ch);
   ctx.fillStyle = '#fff';
   ctx.font = `700 ${fs}px "Geist"`;
   ctx.textAlign = 'center';
   ctx.textBaseline = 'alphabetic';
   if ('letterSpacing' in ctx) ctx.letterSpacing = (-0.045 * fs) + 'px';
   // baseline from the DOM box: line-height .92 → baseline sits ~0.76em below the box top for this face
   const baseline = (tr.top - hr.top) * sy + (tr.height * sy) * 0.5 + fs * 0.3;
   ctx.fillText(title.textContent, (tr.left + tr.width / 2 - hr.left) * sx, baseline);
}

async function startHero() {
   try { await Promise.race([document.fonts.load('700 100px "Geist"'), new Promise(r => setTimeout(r, 1500))]); } catch { }
   const sm = createShader({
      canvas: heroCanvas,
      passes: [
         { name: 'bh', shader: BLUR, defines: ['HORIZ', { SIGMA: 0.011 }], channels: [text], float: true },
         { name: 'bv', shader: BLUR, defines: [{ SIGMA: 0.011 }], channels: ['bh'], float: true },
         { name: 'wh', shader: BLUR, defines: ['HORIZ', { SIGMA: 0.05 }], channels: ['bv'], size: 'half', float: true },
         { name: 'wv', shader: BLUR, defines: [{ SIGMA: 0.05 }], channels: ['wh'], size: 'half', float: true },
         { name: 'main', shader: HERO, channels: [text, 'bv', 'wv'] },
      ],
      uniforms: { u_speed: 1, u_warp: 1, u_hue: 0, u_intro: reduced ? 1 : 0, u_lit: 0 },
      maxPixelRatio: 1.5,
      pointer: { smooth: 0.14 },
      autoplay: !reduced,
      errorOverlay: false,
   });
   await sm.ready;

   // The glyph mask is uploaded once (and again on resize), never per frame.
   const upload = async () => {
      drawTitle(sm);
      await Promise.all([sm.setChannel(0, { element: text, dynamic: false }, 'bh'), sm.setChannel(0, { element: text, dynamic: false }, 'main')]);
      if (reduced) sm.render();
   };
   await upload();
   hero.classList.add('is-gl');
   if (reduced) sm.render(); else sm.tween('u_intro', 1, { duration: 2200, delay: 200, ease: 'outCubic' });

   let t; sm.on('resize', () => { clearTimeout(t); t = setTimeout(upload, 120); });
   document.fonts.ready.then(upload);
   addEventListener('pointermove', () => sm.tween('u_lit', 1, { duration: 700 }), { once: true, passive: true });

   // live uniform sliders
   for (const input of document.querySelectorAll('.tweak input')) {
      const out = input.parentElement.querySelector('output');
      input.addEventListener('input', () => { sm.set(input.name, +input.value); out.textContent = (+input.value).toFixed(1); if (reduced) sm.render(); });
   }
   window.__hero = sm;
}
if (heroCanvas) startHero().catch(e => console.warn('[hero]', e));

/* ─────────────────────────────────────────────────────────────────
   Editable demo: a textarea over a highlighted <pre>. Edits recompile the shader live.
   ───────────────────────────────────────────────────────────────── */
const PRESETS = {
   main: `// Plain GLSL. u_resolution, u_time and fragColor are declared for you.
void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;
  float d = length(uv - 0.3 * vec2(cos(u_time), sin(u_time * 1.3)));
  vec3 col = 0.5 + 0.5 * cos(u_time + uv.xyx * 3.0 + vec3(0.0, 2.0, 4.0));
  fragColor = vec4(col * smoothstep(0.5, 0.0, d), 1.0);
}`,
   pointer: `// Move the pointer over the canvas. u_mouseUV runs 0 to 1.
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 m = dot(u_mouse, u_mouse) < 1.0 ? vec2(0.5) : u_mouseUV;
  vec2 p = (uv - m) * vec2(u_resolution.x / u_resolution.y, 1.0);
  float d = length(p);
  float rings = 0.5 + 0.5 * sin(d * 42.0 - u_time * 3.0);
  vec3 col = mix(vec3(0.04, 0.05, 0.1), vec3(0.55, 0.45, 1.0), rings * smoothstep(0.7, 0.0, d));
  fragColor = vec4(col, 1.0);
}`,
   mainImage: `// ShaderToy-style entry point works as well.
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  float v = sin(uv.x * 9.0 + iTime) + sin(uv.y * 7.0 - iTime * 1.3)
          + sin((uv.x + uv.y) * 6.0 + iTime * 0.7);
  vec3 col = 0.5 + 0.5 * cos(6.2831 * (v * 0.18 + vec3(0.0, 0.33, 0.67)));
  fragColor = vec4(col * 0.9, 1.0);
}`,
};

const GLSL_KW = new Set('const uniform in out inout return if else for while do break continue discard struct precision highp mediump lowp true false varying attribute layout'.split(' '));
const GLSL_TYPE = new Set('void float int uint bool vec2 vec3 vec4 ivec2 ivec3 ivec4 uvec2 uvec3 uvec4 bvec2 bvec3 bvec4 mat2 mat3 mat4 sampler2D samplerCube'.split(' '));
const GLSL_FN = new Set('sin cos tan asin acos atan pow exp log exp2 log2 sqrt inversesqrt abs sign floor ceil fract mod min max clamp mix step smoothstep length distance dot cross normalize reflect refract texture texture2D dFdx dFdy fwidth radians degrees'.split(' '));
const escHtml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function highlightGlsl(src) {
   return escHtml(src).replace(/(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|(^#[^\n]*)|(\b\d+\.?\d*(?:e[+-]?\d+)?\b|\.\d+\b)|([A-Za-z_]\w*)/gm, (m, c, pp, num, id) => {
      if (c) return `<span class="hljs-comment">${c}</span>`;
      if (pp) return `<span class="hljs-meta">${pp}</span>`;
      if (num) return `<span class="hljs-number">${num}</span>`;
      if (GLSL_KW.has(id)) return `<span class="hljs-keyword">${id}</span>`;
      if (GLSL_TYPE.has(id)) return `<span class="hljs-type">${id}</span>`;
      if (GLSL_FN.has(id)) return `<span class="hljs-title">${id}</span>`;
      if (/^(u_|i[A-Z])/.test(id) || id === 'fragColor' || id === 'gl_FragCoord') return `<span class="hljs-attr">${id}</span>`;
      return id;
   });
}

const input = $('#code');
if (input) {
   const layer = $('#code-layer code'), err = $('#ide-err'), stat = $('#ide-stat'), view = $('#demo');
   const paint = () => { layer.innerHTML = highlightGlsl(input.value) + '\n'; };
   const sync = () => { layer.parentElement.scrollTop = input.scrollTop; layer.parentElement.scrollLeft = input.scrollLeft; };
   input.addEventListener('scroll', sync);

   input.value = PRESETS.main; paint();
   const demo = createShader({ canvas: view, shader: input.value, maxPixelRatio: 1.5, pointer: { target: 'canvas', smooth: 0.2 }, errorOverlay: false });
   demo.on('error', e => { err.hidden = false; err.textContent = String(e.message || e).split('\n').slice(0, 6).join('\n'); });
   demo.on('shader', () => { err.hidden = true; });

   let timer;
   input.addEventListener('input', () => { paint(); clearTimeout(timer); timer = setTimeout(() => demo.setShader(input.value), 220); });
   input.addEventListener('keydown', e => {
      if (e.key === 'Tab') { e.preventDefault(); input.setRangeText('  ', input.selectionStart, input.selectionEnd, 'end'); input.dispatchEvent(new Event('input')); }
   });
   for (const tab of document.querySelectorAll('.ide-tab')) {
      tab.addEventListener('click', () => {
         document.querySelectorAll('.ide-tab').forEach(t => t.setAttribute('aria-selected', String(t === tab)));
         input.value = PRESETS[tab.dataset.preset]; paint(); demo.setShader(input.value);
      });
   }
   let frames = 0, last = performance.now();
   demo.on('afterFrame', () => {
      frames++;
      const now = performance.now();
      if (now - last > 600) { stat.textContent = `${Math.round(frames * 1000 / (now - last))} fps · ${demo.canvas.width}×${demo.canvas.height}`; frames = 0; last = now; }
   });
}

/* Install tabs and copy buttons */
for (const group of document.querySelectorAll('[data-tabs]')) {
   const tabs = [...group.querySelectorAll('[role=tab]')], panels = [...group.querySelectorAll('[role=tabpanel]')];
   const select = i => { tabs.forEach((t, n) => t.setAttribute('aria-selected', String(n === i))); panels.forEach((p, n) => { p.hidden = n !== i; }); };
   tabs.forEach((t, i) => t.addEventListener('click', () => select(i)));
}
async function copy(text, btn, done = 'Copied') {
   const old = btn.textContent;
   try { await navigator.clipboard.writeText(text); btn.textContent = done; } catch { btn.textContent = 'Press Ctrl+C'; }
   setTimeout(() => { btn.textContent = old; }, 1400);
}
document.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', () => copy(b.dataset.copy, b)));
document.querySelectorAll('.code-panel .copy').forEach(b => b.addEventListener('click', () => copy(b.parentElement.querySelector('code').innerText, b)));
