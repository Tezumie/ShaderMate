---
title: Errors & debugging
group: Guide
order: 18
description: Compile errors, the overlay, the stats panel and fixing the common problems.
---

# Errors & debugging

## Compile errors

```js
const sm = createShader({ shader });
sm.ready.catch(err => console.error(err.message, err.errors));   // ShaderMateError

sm.on('error', e => { … });                                       // compile and runtime errors
```

On `localhost`, errors are drawn over the canvas with the failing line marked (`errorOverlay: 'auto'`). Set it to `true` or `false` to force it on or off. Line numbers refer to **your** source, not the generated header.

When you hot-reload with `sm.setShader(src)` and the new source fails, the previous program keeps running, so a typo while editing never blanks the page.

## Stats

```js
createShader({ shader, stats: true });      // FPS overlay on from the start
createShader({ shader, stats: 'key' });     // nothing until F1 is pressed
sm.stats.toggle();
```

## Checklist

| Symptom | Likely cause |
| --- | --- |
| Black canvas, no error | The canvas has zero height. Give it a CSS height. |
| A uniform has no effect | It isn't used in the output, so the compiler removed it. Look for the *missing uniform* warning. |
| Everything is 0 or 1 in a buffer | The pass needs `float: true`. |
| Feedback buffer is empty | `pingpong: true` is set but the pass doesn't list itself in `channels`. |
| Texture is black | Cross-origin image without CORS headers, or the image hasn't loaded: `await sm.ready`. |
| Image upside-down | Toggle `flipY` on that channel. |
| Works on desktop, fails on a phone | Lower precision floats or `float: 'full'` unsupported. Try `float: true`, or `webgl: 1` to test the fallback. |
| Blank after switching tabs | A context loss. ShaderMate restores it; listen for `contextrestored` if you hold your own GL resources. |
| Mic or webcam is silent | Needs HTTPS (or localhost) and a user gesture. |

## Warnings

`warnMissingUniforms` (default on) and `strictUniforms` control unknown-name behaviour. `onError` and the `error` event always fire, regardless of the overlay.

## Debugging a shader

Output intermediate values as colour: `fragColor = vec4(vec3(value), 1.0);` or `vec4(uv, 0.0, 1.0)`. Use `sm.pause()` with `sm.step()` to look at one frame, and `sm.readPixels()` to inspect numbers from a float pass. `sm.error` holds the last error, or `null`.
