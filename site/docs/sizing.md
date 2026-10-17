---
title: Sizing & layout
group: Guide
order: 13
description: How the drawing buffer relates to CSS size, pixel ratio, aspect and render scale.
---

# Sizing & layout

## The default: follow the canvas

`size: 'canvas'` (the default) makes the drawing buffer follow the canvas's CSS box, including when the layout changes. Give the canvas a size with CSS and you are done:

```css
#hero { display: block; width: 100%; height: 70vh; }
```

## Other modes

```js
createShader({ shader, size: 'window' });          // a full-window canvas (created for you if you omit `canvas`)
createShader({ shader, size: [1280, 720] });       // fixed resolution, scaled to the CSS box
createShader({ shader, aspect: '16:9', fit: 'cover' });
```

`aspect` locks the ratio (`16/9`, `'16:9'` or `[16, 9]`). `fit` decides how a fixed or aspect-locked buffer sits in its box: `'contain'`, `'cover'` or `'fill'`.

## Pixel ratio and render scale

| Option | Default | Use |
| --- | --- | --- |
| `pixelRatio` | `'auto'` | Uses `devicePixelRatio`, capped by `maxPixelRatio` (2). Set a number to force it. |
| `maxPixelRatio` | `2` | Cap for `auto`. Retina phones can be 3×, which is expensive. |
| `scale` | `1` | Multiplier on top. `0.5` renders at half resolution. |

Lower `scale` first when a large canvas is slow. Soft effects such as clouds, glows or gradients look the same at half size.

## Full-page backgrounds

Omit `canvas` and ShaderMate inserts a `position: fixed` canvas that covers the window. Put it behind your content with one rule (the canvas id is `glcanvas`):

```css
#glcanvas { z-index: -1; pointer-events: none; }
```

## Resizing yourself

```js
sm.resize();               // re-measure now
sm.setSize(1920, 1080);    // switch to a fixed size at runtime
sm.on('resize', ({ width, height }) => { … });
```

Passes with a `size` of `'half'`, `'quarter'`, a number or `[w, h]` resize along with the canvas; fixed-size ones don't.

## Canvases inside grids and flex layouts

A canvas's bitmap size is also its natural size, so a grid or flex track sized by its content can grow with the bitmap, which makes the bitmap grow again. Give the canvas a box whose size comes from the layout alone:

```css
.view { position: relative; min-width: 0; min-height: 0; }        /* the grid / flex item */
.view canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
```

In a grid, use `minmax(0, 1fr)` tracks instead of plain `1fr`, so content can't stretch them.
