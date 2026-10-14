---
title: Options
group: Reference
order: 40
description: Every createShader option.
---

# Options

| Option | Default | What it does |
| --- | --- | --- |
| `canvas` | auto | Canvas element or selector. If omitted a full-window `<canvas id="glcanvas">` is created. |
| `gl` | – | Use an existing WebGL context instead of creating one. |
| `channels` | – | Single-shader shorthand: inputs for `iChannel0..3`. With `passes`, put `channels` on each pass instead. |
| `shader` / `passes` | – | One shader, or an array of passes ([Multipass](../multipass/)). `passes` also accepts a pasted FragCoord.xyz export. |
| `uniforms` | `{}` | Instance-wide uniforms (live object: mutate it or use `sm.set`). |
| `defines` | `[]` | `#define`s: `['FAST', { STEPS: 32 }]`. |
| `includes` | `{}` | `{ 'noise.glsl': '…' }`, resolved before fetching `#include "…"`. |
| `common` | – | GLSL (text or URL) prepended to every pass. |
| `samplers` | `{}` | Named `sampler2D` sources shared by all passes. |
| `dialect` | `'auto'` | `'auto' \| 'fragcoord' \| 'shadertoy' \| 'shadermate'`: which conventions to assume. |
| `size` | `'canvas'` | `'canvas'` follows the canvas's CSS box. `'window'` = full window. `[w, h]` = fixed resolution. |
| `aspect` | – | `16/9`, `'16:9'` or `[16, 9]` locks the aspect (letterboxed via `object-fit`). |
| `fit` | `'contain'` | `'contain' \| 'cover' \| 'fill'` for fixed / aspect-locked canvases. |
| `pixelRatio` | `'auto'` | `'auto'` (devicePixelRatio, capped by `maxPixelRatio: 2`) or a number. |
| `scale` | `1` | Render-scale multiplier. `0.5` renders at half res, which is cheap on big heroes. |
| `autoplay` | `true` | Start the clock immediately. |
| `pauseWhenHidden` | `true` | Stop rendering when the tab is hidden or the canvas scrolls out of view. |
| `maxFps` | `0` | Frame-rate cap (0 = uncapped). |
| `loop` | `0` | Wrap `iTime` every N seconds (seamless loops). |
| `time`, `timeScale`, `fixedDelta`, `maxDelta` | `0, 1, 0, 0.1` | Clock controls. |
| `pointer` | `true` | `false`, or `{ target: 'window' \| 'canvas' \| element, smooth: 0..1 }`. The default listens on the window so DOM text over the canvas doesn't block input. |
| `camera` | – | `{ speed, sensitivity, target }` for the `u_camera_*` fly camera. |
| `background` | transparent | Clear colour: CSS string or `[r, g, b, a]`. |
| `alpha`, `premultipliedAlpha`, `preserveDrawingBuffer`, `antialias`, `powerPreference`, `webgl` | `true, true, false, false, 'default', 'auto'` | Context setup. `webgl: 1` forces WebGL1. |
| `stats` | `false` | `true` shows an FPS overlay, `'key'` installs only the toggle key (`statsKey`, default `F1`). Nothing is installed unless you ask. |
| `errorOverlay` | `'auto'` | Draw compile errors over the canvas. `'auto'` = only on localhost. |
| `theme` | – | Colours for the stats overlay, error overlay and GUI. |
| `strictUniforms`, `warnMissingUniforms` | `false, true` | Unknown uniform names throw / warn once. |
| `autoSetup`, `inject` | `true` | Turn off (all or parts of) the automatic header / uniform / mainImage injection. |
| `onReady`, `onFrame`, `onError` | – | Callbacks (same as the `load`, `beforeFrame`, `error` events). |

## Sizing

`size: 'canvas'` is the default and the one to use inside page layouts: give the canvas a CSS size and the drawing buffer follows it, including on resize. `size: 'window'` creates a full-window canvas. A fixed `[w, h]` renders at that resolution and scales it with `fit`.

Lower `scale` (or `maxPixelRatio`) before you reach for anything else when a big canvas is slow.

## Pointer

By default pointer input is read from the window, so text and buttons on top of a hero don't swallow it. Use `pointer: { target: element }` to scope tracking to one element (the shader buttons example does this per button), and `smooth` to ease the position.

`sm.pointer` exposes `{ x, y, clickX, clickY, down, over, uvX, uvY }`; `sm.domToShader(clientX, clientY)` and `sm.domToUV(…)` convert page coordinates, accounting for `fit`.
