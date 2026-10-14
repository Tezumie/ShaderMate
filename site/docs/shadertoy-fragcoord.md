---
title: ShaderToy & FragCoord.xyz
group: Integrations
order: 33
description: Paste shaders from ShaderToy or FragCoord.xyz and run them as they are.
---

# ShaderToy & FragCoord.xyz

ShaderMate's native dialect is plain WebGL GLSL. If you are bringing shaders from ShaderToy or FragCoord.xyz, they run as they are: ShaderMate detects the dialect from the source, so there is nothing to configure. Set `dialect` only to override the guess.

## ShaderToy

Paste the Image tab as the shader. `iTime`, `iTimeDelta`, `iFrame`, `iFrameRate`, `iResolution`, `iMouse` (exact zw click semantics), `iDate`, `iSampleRate`, `iChannelN`, `iChannelTime` and `iChannelResolution` all work.

- The **Common** tab goes in `common: '…'` (prepended to every pass).
- **Buffers A–D** are passes: `{ name: 'BufferA', float: 'full', pingpong: true, channels: ['BufferA'] }`. Use `float: 'full'` to match ShaderToy's 32-bit buffers.
- **Keyboard** is `channels: [{ keyboard: true }]` (256×3: held / pressed-this-frame / toggle, ShaderToy key codes).
- **Music / Mic** are `{ audio: url }` / `{ mic: true }` (512×2: spectrum / waveform).

## FragCoord.xyz

Paste as is. That can be a single shader, or the whole multi-pass export: `// Common`, `// Pass 1` … `// Main` headers are split into passes automatically, and aux passes get float, history-keeping buffers like FragCoord's.

```js
createShader({ canvas, passes: pastedFragCoordExport });                  // the whole "// Pass 1 … // Main" blob
createShader({ canvas, passes: [
   { name: 'sim', iterations: 4, shader: simGlsl },                        // u_sim / u_pass1 elsewhere, u_recursion inside
   { name: 'main', shader: mainGlsl, samplers: { u_noise: 'noise.png' } }, // any sampler2D uniform can be fed by name
]});
```

### Uniforms

| Uniform | Notes |
| --- | --- |
| `u_resolution`, `u_time`, `u_time_delta`, `u_frame`, `u_refresh_rate`, `u_date` | As FragCoord. |
| `u_mouse` (vec4) | xy position, zw click position, negative while the button is up. Detected when you use `.z` / `.w`, or declare `uniform vec4 u_mouse;`. |
| `u_drag`, `u_scroll` | Click-drag offset and mouse-wheel accumulator (`exp(u_scroll)` for zoom). Declare `uniform float u_scroll;` for the FragCoord meaning. |
| `u_pass1..N`, `u_passes[i]`, `u_<passname>`, `u_main` | Other buffers. `u_main` is the previous frame of the screen pass. |
| `u_recursion`, `u_max_recursion` | Per-pass `iterations: N`. |
| `u_camera_pos`, `u_camera_dir`, `u_camera_view` | Fly camera (WASD + drag), created on first use. |
| `u_audio` | 512×512 spectrogram: R weighted FFT, G waveform, B raw FFT, y = history. Microphone by default. |
| `u_keyboard`, `u_webcam` | 256×3 key state, and the webcam. |

### Comment annotations

```glsl
uniform float u_x = 0.5;        //[0.0, 5.0]       default 0.5, slider range 0–5 (initializer is stripped for GLSL ES)
uniform float u_y;              //1.0, [0.0, 5.0]
uniform sampler2D u_tex;        //https://…/a.png [linear repeat mipmap]
uniform sampler2D u_clip;       //https://…/loop.mp4      video, plus a u_clip_time companion
uniform sampler2D u_prev;       // ref:pass1 [nearest clamp]      also ref:pass:name, ref:main, ref:sampler u_other
```

The defaults and ranges also drive the [tweak panel](../tweak-panel/).

### Not supported

MRT (`fragColor1`), 1D / 3D / cubemap buffers, `u_color_gamut` (always 0), and WebGPU / WGSL sketches.
