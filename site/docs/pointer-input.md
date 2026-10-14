---
title: Pointer & input
group: Guide
order: 12
description: Mouse, touch and scroll as shader inputs, and how to scope them.
---

# Pointer & input

Pointer tracking is on by default and costs nothing when the shader ignores it.

```glsl
uniform vec2 u_mouseUV;     // 0–1 across the canvas
// built-ins, no declaration needed:  u_mouse (pixels), u_mouseUV, u_mouseDown, u_scroll
```

| Built-in | Meaning |
| --- | --- |
| `u_mouse` | Pointer position in drawing-buffer pixels, bottom-left origin. |
| `u_mouseUV` | The same, normalised 0–1. |
| `u_mouseDown` | 1 while a button or finger is down. |
| `u_scroll` | Page scroll in pixels (vec2). |

## Where the pointer is read from

By default the **window** is listened to, so text and buttons on top of a canvas never swallow input, and a full-page background reacts to the cursor anywhere.

```js
createShader({ shader, pointer: { target: 'canvas' } });   // only while over the canvas
createShader({ shader, pointer: { target: someButton } }); // relative to a specific element
createShader({ shader, pointer: false });                  // no listeners at all
```

`smooth: 0..1` eases the position, which is what makes hover effects feel liquid rather than twitchy:

```js
createShader({ shader, pointer: { smooth: 0.14 } });
```

## From JavaScript

```js
sm.pointer              // { x, y, clickX, clickY, down, over, uvX, uvY }
sm.domToShader(e.clientX, e.clientY)   // page → drawing-buffer pixels (accounts for fit and scale)
sm.domToUV(e.clientX, e.clientY)       // page → 0–1
```

## Scroll-driven shaders

`u_scroll.y` is the page's scroll offset in CSS pixels. Divide by the page height, or use your own value:

```js
addEventListener('scroll', () => sm.set('u_progress', scrollY / (document.body.scrollHeight - innerHeight)), { passive: true });
```

## Touch

Touch uses the same pointer events. When tracking the canvas itself, ShaderMate sets `touch-action: none` so a drag drives the shader instead of scrolling the page. Pass `pointer: { target: 'canvas', touch: false }` to keep normal page scrolling over the canvas.
