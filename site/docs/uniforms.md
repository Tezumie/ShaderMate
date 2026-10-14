---
title: Uniforms
group: Guide
order: 11
description: Custom uniforms, types, live updates, tweens and arrays.
---

# Uniforms

```js
createShader({
  shader,
  uniforms: {
    u_speed: 1.5,                                   // type inferred from the shader
    u_color: [1, 0.4, 0.2],
    u_enabled: true,
    u_matrix: { type: 'mat4', value: m, transpose: false },
    u_glow: { value: 1, min: 0, max: 4, step: 0.01, label: 'Glow' },   // extra keys are tweak-panel hints
    u_tint: { value: [1, 1, 1], color: true },
  },
});
```

`type` is optional because ShaderMate reads the real type from the compiled program. When you give one it accepts GLSL names (`float`, `vec3`, `ivec2`, `mat4`, `float[]` …) or the classic shorthand (`1f`, `3f`, `Matrix4fv` …).

## Updating

```js
sm.set('u_speed', 2);                      // one
sm.set({ u_speed: 2, u_color: [0, 1, 0] });  // several
sm.get('u_speed');
sm.uniforms.u_speed = 2;                   // the uniforms object is live too
```

Changes apply on the next frame. Values are uploaded only when they change.

## Tweens

```js
sm.tween('u_glow', 3, { duration: 600, ease: 'outCubic' });   // → Promise<boolean>
```

The promise resolves `true` when the tween finishes and `false` if another tween on the same uniform replaced it. Vectors tween component-wise. Options: `duration` (ms), `delay`, `ease`, and `pass` to target a per-pass uniform.

Built-in eases: `linear`, `inQuad`, `outQuad`, `inOutQuad`, `inCubic`, `outCubic`, `inOutCubic`, `outExpo`, `outBack`, `outElastic`. You can also pass your own `t => t`.

```js
button.addEventListener('pointerenter', () => sm.tween('u_hover', 1, { duration: 200 }));
button.addEventListener('pointerleave', () => sm.tween('u_hover', 0, { duration: 400 }));
```

## Arrays and structs

Arrays are set with a flat list of numbers, or an array of arrays:

```glsl
uniform vec3 u_palette[4];
```

```js
sm.set('u_palette', [[1, .2, .4], [.1, .8, .9], [1, .8, .3], [.5, .3, 1]]);
```

## Per-pass uniforms

Put `uniforms` on a pass to scope them to it, or at the top level to share them across all passes. A pass's own value wins.

```js
createShader({
  uniforms: { u_gain: 1 },                                  // shared
  passes: [{ name: 'sim', shader: sim, uniforms: { u_dt: 0.016 } }, { name: 'out', shader: out }],
});
```

## Missing uniforms

A name that isn't in any compiled pass logs one warning (`warnMissingUniforms`). Set `strictUniforms: true` to throw instead. GLSL removes unused uniforms, so a uniform you set but never read in the shader will also trigger the warning.

> [!TIP]
> A uniform that exists in the source but is optimised out is not an error. Use it in a computation that affects the output, or ignore the warning during development.
