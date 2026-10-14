import { describeGLType, resolveUniformType } from './types.js';
import { isArrayLike, ShaderMateError, warnOnce } from '../utils/util.js';

/**
 * A uniform entry is either a plain value (`0.5`, `[1,0,0]`, `true`)
 * or a spec object `{ type?, value, transpose?, ...ui hints }`.
 */
export function isUniformSpec(v) {
   return v != null && typeof v === 'object' && !isArrayLike(v) && 'value' in v;
}

const num = v => (typeof v === 'boolean' ? (v ? 1 : 0) : v);

function toList(value, n) {
   if (typeof value === 'number' || typeof value === 'boolean') return new Array(n).fill(num(value)); // broadcast
   if (ArrayBuffer.isView(value)) return value;
   if (Array.isArray(value) && value.some(x => typeof x === 'boolean')) return value.map(num);
   return value;
}

/** Upload `value` to `loc` according to a descriptor from types.js. */
export function uploadUniform(gl, loc, d, value, transpose) {
   const n = d.n;
   switch (d.kind) {
      case 'f':
         if (n === 1 && typeof value === 'number') return gl.uniform1f(loc, value);
         return gl['uniform' + n + 'fv'](loc, toList(value, n));
      case 'i':
         if (n === 1 && (typeof value === 'number' || typeof value === 'boolean')) return gl.uniform1i(loc, +value);
         return gl['uniform' + n + 'iv'](loc, toList(value, n));
      case 'u':
         if (n === 1 && typeof value === 'number') return gl.uniform1ui(loc, value);
         return gl['uniform' + n + 'uiv'](loc, toList(value, n));
      case 'm':
         return gl['uniformMatrix' + n + 'fv'](loc, !!transpose, value);
   }
}

/**
 * Apply a name -> entry map using the compiled program's uniform info.
 * Types are optional: when omitted they come from the shader itself.
 */
export function applyUniformMap(gl, info, map, { strict = false, warnMissing = false, label = '' } = {}) {
   if (!map) return;
   for (const name in map) {
      const raw = map[name];
      const spec = isUniformSpec(raw) ? raw : null;
      const value = spec ? spec.value : raw;
      if (value === undefined || value === null) continue;

      const inf = info[name];
      if (!inf || !inf.loc) {
         if (strict) throw new ShaderMateError('Unknown uniform: ' + name);
         if (warnMissing) warnOnce('missing-uniform:' + label + ':' + name,
            `Uniform "${name}" not found in ${label ? `pass "${label}"` : 'shader'} (misspelled, undeclared, or optimized out).`);
         continue;
      }

      let d;
      if (spec && spec.type != null) {
         d = resolveUniformType(spec.type);
         if (!d) {
            if (strict) throw new ShaderMateError('Unknown uniform type: ' + spec.type + ' for ' + name);
            warnOnce('bad-type:' + name, 'Unknown uniform type', spec.type, name);
            continue;
         }
      } else {
         d = describeGLType(inf.type);
         if (!d) continue; // sampler or unsupported type
      }
      uploadUniform(gl, inf.loc, d, value, spec && spec.transpose);
   }
}
