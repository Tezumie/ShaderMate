---
title: Changelog
group: Project
order: 52
description: Release notes for ShaderMate.
---

# Changelog

## 2.0.1

Bug fixes, plus a redesigned website. No API changes.

**Fixed**

- **Compiling no longer freezes the page.** Shaders now compile with `KHR_parallel_shader_compile` when the browser has it (Chrome and Edge do): the driver works in the background and ShaderMate checks back once per frame. Before, it waited for every compile on the main thread, which on Windows could stall the page for hundreds of milliseconds per shader. Passes of a multipass shader also compile at the same time now, instead of one after another.
- **No black frames after a resize.** Resizing clears a canvas, and the redraw used to land one frame late, so a resize briefly showed an empty canvas. A layout where the canvas size changed by a pixel every frame stayed black. The canvas is now redrawn as soon as it is resized.
- **Shared canvases.** Several instances can now draw to one canvas (one WebGL context) and switch with `pause()` / `play()`. A paused instance no longer repaints over the one that is playing when the canvas resizes, when you `set()` a uniform or while a tween runs, and its own buffers still follow the new size. See [Many scenes on one canvas](../recipes/#many-scenes-on-one-canvas).
- **Detached canvases.** A canvas that isn't in the document (an offscreen texture generator, a render source for another library) is no longer treated as "scrolled out of view" by `pauseWhenHidden`, so it keeps rendering.
- **`u_mouse` as `vec4`** (FragCoord.xyz style). Before the first click, `zw` was `-0`, which `step()` and `sign()` treat as "pressed". It is now slightly negative, so shaders see the button as up until you actually click.
- **Tweak panel.** Colour and vector controls now follow the uniform when it changes from code (`sm.set`, `sm.tween`), like number sliders already did.

**Website**

- New design and home page: every section is a live scene on one shared canvas.
- New examples: raymarching, liquid metaballs, reaction diffusion, mesh gradient with GUI, dither post-processing and shader typography. The shader buttons example now has sixteen effects, including a liquid glow that spills past its own edge. The playground has GLSL syntax highlighting.
- Gallery thumbnails share one WebGL context, so a page can show any number of them.

## 2.0.0

A ground-up rebuild. The old single-file 1.x library is kept untouched for existing pages.

**New**

- `createShader()` with a synchronous return and `sm.ready` for loading.
- Named exports only: `createShader`, `useShader`, and the types `ShaderOptions` and `ShaderInstance`. In a `<script>` tag, everything lives on `ShaderMate`.
- Multipass with named passes, ping-pong buffers, half and full float targets, per-pass size, defines and uniforms.
- Channels from images, video, webcam, audio, keyboard, cubemaps, canvases, elements and your own textures.
- Uniform tweening, with ten built-in eases.
- Pointer module with `target` and `smooth`, plus page scroll as a built-in.
- Capture: screenshots and video recording, deterministic frame stepping.
- Optional tweak panel (`shadermate/gui`) and React bindings (`shadermate/react`).
- TypeScript declarations for everything.
- Pauses when hidden or off-screen, frame-rate cap, context-loss recovery.
- Compile errors drawn over the canvas on localhost, mapped to your own line numbers.
- Compatibility with shaders from ShaderToy and FragCoord.xyz, including multi-pass exports.
- A new website with complete docs and a gallery of live examples.

**Changed**

- Canvas sizing follows the CSS box by default.
- `preserveDrawingBuffer` is off by default; screenshots render a fresh frame.
- Uniform types are inferred from the compiled program.

See [Migrating from 1.x](../migrating/) for a translation table.

## 1.x

The original single-file library with `startShaderMate`. It remains available from its original path and is not changed by this release.
