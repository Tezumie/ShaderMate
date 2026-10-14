---
title: Migrating from 1.x
group: Project
order: 50
description: Moving from startShaderMate to createShader: what changed and how to translate your code.
---

# Migrating from 1.x

2.0 is a rewrite with a smaller, clearer API. The old file `src/shaderMate.js` is untouched, so 1.x pages keep working while you move over.

## The short version

```js
// 1.x
const sm = await startShaderMate(passes, { /* options */ });

// 2.x
import { createShader } from 'shadermate';
const sm = createShader({ passes, ...options });
await sm.ready;
```

| 1.x | 2.x |
| --- | --- |
| `await startShaderMate(passesOrPath, options)` | `createShader({ passes, ...options })`, synchronous; `await sm.ready` if you need it. |
| Global `startShaderMate` | `import { createShader }`, or `ShaderMate.createShader` from the script build. |
| Canvas is `#glcanvas` and the window size | `canvas` option, and `size: 'canvas'` follows its CSS box. Omit `canvas` to get a full-window one. |
| `src` fetched unless it starts with `void` | `shader` is text or URL, detected automatically. |
| `uniforms: { u_x: { type: '1f', value: 1 } }` | `uniforms: { u_x: 1 }`. Types are inferred; `{ type: '1f' }` still works. |
| `channels: [{ url }]`, `{ video }`, `{ audio }`, `{ cubemap }` | Same, plus strings, canvases, elements and your own textures. |
| `pingpong`, `float`, `size`, `screen` on passes | Unchanged. |
| `preserveDrawingBuffer: true` always | Off by default; screenshots render fresh. Turn it on if another library reads the canvas. |
| `iMouse.zw` set only while pressed | Same for `iMouse`. `u_mouse` is `vec2` pixels, and `u_mouseUV` is 0–1. |
| `sm.pause() / resume() / stop() / dispose()` | `sm.pause() / play() / destroy()`. |
| `sm.setTime`, `setTimeScale`, `setFixedDelta` | `sm.time = …`, `sm.timeScale = …`, `sm.setFixedDelta()`. |
| `sm.on('beforeFrame' …)` | Same, with a return value that unsubscribes. |
| `sm.gl`, `sm.passes` | Same. |

## Step by step

1. Install the package (or switch the script URL to `shadermate@2`).
2. Replace `startShaderMate(...)` with `createShader({ ... })`. Put the old second argument's keys alongside `passes`.
3. Give your canvas a CSS size. If you relied on the full-window default, leave `canvas` out, or pass `size: 'window'`.
4. Rename `uniforms` entries to plain values (optional).
5. Replace `resume()` with `play()`, and `dispose()`/`stop()` with `destroy()`.
6. Remove any manual resize handling. It's automatic now.

## New in 2.0

Tweens, `sm.set`/`get`, the pointer module with smoothing, `pauseWhenHidden`, screenshots and recording, context-loss recovery, a tweak panel, React bindings, TypeScript types, per-pass defines and includes, and ShaderToy / FragCoord.xyz compatibility.

## Getting help

If a 1.x pattern has no obvious 2.x equivalent, [open an issue](https://github.com/Tezumie/ShaderMate/issues) with a snippet and we'll add it to this page.
