// ShaderMate — public API. Named exports only; the <script> build exposes this same
// namespace as `window.ShaderMate` (so `ShaderMate.createShader(...)`).
//
//   import { createShader, glsl } from 'shadermate';
//   const sm = createShader({ canvas: '#hero', shader: 'hero.glsl', uniforms: { u_glow: 1 } });

export { createShader } from './core/create.js';
export { VERSION } from './constants.js';
export { glsl, ShaderMateError } from './utils/util.js';
export { EASES } from './core/tween.js';
export { BUILTIN_UNIFORMS } from './glsl/builtins.js';
export { resolveUniformType } from './uniforms/types.js';
export { assembleFragment, resolveIncludes } from './glsl/preprocess.js';
