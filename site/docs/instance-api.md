---
title: Instance API
group: Reference
order: 41
description: Everything on the object createShader returns.
---

# Instance API

## Playback

```js
sm.play(); sm.pause(); sm.toggle(); sm.playing
sm.time = 0; sm.seek(3); sm.setFixedDelta(1 / 60); sm.timeScale = 0.5; sm.frame; sm.maxFps = 30; sm.loop = 4
sm.step(n)             // advance n frames while paused
sm.render()            // draw one frame now (no time advance)
```

## Shaders and textures

```js
sm.setShader(src, pass?)          // hot reload; keeps the old program if the new one fails (returns a Promise)
sm.setChannel(i, source, pass?)   // swap a texture at runtime
sm.getTexture(pass?)              // WebGLTexture of an offscreen pass: feed it to three.js etc.
sm.readPixels({ pass, x, y, width, height })   // → { data, width, height }; data is Uint8Array, or Float32Array from float passes
sm.getPass(name); sm.passes; sm.gl; sm.canvas; sm.isWebGL2
```

## Capture

```js
sm.screenshot()                   // data URL
await sm.toBlob('image/jpeg', 0.9)
await sm.download('frame.png')
const rec = sm.record({ fps: 60 }); … const blob = await rec.stop();
await sm.record({ duration: 5000, download: 'loop.webm' });
```

Screenshots and `readPixels` render a fresh frame first, so they work without `preserveDrawingBuffer`. If *another* library reads the canvas (for example `ctx.drawImage(sm.canvas)`), pass `preserveDrawingBuffer: true`.

## Size and pointer

```js
sm.resize(); sm.setSize(1920, 1080); sm.width; sm.height
sm.pointer                        // { x, y, clickX, clickY, down, over, uvX, uvY }
sm.domToShader(clientX, clientY); sm.domToUV(clientX, clientY)
sm.stats.show(); sm.stats.toggle()
```

## Events

```js
const off = sm.on('beforeFrame', ({ time, frame, dt, fps }) => { … });   // returns an unsubscribe function
sm.once('load', () => …);
sm.off('beforeFrame', fn);
```

Events: `load`, `error`, `beforeFrame`, `afterFrame`, `resize`, `play`, `pause`, `shader`, `visibility`, `contextlost`, `contextrestored`, `destroy`.

## State

`sm.ready` (Promise), `sm.loaded`, `sm.error`, `sm.version`, `sm.uniforms`, `sm.theme`, and `sm.camera` once a pass uses `u_camera_*`.

## Cleanup

`sm.destroy()` stops the loop, removes listeners and frees every GL resource. Call it when a component unmounts or a canvas is removed.
