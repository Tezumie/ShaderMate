---
title: Writing shaders
group: Guide
order: 10
description: Entry points, built-in uniforms, includes, defines and the template ShaderMate wraps around your code.
---

# Writing shaders

Write `void main()` and output to `fragColor`. ShaderMate declares `fragColor`, the precision, and any built-in uniform you use. `texture()` works on both WebGL 1 and 2; a macro maps it to `texture2D` on WebGL 1.

```glsl
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  fragColor = vec4(uv, 0.5 + 0.5 * sin(u_time), 1.0);
}
```

`gl_FragColor` also works if you prefer it. Declare your own uniforms normally:

```glsl
uniform float u_speed;
uniform vec3  u_tint;
uniform sampler2D u_photo;
```

and supply them with `uniforms` and `samplers` (see [Uniforms](../uniforms/) and [Textures & media](../textures-media/)).

## Coordinates

`gl_FragCoord.xy` is in **pixels of the drawing buffer**, origin bottom-left. Divide by `u_resolution` for 0–1 coordinates, or centre and scale by height for resolution-independent art:

```glsl
vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;   // −0.5…0.5 vertically, aspect-correct
```

## Includes and defines

```js
createShader({
  shader: '#include "noise.glsl"\nvoid main() { … }',
  includes: { 'noise.glsl': 'float hash(vec2 p) { … }' },   // inline, or leave out and ShaderMate fetches the URL
  defines: ['FAST', { STEPS: 32 }],                           // #define FAST / #define STEPS 32
  common: 'common.glsl',                                      // prepended to every pass
});
```

Per-pass `defines` let you reuse one source for several passes, as the hero on the home page does for its horizontal and vertical blur:

```js
passes: [
  { name: 'h', shader: BLUR, defines: ['HORIZ'], channels: [mask] },
  { name: 'v', shader: BLUR, channels: ['h'] },
]
```

## The `glsl` tag

`glsl` is a no-op template tag. It returns the string unchanged, but editors use it to enable GLSL highlighting inside JavaScript.

```js
import { glsl } from 'shadermate';
const shader = glsl`void main() { fragColor = vec4(1.0); }`;
```

## What ShaderMate adds, and how to turn it off

Before compiling, ShaderMate prepends a header (version, precision, `fragColor`), declares the built-ins your code mentions, and expands includes and defines. `autoSetup: false` switches all of that off and you write the whole shader, `#version` line included. `inject: { builtins: false, mainWrap: false }` turns off only the parts you name.

## Other dialects

If your source has a `mainImage(out vec4, in vec2)` entry, it is wrapped automatically, so shaders from ShaderToy work unchanged. See [ShaderToy & FragCoord.xyz](../shadertoy-fragcoord/).

## Tips

- Prefer `uniforms` over string-building a new shader. Changing a uniform is free, recompiling is not.
- Use `defines` for compile-time switches (loop counts, quality tiers).
- Keep loops bounded by constants; WebGL 1 requires it, and it keeps mobile GPUs happy.
