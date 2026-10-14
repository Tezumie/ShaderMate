---
title: Performance
group: Guide
order: 19
description: How to keep shaders smooth: resolution, frame rate, passes and many canvases on one page.
---

# Performance

A fragment shader costs roughly *pixels × work per pixel × passes*. Reduce whichever you can afford to.

## In order of payoff

1. **Render fewer pixels.** `scale: 0.5` quarter-costs the whole shader. Cap `maxPixelRatio` at 1.5 or 1 on large canvases.
2. **Render fewer frames.** `maxFps: 30` for ambient motion. Pausing off-screen canvases is on by default.
3. **Shrink intermediate passes.** Blurs, glows and fields can run at `size: 'half'` or `'quarter'`.
4. **Pick the right format.** Half float (`float: true`) is faster and smaller than `'full'`. Use 8-bit when you don't need range.
5. **Trim the shader.** Fewer octaves, fewer ray steps, and `defines` for quality tiers.

## Adaptive quality

`scale` is read when the instance is created, so to adapt, rebuild at a lower scale when the frame rate stays low:

```js
let scale = 1, sm = make(scale);
function make(s) {
  const inst = createShader({ canvas, shader, scale: s });
  let slow = 0;
  inst.on('afterFrame', ({ fps }) => {
    slow = fps < 40 ? slow + 1 : 0;
    if (slow > 90 && scale > 0.5) { scale -= 0.25; inst.destroy(); sm = make(scale); }
  });
  return inst;
}
```

## Many canvases on one page

Each instance has its own WebGL context, and browsers limit how many are alive at once (usually around 16). Pausing off-screen instances protects the frame rate but not the context count. For galleries and grids:

- create instances when they scroll near the viewport and call `sm.destroy()` when they leave, as the [examples gallery](../../examples/) does,
- or render one shader to a single large canvas and place it behind a grid with CSS.

## Memory

Float targets use 8 bytes per pixel at half float, 16 at full. A 4K full-float pass is about 130 MB, so size simulation buffers deliberately.

## Reduced motion and battery

Respect `prefers-reduced-motion` (see [Playback & timing](../playback/)) and consider `powerPreference: 'low-power'` for decorative backgrounds.
