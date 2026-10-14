import { ShaderMateError } from '../utils/util.js';

/**
 * Parse a driver info log into [{ line, message }], with `line` relative to the user's
 * source (the injected `#line 1`), so errors point at the file the author wrote.
 */
export function parseShaderLog(log, src) {
   const lines = src.split('\n');
   const userStart = lines.findIndex(l => /^\s*#line\s+1\b/.test(l)) + 1;
   const errors = [];
   for (const row of log.split('\n')) {
      const m = /ERROR:\s*\d+:(\d+):\s*(.*)/.exec(row);
      if (!m) continue;
      const logical = parseInt(m[1], 10);
      const physical = userStart > 0 ? userStart + logical - 1 : logical - 1; // 0-based index into `lines`
      errors.push({ line: logical, message: m[2].trim(), source: lines[physical] ?? '', physical });
   }
   return errors;
}

/**
 * Compile one shader. Returns { shader } or { error: ShaderMateError }.
 */
export function compileShader(gl, type, src, { label = '', showExpandedOnError = true } = {}) {
   const sh = gl.createShader(type);
   gl.shaderSource(sh, src);
   gl.compileShader(sh);
   if (gl.getShaderParameter(sh, gl.COMPILE_STATUS)) return { shader: sh };

   const log = gl.getShaderInfoLog(sh) || '';
   gl.deleteShader(sh);
   const errors = parseShaderLog(log, src);
   const stage = type === gl.VERTEX_SHADER ? 'Vertex' : 'Fragment';
   const summary = errors.length
      ? errors.map(e => `line ${e.line}: ${e.message}`).join('\n')
      : log.trim();
   const err = new ShaderMateError(`${stage} shader compile error${label ? ` in pass "${label}"` : ''}:\n${summary}`,
      { pass: label, stage, log, errors, source: src });

   if (showExpandedOnError) {
      const marks = new Set(errors.map(e => e.physical));
      const numbered = src.split('\n').map((line, i) =>
         `${marks.has(i) ? '>>>' : '   '} ${String(i + 1).padStart(4, ' ')} | ${line}`).join('\n');
      console.error('[ShaderMate] ' + err.message, { COMPILED: '\n' + numbered });
   } else {
      console.error('[ShaderMate] ' + err.message);
   }
   return { error: err };
}

/** Link a program. Returns { program } or { error }. */
export function createProgram(gl, vsrc, fsrc, opts) {
   const v = compileShader(gl, gl.VERTEX_SHADER, vsrc, opts);
   if (v.error) return v;
   const f = compileShader(gl, gl.FRAGMENT_SHADER, fsrc, opts);
   if (f.error) { gl.deleteShader(v.shader); return f; }

   const p = gl.createProgram();
   gl.attachShader(p, v.shader);
   gl.attachShader(p, f.shader);
   gl.linkProgram(p);
   gl.deleteShader(v.shader);
   gl.deleteShader(f.shader);

   if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(p) || '';
      gl.deleteProgram(p);
      const err = new ShaderMateError(`Program link error${opts && opts.label ? ` in pass "${opts.label}"` : ''}: ${log}`, { pass: opts && opts.label, log });
      console.error('[ShaderMate] ' + err.message);
      return { error: err };
   }
   return { program: p };
}

/** name -> { loc, type, size } for every active uniform (array names have `[0]` stripped). */
export function getUniformInfo(gl, program) {
   const n = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
   const out = {};
   for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(program, i);
      if (!info) continue;
      out[info.name.replace(/\[0\]$/, '')] = {
         loc: gl.getUniformLocation(program, info.name),
         type: info.type,
         size: info.size
      };
   }
   return out;
}
