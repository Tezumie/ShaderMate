---
title: Recipes
group: Guide
order: 20
description: Short, complete answers to common jobs: backgrounds, hover buttons, scroll, mouse trails, video filters.
---

# Recipes

Each recipe is self-contained. The [examples](../../examples/) show larger pages.

## A full-page animated background

```js
createShader({
  shader: `void main() {
    vec2 p = gl_FragCoord.xy / u_resolution * 3.0;
    float v = sin(p.x + u_time) + sin(p.y * 1.3 - u_time * 0.7) + sin((p.x + p.y) * 0.8 + u_time * 0.4);
    fragColor = vec4(vec3(0.08, 0.1, 0.18) + 0.06 * v, 1.0);
  }`,
  maxFps: 30, scale: 0.5,                       // cheap: soft gradients look identical at half res
});
```

```css
#glcanvas { z-index: -1; pointer-events: none; }
```

## A button that reacts on hover

```js
const sm = createShader({ canvas: '#btn-canvas', shader, uniforms: { u_hover: 0 }, pointer: { target: btn, smooth: 0.2 } });
btn.addEventListener('pointerenter', () => sm.tween('u_hover', 1, { duration: 200 }));
btn.addEventListener('pointerleave', () => sm.tween('u_hover', 0, { duration: 450, ease: 'outCubic' }));
```

The [shader buttons example](../../examples/buttons/) does this with several styles at once.

## Scroll-linked progress

```js
const sm = createShader({ canvas, shader, uniforms: { u_progress: 0 } });
addEventListener('scroll', () => {
  const max = document.documentElement.scrollHeight - innerHeight;
  sm.set('u_progress', max ? scrollY / max : 0);
}, { passive: true });
```

## A mouse trail with feedback

```js
createShader({
  passes: [
    { name: 'trail', pingpong: true, float: true, channels: ['trail'], shader: `
      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        float d = smoothstep(0.04, 0.0, distance(uv * vec2(u_aspect, 1.0), u_mouseUV * vec2(u_aspect, 1.0)));
        fragColor = vec4(max(texture(iChannel0, uv).rgb * 0.97, vec3(d)), 1.0);
      }` },
    { name: 'out', channels: ['trail'], shader: `
      void main() { fragColor = vec4(texture(iChannel0, gl_FragCoord.xy / u_resolution).rgb * vec3(0.4, 0.7, 1.0), 1.0); }` },
  ],
});
```

## Filter a video

```js
createShader({
  canvas, size: [1280, 720], fit: 'cover',
  passes: [{ channels: [{ video: 'clip.mp4' }], shader: `
    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution;
      float g = dot(texture(iChannel0, uv).rgb, vec3(0.299, 0.587, 0.114));
      fragColor = vec4(vec3(step(0.5, g)), 1.0);
    }` }],
});
```

## Distort an image on hover

```js
createShader({ canvas, passes: [{ channels: ['photo.jpg'], shader: `
  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    float d = distance(uv, u_mouseUV);
    uv += (uv - u_mouseUV) * 0.15 * exp(-d * 6.0);
    fragColor = texture(iChannel0, uv);
  }` }] });
```

## Shader text with a 2D canvas

Draw text with the 2D API, feed it as a channel, and use its alpha as a mask or height map. This is how the title on the home page works.

```js
const c = Object.assign(document.createElement('canvas'), { width: 1200, height: 300 });
const g = c.getContext('2d'); g.font = '800 200px sans-serif'; g.fillStyle = '#fff'; g.fillText('Hello', 40, 220);
createShader({ canvas, shader: `void main() { fragColor = vec4(vec3(texture(iChannel0, gl_FragCoord.xy / u_resolution).a), 1.0); }`,
               channels: [{ element: c, dynamic: false }] });
```

## Pause when the user prefers reduced motion

```js
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const sm = createShader({ canvas, shader, autoplay: !reduced });
if (reduced) sm.render();
```

## Export a looping clip

```js
const sm = createShader({ canvas, shader, loop: 4 });
await sm.record({ fps: 60, duration: 4000, download: 'loop.webm' });
```
