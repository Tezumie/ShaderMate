---
title: With other libraries
group: Integrations
order: 32
description: Feed p5, three.js and 2D canvases into a shader, and get shader output back out.
---

# With other libraries

## Canvas in, shader out

Any canvas, video or image element can be a channel. A p5 sketch becomes shader input with one line, re-uploaded each frame:

```js
const sm = createShader({ canvas: '#fx', shader: post, channels: [p5Canvas] });
```

Use a separate output canvas, and keep the source canvas hidden or off-screen if you only want the processed result.

## Shader out, texture in

`sm.getTexture('passName')` returns the `WebGLTexture` of an offscreen pass. To use it from three.js or another renderer, share the context:

```js
const renderer = new THREE.WebGLRenderer({ canvas });
const sm = createShader({ gl: renderer.getContext(), passes });
const tex = sm.getTexture('sim');
```

Shared contexts also share state, so reset three.js's cached state (`renderer.resetState()`) after ShaderMate draws.

## Your own render loop

```js
const sm = createShader({ canvas, shader, autoplay: false });
function frame(t) { otherLibrary.update(); sm.set('u_x', otherLibrary.value); sm.render(); requestAnimationFrame(frame); }
requestAnimationFrame(frame);
```

## Layering with the DOM

A shader canvas is an ordinary element, so you can stack it with CSS, apply `mix-blend-mode`, `mask-image`, or `filter`, and clip it with `border-radius`. Window-level pointer tracking means DOM content above the canvas never blocks it.

## From a bundler

Everything is a named export; there is no default export and no global side effect on import. Tree shaking removes the GUI and React add-ons if you don't import them.
