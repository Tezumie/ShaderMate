---
title: Quick start
group: Start
order: 2
description: Install ShaderMate and render your first shader in a minute.
---

# Quick start

## Install

Use whichever fits your project. The names are identical everywhere, so nothing changes between a `<script>` tag and npm.

```html
<!-- Script tag: everything lives on window.ShaderMate -->
<script src="https://cdn.jsdelivr.net/npm/shadermate@2/dist/shadermate.min.js"></script>
```

```bash
npm i shadermate
```

```js
import { createShader, glsl } from 'shadermate';              // core
import { createGui } from 'shadermate/gui';                    // optional tweak panel (needs `npm i lil-gui`)
import { ShaderCanvas, useShader } from 'shadermate/react';    // optional React bindings
```

## Render a shader

```js
const sm = createShader({
  canvas: '#hero',                       // element | selector | omit for a full-window canvas
  shader: 'hero.glsl',                   // GLSL text or a URL
  uniforms: { u_glow: 1.2, u_tint: [1, 0.5, 0.2] },
});
await sm.ready;                          // optional: rendering starts by itself
```

`createShader` returns immediately while shaders and textures load in the background. `sm.ready` resolves with the instance, or rejects with a compile error. `createShader(shader, options)` is shorthand for a single shader.

Leave `canvas` out and ShaderMate creates a full-window canvas behind your page content, which is the fastest way to a shader background.

## Make it respond

```glsl
uniform float u_glow;                     // declared by you → set from JS

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float d = distance(uv, u_mouseUV);      // built-in: pointer position, 0–1
  fragColor = vec4(vec3(u_glow * 0.05 / d), 1.0);
}
```

```js
sm.set('u_glow', 2);
sm.tween('u_glow', 0.4, { duration: 600, ease: 'outCubic' });
```

## If something is wrong

On `localhost` compile errors are drawn over the canvas with the failing line marked. In production they go to the console and to the `error` event. See [Errors & debugging](../debugging/).

## Run the examples locally

```bash
git clone https://github.com/Tezumie/ShaderMate
cd ShaderMate
npm install
npm run dev        # http://localhost:8080/
```

## Next

- [How it works](../how-it-works/)
- [Writing shaders](../writing-shaders/)
- [Examples](../../examples/)
