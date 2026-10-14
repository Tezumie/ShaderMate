import { BUILTIN_MACROS_GL1, BUILTIN_MACROS_GL2, MAIN_WRAP_GL1, MAIN_WRAP_GL2 } from './templates.js';
import { BUILTIN_DEFINES, declareBuiltins, declareFragColor } from './builtins.js';

const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

/**
 * Expand `#include "path"` / `#include <path>` recursively.
 * Each file is included once (acts like an include guard); real cycles are reported.
 * `loader(path)` returns (a promise of) the file text.
 */
export async function resolveIncludes(src, { loader, throwOnError = false, warn = console.warn } = {}) {
   const done = new Set();
   const stack = [];

   async function expand(code) {
      const re = /^[ \t]*#include\s+["<]([^">]+)[">]/gm;
      let out = '';
      let last = 0;
      let m;
      while ((m = re.exec(code))) {
         const path = m[1];
         out += code.slice(last, m.index);
         last = re.lastIndex;

         if (stack.includes(path)) {
            warn('[ShaderMate] Circular include:', path);
            out += `\n// skipped include "${path}" (circular)\n`;
         } else if (done.has(path)) {
            out += `\n// skipped include "${path}" (already included)\n`;
         } else {
            done.add(path);
            stack.push(path);
            try {
               const raw = await loader(path);
               const expanded = await expand(raw);
               out += `\n// begin include "${path}"\n${expanded}\n// end include "${path}"\n`;
            } catch (e) {
               warn(`[ShaderMate] Failed to load include "${path}"`, e);
               if (throwOnError) throw e;
               out += `\n// failed include "${path}"\n`;
            } finally {
               stack.pop();
            }
         }
      }
      return out + code.slice(last);
   }
   return expand(src);
}

/** Turn defines (strings / {KEY: value} objects) into `#define` lines. */
export function defineLines(defines) {
   let out = '';
   for (const d of defines) {
      if (typeof d === 'string') out += `#define ${d}\n`;
      else if (d && typeof d === 'object') {
         for (const k in d) {
            const v = d[k];
            out += (v === true || v === undefined) ? `#define ${k}\n` : `#define ${k} ${v}\n`;
         }
      }
   }
   return out;
}

export const DEFAULT_INJECT = { header: true, builtins: true, uniforms: true, defines: true, mainWrap: true };
export const NO_INJECT = { header: false, builtins: false, uniforms: false, defines: false, mainWrap: false };

/**
 * Wrap user GLSL into a complete fragment shader.
 *   inject.header    #version (GL2) + precision
 *   inject.builtins  texture compatibility macros, `out vec4 outColor` (GL2), iGlobalTime alias
 *   inject.uniforms  auto-declare built-in uniforms the shader uses (iTime, iResolution, iChannel0 …)
 *   inject.defines   user #defines
 *   inject.mainWrap  wrap `mainImage(out vec4, in vec2)` in a main()
 */
export function assembleFragment(src, { isGL2, defines = [], enableDerivatives = false, inject = DEFAULT_INJECT, channelTypes = [], builtinOpts = {} } = {}) {
   if (!inject || !Object.values(inject).some(Boolean)) return src;

   // A user-supplied #version must stay on line 1: hoist it.
   let versionLine = '';
   let body = src;
   const vm = /^[ \t]*#version[^\n]*/m.exec(body);
   if (vm) {
      versionLine = vm[0].trim() + '\n';
      body = body.slice(0, vm.index) + body.slice(vm.index + vm[0].length);
   }

   let head = '';
   if (versionLine) head += versionLine;
   else if (inject.header && isGL2) head += '#version 300 es\n';
   // #extension must precede any non-preprocessor token (incl. precision statements).
   if (inject.builtins && !isGL2 && enableDerivatives) head += '#extension GL_OES_standard_derivatives : enable\n';
   if (inject.header) head += 'precision highp float;\nprecision highp int;\n';
   if (inject.builtins) {
      head += isGL2 ? BUILTIN_MACROS_GL2 : BUILTIN_MACROS_GL1;
      head += BUILTIN_DEFINES;
      // Exactly one fragment output: the user's own `out vec4 …`, a `fragColor` they write to from
      // main() (FragCoord.xyz / GLSL 3 style), or our `outColor` for the mainImage wrapper.
      const fragDecl = declareFragColor(body, isGL2);
      const userOut = /\bout\s+(?:\w+\s+)*vec4\s+\w+\s*;/.test(stripComments(body));   // a declaration, not a `mainImage(out vec4 c, …)` parameter
      if (fragDecl) head += fragDecl;
      else if (isGL2 && !userOut) head += 'out vec4 outColor;\n';
   }
   if (inject.uniforms) head += declareBuiltins(body, channelTypes, builtinOpts);
   if (inject.defines) head += defineLines(defines);

   const clean = stripComments(body);
   const needWrap = inject.mainWrap && /\bmainImage\s*\(/.test(clean) && !/\bvoid\s+main\s*\(/.test(clean);

   let out = head + '#line 1\n' + body;
   if (needWrap) out += isGL2 ? MAIN_WRAP_GL2 : MAIN_WRAP_GL1;
   return out;
}
