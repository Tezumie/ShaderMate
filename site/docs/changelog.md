---
title: Changelog
group: Project
order: 52
description: Release notes for ShaderMate.
---

# Changelog

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
