---
title: Textures & media
group: Guide
order: 15
description: Images, video, webcam, audio, keyboard, cubemaps, canvases and your own textures as channels.
---

# Textures & media

Anything you can sample is a **channel**. Put it in a pass's `channels` array (bound to `iChannel0..3`) or give it a name with `samplers`.

| Channel | Example |
| --- | --- |
| Image | `'photo.jpg'`, `{ url: 'photo.jpg', wrap: 'repeat', filter: 'nearest', flipY: true, mipmap: true }` |
| Video | `{ video: 'clip.mp4' }` |
| Webcam | `{ camera: true }` |
| Audio spectrum | `{ audio: 'song.mp3', fftSize: 1024 }` or `{ mic: true }`. Row 0 is the spectrum, row 1 the waveform. |
| Keyboard | `{ keyboard: true }`. A 256×3 texture: held, pressed this frame, toggled. |
| Cubemap | `{ cubemap: [px, nx, py, ny, pz, nz] }` |
| An element | `myCanvas`, `{ element: video }`. Canvases and videos update every frame. |
| Your texture | `{ texture, width, height }` for a `WebGLTexture` you made |
| Another pass | `'sim'`, see [Multipass](../multipass/) |

## Texture parameters

Every image-like channel accepts `wrap` (`'clamp'`, `'repeat'`, `'mirror'`), `filter` (`'linear'`, `'nearest'`), `mipmap` and `flipY`. Non-power-of-two images work on WebGL 2; on WebGL 1 repeat and mipmaps are limited by the browser.

## Video, webcam and audio

Autoplay rules apply. Video is muted and plays inline so it starts without a click. Microphone, webcam and audio-element inputs need a user gesture or permission, and a secure context (HTTPS or localhost). Create the shader inside a click handler when in doubt:

```js
button.onclick = () => createShader({ canvas, shader, passes: [{ shader, channels: [{ mic: true }] }] });
```

## Canvas and element inputs

A 2D canvas, a p5 or three.js canvas, a `<video>` and an `<img>` can be channels directly. Static images upload once; canvases and videos re-upload each frame (`dynamic: true`). Pass `dynamic: false` on a canvas you draw only once, as the home-page title does:

```js
sm.setChannel(0, { element: textCanvas, dynamic: false });
```

> [!NOTE]
> Canvas inputs are flipped to match WebGL's bottom-left origin. If you read a canvas you drew yourself and it looks upside-down, set `flipY: false`.

## Cross-origin images

Images from another origin need CORS headers (`Access-Control-Allow-Origin`). ShaderMate sets `crossOrigin = 'anonymous'` for you; without matching headers the browser refuses to upload the image to WebGL.

## Reading a texture back

```js
const { data, width, height } = sm.readPixels({ pass: 'sim', x: 0, y: 0, width: 4, height: 4 });   // data: Uint8Array, or Float32Array from float passes
const tex = sm.getTexture('sim');                                               // WebGLTexture, for other libraries
```
