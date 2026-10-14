---
title: Introduction
group: Start
order: 1
description: What ShaderMate is, what it is for, and where to start.
---

# ShaderMate

ShaderMate puts a GLSL fragment shader on any canvas. You write the shader; it handles the WebGL context, compiling, sizing, the render loop, input, textures and multipass buffers. It has no dependencies and ships as a single file for `<script>` tags, an ES module for bundlers, and optional React and tweak-panel add-ons.

```html
<canvas id="hero"></canvas>
<script src="https://cdn.jsdelivr.net/npm/shadermate@2/dist/shadermate.min.js"></script>
<script>
  ShaderMate.createShader({
    canvas: '#hero',
    shader: `
      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        fragColor = vec4(0.5 + 0.5 * cos(u_time + uv.xyx + vec3(0, 2, 4)), 1.0);
      }`
  });
</script>
```

You write ordinary WebGL GLSL. There is no precision line, no `out vec4`, and no uniform declarations to copy from page to page: the built-ins you use are declared for you.

## What it is for

- **Backgrounds and heroes** that follow the page: pointer, scroll, and a canvas that sizes itself to its CSS box.
- **Shader-driven UI** such as buttons, cards and transitions, with uniforms you can tween from JavaScript.
- **Simulations and generative art** using ping-pong float buffers, feedback and per-pass resolution.
- **Post-processing** of a video, an image, a webcam, or another canvas such as p5 or a 2D drawing.

## What you get

- **Any canvas, any size.** The drawing buffer follows the canvas's CSS box, the window, or a fixed resolution, with pixel ratio and render scale handled.
- **Multipass.** Named passes, ping-pong buffers, half and full float targets, and video, webcam, audio, keyboard, cubemap and canvas inputs.
- **Made for real pages.** Pauses when hidden, caps the frame rate, loses and restores its context gracefully, and cleans up after itself.
- **Live uniforms.** Set, read and [tween](../uniforms/) any uniform. Optional [tweak panel](../tweak-panel/) and [React](../react/) bindings.
- **Capture.** Screenshots and video recording straight from the canvas.
- **Compatible.** Shaders written for [ShaderToy and FragCoord.xyz](../shadertoy-fragcoord/) run as they are.

## Where next

- [Quick start](../getting-started/): install it and put a shader on the page.
- [How it works](../how-it-works/): the mental model in five minutes.
- [Writing shaders](../writing-shaders/) and [Uniforms](../uniforms/): the day-to-day parts.
- [Recipes](../recipes/): short answers to common jobs.
- [Examples](../../examples/): complete pages you can view-source.
