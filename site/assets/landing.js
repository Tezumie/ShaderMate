// Home page. Every section names a scene; all scenes are ShaderMate instances that share ONE fixed canvas
// (one WebGL context, so there's no 16-context limit to worry about). They're created paused as they're needed,
// and each next one compiles while you read the current section. Switching a scene is just `old.pause(); next.play()`.
import { createShader } from '../lib/shadermate.esm.js';
import { shaderButton } from '../examples/buttons/effects.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const stage = $('#stage');

/* ═════════════════════════════════ shaders ═════════════════════════════════ */
// Built-in uniforms (iTime, iMouse, iResolution…) are declared automatically, so the shaders just use them.

const common = /* glsl */ `
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.02 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}
mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) { return a + b * cos(6.28318 * (c * t + d)); }
vec3 neon(float t) { return palette(t, vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.0, 0.33, 0.67)); }
vec2 centered(vec2 fc) { return (fc - 0.5 * iResolution.xy) / iResolution.y; }
vec2 pointer(vec2 fallback) { return iMouse.x > 0.0 ? centered(iMouse.xy) : fallback; }
float pressed() { return iMouse.z > 0.0 ? 1.0 : 0.0; }
`;

const aurora = /* glsl */ `
#include "common.glsl"
uniform float u_calm;   // 0 for the hero, 1 for the quieter background behind the feature cards

void mainImage(out vec4 o, in vec2 fc) {
  vec2 uv = centered(fc);
  vec2 d = uv - pointer(vec2(sin(iTime * 0.3) * 0.5, cos(iTime * 0.23) * 0.25));
  float near = exp(-dot(d, d) * 6.0) * (1.0 - u_calm * 0.7);
  uv -= d * near * (0.35 + 0.4 * pressed());

  float t = iTime * mix(0.12, 0.05, u_calm);
  vec2 q = vec2(fbm(uv * 1.5 + t), fbm(uv * 1.5 - t + 4.2));
  vec2 r = vec2(fbm(uv * 1.7 + 3.0 * q + vec2(1.7, 9.2) + t), fbm(uv * 1.7 + 3.0 * q + vec2(8.3, 2.8) - t));
  float f = fbm(uv * 2.0 + 3.0 * r);

  vec3 col = vec3(0.02, 0.015, 0.06);
  col = mix(col, vec3(0.5, 0.32, 1.0), smoothstep(0.3, 0.7, f));
  col = mix(col, vec3(0.1, 0.9, 1.0), smoothstep(0.5, 0.8, q.y) * 0.8);
  col = mix(col, vec3(1.0, 0.3, 0.8), smoothstep(0.5, 0.75, r.x) * 0.8);
  col += vec3(0.8, 0.9, 1.0) * pow(smoothstep(0.55, 0.9, f), 3.0) * 0.6;
  col += 0.06 * sin(f * 40.0 - iTime) * smoothstep(0.4, 0.8, f);
  col += vec3(0.55, 0.45, 1.0) * near * 0.18;
  col *= 1.1 - 0.5 * dot(uv, uv);
  col *= mix(1.0, 0.45, u_calm);
  col += (hash(fc + fract(iTime)) - 0.5) * 0.05;
  o = vec4(col, 1.0);
}`;

const raymarch = /* glsl */ `
#include "common.glsl"
vec2 spin;
float wobble;

float map(vec3 p) {
  p.xz *= rot(iTime * 0.35 + spin.x);
  p.yz *= rot(iTime * 0.25 + spin.y);
  float blob = length(p) - 1.0 + wobble * sin(p.x * 4.0 + iTime * 1.6) * sin(p.y * 4.0 + iTime * 1.2) * sin(p.z * 4.0 + iTime);
  float ring = length(vec2(length(p.xz) - 1.6, p.y)) - 0.05;
  return min(blob * 0.6, ring);
}
vec3 normalAt(vec3 p) {
  vec2 e = vec2(0.001, 0.0);
  return normalize(vec3(map(p + e.xyy) - map(p - e.xyy), map(p + e.yxy) - map(p - e.yxy), map(p + e.yyx) - map(p - e.yyx)));
}

void mainImage(out vec4 o, in vec2 fc) {
  vec2 uv = centered(fc);
  spin = iMouse.x > 0.0 ? (iMouse.xy / iResolution.xy - 0.5) * 3.0 : vec2(0.0);
  wobble = 0.15 + 0.2 * pressed();
  vec3 ro = vec3(0.0, 0.0, 4.2), rd = normalize(vec3(uv, -1.6));

  float d = 0.0, glow = 0.0;
  bool hit = false;
  for (int i = 0; i < 100; i++) {
    float h = map(ro + rd * d);
    glow += exp(-h * 12.0) * 0.02;
    if (h < 0.001) { hit = true; break; }
    d += h;
    if (d > 10.0) break;
  }

  vec3 col = mix(vec3(0.02, 0.01, 0.05), vec3(0.12, 0.05, 0.25), 1.0 - smoothstep(0.0, 1.2, length(uv)));
  col += glow * vec3(0.5, 0.35, 1.0) * 0.5;
  if (hit) {
    vec3 p = ro + rd * d, n = normalAt(p), l = normalize(vec3(0.6, 0.8, 0.5)), ref = reflect(rd, n);
    float fres = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
    vec3 env = mix(vec3(0.05, 0.02, 0.15), vec3(0.7, 0.5, 1.0), smoothstep(-0.3, 1.0, ref.y));
    vec3 base = neon(dot(n, vec3(0.4, 0.7, 0.2)) * 0.6 + iTime * 0.08);
    col = base * (0.15 + 0.6 * max(dot(n, l), 0.0)) + env * fres * 1.2 + pow(max(dot(ref, l), 0.0), 40.0);
  }
  o = vec4(pow(col, vec3(0.85)), 1.0);
}`;

const metaballs = /* glsl */ `
#include "common.glsl"
void mainImage(out vec4 o, in vec2 fc) {
  vec2 uv = centered(fc);
  float t = iTime * 0.6, aspect = iResolution.x / iResolution.y;
  float field = 0.0;
  vec2 grad = vec2(0.0);
  for (int i = 0; i < 9; i++) {
    float k = float(i), size = 0.02;
    vec2 p = vec2(sin(t * (0.5 + k * 0.07) + k * 2.1) * aspect * 0.38, cos(t * (0.6 + k * 0.05) + k * 1.3) * 0.32);
    if (i == 8) { p = pointer(vec2(cos(t * 1.3) * aspect * 0.3, sin(t * 1.7) * 0.25)); size = 0.04 + 0.05 * pressed(); }
    float g = exp(-dot(uv - p, uv - p) / size);
    field += g;
    grad -= 2.0 * (uv - p) / size * g;
  }
  vec3 n = normalize(vec3(-grad * 0.15, 1.0));
  vec3 L = normalize(vec3(-0.5, 0.6, 0.7));
  float diff = max(dot(n, L), 0.0);
  float spec = pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), 60.0);
  vec3 blob = neon(0.62 + (1.0 - n.z) * 0.9 + uv.x * 0.15 + t * 0.05) * (0.25 + 0.8 * diff) + spec * 1.2;
  vec3 bg = vec3(0.02, 0.02, 0.05);
  bg += (1.0 - smoothstep(0.0, 0.1, length(fract(uv * 14.0) - 0.5))) * 0.07;
  bg += vec3(0.45, 0.3, 1.0) * 0.25 * min(field, 1.0);
  o = vec4(mix(bg, blob, smoothstep(0.48, 0.52, field)), 1.0);
}`;

const trail = /* glsl */ `
#include "common.glsl"
void mainImage(out vec4 o, in vec2 fc) {
  vec2 uv = fc / iResolution.xy, p = centered(fc);
  float a = fbm(p * 1.5 + iTime * 0.15) * 12.0;
  vec2 flow = vec2(cos(a), sin(a)) * 0.0012 + (uv - 0.5) * 0.0015;
  vec3 col = texture(iChannel0, uv - flow).rgb * 0.975;          // last frame, nudged along a flow field
  float aspect = iResolution.x / iResolution.y;
  for (int i = 0; i < 5; i++) {
    float k = float(i), t = iTime * (0.5 + k * 0.08) + k * 1.7;
    vec2 c = vec2(sin(t * 1.3) * aspect * 0.4, sin(t * 1.9 + k) * 0.36);
    col += neon(k * 0.18 + iTime * 0.04) * (1.0 - smoothstep(0.0, 0.045, length(p - c))) * 0.5;
  }
  if (iMouse.x > 0.0) {
    float brush = 1.0 - smoothstep(0.0, 0.04 + 0.08 * pressed(), length(p - centered(iMouse.xy)));
    col += mix(vec3(1.0, 0.95, 1.0), neon(iTime * 0.3), pressed()) * brush * (0.35 + 0.5 * pressed());
  }
  o = vec4(col, 1.0);
}`;

const trailPost = /* glsl */ `
void mainImage(out vec4 o, in vec2 fc) {
  vec2 uv = fc / iResolution.xy, split = (uv - 0.5) * 0.006;
  vec3 col = vec3(texture(iChannel0, uv + split).r, texture(iChannel0, uv).g, texture(iChannel0, uv - split).b);
  col = 1.0 - exp(-col * 1.4);
  col *= 1.0 - 0.8 * dot(uv - 0.5, uv - 0.5);
  o = vec4(col, 1.0);
}`;

const textureFx = /* glsl */ `
#include "common.glsl"
vec2 cover(vec2 fc) {
  vec2 img = max(iChannelResolution[0].xy, vec2(1.0));
  float s = max(iResolution.x / img.x, iResolution.y / img.y);
  return (fc - 0.5 * iResolution.xy) / (img * s) + 0.5;
}
void mainImage(out vec4 o, in vec2 fc) {
  vec2 p = centered(fc);
  vec2 dir = p - pointer(vec2(sin(iTime * 0.5) * 0.6, cos(iTime * 0.7) * 0.25));
  float d = length(dir);
  vec2 ripple = dir / (d + 1e-4) * sin(d * 45.0 - iTime * 5.0) * (0.012 + 0.03 * pressed()) * exp(-d * 4.0);
  vec2 uv = cover(fc + ripple * iResolution.y);
  vec3 photo = vec3(texture(iChannel0, uv + ripple).r, texture(iChannel0, uv).g, texture(iChannel0, uv - ripple).b);

  float luma = dot(photo, vec3(0.299, 0.587, 0.114));
  float dots = length(fract(rot(0.785) * fc / 9.0) - 0.5);
  float ink = 1.0 - smoothstep(-0.05, 0.05, dots - sqrt(luma) * 0.55);
  vec3 duotone = mix(vec3(0.05, 0.02, 0.15), mix(vec3(1.0, 0.25, 0.75), vec3(0.15, 0.9, 1.0), luma), ink);

  float edge = 0.5 + 0.3 * sin(iTime * 0.45);
  float x = fc.x / iResolution.x + (fc.y / iResolution.y - 0.5) * 0.25;
  vec3 col = mix(photo, duotone, smoothstep(edge - 0.002, edge + 0.002, x));
  col += vec3(0.7, 0.6, 1.0) * exp(-abs(x - edge) * 90.0);
  o = vec4(col, 1.0);
}`;

const synthwave = /* glsl */ `
#include "common.glsl"
void mainImage(out vec4 o, in vec2 fc) {
  vec2 uv = centered(fc);
  float horizon = -0.08;
  vec3 col = mix(vec3(0.9, 0.2, 0.55), vec3(0.04, 0.01, 0.12), smoothstep(horizon, 0.55, uv.y));
  vec2 s = uv - vec2(0.0, 0.14);
  float sun = 1.0 - smoothstep(0.27, 0.275, length(s));
  float cuts = step(0.0, sin(s.y * 110.0 + iTime * 2.0) + 0.7 + s.y * 4.0);
  col = mix(col, mix(vec3(1.0, 0.2, 0.55), vec3(1.0, 0.85, 0.25), smoothstep(-0.25, 0.25, s.y)), sun * cuts);
  col += vec3(1.0, 0.3, 0.6) * exp(-length(s) * 3.5) * 0.35;
  float ridge = horizon + (0.04 + 0.25 * fbm(vec2(uv.x * 2.5, 1.0))) * smoothstep(0.15, 1.0, abs(uv.x));
  float mountain = (1.0 - smoothstep(ridge - 0.003, ridge + 0.003, uv.y)) * step(horizon, uv.y);
  col = mix(col, vec3(0.08, 0.02, 0.16) + vec3(0.6, 0.2, 0.8) * smoothstep(ridge - 0.06, ridge, uv.y) * 0.4, mountain);
  float depth = horizon - uv.y, z = 0.35 / max(depth, 0.001);
  vec2 g = vec2(uv.x * z, z + iTime * 2.0);
  vec2 lines = 1.0 - smoothstep(vec2(0.0), fwidth(g) * 1.5, abs(fract(g - 0.5) - 0.5));
  float fade = exp(-z * 0.08);
  vec3 ground = vec3(0.03, 0.0, 0.08) + mix(vec3(1.0, 0.2, 0.7), vec3(0.2, 0.9, 1.0), fade) * max(lines.x, lines.y) * fade * 1.5;
  ground += vec3(0.9, 0.2, 0.6) * exp(-depth * 25.0) * 0.4;
  o = vec4(mix(col, ground, step(0.0, depth)), 1.0);
}`;

const dither = /* glsl */ `
#include "common.glsl"
float bayer2(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
void mainImage(out vec4 o, in vec2 fc) {
  float px = 4.0, levels = 3.0;
  vec2 cell = floor(fc / px);
  vec3 scene = texture(iChannel0, fc / iResolution.xy).rgb;
  vec3 pixel = texture(iChannel0, (cell + 0.5) * px / iResolution.xy).rgb;
  vec3 dithered = floor(pixel * (levels - 1.0) + bayer4(cell)) / (levels - 1.0);
  float radius = 0.22 + 0.12 * pressed();
  float r = length(centered(fc) - pointer(vec2(sin(iTime * 0.6) * 0.5, -0.05 + cos(iTime * 0.4) * 0.15)));
  vec3 col = mix(dithered, scene, 1.0 - smoothstep(radius, radius + 0.005, r));
  col += vec3(0.7, 0.9, 1.0) * (1.0 - smoothstep(0.0, 0.004, abs(r - radius - 0.005)));
  o = vec4(col, 1.0);
}`;

const kaleido = /* glsl */ `
#include "common.glsl"
uniform float u_segments;
uniform float u_hue;
uniform float u_twist;
void mainImage(out vec4 o, in vec2 fc) {
  vec2 uv = centered(fc) - pointer(vec2(0.0)) * 0.35;
  float r = length(uv), a = atan(uv.y, uv.x) + iTime * 0.05;
  float seg = 6.28318 / floor(u_segments);
  a = abs(mod(a, seg) - seg * 0.5);
  vec2 p = rot(u_twist * r) * vec2(cos(a), sin(a)) * r;
  float f = fbm(p * 3.0 + vec2(iTime * 0.25, -iTime * 0.15));
  float rings = sin(r * 18.0 - iTime * 2.0 + f * 9.0);
  vec3 col = palette(f + r * 0.6 + u_hue, vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.0, 0.1, 0.2));
  col *= 0.55 + 0.45 * rings;
  col += pow(1.0 - abs(rings), 14.0) * 0.5;
  col *= 1.0 - smoothstep(0.3, 1.3, r);
  o = vec4(col, 1.0);
}`;

const meshGradient = /* glsl */ `
#include "common.glsl"
uniform vec3 u_c1;
uniform vec3 u_c2;
uniform vec3 u_c3;
uniform vec3 u_c4;
uniform float u_speed;
uniform float u_warp;
uniform float u_swirl;
uniform float u_scale;
uniform float u_grain;
float weight(vec2 uv, vec2 p) { return 1.0 / (dot(uv - p, uv - p) + 0.02); }
void mainImage(out vec4 o, in vec2 fc) {
  float t = iTime * u_speed;
  vec2 uv = centered(fc) * u_scale;
  vec2 m = pointer(vec2(0.0)) * u_scale;
  uv += (m - uv) * 0.3 * exp(-length(uv - m) * 1.5);
  uv *= rot(u_swirl * exp(-dot(uv, uv) * 0.8));
  uv += u_warp * (vec2(fbm(uv * 1.2 + t), fbm(uv * 1.2 - t + 7.0)) - 0.5);
  float w1 = weight(uv, vec2(sin(t * 1.1), cos(t * 0.9)) * 0.6);
  float w2 = weight(uv, vec2(cos(t * 0.7 + 2.0), sin(t * 1.3 + 1.0)) * 0.6);
  float w3 = weight(uv, vec2(sin(t * 0.8 + 4.0), cos(t * 1.2 + 3.0)) * 0.6);
  float w4 = weight(uv, vec2(cos(t * 1.4 + 5.0), sin(t * 0.6 + 2.0)) * 0.6);
  vec3 col = (u_c1 * w1 + u_c2 * w2 + u_c3 * w3 + u_c4 * w4) / (w1 + w2 + w3 + w4);
  o = vec4(col + (hash(fc + fract(iTime)) - 0.5) * u_grain, 1.0);
}`;

const buttonsBg = /* glsl */ `
#include "common.glsl"
void mainImage(out vec4 o, in vec2 fc) {
  float px = iResolution.y / 900.0;
  vec3 col = vec3(0.02, 0.015, 0.05);
  col += (1.0 - smoothstep(0.0, 1.5 * px, length(mod(fc, 28.0 * px) - 14.0 * px))) * 0.08;
  vec2 m = iMouse.x > 0.0 ? iMouse.xy : iResolution.xy * vec2(0.72 + 0.1 * sin(iTime * 0.5), 0.5);
  col += vec3(0.45, 0.35, 1.0) * 0.22 * exp(-length(fc - m) / (260.0 * px));
  col += vec3(0.1, 0.8, 1.0) * 0.06 * exp(-length(fc - iResolution.xy * vec2(0.15, 0.9)) / (500.0 * px));
  o = vec4(col, 1.0);
}`;

const rdStep = /* glsl */ `
#include "common.glsl"
vec2 at(vec2 fc) { return texture(iChannel0, fc / iResolution.xy).rg; }
void mainImage(out vec4 o, in vec2 fc) {
  if (iFrame < 3) { o = vec4(1.0, step(0.93, hash(floor(fc / 5.0))), 0.0, 1.0); return; }
  vec2 c = at(fc);
  vec2 lap = 0.2 * (at(fc + vec2(1, 0)) + at(fc - vec2(1, 0)) + at(fc + vec2(0, 1)) + at(fc - vec2(0, 1)))
           + 0.05 * (at(fc + vec2(1)) + at(fc - vec2(1)) + at(fc + vec2(1, -1)) + at(fc - vec2(1, -1))) - c;
  vec2 uv = fc / iResolution.xy;
  float t = (uv.x + uv.y) * 0.5;
  float feed = mix(0.0367, 0.055, t), kill = mix(0.0649, 0.062, t);
  float react = c.x * c.y * c.y;
  vec2 next = c + vec2(lap.x - react + feed * (1.0 - c.x), 0.5 * lap.y + react - (kill + feed) * c.y);
  vec2 brush = (vec2(sin(iTime * 0.7), sin(iTime * 1.1)) * 0.35 + 0.5) * iResolution.xy;
  float paint = 1.0 - smoothstep(0.0, 6.0, length(fc - brush));
  if (iMouse.z > 0.0) paint = max(paint, 1.0 - smoothstep(0.0, 10.0, length(fc - iMouse.xy)));   // iMouse is in this pass's pixels
  next.y = max(next.y, paint);
  o = vec4(clamp(next, 0.0, 1.0), 0.0, 1.0);
}`;

const rdView = /* glsl */ `
#include "common.glsl"
void mainImage(out vec4 o, in vec2 fc) {
  vec2 uv = fc / iResolution.xy, e = 2.0 / iResolution.xy;
  float b = texture(iChannel0, uv).g;
  float dx = texture(iChannel0, uv + vec2(e.x, 0.0)).g - texture(iChannel0, uv - vec2(e.x, 0.0)).g;
  float dy = texture(iChannel0, uv + vec2(0.0, e.y)).g - texture(iChannel0, uv - vec2(0.0, e.y)).g;
  vec3 n = normalize(vec3(-dx, -dy, 0.15)), L = normalize(vec3(-0.5, 0.6, 0.6));
  float v = smoothstep(0.12, 0.32, b);
  vec3 col = mix(vec3(0.015, 0.01, 0.04), neon(0.55 + 0.4 * uv.x - 0.2 * uv.y + iTime * 0.03), v) * (0.45 + 0.75 * max(dot(n, L), 0.0));
  col += pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), 30.0) * 0.6 * v;
  o = vec4(col, 1.0);
}`;

const marble = /* glsl */ `
#include "common.glsl"
void mainImage(out vec4 o, in vec2 fc) {
  vec2 uv = centered(fc);
  vec2 d = uv - pointer(vec2(sin(iTime * 0.4) * 0.6, cos(iTime * 0.3) * 0.3));
  uv += d * 0.6 * exp(-dot(d, d) * 5.0) * sin(iTime * 2.0 - length(d) * 8.0);
  float t = iTime * 0.2;
  vec2 w = uv + 0.6 * vec2(fbm(uv * 2.0 + t), fbm(uv * 2.0 - t + 5.0));
  float bands = sin((w.x + w.y) * 9.0 + fbm(w * 3.0) * 6.0 - iTime);
  vec3 col = neon(0.5 + 0.25 * bands + 0.3 * w.x + t * 0.3);
  col *= 0.7 + 0.5 * smoothstep(0.6, 1.0, bands);
  col += pow(max(bands, 0.0), 20.0) * 0.8;
  o = vec4(col, 1.0);
}`;

const warp = /* glsl */ `
#include "common.glsl"
void mainImage(out vec4 o, in vec2 fc) {
  vec2 uv = centered(fc) - pointer(vec2(sin(iTime * 0.4) * 0.3, cos(iTime * 0.3) * 0.15)) * 0.5;
  float r = length(uv), a = atan(uv.y, uv.x);
  float z = 0.5 / max(r, 0.001) + iTime * (1.5 + 3.0 * pressed());
  vec2 grid = abs(fract(vec2(a / 6.28318 * 16.0, z)) - 0.5);
  float lines = max(1.0 - smoothstep(0.0, 0.05, grid.x), 1.0 - smoothstep(0.0, 0.05, grid.y));
  vec3 col = neon(z * 0.04 + 0.15 * sin(a * 2.0)) * lines * smoothstep(0.03, 0.5, r) * 1.6;
  float h = hash(vec2(floor(a / 6.28318 * 140.0), 1.0));
  col += vec3(0.8, 0.85, 1.0) * smoothstep(0.97, 1.0, fract(z * 0.25 + h * 10.0)) * step(0.6, h) * smoothstep(0.1, 0.6, r);
  col += vec3(0.5, 0.35, 1.0) * 0.06 / (r + 0.05);
  col *= 1.0 - 0.25 * r;
  o = vec4(col, 1.0);
}`;

/* ═════════════════════════════════ scenes ═════════════════════════════════ */

// A painted 2D canvas used as a texture (section 05). Drawn once, uploaded once.
function paintPoster() {
  const c = document.createElement('canvas');
  c.width = 1600; c.height = 1000;
  const g = c.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, 640);
  sky.addColorStop(0, '#120b3a'); sky.addColorStop(.55, '#7c3aed'); sky.addColorStop(1, '#ff7a59');
  g.fillStyle = sky; g.fillRect(0, 0, 1600, 1000);
  for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * .8})`; g.fillRect(Math.random() * 1600, Math.random() * 380, 2, 2); }
  const sun = g.createRadialGradient(1060, 520, 10, 1060, 520, 220);
  sun.addColorStop(0, '#fff6c8'); sun.addColorStop(.45, '#ffd166'); sun.addColorStop(1, 'rgba(255,122,89,0)');
  g.fillStyle = sun; g.beginPath(); g.arc(1060, 520, 220, 0, Math.PI * 2); g.fill();
  const ridge = (base, amp, freq, color, seed) => {
    g.fillStyle = color; g.beginPath(); g.moveTo(0, 1000);
    for (let x = 0; x <= 1600; x += 8) g.lineTo(x, base - amp * (Math.sin(x * freq + seed) * .6 + Math.sin(x * freq * 2.7 + seed * 3) * .3 + Math.sin(x * freq * 6.1 + seed) * .1));
    g.lineTo(1600, 1000); g.fill();
  };
  ridge(600, 140, .004, '#3b1a6b', 1); ridge(680, 110, .006, '#26124d', 4); ridge(760, 80, .009, '#150a30', 7);
  const sea = g.createLinearGradient(0, 760, 0, 1000);
  sea.addColorStop(0, '#0d0726'); sea.addColorStop(1, '#05030f');
  g.fillStyle = sea; g.fillRect(0, 760, 1600, 240);
  for (let y = 770; y < 1000; y += 9) { g.fillStyle = `rgba(255,190,120,${.5 * (1 - (y - 770) / 230)})`; g.fillRect(1060 - 160 + Math.sin(y) * 30, y, 320 - (y - 770) * .6, 2); }
  return c;
}

const sceneDefs = {
  hero: { shader: aurora, uniforms: { u_calm: 0 } },
  raymarch: { shader: raymarch, scale: 0.85 },
  blobs: { shader: metaballs },
  trails: {
    passes: [
      { name: 'trail', shader: trail, pingpong: true, float: true, channels: ['trail'] },   // reads its own last frame
      { name: 'image', shader: trailPost, channels: ['trail'] },
    ],
  },
  texture: { shader: textureFx, channels: [{ element: paintPoster(), dynamic: false }] },
  dither: {
    passes: [
      { name: 'scene', shader: synthwave },
      { name: 'dither', shader: dither, channels: ['scene'] },
    ],
  },
  uniforms: { shader: kaleido, uniforms: { u_segments: 6, u_hue: 0, u_twist: 1 } },
  mesh: {
    shader: meshGradient,
    uniforms: {
      u_c1: { value: [0.10, 0.05, 0.35], color: true, label: 'colour 1' },
      u_c2: { value: [0.49, 0.36, 1.00], color: true, label: 'colour 2' },
      u_c3: { value: [0.13, 0.83, 0.93], color: true, label: 'colour 3' },
      u_c4: { value: [1.00, 0.31, 0.85], color: true, label: 'colour 4' },
      u_speed: { value: 0.35, min: 0, max: 2, label: 'speed' },
      u_warp: { value: 0.8, min: 0, max: 2, label: 'warp' },
      u_swirl: { value: 1.5, min: -4, max: 4, label: 'swirl' },
      u_scale: { value: 1.2, min: 0.5, max: 3, label: 'scale' },
      u_grain: { value: 0.06, min: 0, max: 0.2, step: 0.001, label: 'grain' },
    },
  },
  buttons: { shader: buttonsBg },
  sim: {
    passes: [
      // A ← D, B ← A, C ← B, D ← C: four simulation steps per frame. A reads D's previous frame.
      ...['A', 'B', 'C', 'D'].map((name, i, steps) => ({ name, shader: rdStep, size: 'half', float: true, wrap: 'repeat', channels: [steps.at(i - 1)] })),
      { name: 'view', shader: rdView, channels: ['D'] },
    ],
  },
  type: { shader: marble },
  calm: { shader: aurora, uniforms: { u_calm: 1 } },
  cta: { shader: warp },
};

const shared = {
  canvas: stage,
  autoplay: false,               // landing.js decides which one plays
  preserveDrawingBuffer: true,   // so the outgoing frame can be copied for the dissolve
  maxPixelRatio: 1.5,
  errorOverlay: false,
  pointer: { smooth: 0.12 },
  includes: { 'common.glsl': common },
};

/* ═════════════════════════════ scene switching ═════════════════════════════ */

const scenes = {};
let active = null, wanted = 'hero';
const snapshot = $('#snapshot');

function dissolveCurrentFrame() {
  snapshot.width = stage.width >> 1;
  snapshot.height = stage.height >> 1;
  snapshot.getContext('2d').drawImage(stage, 0, 0, snapshot.width, snapshot.height);
  snapshot.classList.remove('dissolve');
  void snapshot.offsetWidth;
  snapshot.classList.add('dissolve');
}

// Scenes are created on demand. There's nothing to download (the library is already here); what costs time is the
// GPU compiling each shader, and on Windows a compile can hold up the GPU for a few hundred milliseconds, which
// stalls whatever is animating at that moment. So we never compile in bulk: the scene on screen compiles first,
// and once you've settled on a section, only the NEXT section's scene compiles, so it's ready when you get there.
const ready = new Set();

function ensure(name) {
  if (scenes[name] || !sceneDefs[name]) return scenes[name];
  const sm = createShader({ ...shared, ...sceneDefs[name] });
  scenes[name] = sm;
  wire[name]?.(sm);
  sm.ready.then(() => { ready.add(name); if (wanted === name) show(name); }, e => console.warn('[landing] scene failed:', name, e));
  return sm;
}

function show(name) {
  wanted = name;
  const next = ensure(name);
  if (!next || next === active || !ready.has(name)) return;   // not compiled yet: ensure() calls back when it is
  if (active) { dissolveCurrentFrame(); active.pause(); }
  else stage.classList.add('on');                                // first frame: fade the stage in
  next.play();
  active = next;
}

/* ═════════════════════════════ section behaviours ═════════════════════════════ */

// 07 · sliders → uniforms. They animate on their own until someone touches one.
function wireSliders(sm) {
  const sliders = $$('[data-uniform]');
  const auto = { u_segments: t => 9 + 6 * Math.sin(t * 0.3), u_hue: t => (t * 0.04) % 1, u_twist: t => 2.5 * Math.sin(t * 0.45) };
  let touched = false;
  sliders.forEach(s => s.addEventListener('input', () => { touched = true; }));
  sm.on('beforeFrame', ({ time }) => {
    for (const s of sliders) {
      const name = s.dataset.uniform;
      if (!touched) s.value = auto[name](time);
      sm.set(name, +s.value);
      s.previousElementSibling.value = (+s.value).toFixed(name === 'u_segments' ? 0 : 2);
    }
  });
}

// 08 · a GUI generated from the uniforms, plus presets. It cycles presets until someone touches it.
const PRESETS = {
  Aurora: [[0.10, 0.05, 0.35], [0.49, 0.36, 1.00], [0.13, 0.83, 0.93], [1.00, 0.31, 0.85]],
  Sunset: [[0.99, 0.36, 0.25], [1.00, 0.73, 0.30], [0.84, 0.18, 0.48], [0.30, 0.10, 0.45]],
  Lagoon: [[0.02, 0.20, 0.35], [0.00, 0.62, 0.66], [0.55, 0.95, 0.80], [0.10, 0.35, 0.85]],
  Acid: [[0.78, 1.00, 0.24], [0.05, 0.05, 0.08], [0.13, 0.83, 0.93], [0.95, 0.95, 0.98]],
};
async function wireGui(sm) {
  if (!window.ShaderMate?.createGui) return;
  const gui = await window.ShaderMate.createGui(sm, { title: 'mesh-gradient.glsl', container: $('#gui'), controls: false, theme: window.SITE_THEME });
  const ui = { preset: 'Aurora', randomize() { ['u_c1', 'u_c2', 'u_c3', 'u_c4'].forEach(n => sm.set(n, [Math.random(), Math.random(), Math.random()])); } };
  const setPreset = name => PRESETS[name].forEach((c, i) => sm.tween('u_c' + (i + 1), c, { duration: 900, ease: 'inOutCubic' }));
  const presetCtrl = gui.add(ui, 'preset', Object.keys(PRESETS)).onChange(setPreset);
  gui.add(ui, 'randomize').name('🎲 randomize');
  // lil-gui adds controllers to the end; move the preset menu and button to the top
  gui.$children.prepend(presetCtrl.domElement);
  let touched = false, auto = false, i = 0;
  gui.onChange(() => { if (!auto) touched = true; });
  const names = Object.keys(PRESETS);
  setInterval(() => {
    if (touched || !sm.playing) return;
    auto = true;
    ui.preset = names[++i % names.length];
    presetCtrl.updateDisplay();
    setPreset(ui.preset);
    auto = false;
  }, 4000);
}

// 09 · real buttons, each with its own small canvas. Created when you reach the section before them.
//       When the pointer is idle they demo themselves.
function wireButtons() {
  const btns = $$('.shader-btn');
  const instances = btns.map(b => shaderButton(b, b.dataset.fx, { maxPixelRatio: 2 }));
  const section = $('.buttons-scene');
  let movedAt = 0, k = 0;
  addEventListener('pointermove', () => { movedAt = performance.now(); }, { passive: true });
  setInterval(() => {
    if (!section.classList.contains('in') || performance.now() - movedAt < 2500) return;
    const i = k++ % btns.length, sm = instances[i], btn = btns[i];
    btn.classList.add('demo');
    sm.tween('u_hover', 1, { duration: 350, ease: 'outCubic' });
    setTimeout(() => sm.set('u_click', [0.3 + Math.random() * 0.4, 0.5, sm.time]), 500);
    setTimeout(() => { btn.classList.remove('demo'); sm.tween('u_hover', 0, { duration: 700, ease: 'outExpo' }); }, 1300);
  }, 1500);
}
let buttonsWired = false;
function ensureButtons() { if (!buttonsWired) { buttonsWired = true; wireButtons(); } }

const wire = { uniforms: wireSliders, mesh: wireGui };

/* ═════════════════════════════ boot ═════════════════════════════ */


function boot() {
  sections.forEach(s => sectionObserver.observe(s));   // the section on screen compiles and plays right away
}

// After you've stayed on a section for a moment, compile the next section's scene (one at a time).
let prefetchTimer = 0;
function prefetchNext() {
  clearTimeout(prefetchTimer);
  const here = current;
  prefetchTimer = setTimeout(() => {
    if (here !== current) return;
    const next = sections[current + 1];
    if (!next) return;
    if (next.classList.contains('buttons-scene')) ensureButtons();   // its own small canvases
    ensure(next.dataset.scene);
  }, 1600);
}

/* ═════════════════════════════ page chrome ═════════════════════════════ */

const sections = $$('.scene');
const hint = $('#hint'), counter = $('#counter'), hud = $('.hud');
const pad = n => String(n).padStart(2, '0');
const dots = sections.map((section, i) => {
  const dot = document.createElement('button');
  dot.type = 'button';
  dot.setAttribute('aria-label', `Section ${i + 1}`);
  dot.onclick = () => section.scrollIntoView({ behavior: 'smooth' });
  $('.dots').append(dot);
  return dot;
});

let current = 0;
// A section is "current" while it covers the middle of the viewport (works for sections taller than the screen too).
const sectionObserver = new IntersectionObserver(entries => entries.forEach(({ target, isIntersecting }) => {
  target.classList.toggle('in', isIntersecting);
  if (!isIntersecting) return;
  current = sections.indexOf(target);
  show(target.dataset.scene);
  if (target.classList.contains('buttons-scene')) ensureButtons();
  prefetchNext();
  hint.textContent = target.dataset.hint ? '🖱 ' + target.dataset.hint : '';
  dots.forEach((d, i) => d.classList.toggle('on', i === current));
  counter.textContent = `${pad(current + 1)} / ${pad(sections.length)}`;
}), { rootMargin: '-50% 0px -50% 0px' });

// Hide the HUD over the footer.
new IntersectionObserver(([e]) => { hud.classList.toggle('away', e.isIntersecting); $('.dots').classList.toggle('away', e.isIntersecting); }, { threshold: 0.15 }).observe($('.footer'));

boot();

// Cursor ring
const cursor = $('.cursor');
addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse') return;
  cursor.classList.add('on');
  cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
}, { passive: true });
addEventListener('pointerdown', () => cursor.classList.add('down'));
addEventListener('pointerup', () => cursor.classList.remove('down'));
document.addEventListener('pointerleave', () => cursor.classList.remove('on'));

// Auto tour: T or the HUD button, or ?tour in the URL (handy for screen recordings)
let tour = null;
const tourButton = $('#tour');
function toggleTour() {
  if (tour) { clearInterval(tour); tour = null; }
  else tour = setInterval(() => sections[(current + 1) % sections.length].scrollIntoView({ behavior: 'smooth' }), 5000);
  tourButton.textContent = tour ? '❚❚ Pause' : '▶ Tour';
}
tourButton.onclick = toggleTour;
addEventListener('keydown', e => {
  if (e.target.closest('input, textarea, select, [contenteditable]') || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key.toLowerCase() === 't') toggleTour();
});
if (/[?&]tour\b/.test(location.search)) toggleTour();

// Copy buttons and install tabs
async function copy(text, btn) {
  try { await navigator.clipboard.writeText(text); } catch { return; }
  const label = btn.textContent;
  btn.textContent = 'Copied';
  setTimeout(() => { btn.textContent = label; }, 1200);
}
$$('[data-copy]').forEach(b => b.addEventListener('click', () => copy(b.dataset.copy, b)));
$$('.code-panel .copy-btn').forEach(b => b.addEventListener('click', () => copy($('pre', b.parentElement).innerText, b)));
for (const group of $$('[data-tabs]')) {
  const tabs = $$('[role="tab"]', group), panels = $$('[role="tabpanel"]', group);
  tabs.forEach((tab, i) => tab.addEventListener('click', () => {
    tabs.forEach((t, j) => t.setAttribute('aria-selected', String(i === j)));
    panels.forEach((p, j) => { p.hidden = i !== j; });
  }));
}
