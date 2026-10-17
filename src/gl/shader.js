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

/** Build the ShaderMateError (and console report) for a shader whose compile failed. */
function shaderError(gl, sh, type, src, { label = '', showExpandedOnError = true } = {}) {
   const log = gl.getShaderInfoLog(sh) || '';
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
   return err;
}

function linkError(gl, p, opts) {
   const log = gl.getProgramInfoLog(p) || '';
   const err = new ShaderMateError(`Program link error${opts && opts.label ? ` in pass "${opts.label}"` : ''}: ${log}`, { pass: opts && opts.label, log });
   console.error('[ShaderMate] ' + err.message);
   return err;
}

/**
 * Compile one shader. Returns { shader } or { error: ShaderMateError }.
 */
export function compileShader(gl, type, src, opts = {}) {
   const sh = gl.createShader(type);
   gl.shaderSource(sh, src);
   gl.compileShader(sh);
   if (gl.getShaderParameter(sh, gl.COMPILE_STATUS)) return { shader: sh };
   const error = shaderError(gl, sh, type, src, opts);
   gl.deleteShader(sh);
   return { error };
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
      const error = linkError(gl, p, opts);
      gl.deleteProgram(p);
      return { error };
   }
   return { program: p };
}

const wait = () => new Promise(r => {
   if (typeof requestAnimationFrame === 'function' && !(typeof document !== 'undefined' && document.hidden)) requestAnimationFrame(() => r());
   else setTimeout(r, 16);
});

/**
 * Link a program without blocking the page. Resolves to { program } or { error }.
 *
 * Asking the driver for COMPILE_STATUS / LINK_STATUS right after compiling makes the browser wait for the
 * compile to finish, which can freeze the page for hundreds of milliseconds per shader (Windows translates every
 * shader for Direct3D). With KHR_parallel_shader_compile the driver compiles in the background and we poll
 * COMPLETION_STATUS_KHR once per frame. Without the extension we still yield a frame first, so several
 * programs compile across frames instead of all in one long task.
 */
export async function createProgramAsync(gl, vsrc, fsrc, opts = {}) {
   const ext = gl.getExtension('KHR_parallel_shader_compile');
   const v = gl.createShader(gl.VERTEX_SHADER), f = gl.createShader(gl.FRAGMENT_SHADER);
   gl.shaderSource(v, vsrc); gl.compileShader(v);
   gl.shaderSource(f, fsrc); gl.compileShader(f);
   const p = gl.createProgram();
   gl.attachShader(p, v);
   gl.attachShader(p, f);
   gl.linkProgram(p);

   if (ext) { while (!gl.isContextLost() && !gl.getProgramParameter(p, ext.COMPLETION_STATUS_KHR)) await wait(); }
   else await wait();

   let error = null;
   if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      if (!gl.getShaderParameter(v, gl.COMPILE_STATUS)) error = shaderError(gl, v, gl.VERTEX_SHADER, vsrc, opts);
      else if (!gl.getShaderParameter(f, gl.COMPILE_STATUS)) error = shaderError(gl, f, gl.FRAGMENT_SHADER, fsrc, opts);
      else error = linkError(gl, p, opts);
   }
   gl.deleteShader(v);
   gl.deleteShader(f);
   if (error) { gl.deleteProgram(p); return { error }; }
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
