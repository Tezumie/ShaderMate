---
title: Capture & recording
group: Guide
order: 17
description: Screenshots, downloads and video recording of the canvas.
---

# Capture & recording

## Screenshots

```js
const url = sm.screenshot();                       // data URL (PNG)
const blob = await sm.toBlob('image/jpeg', 0.9);
await sm.download('frame.png');                    // triggers a browser download
```

Each call renders a fresh frame first, so it works without `preserveDrawingBuffer` and never returns a blank image.

## Recording

```js
const rec = sm.record({ fps: 60 });
// …later
const blob = await rec.stop();                     // WebM Blob

await sm.record({ duration: 5000, download: 'loop.webm' });   // fixed length, saved automatically
```

Options: `fps`, `mimeType`, `bitsPerSecond`, `duration` (ms) and `download` (`true` or a filename). Recording uses `MediaRecorder`, so the available formats depend on the browser. Chrome and Firefox produce WebM; Safari support varies by version.

> [!TIP]
> For a seamless loop, set `loop` to the clip length and record exactly that `duration`.

## Resolution

Captures are at the drawing-buffer size. To export larger than the screen, switch to a fixed size first:

```js
sm.setSize(3840, 2160);
await sm.download('poster.png');
sm.setSize(...originalSize);
```

## When another library reads the canvas

If other code reads the canvas (for example `ctx.drawImage(sm.canvas, 0, 0)`), pass `preserveDrawingBuffer: true`. It is off by default because it costs memory bandwidth on some GPUs.
