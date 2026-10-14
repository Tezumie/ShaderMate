---
title: FAQ & troubleshooting
group: Project
order: 51
description: Browser support, licensing, mobile, and answers to the questions people ask first.
---

# FAQ & troubleshooting

## Which browsers work?

Any browser with WebGL 2, which is every current version of Chrome, Edge, Firefox and Safari, on desktop and mobile. WebGL 1 is used as a fallback, with the same API. Force it with `webgl: 1` to test.

## How big is it?

The core has no dependencies and is a single file. The tweak panel and React bindings are separate files that load only when you import them. The exact size of the build you are using is printed by `npm run build`.

## Do I need to learn GLSL?

Yes, but only the parts you use: a `main()` that writes a colour. The [Writing shaders](../writing-shaders/) page and the [examples](../../examples/) are enough to start. [The Book of Shaders](https://thebookofshaders.com/) is a good companion.

## Does it work with ShaderToy shaders?

Yes. Paste the Image tab and it runs. See [ShaderToy & FragCoord.xyz](../shadertoy-fragcoord/). Normal WebGL GLSL is the primary way to use the library.

## Can I use it commercially?

Yes. ShaderMate is MIT licensed: use it in personal, client and commercial projects, modify it, and ship it, with no fee and no need to open-source your own code. Keep the copyright notice and licence text with any copy of ShaderMate itself.

## Why is my canvas blurry?

The drawing buffer is smaller than the screen. Check `pixelRatio` and `scale`, and that the canvas has a real CSS size. Remember `maxPixelRatio` caps at 2.

## Why is it slow on a phone?

Lower `scale` or `maxPixelRatio`, set `maxFps: 30`, reduce loops in the shader, and use `float: true` rather than `'full'`. See [Performance](../performance/).

## Can I have lots of shaders on a page?

Yes, within the browser's WebGL context limit (about 16). Off-screen instances pause automatically; destroy those you no longer need. See [Performance](../performance/).

## Does it work with server-side rendering?

Import it anywhere; it only touches the DOM when `createShader` runs. Call it from client-side code (an effect, or `DOMContentLoaded`).

## Can I use it without a canvas element?

Yes: leave `canvas` out and a full-window canvas is created.

## Something's broken. Where do I look?

Start at [Errors & debugging](../debugging/), then search the [issues](https://github.com/Tezumie/ShaderMate/issues). A minimal shader that reproduces the problem is the fastest way to a fix.
