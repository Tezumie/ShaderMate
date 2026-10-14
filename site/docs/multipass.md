---
title: Multipass & channels
group: Guide
order: 14
description: Passes, ping-pong buffers, float targets and how passes read each other.
---

# Multipass & channels

```js
createShader({
  passes: [
    { name: 'sim',  shader: 'sim.glsl',  pingpong: true, float: true, channels: ['sim'] },
    { name: 'blur', shader: 'blur.glsl', size: 'half', channels: ['sim'] },
    { name: 'out',  shader: 'out.glsl',  channels: ['blur', 'photo.jpg', { video: 'clip.mp4' }] },
  ],
});
```

Passes run in order each frame. The last one draws to the screen unless another has `screen: true`. Every other pass renders to its own texture, which later passes (and itself, with `pingpong`) can sample.

## Pass fields

| Field | Meaning |
| --- | --- |
| `name` | How other passes refer to it. |
| `shader` / `src` | GLSL text or a URL. |
| `size` | `'screen'`, `'half'`, `'quarter'`, `0.5`, or `[w, h]`. |
| `screen` | Draw to the canvas (defaults to the last pass). |
| `pingpong` | Keep last frame's buffer so the pass can read itself. |
| `float` | `true` = half float, `'full'` = 32-bit. |
| `wrap`, `filter`, `depth` | Texture parameters for the pass's output. |
| `channels` | Up to four inputs, bound to `iChannel0..3`. |
| `uniforms`, `defines` | Per-pass values. |
| `samplers` | Sources for named `sampler2D` uniforms. |
| `iterations` | Draw the pass N times per frame. |

## Reading passes

A channel can name another pass: `channels: ['blur']`. A ping-pong pass that lists **itself** reads its previous frame:

```js
{ name: 'trail', pingpong: true, float: true, channels: ['trail'], shader: `
  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    vec4 prev = texture(iChannel0, uv);
    float dot = smoothstep(0.03, 0.0, distance(uv, u_mouseUV));
    fragColor = max(prev * 0.985, vec4(dot));
  }` }
```

Use `{ pass: 'sim', buffer: 'prev' }` to read the previous frame of a pass that isn't ping-ponged to itself.

## Choosing sizes and formats

- Simulation state needs `float: true`, otherwise values clamp to 0–1 and quantise to 8 bits. Use `'full'` only when half float (16-bit) drifts.
- Blurs, glows and bloom rarely need full size: `size: 'half'` is four times cheaper.
- A pass sampling a smaller pass gets bilinear upscaling for free with `filter: 'linear'`.

## Named samplers

Any `sampler2D` that isn't `iChannelN` can be fed by name, on the pass or for the whole instance:

```js
{ name: 'main', shader, samplers: { u_noise: 'noise.png', u_prev: { pass: 'sim' } } }
```

Samplers named after a pass (`u_sim`), `u_pass1..N`, `u_main`, `u_audio`, `u_keyboard` and `u_webcam` are wired up automatically.

## Replacing a channel at runtime

```js
await sm.setChannel(0, 'other.jpg');            // first pass
await sm.setChannel(1, someCanvas, 'blur');     // a named pass
```

For the full list of channel inputs, see [Textures & media](../textures-media/).
