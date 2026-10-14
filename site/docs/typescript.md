---
title: TypeScript
group: Reference
order: 44
description: Types ship with the package; no @types install needed.
---

# TypeScript

Declarations are included for the core, the GUI add-on and the React bindings.

```ts
import { createShader, type ShaderInstance, type ShaderOptions, type PassConfig } from 'shadermate';

const options: ShaderOptions = { shader, uniforms: { u_glow: 1 } };
const sm: ShaderInstance = createShader(options);
```

## Useful types

| Type | For |
| --- | --- |
| `ShaderOptions` | The argument to `createShader`. |
| `ShaderInstance` | What it returns. |
| `PassConfig`, `PassSize` | Entries of `passes`. |
| `ChannelSource` | Anything accepted as a channel. |
| `UniformMap`, `UniformValue`, `UniformSpec` | The `uniforms` option. |
| `TweenOptions`, `EaseName` | `sm.tween`. |
| `FrameInfo`, `EventName` | Event handlers. |
| `ShaderMateError` | Errors, with `.errors[]` giving line numbers. |
| `RecordOptions`, `RecordHandle` | `sm.record`. |

## Entry points

```ts
import { createShader } from 'shadermate';
import { createGui } from 'shadermate/gui';
import { ShaderCanvas, useShader } from 'shadermate/react';
```

All exports are named. There is no default export. The package also exports `glsl`, `VERSION`, `EASES`, `BUILTIN_UNIFORMS`, `assembleFragment` and `resolveIncludes` for tooling.

## Typing your uniforms

`uniforms` is loosely typed so any name works. For safety in your own code, wrap it:

```ts
type Hero = { u_glow: number; u_tint: [number, number, number] };
const set = <K extends keyof Hero>(k: K, v: Hero[K]) => sm.set(k, v as any);
```
