// Copyright (C) 2025 Tezumie
// 
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

/*
 * ShaderMate version 1.0  — robust WebGL(2) multi‑pass playground
 * ---------------------------------------------------------
 */

// ========================= Utility & State =========================
const ShaderMate = (() => {
   'use strict';

   // ---- internal shared state (per page) ----
   let quadBuf = null;

   // ---------------- RefPool -----------------
   class RefPool {
      constructor(gl) {
         this.gl = gl;
         this._items = new Map(); // id -> { obj, count, type }
         this._nextId = 1;
      }
      add(obj, type) {
         const id = this._nextId++;
         this._items.set(id, { obj, count: 1, type });
         return id;
      }
      ref(id) { const it = this._items.get(id); if (it) it.count++; return id; }
      unref(id) {
         const it = this._items.get(id); if (!it) return;
         it.count--;
         if (it.count <= 0) {
            const { obj, type } = it;
            const gl = this.gl;
            switch (type) {
               case 'texture2D':
               case 'textureCube': gl.deleteTexture(obj); break;
               case 'fbo': gl.deleteFramebuffer(obj); break;
               case 'buffer': gl.deleteBuffer(obj); break;
               case 'program': gl.deleteProgram(obj); break;
            }
            this._items.delete(id);
         }
      }
   }

   // --------------- Helpers ------------------
   const isWebGL2 = gl => (typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext);

   function getExtensions(gl, isGL2) {
      const ext = {};
      if (!isGL2) {
         ext.OES_texture_float = gl.getExtension('OES_texture_float');
         ext.OES_texture_half_float = gl.getExtension('OES_texture_half_float');
         ext.OES_standard_derivatives = gl.getExtension('OES_standard_derivatives');
         ext.WEBGL_color_buffer_float = gl.getExtension('WEBGL_color_buffer_float');
         ext.EXT_color_buffer_half_float = gl.getExtension('EXT_color_buffer_half_float');
      } else {
         ext.EXT_color_buffer_float = gl.getExtension('EXT_color_buffer_float');
         ext.EXT_color_buffer_half_float = gl.getExtension('EXT_color_buffer_half_float');
      }
      return ext;
   }

   function bindQuad(gl, program) {
      if (!quadBuf) {
         quadBuf = gl.createBuffer();
         gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
         gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1, -1, 1, -1, -1, 1,
            -1, 1, 1, -1, 1, 1
         ]), gl.STATIC_DRAW);
      } else gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);

      const loc = gl.getAttribLocation(program, 'a_position');
      if (loc !== -1) {
         gl.enableVertexAttribArray(loc);
         gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      }
   }

   // ---------------- Compile & link ------------------
   function createShader(gl, type, src, opts = {}) {
      const { showExpandedOnError = true } = opts;
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);

      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
         const log = gl.getShaderInfoLog(sh) || '';

         // ---- 1. grab the line number WebGL gives us -----------------
         const m = log.match(/ERROR:\s*\d+:(\d+):/);
         const logicalErr = m ? parseInt(m[1], 10) : null;

         // ---- 2. find where user code starts (#line 1) ----------------
         const lines = src.split('\n');
         const userStartIdx = lines.findIndex(l => /^\s*#line\s+1\b/.test(l)) + 1; // +1 = line after directive

         // ---- 3. translate logical → physical ------------------------
         const physicalErr = (logicalErr != null && userStartIdx > 0)
            ? userStartIdx + logicalErr - 1
            : null;

         if (showExpandedOnError) {
            const numbered = lines.map((line, i) => {
               const mark = (i === physicalErr) ? '>>>' : '   ';
               return `${mark} ${String(i + 1).padStart(4, ' ')} | ${line}`;
            }).join('\n');
            const markedLineStr = (logicalErr != null && logicalErr <= lines.length)
               ? `>>> Line ${String(logicalErr).padStart(2, '0')} | ${lines[userStartIdx + logicalErr - 1]}`
               : '';
            console.error(log, {
               DETAILS: { LINE: '\n' + markedLineStr, COMPILED: '\n' + numbered }
            });
         } else {
            console.error(log);
         }

         gl.deleteShader(sh);
         return null;
      }
      return sh;
   }

   function createProgram(gl, vsrc, fsrc, shaderOpts) {
      const vs = createShader(gl, gl.VERTEX_SHADER, vsrc, shaderOpts);
      const fs = createShader(gl, gl.FRAGMENT_SHADER, fsrc, shaderOpts);

      if (!vs || !fs) {
         console.error('Program creation failed: shader compilation error');
         return null;
      }

      const p = gl.createProgram();
      gl.attachShader(p, vs);
      gl.attachShader(p, fs);
      gl.linkProgram(p);
      gl.deleteShader(vs);
      gl.deleteShader(fs);

      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
         const log = gl.getProgramInfoLog(p) || '';
         gl.deleteProgram(p);
         throw new Error('Program link error: ' + log);
      }
      return p;
   }

   function getUniformLocations(gl, program) {
      const n = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
      const out = {};
      for (let i = 0; i < n; i++) {
         const info = gl.getActiveUniform(program, i);
         if (!info) continue;
         out[info.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(program, info.name);
      }
      return out;
   }

   function getUniformBlocks(gl, program) {
      if (!isWebGL2(gl)) return null;
      const n = gl.getProgramParameter(program, gl.ACTIVE_UNIFORM_BLOCKS);
      const blocks = [];
      for (let i = 0; i < n; i++) {
         const name = gl.getActiveUniformBlockName(program, i);
         const size = gl.getActiveUniformBlockParameter(program, i, gl.UNIFORM_BLOCK_DATA_SIZE);
         blocks.push({ index: i, name, size });
      }
      return blocks;
   }

   // ---------------- Include / Preprocess ------------------
   async function preprocessFragment(gl, src, {
      isGL2,
      addDefines = [],
      includeLoader,
      enableDerivatives,
      throwOnIncludeError = false,
      inject // {header,defines,mainWrap,builtins}
   } = {}) {
      const seen = new Set();

      async function resolveIncludes(code) {
         const incRegex = /^[ \t]*#include\s+["<]([^">]+)[">]/gm;
         let result = '';
         let lastIndex = 0;
         let match;

         while ((match = incRegex.exec(code))) {
            const [line, path] = match;
            const start = match.index;
            const end = incRegex.lastIndex;
            result += code.slice(lastIndex, start);

            if (seen.has(path)) {
               console.warn('Circular include:', path);
               result += `\n// skipped include "${path}" (already included)\n`;
            } else {
               seen.add(path);
               try {
                  const raw = includeLoader
                     ? await includeLoader(path)
                     : await fetch(path).then(r => { if (!r.ok) throw new Error(`${r.status} ${r.statusText}`); return r.text(); });
                  const expanded = await resolveIncludes(raw);
                  result += `\n// begin include "${path}"\n${expanded}\n// end include "${path}"\n`;
               } catch (e) {
                  console.warn(`Failed to load include "${path}"`, e);
                  if (throwOnIncludeError) throw e;
                  result += `\n// failed include "${path}"\n`;
               }
            }
            lastIndex = end;
         }
         result += code.slice(lastIndex);
         return result;
      }

      const expandedSrc = await resolveIncludes(src);

      // If auto-setup disabled entirely, just return with a #line for error mapping
      if (!inject || (!inject.header && !inject.defines && !inject.mainWrap && !inject.builtins)) {
         return expandedSrc;
      }

      // DEFINES block
      let defineBlock = '';
      if (inject.defines) {
         addDefines.forEach(d => {
            if (typeof d === 'string') defineBlock += `#define ${d}\n`;
            else if (typeof d === 'object') {
               for (const k in d) {
                  const v = d[k];
                  defineBlock += (v === true || v === undefined)
                     ? `#define ${k}\n`
                     : `#define ${k} ${v}\n`;
               }
            }
         });
      }

      let header = '';
      if (inject.header) {
         header += isGL2 ? '#version 300 es\n' : '';
         header += 'precision highp float;\nprecision highp int;\n';
      }

      if (inject.builtins) {
         header += `\n#if __VERSION__ >= 300\n#define texture2D(s,u)   texture(s,u)\n#define textureCube(s,u) texture(s,u)\n#define TEX(s,u)         texture(s,u)\n#define TEX_LOD(s,u,l)   textureLod(s,u,l)\n#else\n#define TEX(s,u)         texture2D(s,u)\n#define TEX_LOD(s,u,l)   texture2D(s,u)\n#endif\n`;
         if (isGL2) header += 'out vec4 outColor;\n';
         if (enableDerivatives && !isGL2) header += '#extension GL_OES_standard_derivatives : enable\n';
      }

      const needWrap = inject.mainWrap && expandedSrc.includes('mainImage(') && !expandedSrc.includes('void main(');
      let body = '#line 1\n' + expandedSrc;

      if (needWrap) {
         body += isGL2
            ? `\n#line 100000\nvoid main(){\n  vec4 c;\n  mainImage(c, gl_FragCoord.xy);\n  outColor = c;\n}`
            : `\n#line 100000\nvoid main(){\n  vec4 c;\n  mainImage(c, gl_FragCoord.xy);\n  gl_FragColor = c;\n}`;
      }

      return header + defineBlock + body;
   }

   // ---------------- Texture / FBO creation ------------------
   function chooseFormat(gl, isGL2, ext, opts) {
      // default 8-bit
      let ifmt = isGL2 ? gl.RGBA8 : gl.RGBA;
      let fmt = gl.RGBA;
      let type = gl.UNSIGNED_BYTE;

      if (opts.float) {
         if (isGL2) {
            ifmt = gl.RGBA16F; fmt = gl.RGBA; type = gl.HALF_FLOAT;
         } else {
            if (ext.OES_texture_half_float) {
               ifmt = gl.RGBA; fmt = gl.RGBA; type = ext.OES_texture_half_float.HALF_FLOAT_OES;
            } else if (ext.OES_texture_float) {
               ifmt = gl.RGBA; fmt = gl.RGBA; type = gl.FLOAT;
            }
         }
      }
      return { ifmt, fmt, type };
   }

   function isRenderable(gl, ifmt, fmt, type) {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texImage2D(gl.TEXTURE_2D, 0, ifmt, 4, 4, 0, fmt, type, null);

      const fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);

      const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.deleteFramebuffer(fbo);
      gl.deleteTexture(tex);

      return status === gl.FRAMEBUFFER_COMPLETE;
   }

   function createTarget(gl, pool, w, h, opts, isGL2, ext) {
      const { ifmt, fmt, type } = chooseFormat(gl, isGL2, ext, opts);

      let chosen = { ifmt, fmt, type };
      if (!isRenderable(gl, ifmt, fmt, type)) {
         console.warn('Requested format not renderable, falling back to 8-bit.');
         chosen = { ifmt: isGL2 ? gl.RGBA8 : gl.RGBA, fmt: gl.RGBA, type: gl.UNSIGNED_BYTE };
      }

      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      const wrap = opts.wrap === 'repeat' ? gl.REPEAT : gl.CLAMP_TO_EDGE;
      const filter = opts.filter === 'nearest' ? gl.NEAREST : gl.LINEAR;
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
      gl.texImage2D(gl.TEXTURE_2D, 0, chosen.ifmt, w, h, 0, chosen.fmt, chosen.type, null);

      let depthTex = null;
      if (opts.depth) {
         depthTex = gl.createTexture();
         gl.bindTexture(gl.TEXTURE_2D, depthTex);
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
         gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT16, w, h, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT, null);
      }

      const fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      if (depthTex) gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTex, 0);

      const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
      if (status !== gl.FRAMEBUFFER_COMPLETE) {
         console.warn('Framebuffer incomplete:', status);
      }

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.bindTexture(gl.TEXTURE_2D, null);

      return {
         texId: pool.add(tex, 'texture2D'),
         depthId: depthTex ? pool.add(depthTex, 'texture2D') : null,
         fboId: pool.add(fbo, 'fbo'),
         width: w,
         height: h,
         fmt: chosen
      };
   }

   // -------------- Loaders -------------------
   function loadTexture2D(gl, pool, url, params = {}) {
      return new Promise(res => {
         const img = new Image();
         img.crossOrigin = 'anonymous';
         img.onload = () => {
            const tex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tex);
            const wrap = params.wrap === 'repeat' ? gl.REPEAT : gl.CLAMP_TO_EDGE;
            const filter = params.filter === 'nearest' ? gl.NEAREST : gl.LINEAR;
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, !!params.flipY);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
            gl.bindTexture(gl.TEXTURE_2D, null);
            res({ texId: pool.add(tex, 'texture2D'), width: img.width, height: img.height, update() { } });
         };
         img.onerror = () => res(null);
         img.src = url;
      });
   }

   function loadCubeMap(gl, pool, urls, params = {}) {
      return new Promise(res => {
         const tex = gl.createTexture();
         gl.bindTexture(gl.TEXTURE_CUBE_MAP, tex);
         const wrap = params.wrap === 'repeat' ? gl.REPEAT : gl.CLAMP_TO_EDGE;
         const filter = params.filter === 'nearest' ? gl.NEAREST : gl.LINEAR;
         gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, filter);
         gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, filter);
         gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, wrap);
         gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, wrap);

         const faces = [
            gl.TEXTURE_CUBE_MAP_POSITIVE_X, gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
            gl.TEXTURE_CUBE_MAP_POSITIVE_Y, gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
            gl.TEXTURE_CUBE_MAP_POSITIVE_Z, gl.TEXTURE_CUBE_MAP_NEGATIVE_Z
         ];
         let loaded = 0, w = 0, h = 0;

         urls.forEach((u, i) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
               if (!w) { w = img.width; h = img.height; }
               gl.bindTexture(gl.TEXTURE_CUBE_MAP, tex);
               gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
               gl.texImage2D(faces[i], 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
               loaded++;
               if (loaded === 6) {
                  gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
                  res({ texId: pool.add(tex, 'textureCube'), width: w, height: h, cubemap: true, update() { } });
               }
            };
            img.onerror = () => res(null);
            img.src = u;
         });
      });
   }

   function loadVideoTexture(gl, pool, url, params = {}) {
      return new Promise(res => {
         const video = document.createElement('video');
         Object.assign(video, { src: url, crossOrigin: 'anonymous', loop: true, muted: true, playsInline: true, autoplay: true });
         video.addEventListener('canplay', () => {
            const tex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tex);
            const wrap = params.wrap === 'repeat' ? gl.REPEAT : gl.CLAMP_TO_EDGE;
            const filter = params.filter === 'nearest' ? gl.NEAREST : gl.LINEAR;
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
            gl.bindTexture(gl.TEXTURE_2D, null);
            res({
               texId: pool.add(tex, 'texture2D'), width: video.videoWidth, height: video.videoHeight,
               start: performance.now(),
               update() {
                  gl.bindTexture(gl.TEXTURE_2D, tex);
                  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
                  gl.bindTexture(gl.TEXTURE_2D, null);
               }
            });
         }, { once: true });
         video.load();
      });
   }

   function loadAudioFFT(gl, pool, url, fftSize = 512) {
      return new Promise(res => {
         const audio = new Audio();
         Object.assign(audio, { src: url, crossOrigin: 'anonymous', loop: true, autoplay: true });
         audio.addEventListener('canplay', () => {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const src = ctx.createMediaElementSource(audio);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = fftSize;
            src.connect(analyser); analyser.connect(ctx.destination);
            const bins = analyser.frequencyBinCount;
            const data = new Uint8Array(bins);

            const tex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, bins, 1, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, data);
            gl.bindTexture(gl.TEXTURE_2D, null);

            res({
               texId: pool.add(tex, 'texture2D'), width: bins, height: 1,
               start: performance.now(),
               update() {
                  analyser.getByteFrequencyData(data);
                  gl.bindTexture(gl.TEXTURE_2D, tex);
                  gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, bins, 1, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, data);
                  gl.bindTexture(gl.TEXTURE_2D, null);
               }
            });
         }, { once: true });
         audio.load();
      });
   }

   // ---------------- User uniforms ------------------
   function applyUserUniforms(gl, po, strictUniforms) {
      const uu = po.cfg.uniforms;
      if (!uu) return;
      for (const name in uu) {
         const spec = uu[name];
         const loc = po.uniforms[name];
         if (!loc) { if (strictUniforms) throw new Error('Unknown uniform: ' + name); else continue; }
         const { type, value, transpose } = spec;
         switch (type) {
            case '1f': gl.uniform1f(loc, value); break;
            case '2f': gl.uniform2f(loc, value[0], value[1]); break;
            case '3f': gl.uniform3f(loc, value[0], value[1], value[2]); break;
            case '4f': gl.uniform4f(loc, value[0], value[1], value[2], value[3]); break;
            case '1i': gl.uniform1i(loc, value); break;
            case '2i': gl.uniform2i(loc, value[0], value[1]); break;
            case '3i': gl.uniform3i(loc, value[0], value[1], value[2]); break;
            case '4i': gl.uniform4i(loc, value[0], value[1], value[2], value[3]); break;
            case '1fv': gl.uniform1fv(loc, value); break;
            case '2fv': gl.uniform2fv(loc, value); break;
            case '3fv': gl.uniform3fv(loc, value); break;
            case '4fv': gl.uniform4fv(loc, value); break;
            case 'Matrix3fv': gl.uniformMatrix3fv(loc, !!transpose, value); break;
            case 'Matrix4fv': gl.uniformMatrix4fv(loc, !!transpose, value); break;
            default:
               if (strictUniforms) throw new Error('Unknown uniform type: ' + type + ' for ' + name);
               console.warn('Unknown uniform type', type, name);
         }
      }
   }

   // ---------------- Mouse ------------------
   const mouseState = { x: 0, y: 0, clickX: 0, clickY: 0, down: false };
   function installMouseListeners(canvas) {
      const rect = () => canvas.getBoundingClientRect();
      function toLocal(e) {
         const r = rect();
         return [(e.clientX - r.left) * (canvas.width / r.width), (r.bottom - e.clientY) * (canvas.height / r.height)];
      }
      const move = e => { const [mx, my] = toLocal(e); mouseState.x = mx; mouseState.y = my; };
      const down = e => { mouseState.down = true; const [mx, my] = toLocal(e); mouseState.clickX = mx; mouseState.clickY = my; };
      const up = () => { mouseState.down = false; };
      canvas.addEventListener('mousemove', move);
      canvas.addEventListener('mousedown', down);
      window.addEventListener('mouseup', up);
      return () => {
         canvas.removeEventListener('mousemove', move);
         canvas.removeEventListener('mousedown', down);
         window.removeEventListener('mouseup', up);
      };
   }

   // ---------------- Resize debouncer ------------------
   function createResizeHandler(fn) {
      let pending = false;
      function onResize() {
         if (pending) return;
         pending = true;
         requestAnimationFrame(() => { pending = false; fn(); });
      }
      return onResize;
   }

   // ---------------- Public API ------------------
   async function startShaderMate(passesOrPath, options = {}) {
      // options defaults
      const defaultInject = { header: true, defines: true, mainWrap: true, builtins: true };
      const autoSetup = options.autoSetup === undefined ? true : !!options.autoSetup;
      const inject = autoSetup ? Object.assign({}, defaultInject, options.inject) : { header: false, defines: false, mainWrap: false, builtins: false };

      const canvas = options.canvas || document.getElementById('glcanvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) throw new Error('WebGL not supported');
      const isGL2Ctx = isWebGL2(gl);
      const ext = getExtensions(gl, isGL2Ctx);
      const pool = new RefPool(gl);

      const enableDerivatives = !!(isGL2Ctx || ext.OES_standard_derivatives);

      // Resize canvas helper
      function resizeCanvas() {
         const w = window.innerWidth, h = window.innerHeight;
         if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w; canvas.height = h;
            gl.viewport(0, 0, w, h);
         }
      }
      const onResize = createResizeHandler(() => { resizeCanvas(); resizeTargets(); });
      window.addEventListener('resize', onResize);
      resizeCanvas();

      // Normalize passes
      let PASSES;
      if (typeof passesOrPath === 'string') {
         PASSES = [{ name: 'A', src: passesOrPath, size: 'screen', screen: true, channels: [null, null, null, null] }];
      } else if (Array.isArray(passesOrPath)) {
         PASSES = passesOrPath;
      } else throw new Error('startShaderMate: expected string or array');

      if (!PASSES.some(p => p.screen)) {
         const last = PASSES[PASSES.length - 1];
         last.screen = true;
         if (!last.size) last.size = 'screen';
      }
      if (PASSES.filter(p => p.screen).length > 1) console.warn('Multiple screen:true passes; last drawn wins.');

      const VERT_GL2 = `#version 300 es\nlayout(location=0) in vec2 a_position;\nvoid main(){ gl_Position = vec4(a_position,0.0,1.0); }`;
      const VERT_GL1 = `attribute vec2 a_position;\nvoid main(){ gl_Position = vec4(a_position,0.0,1.0); }`;
      const vertSrc = isGL2Ctx ? VERT_GL2 : VERT_GL1;

      const globalDefines = options.defines ? (Array.isArray(options.defines) ? options.defines : [options.defines]) : [];
      const includeStore = options.includes || {};
      const includeLoader = async path => {
         if (includeStore[path] != null) return includeStore[path];
         const r = await fetch(path);
         if (!r.ok) throw new Error(`Failed to fetch ${path}: ${r.status} ${r.statusText}`);
         return r.text();
      };

      // Build passes --------------------------------------------------
      const passObjs = [];
      for (const pass of PASSES) {
         let srcText;
         try {
            if (typeof pass.src === 'string' && pass.src.trim().startsWith('void')) {
               srcText = pass.src;
            } else {
               const r = await fetch(pass.src);
               if (!r.ok) throw new Error(`Failed to fetch ${pass.src}: ${r.status} ${r.statusText}`);
               srcText = await r.text();
            }
         } catch (e) { throw e; }

         const localDefines = pass.defines ? (Array.isArray(pass.defines) ? pass.defines : [pass.defines]) : [];
         const frag = await preprocessFragment(gl, srcText, {
            isGL2: isGL2Ctx,
            addDefines: [...globalDefines, ...localDefines],
            includeLoader,
            enableDerivatives,
            throwOnIncludeError: false,
            inject
         });

         const program = createProgram(gl, vertSrc, frag, { showExpandedOnError: options.showExpandedOnError !== false });
         if (!program) {
            console.error('Failed to compile/link shader program. Aborting this pass.');
            return;
         }
         gl.useProgram(program);
         bindQuad(gl, program);
         const uniforms = getUniformLocations(gl, program);
         const uniformBlocks = getUniformBlocks(gl, program);

         passObjs.push({
            cfg: pass,
            programId: pool.add(program, 'program'),
            uniforms,
            uniformBlocks,
            target: null,
            targetPrev: null,
            texChannels: [null, null, null, null],
            timeStarted: performance.now()
         });
      }

      // Load external channels ---------------------------------------
      for (const po of passObjs) {
         const chans = po.cfg.channels || [];
         for (let i = 0; i < 4; i++) {
            const ch = chans[i];
            if (!ch) continue;
            if (ch.url) po.texChannels[i] = await loadTexture2D(gl, pool, ch.url, ch);
            else if (ch.video) po.texChannels[i] = await loadVideoTexture(gl, pool, ch.video, ch);
            else if (ch.audio || ch.audioFFT) po.texChannels[i] = await loadAudioFFT(gl, pool, ch.audio || ch.audioFFT, ch.fftSize || 512);
            else if (ch.cubemap) po.texChannels[i] = await loadCubeMap(gl, pool, ch.cubemap, ch);
         }
      }

      // Create FBO targets -------------------------------------------
      function resizeTargets() {
         for (const po of passObjs) {
            const cfg = po.cfg;
            const size = cfg.size || 'screen';
            let w, h;
            if (size === 'screen') { w = canvas.width; h = canvas.height; }
            else if (size === 'half') { w = canvas.width >> 1; h = canvas.height >> 1; }
            else if (Array.isArray(size)) { w = size[0]; h = size[1]; }
            else { w = canvas.width; h = canvas.height; }

            const needTarget = !cfg.screen;
            if (needTarget) {
               if (cfg.pingpong) {
                  if (!po.target || po.target.width !== w || po.target.height !== h) {
                     if (po.target) deleteTarget(po.target);
                     if (po.targetPrev) deleteTarget(po.targetPrev);
                     po.target = createTarget(gl, pool, w, h, cfg, isGL2Ctx, ext);
                     po.targetPrev = createTarget(gl, pool, w, h, cfg, isGL2Ctx, ext);
                  }
               } else {
                  if (!po.target || po.target.width !== w || po.target.height !== h) {
                     if (po.target) deleteTarget(po.target);
                     po.target = createTarget(gl, pool, w, h, cfg, isGL2Ctx, ext);
                  }
               }
            } else {
               if (po.target) { deleteTarget(po.target); po.target = null; }
               if (po.targetPrev) { deleteTarget(po.targetPrev); po.targetPrev = null; }
            }
         }
      }
      resizeTargets();

      // Delete helpers (respect refcount) -----------------------------
      function deleteTarget(t) {
         if (!t) return;
         pool.unref(t.texId);
         if (t.depthId) pool.unref(t.depthId);
         pool.unref(t.fboId);
      }
      function deleteProgramId(id) { pool.unref(id); }

      // Timing --------------------------------------------------------
      let last = performance.now();
      let frame = 0;
      let time = 0; // seconds
      let running = !options.startPaused;
      let fixedDelta = options.fixedDelta || 0;
      let timeScale = options.timeScale || 1.0;
      let rafId = null;

      // Events
      const events = new Map(); // name -> Set
      function emit(ev, data) { const s = events.get(ev); if (s) s.forEach(fn => fn(data)); }
      function on(ev, fn) { if (!events.has(ev)) events.set(ev, new Set()); events.get(ev).add(fn); }
      function off(ev, fn) { const s = events.get(ev); if (s) s.delete(fn); }

      const removeMouse = installMouseListeners(canvas);

      function render(now) {
         rafId = requestAnimationFrame(render);
         const rawDt = (now - last) * 0.001;
         last = now;
         const dt = fixedDelta > 0 ? fixedDelta : rawDt;
         if (running) time += dt * timeScale;
         frame++;
         const fps = dt > 0 ? 1 / dt : 0;

         emit('beforeFrame', { time, frame, dt, fps });

         const date = new Date();
         const seconds = date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
         const iRes2 = [canvas.width, canvas.height];
         const iRes3 = [canvas.width, canvas.height, 0];
         const iDate = [date.getFullYear(), date.getMonth() + 1, date.getDate(), seconds];

         // update dynamic tex
         for (const po of passObjs) {
            for (let i = 0; i < 4; i++) {
               const wrap = po.texChannels[i];
               if (wrap && wrap.update) wrap.update();
            }
         }

         for (const po of passObjs) {
            const cfg = po.cfg;
            const program = pool._items.get(po.programId).obj;
            const uniforms = po.uniforms;

            if (cfg.pingpong && po.target && po.targetPrev) {
               const tmp = po.targetPrev; po.targetPrev = po.target; po.target = tmp;
            }

            if (cfg.screen) {
               gl.bindFramebuffer(gl.FRAMEBUFFER, null);
               gl.viewport(0, 0, canvas.width, canvas.height);
            } else {
               gl.bindFramebuffer(gl.FRAMEBUFFER, pool._items.get(po.target.fboId).obj);
               gl.viewport(0, 0, po.target.width, po.target.height);
            }

            gl.useProgram(program);
            gl.clear(gl.COLOR_BUFFER_BIT);

            // Built-ins (only if user declared them — harmless if not)
            if (uniforms.iTime) gl.uniform1f(uniforms.iTime, time);
            if (uniforms.u_time) gl.uniform1f(uniforms.u_time, time);
            if (uniforms.iTimeDelta) gl.uniform1f(uniforms.iTimeDelta, dt);
            if (uniforms.u_delta) gl.uniform1f(uniforms.u_delta, dt);
            if (uniforms.iFrame) gl.uniform1i(uniforms.iFrame, frame);
            if (uniforms.u_frame) gl.uniform1i(uniforms.u_frame, frame);
            if (uniforms.iFrameRate) gl.uniform1f(uniforms.iFrameRate, fps);

            if (uniforms.iResolution) {
               const size = cfg.screen ? iRes3 : [po.target.width, po.target.height, 0];
               gl.uniform3f(uniforms.iResolution, size[0], size[1], size[2]);
            }
            if (uniforms.u_resolution) {
               const size = cfg.screen ? iRes2 : [po.target.width, po.target.height];
               gl.uniform2f(uniforms.u_resolution, size[0], size[1]);
            }
            if (uniforms.iDate) gl.uniform4f(uniforms.iDate, iDate[0], iDate[1], iDate[2], iDate[3]);
            if (uniforms.u_date) gl.uniform4f(uniforms.u_date, iDate[0], iDate[1], iDate[2], iDate[3]);

            // Mouse
            if (uniforms.iMouse) {
               gl.uniform4f(uniforms.iMouse, mouseState.x, mouseState.y, mouseState.clickX * (mouseState.down ? 1 : 0), mouseState.clickY * (mouseState.down ? 1 : 0));
            }
            if (uniforms.u_mouse) gl.uniform2f(uniforms.u_mouse, mouseState.x, mouseState.y);

            // Channels
            const chTimes = [0, 0, 0, 0];
            const chRes = new Float32Array(12);
            const chans = cfg.channels || [];

            for (let i = 0; i < 4; i++) {
               const ch = chans[i]; if (!ch) continue;
               let texObj = null, w = 0, h = 0, startT = po.timeStarted, isCube = false;

               if (ch.pass) {
                  const srcPass = passObjs.find(p => p.cfg.name === ch.pass);
                  if (srcPass) {
                     if (ch.buffer === 'prev' && srcPass.cfg.pingpong) {
                        texObj = srcPass.targetPrev ? pool._items.get(srcPass.targetPrev.texId).obj : null;
                        w = srcPass.targetPrev?.width || 0; h = srcPass.targetPrev?.height || 0;
                     } else {
                        texObj = srcPass.target ? pool._items.get(srcPass.target.texId).obj : null;
                        w = srcPass.target?.width || 0; h = srcPass.target?.height || 0;
                     }
                     startT = srcPass.timeStarted;
                  }
               } else {
                  const wrap = po.texChannels[i];
                  if (wrap) {
                     texObj = pool._items.get(wrap.texId).obj; w = wrap.width; h = wrap.height;
                     startT = wrap.start || po.timeStarted; isCube = wrap.cubemap;
                  }
               }

               if (texObj) {
                  const unit = gl.TEXTURE0 + i;
                  gl.activeTexture(unit);
                  if (isCube) gl.bindTexture(gl.TEXTURE_CUBE_MAP, texObj);
                  else gl.bindTexture(gl.TEXTURE_2D, texObj);
                  const uni = uniforms['iChannel' + i];
                  if (uni) gl.uniform1i(uni, i);

                  chTimes[i] = time - (startT * 0.001);
                  chRes[i * 3 + 0] = w; chRes[i * 3 + 1] = h; chRes[i * 3 + 2] = 0.0;
               }
            }

            if (uniforms.iChannelTime) gl.uniform4fv(uniforms.iChannelTime, chTimes);
            if (uniforms.iChannelResolution) gl.uniform3fv(uniforms.iChannelResolution, chRes);

            applyUserUniforms(gl, po, options.strictUniforms);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
         }

         emit('afterFrame', { time, frame, dt, fps });
      }

      rafId = requestAnimationFrame(render);

      function dispose() {
         cancelAnimationFrame(rafId);
         window.removeEventListener('resize', onResize);
         removeMouse();

         passObjs.forEach(po => {
            deleteProgramId(po.programId);
            deleteTarget(po.target);
            deleteTarget(po.targetPrev);
            po.texChannels.forEach(w => { if (!w) return; pool.unref(w.texId); });
         });
         if (quadBuf) { gl.deleteBuffer(quadBuf); quadBuf = null; }
      }

      function pause() { running = false; emit('pause'); }
      function resume() { running = true; emit('resume'); }
      function stop() { cancelAnimationFrame(rafId); emit('stop'); }
      function step(frames = 1) { for (let i = 0; i < frames; i++) render(performance.now()); }
      function setTime(t) { time = t; }
      function setTimeScale(s) { timeScale = s; }
      function setFixedDelta(dt) { fixedDelta = dt; }

      return { pause, resume, stop, dispose, step, setTime, setTimeScale, setFixedDelta, on, off, gl, passes: passObjs };
   }

   return { startShaderMate };
})();

// expose globally
const startShaderMate = ShaderMate.startShaderMate;
