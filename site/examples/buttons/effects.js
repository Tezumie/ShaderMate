// Shader buttons: one small canvas + ShaderMate instance per <button>. The label stays normal DOM text.
// Used by this example page and by the home page.
//
//   import { shaderButton } from './effects.js';
//   shaderButton(document.querySelector('button'), 'liquid');
//
// The button needs a <canvas> child (absolutely positioned behind the label).
// Effects listed in BLEED draw a glow past the button's edge: their canvas is BLEED_PX larger on every side
// (the page CSS does that with the .bleed class) and the shader draws the pill itself, on a transparent canvas.
import { createShader, glsl } from '../../lib/shadermate.esm.js';

// Shared uniforms + helpers, pulled into every effect via `includes`.
// Built-ins (u_time, u_resolution, u_mouseUV, u_aspect …) are declared automatically; these three are ours.
export const common = glsl`
uniform float u_hover;   // 0..1, tweened on pointer enter / leave
uniform float u_press;   // 0..1, tweened on pointer down / up
uniform vec3  u_click;   // click position (UV) and the time it happened
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
   vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
   return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + 1.0), f.x), f.y);
}
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.0 + 3.1; a *= 0.5; } return v; }
vec3 pal(float t) { return 0.5 + 0.5 * cos(6.2831 * (t + vec3(0.0, 0.33, 0.67))); }
// mouse in button UV, but only while hovered (eases back to the centre otherwise)
vec2 mouseUV() { vec2 m = u_mouseUV.x + u_mouseUV.y > 0.0 ? u_mouseUV : vec2(0.5); return mix(vec2(0.5), m, u_hover); }   // no pointer yet: centre
// signed distance to the pill-shaped border, in pixels: 0 at the edge, negative inside
float edgeDist(vec2 fc) {
   vec2 h = u_resolution * 0.5; float r = h.y; vec2 q = abs(fc - h) - (h - r);
   return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
// smooth minimum: blends two distance fields into one gooey shape
float smin(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
// expanding ring from the last click, 0..1
float clickRing(vec2 uv) {
   vec2 asp = vec2(u_aspect, 1.0);
   float age = u_time - u_click.z;
   float d = distance(uv * asp, u_click.xy * asp);
   return smoothstep(0.04, 0.0, abs(d - age * 1.2)) * exp(-age * 2.5);
}
`;

export const effects = {
   // Metaballs drifting around, pulled toward the cursor while hovered.
   liquid: glsl`
      #include "common.glsl"
      float ball(vec2 p, vec2 c, float r) { return r / dot(p - c, p - c); }
      void mainImage(out vec4 o, in vec2 fc) {
         vec2 uv = fc / u_resolution; vec2 p = uv * vec2(u_aspect, 1.0);
         vec2 m = mouseUV() * vec2(u_aspect, 1.0);
         float t = u_time;
         vec2 c1 = vec2(0.8 + 0.5 * sin(t * 0.9), 0.5 + 0.3 * cos(t * 1.3));
         vec2 c2 = vec2(2.2 + 0.6 * cos(t * 0.7), 0.5 + 0.35 * sin(t * 1.1));
         vec2 c3 = vec2(1.5 + 0.9 * sin(t * 0.5), 0.5 + 0.3 * sin(t * 1.7));
         c1 = mix(c1, m, u_hover * 0.5); c2 = mix(c2, m, u_hover * 0.3);
         float f = ball(p, c1, 0.09) + ball(p, c2, 0.08) + ball(p, c3, 0.06) + ball(p, m, 0.06 * u_hover);
         float edge = smoothstep(0.9, 1.1, f);
         float rim = smoothstep(0.9, 1.0, f) - smoothstep(1.0, 1.8, f);
         vec3 col = mix(vec3(0.05, 0.04, 0.12), pal(0.6 + uv.x * 0.4 + u_time * 0.05), edge) + rim * vec3(0.9, 1.0, 1.0) * 0.5;
         col += 0.15 * u_press + vec3(0.8, 0.9, 1.0) * clickRing(uv);
         o = vec4(col, 1.0);
      }`,

   // Dark glass with rings expanding from each click.
   ripple: glsl`
      #include "common.glsl"
      void mainImage(out vec4 o, in vec2 fc) {
         vec2 uv = fc / u_resolution; vec2 asp = vec2(u_aspect, 1.0);
         vec3 base = mix(vec3(0.10, 0.08, 0.30), vec3(0.32, 0.20, 0.70), uv.x + 0.2 * noise(uv * 3.0 + u_time * 0.3));
         float age = u_time - u_click.z;
         float d = distance(uv * asp, u_click.xy * asp);
         float ring = smoothstep(0.03, 0.0, abs(d - age * 1.1)) * exp(-age * 2.5);
         float ring2 = smoothstep(0.02, 0.0, abs(d - age * 0.7)) * exp(-age * 3.0) * 0.6;
         float glow = smoothstep(0.6, 0.0, distance(uv * asp, mouseUV() * asp)) * u_hover * 0.35;
         vec3 col = base * (0.7 + 0.3 * u_hover + 0.2 * u_press) + vec3(0.6, 0.8, 1.0) * (ring + ring2) + vec3(0.5, 0.6, 1.0) * glow;
         o = vec4(col, 1.0);
      }`,

   // Sine plasma that brightens and speeds up on hover.
   plasma: glsl`
      #include "common.glsl"
      void mainImage(out vec4 o, in vec2 fc) {
         vec2 uv = fc / u_resolution; vec2 p = uv * vec2(u_aspect, 1.0) * 3.0;
         float t = u_time * (0.6 + u_hover * 1.2);
         vec2 m = mouseUV() * vec2(u_aspect, 1.0) * 3.0;
         float v = sin(p.x + t) + sin(p.y + t * 0.7) + sin((p.x + p.y) * 0.7 + t * 1.3) + sin(length(p - m) * 3.0 - t);
         vec3 col = pal(v * 0.15 + 0.1) * (0.35 + 0.35 * u_hover + 0.3 * u_press);
         o = vec4(col + clickRing(uv) * 0.6, 1.0);
      }`,

   // A glowing gradient running around the border, chasing the cursor on hover.
   neon: glsl`
      #include "common.glsl"
      void mainImage(out vec4 o, in vec2 fc) {
         vec2 uv = fc / u_resolution;
         float d = edgeDist(fc);
         vec2 c = uv - 0.5; vec2 m = mouseUV() - 0.5;
         float ang = atan(c.y, c.x * u_aspect) / 6.2831;
         float mang = atan(m.y, m.x * u_aspect) / 6.2831;
         float sweep = fract(ang - u_time * 0.15);
         float chase = exp(-pow(fract(ang - mang + 0.5) - 0.5, 2.0) * 60.0) * u_hover;
         vec3 hue = pal(ang + u_time * 0.1);
         float line = exp(-abs(d + 1.5) * 0.9);
         float glow = exp(-abs(d + 1.5) * 0.12);
         float energy = 0.35 + 0.5 * pow(sweep, 3.0) + chase + 0.3 * u_press;
         vec3 col = vec3(0.04, 0.03, 0.08) + hue * (line * 1.2 + glow * 0.25) * energy;
         o = vec4(col + clickRing(uv) * hue, 1.0);
      }`,

   // Holographic foil: hue depends on view angle (cursor) + fine grain.
   holo: glsl`
      #include "common.glsl"
      void mainImage(out vec4 o, in vec2 fc) {
         vec2 uv = fc / u_resolution; vec2 m = mouseUV();
         float angle = (uv.x - m.x) * 1.5 + (uv.y - m.y) * 0.6;
         float grain = noise(fc * 0.6) * 0.08;
         float bands = sin((uv.x * 1.2 + uv.y * 0.4 + angle + u_time * 0.1) * 6.2831) * 0.5 + 0.5;
         vec3 col = pal(angle * 0.6 + bands * 0.15 + grain);
         float lit = 0.45 + 0.45 * u_hover + 0.2 * u_press;
         col = mix(vec3(0.9), col, 0.6) * lit + grain * 0.15;
         o = vec4(col + clickRing(uv) * 0.5, 1.0);
      }`,

   // Aurora curtains drifting sideways.
   aurora: glsl`
      #include "common.glsl"
      void mainImage(out vec4 o, in vec2 fc) {
         vec2 uv = fc / u_resolution; float t = u_time * 0.25;
         float x = uv.x * u_aspect * 1.2 + (mouseUV().x - 0.5) * 0.6 * u_hover;
         float a = fbm(vec2(x * 1.5 + t, uv.y * 0.6 + t * 0.3));
         float b = fbm(vec2(x * 2.5 - t * 0.7, uv.y * 0.4 + 7.0));
         float curtain = smoothstep(0.2, 0.85, a + b * 0.5 - uv.y * 0.35);
         vec3 col = vec3(0.02, 0.03, 0.09);
         col += curtain * mix(vec3(0.05, 0.9, 0.55), vec3(0.45, 0.25, 0.95), b) * (0.7 + 0.5 * u_hover + 0.25 * u_press);
         col += pow(curtain, 4.0) * vec3(0.6, 1.0, 0.9) * 0.25;
         o = vec4(col + clickRing(uv) * vec3(0.5, 1.0, 0.8), 1.0);
      }`,

   // RGB-split blocks that tear harder on hover and snap on click.
   glitch: glsl`
      #include "common.glsl"
      vec3 scene(vec2 uv) {
         float stripes = step(0.5, fract(uv.x * 6.0 - u_time * 0.4));
         return mix(vec3(0.08, 0.06, 0.2), mix(vec3(0.2, 0.9, 1.0), vec3(1.0, 0.3, 0.85), uv.x), 0.35 + 0.25 * stripes);
      }
      void mainImage(out vec4 o, in vec2 fc) {
         vec2 uv = fc / u_resolution;
         float t = floor(u_time * 12.0);
         float row = floor(uv.y * 8.0);
         float tear = step(0.75 - 0.4 * u_hover, hash(vec2(row, t))) * (hash(vec2(t, row)) - 0.5) * (0.06 + 0.2 * u_hover + 0.4 * u_press);
         float split = 0.004 + 0.02 * u_hover + 0.03 * clickRing(uv);
         vec3 col = vec3(scene(uv + vec2(tear + split, 0.0)).r, scene(uv + vec2(tear, 0.0)).g, scene(uv + vec2(tear - split, 0.0)).b);
         col *= 0.85 + 0.15 * step(0.5, fract(fc.y * 0.5));
         o = vec4(col, 1.0);
      }`,

   // Flames rising from the bottom edge; the cursor fans them.
   fire: glsl`
      #include "common.glsl"
      void mainImage(out vec4 o, in vec2 fc) {
         vec2 uv = fc / u_resolution; vec2 p = uv * vec2(u_aspect, 1.0);
         float t = u_time * (1.2 + u_hover);
         p.x += (mouseUV().x - 0.5) * 0.4 * u_hover * uv.y;
         float n = fbm(vec2(p.x * 3.0, p.y * 2.0 - t * 1.6));
         float heat = smoothstep(0.0, 1.0, (1.0 - uv.y) * (0.55 + 0.6 * u_hover + 0.5 * u_press) + n * 0.6 - 0.25);
         vec3 col = mix(vec3(0.05, 0.02, 0.04), vec3(0.9, 0.15, 0.05), smoothstep(0.1, 0.5, heat));
         col = mix(col, vec3(1.0, 0.7, 0.15), smoothstep(0.45, 0.8, heat));
         col = mix(col, vec3(1.0, 0.97, 0.8), smoothstep(0.8, 1.0, heat));
         o = vec4(col + clickRing(uv) * vec3(1.0, 0.6, 0.2), 1.0);
      }`,

   // Liquid chrome: a fake reflection that bends toward the cursor.
   chrome: glsl`
      #include "common.glsl"
      void mainImage(out vec4 o, in vec2 fc) {
         vec2 uv = fc / u_resolution; vec2 m = mouseUV();
         float h = fbm(uv * vec2(u_aspect, 1.0) * 2.0 + u_time * 0.15) + 0.4 * (uv.y - 0.5) + 0.35 * u_hover * (1.0 - distance(uv, m));
         float bands = sin(h * 14.0 + u_time * 0.8);
         vec3 col = mix(vec3(0.12, 0.12, 0.16), vec3(0.95, 0.96, 1.0), smoothstep(-0.2, 0.9, bands));
         col *= mix(vec3(1.0), pal(h * 0.5 + 0.55), 0.25 + 0.35 * u_hover);
         col += pow(max(bands, 0.0), 30.0) * 0.6 + 0.12 * u_press;
         o = vec4(col + clickRing(uv) * 0.6, 1.0);
      }`,

   // Pixels resolve into a smooth gradient as you hover.
   pixel: glsl`
      #include "common.glsl"
      void mainImage(out vec4 o, in vec2 fc) {
         float cell = mix(10.0, 1.0, u_hover) + 6.0 * u_press;
         vec2 q = (floor(fc / cell) + 0.5) * cell;
         vec2 uv = q / u_resolution;
         float g = uv.x + 0.25 * sin(uv.y * 4.0 + u_time) + 0.2 * noise(uv * 4.0 + u_time * 0.4);
         vec3 col = pal(g * 0.6 + 0.55) * 0.75;
         col *= 0.82 + 0.18 * step(0.08, fract(fc.x / cell)) * step(0.08, fract(fc.y / cell)) * step(1.5, cell);
         o = vec4(col + clickRing(fc / u_resolution) * 0.7, 1.0);
      }`,

   // Lightning arcs from the centre toward the cursor.
   electric: glsl`
      #include "common.glsl"
      void mainImage(out vec4 o, in vec2 fc) {
         vec2 uv = fc / u_resolution; vec2 p = uv * vec2(u_aspect, 1.0);
         vec2 a = vec2(0.5 * u_aspect, 0.5);
         vec2 b = mix(vec2(0.95 * u_aspect, 0.5 + 0.4 * sin(u_time * 2.3)), mouseUV() * vec2(u_aspect, 1.0), u_hover);
         vec2 ab = b - a; float k = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0);
         float wob = (fbm(vec2(k * 6.0, u_time * 8.0)) - 0.5) * 0.25 * sin(k * 3.1416);
         vec2 n = normalize(vec2(-ab.y, ab.x));
         float d = abs(dot(p - (a + ab * k), n) - wob);
         float bolt = 0.004 / (d + 0.004) * (0.5 + 0.7 * u_hover + 0.6 * u_press);
         vec3 col = vec3(0.03, 0.03, 0.09) + vec3(0.45, 0.6, 1.0) * bolt + vec3(0.2, 0.15, 0.5) * exp(-d * 18.0) * 0.4;
         o = vec4(col + clickRing(uv) * vec3(0.6, 0.8, 1.0), 1.0);
      }`,

   // A tiny synthwave sunset: sun stripes slide, grid speeds up on hover.
   sunset: glsl`
      #include "common.glsl"
      void mainImage(out vec4 o, in vec2 fc) {
         vec2 uv = fc / u_resolution; vec2 p = (fc - 0.5 * u_resolution) / u_resolution.y;
         vec3 col = mix(vec3(0.95, 0.25, 0.55), vec3(0.08, 0.02, 0.18), smoothstep(-0.1, 0.5, p.y));
         vec2 s = p - vec2((mouseUV().x - 0.5) * 0.3 * u_hover, 0.05);
         float sun = 1.0 - smoothstep(0.26, 0.27, length(s));
         sun *= step(0.0, sin(s.y * 60.0 + u_time * 3.0) + 0.6 + s.y * 6.0);
         col = mix(col, mix(vec3(1.0, 0.3, 0.55), vec3(1.0, 0.85, 0.3), smoothstep(-0.2, 0.25, s.y)), sun);
         float depth = -0.05 - p.y;
         if (depth > 0.0) {
            float z = 0.25 / depth;
            vec2 g = abs(fract(vec2(p.x * z, z + u_time * (1.0 + 2.0 * u_hover))) - 0.5);
            col = vec3(0.04, 0.0, 0.1) + vec3(0.3, 0.9, 1.0) * (1.0 - smoothstep(0.0, 0.06, min(g.x, g.y))) * exp(-z * 0.15);
         }
         o = vec4(col * (0.75 + 0.25 * u_hover) + clickRing(uv) * 0.6, 1.0);
      }`,

   // A neon pill that stretches toward the cursor like liquid and glows past its own edge (a .bleed button).
   glow: glsl`
      #include "common.glsl"
      uniform float u_pad;   // how far the canvas extends past the button, in CSS pixels
      float sdPill(vec2 p, vec2 b) { vec2 q = abs(p) - b + b.y; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - b.y; }
      void mainImage(out vec4 o, in vec2 fc) {
         float px = u_pixelRatio, pad = u_pad * px;
         vec2 c = 0.5 * u_resolution, b = c - pad, p = fc - c;
         vec2 toward = clamp(mouseUV() * u_resolution - c, -b, b);
         float d = sdPill(p, b);
         d += sin(atan(p.y, p.x) * 5.0 + u_time * 4.0) * 2.5 * px * u_hover;                       // wobble
         float drop = length(p - toward * 0.8) - b.y * 0.8 * u_hover;                                // blob under the cursor
         d = smin(d, drop, 26.0 * px * u_hover + 0.001);
         d -= 3.0 * px * u_press;
         vec3 fill = pal(0.6 + p.x / u_resolution.x * 0.5 + u_time * 0.1) * (0.65 + 0.35 * u_hover);
         fill *= 1.0 - 0.5 * smoothstep(-b.y * 0.8, 0.0, d);                                           // darker rim
         fill += 0.4 * smoothstep(b.y * 0.1, b.y * 0.8, p.y) * (1.0 - smoothstep(-6.0 * px, 0.0, d));  // top sheen
         float inside = 1.0 - smoothstep(-px, px, d);
         float glow = exp(-max(d, 0.0) / ((5.0 + 6.0 * u_hover) * px)) * (0.3 + 0.5 * u_hover) * (1.0 - inside);
         glow *= 1.0 - smoothstep(pad * 0.45, pad * 0.95, d);                                        // gone before the canvas edge
         vec3 col = fill * inside + fill * glow + vec3(0.8, 0.9, 1.0) * clickRing(fc / u_resolution) * inside;
         o = vec4(col, max(inside, glow));                                                             // premultiplied
      }`,

   // A spiral galaxy that spins faster and leans toward the cursor on hover.
   galaxy: glsl`
      #include "common.glsl"
      void mainImage(out vec4 o, in vec2 fc) {
         vec2 uv = fc / u_resolution;
         vec2 p = (fc - 0.5 * u_resolution) / u_resolution.y + (0.5 - mouseUV()) * vec2(u_aspect, 1.0) * 0.25 * u_hover;
         float r = length(p), a = atan(p.y, p.x);
         float spin = u_time * (0.3 + 1.2 * u_hover);
         float arms = 0.5 + 0.5 * sin(a * 2.0 + log(r + 0.001) * 6.0 - spin * 3.0);
         float dust = fbm(vec2(a * 2.0 + spin, r * 8.0 - spin));
         vec3 col = vec3(0.02, 0.01, 0.06);
         col += mix(vec3(0.35, 0.2, 0.9), vec3(1.0, 0.45, 0.8), dust) * pow(arms, 3.0) * exp(-r * 2.2) * (0.9 + 0.6 * u_hover);
         col += vec3(1.0, 0.9, 0.75) * exp(-r * 14.0) * (0.7 + 0.5 * u_press);
         vec2 g = floor(fc / 3.0);
         col += step(0.985, hash(g)) * (0.5 + 0.5 * sin(u_time * 4.0 + hash(g + 1.0) * 30.0)) * 0.7;   // twinkling stars
         o = vec4(col + clickRing(uv) * vec3(0.8, 0.7, 1.0), 1.0);
      }`,

   // Marbled ink, stirred by the cursor.
   marble: glsl`
      #include "common.glsl"
      void mainImage(out vec4 o, in vec2 fc) {
         vec2 uv = fc / u_resolution; vec2 p = uv * vec2(u_aspect, 1.0) * 1.6;
         vec2 m = mouseUV() * vec2(u_aspect, 1.0) * 1.6;
         vec2 d = p - m;
         p += d * 0.8 * exp(-dot(d, d) * 6.0) * sin(u_time * 3.0 - length(d) * 10.0) * u_hover;
         float t = u_time * 0.25;
         vec2 w = p + 0.7 * vec2(fbm(p * 1.5 + t), fbm(p * 1.5 - t + 5.0));
         float bands = sin((w.x + w.y) * 7.0 + fbm(w * 2.5) * 6.0 - u_time * (0.6 + u_hover));
         vec3 col = pal(0.55 + 0.2 * bands + 0.25 * w.x) * (0.55 + 0.35 * smoothstep(0.5, 1.0, bands) + 0.15 * u_hover + 0.15 * u_press);
         col += pow(max(bands, 0.0), 24.0) * 0.6;
         o = vec4(col + clickRing(uv) * 0.6, 1.0);
      }`,

   // Falling digital rain; it pours faster and brighter on hover.
   matrix: glsl`
      #include "common.glsl"
      void mainImage(out vec4 o, in vec2 fc) {
         vec2 uv = fc / u_resolution;
         float cell = 7.0 * u_pixelRatio;
         vec2 id = floor(fc / cell), f = fract(fc / cell);
         float speed = (4.0 + 6.0 * hash(vec2(id.x, 3.0))) * (1.0 + 1.5 * u_hover);
         float head = fract(hash(vec2(id.x, 9.0)) - u_time * speed * cell / u_resolution.y);
         float y = 1.0 - uv.y;
         float trail = fract(head - y + 1.0);
         float lit = smoothstep(0.35, 0.0, trail) * (0.4 + 0.6 * u_hover);
         float glyph = step(0.35, hash(id + floor(u_time * 8.0 * hash(id)))) * step(0.15, f.x) * step(f.x, 0.85) * step(0.1, f.y) * step(f.y, 0.9);
         float near = smoothstep(0.35, 0.0, distance(uv * vec2(u_aspect, 1.0), mouseUV() * vec2(u_aspect, 1.0))) * u_hover;
         vec3 col = vec3(0.01, 0.03, 0.02) + vec3(0.2, 1.0, 0.5) * glyph * (lit + 0.06 + near * 0.6);
         col += vec3(0.8, 1.0, 0.9) * glyph * smoothstep(0.03, 0.0, trail);
         o = vec4(col + 0.1 * u_press + clickRing(uv) * vec3(0.4, 1.0, 0.6), 1.0);
      }`,
};

/**
 * Wire one <button> (with a <canvas> child): shader background + hover / press / click uniforms.
 * Returns the ShaderMate instance.
 */
export const BLEED = ['glow'];
export const BLEED_PX = 24;

export function shaderButton(btn, name, options = {}) {
   const bleed = BLEED.includes(name);
   if (bleed) btn.classList.add('bleed');           // CSS grows the canvas by BLEED_PX and drops the clipping
   const sm = createShader({
      canvas: btn.querySelector('canvas'),
      shader: effects[name],
      includes: { 'common.glsl': common },
      pointer: { target: btn, smooth: 0.2 },        // only this button's pointer events
      uniforms: { u_hover: 0, u_press: 0, u_click: [0.5, 0.5, -10], ...(bleed ? { u_pad: BLEED_PX } : {}) },
      ...options,
   });
   btn.addEventListener('pointerenter', () => sm.tween('u_hover', 1, { duration: 350, ease: 'outCubic' }));
   btn.addEventListener('pointerleave', () => { sm.tween('u_hover', 0, { duration: 700, ease: 'outExpo' }); sm.tween('u_press', 0, { duration: 300 }); });
   btn.addEventListener('pointerdown', () => sm.tween('u_press', 1, { duration: 80 }));
   btn.addEventListener('pointerup', () => sm.tween('u_press', 0, { duration: 500, ease: 'outElastic' }));
   btn.addEventListener('click', e => {
      const [u, v] = sm.domToUV(e.clientX, e.clientY);      // click position in the canvas' UV space
      sm.set('u_click', [u, v, sm.time]);
   });
   return sm;
}
