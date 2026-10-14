---
title: Events
group: Reference
order: 43
description: Every event an instance emits and the data it carries.
---

# Events

```js
const off = sm.on('beforeFrame', ({ time, frame, dt, fps }) => { sm.set('u_x', Math.sin(time)); });
sm.once('load', () => console.log('ready'));
sm.off('beforeFrame', handler);
off();                                  // `on` and `once` return an unsubscribe function
```

| Event | Data | When |
| --- | --- | --- |
| `load` | the instance | Shaders compiled and textures loaded. |
| `error` | `ShaderMateError` | A compile, link or load error. |
| `beforeFrame` | `{ time, frame, dt, fps }` | Before each frame draws. Set uniforms here. |
| `afterFrame` | `{ time, frame, dt, fps }` | After each frame draws. |
| `resize` | `{ width, height }` | The drawing buffer changed size. |
| `play`, `pause` | none | Playback state changed. |
| `shader` | `{ pass }` | A pass was (re)compiled, for example by `setShader`. |
| `visibility` | `boolean` | The canvas entered or left view, or the tab was shown or hidden. |
| `contextlost`, `contextrestored` | none | The GPU context was lost and rebuilt. |
| `destroy` | none | `destroy()` was called. |

## Callback options

`onReady`, `onFrame` and `onError` in the options are shorthand for `load`, `beforeFrame` and `error`.

## Context loss

ShaderMate rebuilds its own programs and textures after a lost context. If you keep WebGL resources of your own (a shared `gl`, custom textures), recreate them on `contextrestored`.
