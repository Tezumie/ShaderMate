---
title: How it works
group: Start
order: 3
description: The mental model: instances, passes, uniforms, channels and the frame loop.
---

# How it works

Five ideas cover the whole library.

## 1. An instance owns a canvas

`createShader()` returns an **instance**. It owns one WebGL context, one render loop and every GPU resource it creates. Everything you do afterwards (`sm.set`, `sm.pause`, `sm.screenshot`) goes through that object, and `sm.destroy()` releases all of it.

## 2. A shader is a fragment shader

The GPU runs your shader once per pixel. ShaderMate draws a single full-screen triangle, so the whole job of your code is: given `gl_FragCoord`, write a colour. A small header is prepended automatically (precision, `fragColor`, the built-ins you use), which is why a shader can be five lines long. See [Writing shaders](../writing-shaders/).

## 3. Passes are stages

One shader is one pass that draws to the canvas. More passes draw to offscreen textures first, in order, and later passes can read earlier ones. A pass can also read **its own previous frame** (ping-pong), which is how feedback, fluids and cellular automata work. See [Multipass & channels](../multipass/).

## 4. Uniforms are your inputs

A uniform is a value the shader reads: a number, a vector, a colour. ShaderMate supplies built-ins (`u_time`, `u_resolution`, `u_mouseUV` …) and you add your own with `uniforms: {}`. Changing one from JavaScript is a cheap upload, and `sm.tween()` animates it for you. See [Uniforms](../uniforms/) and [Built-in uniforms](../builtin-uniforms/).

## 5. Channels are your textures

A channel is a texture bound to `iChannel0..3`, or to a named sampler. It can be an image, a video, the webcam, audio, a canvas, another pass, or your own `WebGLTexture`. Canvases and videos re-upload each frame, so a p5 sketch or a 2D canvas becomes live input. See [Textures & media](../textures-media/).

## The frame loop

Each frame, in order:

1. `beforeFrame` fires, so you can set uniforms.
2. Time, delta, frame count, pointer and built-ins update.
3. Every pass draws in sequence. Ping-pong passes swap their buffers afterwards.
4. `afterFrame` fires.

The loop pauses by itself when the tab is hidden or the canvas scrolls off-screen (`pauseWhenHidden`), and resumes when it returns. While paused, `sm.render()` still draws a single frame on demand.
