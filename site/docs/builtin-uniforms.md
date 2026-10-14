---
title: Built-in uniforms
group: Reference
order: 42
description: Every uniform ShaderMate supplies, in short and ShaderToy names.
---

# Built-in uniforms

A built-in is declared for you when your shader mentions it and doesn't declare it itself. Use the short names, the ShaderToy names, or both: they are the same data.

| Short | ShaderToy | Type | Meaning |
| --- | --- | --- | --- |
| `u_resolution` | `iResolution` | `vec2` / `vec3` | Drawing-buffer size in pixels (`iResolution.z` is the pixel ratio). |
| `u_time` | `iTime` | `float` | Seconds since start, after `timeScale` and `loop`. |
| `u_delta` | `iTimeDelta` | `float` | Seconds since the last frame. |
| `u_frame` | `iFrame` | `int` | Frame counter. |
| `u_fps` | `iFrameRate` | `float` | Measured frame rate. |
| `u_mouse` | `iMouse` | `vec2` / `vec4` | Pointer in pixels, bottom-left origin. `iMouse` also carries the click position in `zw`. |
| `u_mouseUV` | | `vec2` | Pointer, 0–1 across the canvas. |
| `u_mouseDown` | | `float` | 1 while pressed. |
| `u_scroll` | `iScroll` | `vec2` | Page scroll in CSS pixels. |
| `u_date` | `iDate` | `vec4` | Year, month, day, seconds since midnight. |
| `u_pixelRatio` | | `float` | Effective pixel ratio. |
| `u_aspect` | | `float` | Width divided by height. |
| | `iSampleRate` | `float` | 44100. |
| | `iChannel0..3` | `sampler2D` / `samplerCube` | Channel textures. |
| | `iChannelResolution[4]` | `vec3[4]` | Channel sizes. |
| | `iChannelTime[4]` | `float[4]` | Playback time of video and audio channels. |

`iGlobalTime` is accepted as an alias of `iTime`.

## Type-aware names

`u_mouse` and `u_scroll` take the shape you declare. Leave them undeclared and you get ShaderMate's (`vec2` pixels, `vec2` scroll). Declare `uniform vec4 u_mouse;` and you get the xy and click layout that [FragCoord.xyz](../shadertoy-fragcoord/) sketches expect.

## Extras for pasted shaders

`u_time_delta`, `u_refresh_rate`, `u_drag`, `u_wheel`, `u_camera_pos`, `u_camera_dir`, `u_camera_view`, `u_recursion`, `u_max_recursion`, `u_audio`, `u_keyboard`, `u_webcam`, `u_main`, `u_passN` are supplied for FragCoord.xyz compatibility. See that page for details.

## Overriding

A built-in is a default. Declare the same name yourself with a different type and your declaration wins; set it from JavaScript if you want your own value.
