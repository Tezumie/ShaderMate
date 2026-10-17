import { MAX_CHANNELS, DEFAULT_CANVAS_ID, VERSION } from '../constants.js';
import { ShaderMateError, toArray, warnOnce, isBrowser, parseColor, isDevHost } from '../utils/util.js';
import { RefPool } from './RefPool.js';
import { createEmitter } from './events.js';
import { createTweens } from './tween.js';
import { normalizePasses, normalizeChannel, isInlineSource } from './passes.js';
import { createContext, getExtensions, isWebGL2 } from '../gl/context.js';
import { createQuad } from '../gl/quad.js';
import { createBlit } from '../gl/blit.js';
import { createProgramAsync, getUniformInfo } from '../gl/shader.js';
import { createTarget, deleteTarget, resolvePassSize } from '../gl/targets.js';
import { VERT_GL1, VERT_GL2 } from '../glsl/templates.js';
import { resolveIncludes, assembleFragment, DEFAULT_INJECT, NO_INJECT } from '../glsl/preprocess.js';
import { loadChannel, channelSamplerType } from '../loaders/index.js';
import { splitPassBlob, parseUniformComments, usesMouseVec4 } from '../glsl/fragcoord.js';
import { looksLikeFragCoord } from '../glsl/builtins.js';
import { resolveSamplerSpecs, needsMainBackbuffer, auxPasses } from './samplers.js';
import { createCamera } from '../input/camera.js';
import { applyUniformMap, isUniformSpec } from '../uniforms/apply.js';
import { GL_FLOAT, GL_FLOAT_VEC4, GL_FLOAT_VEC2 } from '../uniforms/types.js';
import { createPointer } from '../input/pointer.js';
import { createSizer } from '../view/sizing.js';
import { createVisibility } from '../view/visibility.js';
import { createStats } from '../ui/stats.js';
import { createErrorOverlay } from '../ui/errorOverlay.js';
import { createCapture } from '../capture/capture.js';

/**
 * Several instances may share one canvas (scene switching: pause one, play another). Remember which instance
 * drew the canvas's current frame, so a paused instance only redraws (on resize, set(), seek()) a canvas it owns
 * instead of painting over whichever instance is playing there.
 */
const lastDrawer = new WeakMap();   // canvas -> api

/** Accepts create(options) or create(shaderOrPasses, options). */
function normalizeArgs(a, b) {
   if (typeof a === 'string' || Array.isArray(a)) return { ...(b || {}), passes: a };
   if (a && typeof a === 'object' && (a.shader != null || a.passes != null || a.src != null)) {
      const o = { ...a };
      // Single-shader form: per-pass fields written at the top level belong to that one pass.
      if (o.passes == null) o.passes = { src: o.shader ?? o.src, uniforms: o.passUniforms, channels: o.channels, pingpong: o.pingpong, float: o.float };
      else if (o.channels != null) console.warn('[ShaderMate] `channels` only applies to the single-shader form; put channels on each pass instead.');
      return o;
   }
   throw new ShaderMateError('createShader: pass a shader string, an array of passes, or { shader | passes, ...options }');
}

function resolveCanvas(c) {
   if (c && typeof c === 'object' && typeof c.getContext === 'function') return { canvas: c, given: true };
   if (typeof c === 'string') {
      let el = document.getElementById(c);
      if (!el) { try { el = document.querySelector(c); } catch { /* invalid selector */ } }
      if (!el) throw new ShaderMateError(`Canvas not found: "${c}"`);
      return { canvas: el, given: true };
   }
   let el = document.getElementById(DEFAULT_CANVAS_ID);
   if (el) return { canvas: el, given: true };
   el = document.createElement('canvas');
   el.id = DEFAULT_CANVAS_ID;
   (document.body || document.documentElement).appendChild(el);
   return { canvas: el, given: false };
}

function setUniformIn(map, name, value) {
   const cur = map[name];
   if (isUniformSpec(cur)) cur.value = value;
   else map[name] = value;
}
const readUniform = (map, name) => (isUniformSpec(map[name]) ? map[name].value : map[name]);

/**
 * Create a ShaderMate instance. Returns synchronously; shaders and textures load in the
 * background. `await sm.ready` to know when the first frame can render.
 */
export function createShader(a, b) {
   if (!isBrowser) throw new ShaderMateError('ShaderMate needs a browser environment (window/document).');
   const options = normalizeArgs(a, b);

   // ---- options ---------------------------------------------------------
   const autoSetup = options.autoSetup !== false;
   const inject = Object.assign({}, autoSetup ? DEFAULT_INJECT : NO_INJECT, options.inject);
   const globalDefines = toArray(options.defines);
   let commonSrc = typeof options.common === 'string' ? options.common : '';
   const dialect = options.dialect || 'auto';            // 'auto' | 'fragcoord' | 'shadertoy' | 'shadermate'
   const instanceSamplers = options.samplers || {};
   const uniforms = options.uniforms || {};          // instance-wide, live
   const includeStore = options.includes || {};
   const strictUniforms = !!options.strictUniforms;
   const warnUniforms = options.warnMissingUniforms !== false;
   const showExpanded = options.showExpandedOnError !== false;
   const useOverlay = options.errorOverlay === undefined || options.errorOverlay === 'auto' ? isDevHost() : !!options.errorOverlay;

   // ---- context ---------------------------------------------------------
   let canvas, givenCanvas, gl;
   if (options.gl) {
      gl = options.gl; canvas = gl.canvas; givenCanvas = true;
   } else {
      ({ canvas, given: givenCanvas } = resolveCanvas(options.canvas));
      gl = createContext(canvas, options);
   }
   const isGL2 = isWebGL2(gl);
   const ext = getExtensions(gl, isGL2);
   const env = { isGL2, ext };
   const pool = new RefPool(gl);
   const enableDerivatives = !!(isGL2 || ext.OES_standard_derivatives);
   const bg = parseColor(options.background ?? options.clearColor) || [0, 0, 0, 0];
   gl.clearColor(bg[0], bg[1], bg[2], bg[3]);

   const emitter = createEmitter();
   const { emit, on, off, once } = emitter;
   const quad = createQuad(gl);
   const sizer = createSizer(canvas, options, givenCanvas);
   const pointer = createPointer(canvas, sizer.fit, options.pointer === false ? { target: 'canvas', smooth: 0 } : (typeof options.pointer === 'object' ? options.pointer : {}));
   const tweens = createTweens();
   const overlay = useOverlay ? createErrorOverlay(canvas, options.theme) : null;
   let stats = null;
   if (options.stats) {
      stats = createStats({
         visible: options.stats === true || options.stats === 'visible',
         key: options.statsKey === undefined ? 'F1' : options.statsKey,
         position: options.statsPosition,
         theme: options.theme,
      });
   }

   // ---- state -----------------------------------------------------------
   const passObjs = [];
   const byName = new Map();
   let PASSES = [];
   let disposed = false;
   let loaded = false;
   let rafId = null;
   let removeResize = () => { };
   let last = performance.now();
   let lastRender = 0;
   let frame = 0;
   let time = options.time || 0;
   let playing = options.autoplay !== false && !options.startPaused && !options.paused;
   let timeScale = options.timeScale ?? 1;
   let fixedDelta = options.fixedDelta || 0;
   let maxFps = options.maxFps || options.fps || 0;
   let loopLen = options.loop || 0;
   const maxDelta = options.maxDelta ?? 0.1;
   let visible = true;
   let lastError = null;
   let refreshRate = 60;                 // estimated display refresh rate (median of recent rAF intervals)
   const rafDts = [];
   let camera = null;                    // fly camera, created when a pass uses u_camera_*
   let blit = null;                      // copies the screen pass' buffer to the canvas when u_main is sampled
   let mainBackbuffer = false;

   const visibility = createVisibility(canvas, {
      enabled: options.pauseWhenHidden !== false,
      onChange: v => { visible = v; if (v) last = performance.now(); emit('visibility', v); }
   });

   // ---- helpers ---------------------------------------------------------
   function reportError(err) {
      lastError = err;
      if (overlay) overlay.show(err);
      emit('error', err);
      if (options.onError) options.onError(err);
   }
   function clearError() {
      lastError = null;
      if (overlay) overlay.hide();
   }

   const loadText = async path => {
      const r = await fetch(path);
      if (!r.ok) throw new ShaderMateError(`Failed to fetch ${path}: ${r.status} ${r.statusText}`);
      return r.text();
   };
   const includeLoader = async path => (includeStore[path] != null ? includeStore[path] : loadText(path));

   let commonText = null;
   async function getCommon() {
      if (commonText !== null) return commonText;
      if (!commonSrc) return (commonText = '');
      const raw = isInlineSource(commonSrc) ? commonSrc : await loadText(commonSrc);
      const parsed = parseUniformComments(raw);                        // Common may declare annotated uniforms too
      for (const n in parsed.uniforms) if (!(n in uniforms)) uniforms[n] = parsed.uniforms[n];
      Object.assign(instanceSamplers, parsed.samplers, instanceSamplers);
      return (commonText = parsed.source);
   }

   /** Fetch (if needed), preprocess and compile a pass' fragment shader. */
   async function buildProgram(pass, src, allPasses = PASSES) {
      let text = isInlineSource(src) ? src : await loadText(src);
      const common = await getCommon();

      // FragCoord.xyz annotations: `uniform float u_x = 0.5; //[0, 1]`, `uniform sampler2D u_tex; //https://…`
      const parsed = parseUniformComments(text);
      text = parsed.source;
      for (const n in parsed.uniforms) if (!(n in pass.uniforms) && !(n in uniforms)) pass.uniforms[n] = parsed.uniforms[n];
      pass.annotatedSamplers = parsed.samplers;

      const full = common ? common + '\n#line 1\n' + text : text;
      const expanded = await resolveIncludes(full, { loader: includeLoader });

      const fc = dialect === 'fragcoord' || (dialect === 'auto' && looksLikeFragCoord(expanded));
      const samplerNames = [];
      const aux = allPasses.filter(p => !p.screen);
      allPasses.forEach(p => samplerNames.push('u_' + p.name));
      aux.forEach((p, i) => { const n = 'u_pass' + (i + 1); if (!samplerNames.includes(n)) samplerNames.push(n); });

      const frag = assembleFragment(expanded, {
         isGL2,
         defines: [...globalDefines, ...toArray(pass.defines)],
         enableDerivatives,
         inject,
         channelTypes: pass.channels.map(channelSamplerType),
         builtinOpts: {
            fragcoord: fc,
            mouseVec4: fc || dialect === 'fragcoord' || usesMouseVec4(expanded),
            scrollFloat: fc || dialect === 'fragcoord',
            samplerNames,
            passCount: aux.length,
         },
      });
      const r = await createProgramAsync(gl, isGL2 ? VERT_GL2 : VERT_GL1, frag, { label: pass.name, showExpandedOnError: showExpanded });
      if (r.error) throw r.error;
      return { program: r.program, source: text, compiled: frag, fragcoord: fc };
   }

   function resizeTargets() {
      for (const po of passObjs) {
         const cfg = po.cfg;
         if (cfg.screen && !mainBackbuffer) continue;
         const [w, h] = cfg.screen ? [canvas.width, canvas.height] : resolvePassSize(cfg.size, canvas.width, canvas.height);
         if (po.target && po.target.width === w && po.target.height === h) continue;
         deleteTarget(pool, po.target);
         deleteTarget(pool, po.targetPrev);
         po.target = createTarget(gl, pool, w, h, cfg, isGL2, ext);
         po.targetPrev = (cfg.pingpong || (cfg.screen && mainBackbuffer)) ? createTarget(gl, pool, w, h, cfg, isGL2, ext) : null;
      }
   }

   // Size this instance last laid out for. Compared with the canvas itself rather than trusting sizer.update(),
   // because when instances share a canvas only the first one to run sees the change happen.
   let knownW = 0, knownH = 0;
   function syncSize() {
      if (canvas.width === knownW && canvas.height === knownH) return false;
      knownW = canvas.width; knownH = canvas.height;
      gl.viewport(0, 0, canvas.width, canvas.height);
      resizeTargets();
      emit('resize', { width: canvas.width, height: canvas.height });
      return true;
   }
   const ownsCanvas = () => !lastDrawer.has(canvas) || lastDrawer.get(canvas) === api;

   function handleResize() {
      if (disposed) return;
      sizer.update();
      // Resizing clears the canvas. This runs after the frame's draw, so redraw now (without advancing time),
      // playing or paused; otherwise the cleared canvas is what gets shown, which turns into a black canvas
      // when a layout makes the size wobble every frame.
      if (syncSize() && loaded && visible && ownsCanvas()) renderNow();
   }

   async function loadPassChannels(po) {
      await Promise.all(po.cfg.channels.map(async (ch, i) => {
         if (!ch || ch.pass != null) return;
         try {
            po.texChannels[i] = await loadChannel(gl, pool, ch, env);
         } catch (e) {
            console.warn(`[ShaderMate] Pass "${po.name}" channel ${i}: ${e.message}`);
            emit('error', e);
         }
      }));
      // named samplers (u_pass1, u_blur, u_main, u_audio, annotated URLs …)
      po.samplers = resolveSamplerSpecs(po, passObjs, instanceSamplers);
      await Promise.all(po.samplers.map(async s => {
         if (s.spec.pass != null || s.spec.array) return;
         try {
            s.wrap = await loadChannel(gl, pool, s.spec, env);
         } catch (e) {
            console.warn(`[ShaderMate] Pass "${po.name}" sampler ${s.name}: ${e.message}`);
            emit('error', e);
         }
      }));
   }

   // ---- build -----------------------------------------------------------
   /** A pasted FragCoord.xyz multi-pass blob (`// Pass 1` … `// Main`) becomes a pass list. */
   function expandPassBlob(input) {
      if (typeof input !== 'string' || !isInlineSource(input)) return input;
      const blob = splitPassBlob(input);
      if (!blob) return input;
      if (blob.common) commonSrc = commonSrc ? commonSrc + '\n' + blob.common : blob.common;
      const unsupported = blob.passes.find(p => p.bufferType !== '2d');
      if (unsupported) throw new ShaderMateError(`Pass "${unsupported.label}" uses a ${unsupported.bufferType} buffer; ShaderMate supports 2D buffers only.`);
      const passes = blob.passes.map(p => p.main
         ? { name: 'main', shader: p.src, screen: true }
         : { name: p.name, shader: p.src, pingpong: true, float: true });       // aux passes keep history (feedback) like FragCoord
      if (!passes.some(p => p.screen)) passes[passes.length - 1].screen = true;
      return passes;
   }

   async function build() {
      PASSES = normalizePasses(expandPassBlob(options.passes));
      for (const p of PASSES) if (p.iterations > 1 && !p.screen) p.pingpong = true;   // recursion reads the previous iteration
      // Start every pass compiling at once (the driver can work on them in parallel), then wire them up in order.
      const builds = await Promise.allSettled(PASSES.map(pass => buildProgram(pass, pass.src)));
      const failed = builds.find(b => b.status === 'rejected');
      if (failed || disposed) {
         for (const b of builds) if (b.status === 'fulfilled') gl.deleteProgram(b.value.program);
         if (failed) throw failed.reason;
         return;
      }
      for (let i = 0; i < PASSES.length; i++) {
         const pass = PASSES[i];
         const { program, source, compiled, fragcoord } = builds[i].value;
         const po = {
            cfg: pass, name: pass.name, index: i,
            programId: pool.add(program, 'program'),
            uniformInfo: getUniformInfo(gl, program),
            source, compiled, fragcoord,
            target: null, targetPrev: null,
            texChannels: new Array(MAX_CHANNELS).fill(null),
            samplers: [],
         };
         passObjs.push(po);
         byName.set(po.name, po);
      }
      await Promise.all(passObjs.map(loadPassChannels));
      if (disposed) return;
      mainBackbuffer = needsMainBackbuffer(passObjs);
      if (mainBackbuffer && !blit) blit = createBlit(gl, isGL2, quad);
      if (!camera && passObjs.some(po => po.uniformInfo.u_camera_pos || po.uniformInfo.u_camera_dir || po.uniformInfo.u_camera_view)) {
         camera = createCamera(canvas, typeof options.camera === 'object' ? options.camera : {});
      }
      resizeTargets();
   }

   // ---- frame -----------------------------------------------------------
   /** Texture of another pass as seen from `po` (previous frame when reading itself / a later pass). */
   function passTexture(po, src, buffer) {
      let t = null;
      if (src.targetPrev) {
         const prev = buffer === 'prev' || (buffer !== 'current' && src.index >= po.index);
         t = prev ? src.targetPrev : src.target;
      } else if (src === po) {
         warnOnce('self:' + po.name, `Pass "${po.name}" reads its own output; add pingpong: true.`);
      } else if (src.cfg.screen) {
         warnOnce('screen:' + src.name, `Pass "${po.name}" can't read screen pass "${src.name}" (it has no texture).`);
      } else t = src.target;
      return t;
   }

   function drawPass(po, f, iteration = 0) {
      const cfg = po.cfg;
      const program = pool.get(po.programId);
      const u = po.uniformInfo;
      const m = pointer.state;
      const set1f = (n, v) => { const i = u[n]; if (i) gl.uniform1f(i.loc, v); };
      const set1i = (n, v) => { const i = u[n]; if (i) gl.uniform1i(i.loc, v); };

      if (po.targetPrev) { const t = po.targetPrev; po.targetPrev = po.target; po.target = t; }

      let rw, rh;
      if (cfg.screen && !mainBackbuffer) {
         gl.bindFramebuffer(gl.FRAMEBUFFER, null);
         rw = canvas.width; rh = canvas.height;
      } else {
         gl.bindFramebuffer(gl.FRAMEBUFFER, pool.get(po.target.fboId));
         rw = po.target.width; rh = po.target.height;
      }
      const k = cfg.screen ? 1 : rw / canvas.width;     // mouse in this pass' pixel space
      const ky = cfg.screen ? 1 : rh / canvas.height;
      gl.viewport(0, 0, rw, rh);
      gl.useProgram(program);
      gl.clear(gl.COLOR_BUFFER_BIT | (po.target && po.target.depthId ? gl.DEPTH_BUFFER_BIT : 0));

      // built-ins
      set1f('iTime', f.time); set1f('u_time', f.time);
      set1f('iTimeDelta', f.dt); set1f('u_delta', f.dt); set1f('u_time_delta', f.dt);
      set1i('iFrame', f.frame); set1i('u_frame', f.frame);
      set1f('iFrameRate', f.fps); set1f('u_fps', f.fps); set1f('u_refresh_rate', f.refreshRate);
      set1f('iSampleRate', 44100);
      if (u.iResolution) gl.uniform3f(u.iResolution.loc, rw, rh, 1);
      if (u.u_resolution) gl.uniform2f(u.u_resolution.loc, rw, rh);
      set1f('u_aspect', rw / rh);
      set1f('u_pixelRatio', f.dpr);
      if (u.iDate) gl.uniform4fv(u.iDate.loc, f.date);
      if (u.u_date) gl.uniform4fv(u.u_date.loc, f.date);
      if (u.iScroll) gl.uniform2f(u.iScroll.loc, f.scrollX, f.scrollY);
      if (u.u_scroll) {
         // vec2 = page scroll (ShaderMate); float = mouse-wheel accumulator (FragCoord.xyz convention)
         if (u.u_scroll.type === GL_FLOAT) gl.uniform1f(u.u_scroll.loc, m.wheel); else gl.uniform2f(u.u_scroll.loc, f.scrollX, f.scrollY);
      }
      set1f('u_wheel', m.wheel);
      if (u.u_drag) gl.uniform2f(u.u_drag.loc, m.dragX * k, m.dragY * ky);
      set1i('u_recursion', iteration);
      set1i('u_max_recursion', cfg.iterations || 1);
      set1i('u_color_gamut', 0);
      if (camera) {
         if (u.u_camera_pos) gl.uniform3fv(u.u_camera_pos.loc, camera.pos);
         if (u.u_camera_dir) gl.uniform3fv(u.u_camera_dir.loc, camera.dir);
         if (u.u_camera_view) gl.uniformMatrix4fv(u.u_camera_view.loc, false, camera.view);
      }
      if (u.iMouse) {
         // ShaderToy semantics: z > 0 while the button is held, w > 0 only on the frame of the click; both carry |click pos| otherwise
         const sz = m.down ? 1 : -1, sw = m.clicked ? 1 : -1;
         gl.uniform4f(u.iMouse.loc, m.x * k, m.y * ky, m.clickX * k * sz, m.clickY * ky * sw);
      }
      if (u.u_mouse) {
         // vec2 = position; vec4 = position + click position, zw negative while the button is up (FragCoord.xyz convention)
         if (u.u_mouse.type === GL_FLOAT_VEC4) {
            // FragCoord.xyz convention: zw = click position, negative while the button is up. Before the first
            // click that position is 0, and -0 isn't negative to step()/sign(), so use a tiny negative instead.
            const up = v => -Math.max(v, 1e-3);
            gl.uniform4f(u.u_mouse.loc, m.x * k, m.y * ky, m.down ? m.clickX * k : up(m.clickX * k), m.down ? m.clickY * ky : up(m.clickY * ky));
         }
         else gl.uniform2f(u.u_mouse.loc, m.x * k, m.y * ky);
      }
      if (u.u_mouseUV) gl.uniform2f(u.u_mouseUV.loc, m.uvX, m.uvY);
      set1f('u_mouseDown', m.down ? 1 : 0);

      // channels
      const chTimes = [0, 0, 0, 0];
      const chRes = new Float32Array(12);
      for (let i = 0; i < MAX_CHANNELS; i++) {
         const ch = cfg.channels[i];
         if (!ch) continue;
         let texObj = null, w = 0, h = 0, isCube = false, chTime = f.time;

         if (ch.pass != null) {
            const src = byName.get(ch.pass);
            const t = src ? passTexture(po, src, ch.buffer) : null;
            if (t) { texObj = pool.get(t.texId); w = t.width; h = t.height; }
         } else {
            const wrap = po.texChannels[i];
            if (wrap) {
               texObj = pool.get(wrap.texId); w = wrap.width; h = wrap.height; isCube = !!wrap.cubemap;
               if (wrap.getTime) chTime = wrap.getTime();
            }
         }
         if (texObj) {
            gl.activeTexture(gl.TEXTURE0 + i);
            gl.bindTexture(isCube ? gl.TEXTURE_CUBE_MAP : gl.TEXTURE_2D, texObj);
            set1i('iChannel' + i, i);
            chTimes[i] = chTime;
            chRes[i * 3] = w; chRes[i * 3 + 1] = h; chRes[i * 3 + 2] = 1;
         }
      }
      if (u.iChannelTime) (u.iChannelTime.type === GL_FLOAT_VEC4 ? gl.uniform4fv : gl.uniform1fv).call(gl, u.iChannelTime.loc, chTimes);
      if (u.iChannelResolution) gl.uniform3fv(u.iChannelResolution.loc, chRes);

      // named samplers on texture units after the four iChannels
      let unit = MAX_CHANNELS;
      for (const s of po.samplers) {
         const bindTex = (tex, isCube) => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(isCube ? gl.TEXTURE_CUBE_MAP : gl.TEXTURE_2D, tex); return unit++; };
         if (s.spec.array) {
            const units = s.spec.array.map(src => { const t = passTexture(po, src, s.spec.buffer); return t ? bindTex(pool.get(t.texId), false) : 0; });
            gl.uniform1iv(s.info.loc, units);
         } else if (s.spec.pass != null) {
            const src = byName.get(s.spec.pass);
            const t = src ? passTexture(po, src, s.spec.buffer) : null;
            if (t) gl.uniform1i(s.info.loc, bindTex(pool.get(t.texId), false));
         } else if (s.wrap) {
            gl.uniform1i(s.info.loc, bindTex(pool.get(s.wrap.texId), !!s.wrap.cubemap));
            if (s.wrap.getTime) set1f(s.name + '_time', s.wrap.getTime());                // FragCoord: companion <name>_time for video
            const res = u[s.name + '_resolution']; if (res) gl.uniform2f(res.loc, s.wrap.width, s.wrap.height);
         }
      }

      // user uniforms: instance-wide first, then per-pass overrides
      applyUniformMap(gl, u, uniforms, { strict: false });
      applyUniformMap(gl, u, cfg.uniforms, { strict: strictUniforms, warnMissing: warnUniforms, label: po.name });

      quad.bind(program);
      quad.draw();
   }

   /** Advance the clock (if playing/forced) and draw every pass. */
   function frameStep(now, { advance = playing, rawDt } = {}) {
      const t0 = performance.now();
      syncSize();
      if (rawDt === undefined) rawDt = Math.max(0, (now - last) * 0.001);
      last = now;
      if (rawDt > 0.002 && rawDt < 0.1) { rafDts.push(rawDt); if (rafDts.length > 30) rafDts.shift(); if (rafDts.length >= 10) { const s = [...rafDts].sort((a, b) => a - b); refreshRate = Math.round(1 / s[s.length >> 1]); } }
      let dt = fixedDelta > 0 ? fixedDelta : Math.min(rawDt, maxDelta);
      if (advance) {
         time += dt * timeScale;
         if (loopLen > 0) time = ((time % loopLen) + loopLen) % loopLen;
      } else dt = 0;
      frame++;
      const fps = rawDt > 0 ? 1 / rawDt : 0;
      tweens.update(now);
      pointer.update();

      const info = { time, frame, dt, fps };
      emit('beforeFrame', info);
      if (options.onFrame) options.onFrame(info);

      const d = new Date();
      const f = {
         time, frame, dt, fps,
         dpr: window.devicePixelRatio || 1,
         date: [d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds() + d.getMilliseconds() / 1000],
         scrollX: window.scrollX || 0, scrollY: window.scrollY || 0,
         refreshRate,
      };

      if (camera) camera.update(rawDt);
      for (const po of passObjs) {
         for (const w of po.texChannels) if (w && w.update) w.update();
         for (const s of po.samplers) if (s.wrap && s.wrap.update) s.wrap.update();
      }
      for (const po of passObjs) {
         const n = Math.max(1, po.cfg.iterations | 0);
         for (let i = 0; i < n; i++) drawPass(po, f, i);
         if (po.cfg.screen && mainBackbuffer && blit) blit.draw(pool.get(po.target.texId), canvas.width, canvas.height);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      lastDrawer.set(canvas, api);

      emit('afterFrame', info);
      if (stats) stats.update({ rawDt, cpuMs: performance.now() - t0, frame, time, width: canvas.width, height: canvas.height, passes: passObjs.length });
   }

   function loop(now) {
      rafId = requestAnimationFrame(loop);
      if (!loaded || !visible) { last = now; return; }
      if (!playing && tweens.size === 0 && options.renderWhilePaused !== true) { last = now; return; }
      if (!playing && !ownsCanvas()) { last = now; return; }   // a paused instance never paints over another one sharing the canvas
      if (maxFps > 0 && now - lastRender < 1000 / maxFps - 0.5) return;
      lastRender = now;
      frameStep(now);
   }

   /** Draw one frame right now without advancing time (used by screenshots, resize while paused…). */
   function renderNow() {
      if (!loaded || disposed) return;
      frameStep(performance.now(), { advance: false, rawDt: 0 });
   }

   // ---- lifecycle -------------------------------------------------------
   function startLoop() {
      if (disposed || rafId != null) return;
      last = performance.now();
      rafId = requestAnimationFrame(loop);
   }
   function stopLoop() {
      if (rafId != null) cancelAnimationFrame(rafId);
      rafId = null;
   }

   function destroy() {
      if (disposed) return;
      disposed = true;
      stopLoop();
      removeResize();
      pointer.dispose();
      visibility.dispose();
      tweens.cancel();
      if (stats) stats.dispose();
      if (overlay) overlay.dispose();
      if (camera) camera.dispose();
      if (blit) blit.dispose();
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
      teardownPasses();
      quad.dispose();
      emit('destroy');
      emitter.clear();
      if (!givenCanvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
   }

   function teardownPasses() {
      for (const po of passObjs) {
         pool.unref(po.programId);
         deleteTarget(pool, po.target);
         deleteTarget(pool, po.targetPrev);
         po.texChannels.forEach(w => { if (!w) return; if (w.dispose) w.dispose(); pool.unref(w.texId); });
         (po.samplers || []).forEach(s => { if (!s.wrap) return; if (s.wrap.dispose) s.wrap.dispose(); pool.unref(s.wrap.texId); });
      }
      passObjs.length = 0;
      byName.clear();
   }

   function onContextLost(e) {
      e.preventDefault();
      stopLoop();
      loaded = false;
      console.warn('[ShaderMate] WebGL context lost.');
      emit('contextlost');
   }
   async function onContextRestored() {
      console.warn('[ShaderMate] WebGL context restored, rebuilding.');
      pool._items.clear();
      passObjs.length = 0; byName.clear();
      try { await build(); loaded = true; startLoop(); emit('contextrestored'); }
      catch (err) { reportError(err); }
   }
   canvas.addEventListener('webglcontextlost', onContextLost);
   canvas.addEventListener('webglcontextrestored', onContextRestored);

   // ---- public API ------------------------------------------------------
   const capture = createCapture(canvas, renderNow);

   function set(name, value, passName) {
      if (name && typeof name === 'object') { for (const k in name) set(k, name[k], value); return api; }
      tweens.cancel(name);
      let hit = false;
      for (const po of passObjs) {
         if (passName && po.name !== passName) continue;
         if (name in po.cfg.uniforms) { setUniformIn(po.cfg.uniforms, name, value); hit = true; }
      }
      if (!hit) {
         if (passName) {
            const po = byName.get(passName);
            if (!po) throw new ShaderMateError(`set: unknown pass "${passName}"`);
            setUniformIn(po.cfg.uniforms, name, value);
         } else setUniformIn(uniforms, name, value);
      }
      if (!playing && loaded) scheduleRender();
      return api;
   }
   function get(name, passName) {
      for (const po of passObjs) {
         if (passName && po.name !== passName) continue;
         if (name in po.cfg.uniforms) return readUniform(po.cfg.uniforms, name);
      }
      return readUniform(uniforms, name);
   }
   function tween(name, to, opts = {}) {
      const passName = opts.pass;
      const owner = () => {
         for (const po of passObjs) if ((!passName || po.name === passName) && name in po.cfg.uniforms) return po.cfg.uniforms;
         return uniforms;
      };
      return tweens.tween(name, () => readUniform(owner(), name), v => setUniformIn(owner(), name, v), to, opts);
   }

   let renderQueued = false;
   function scheduleRender() {
      if (renderQueued) return;
      renderQueued = true;
      requestAnimationFrame(() => { renderQueued = false; if (!playing && ownsCanvas()) renderNow(); });
   }

   async function setShader(src, passName) {
      const po = passName ? byName.get(passName) : passObjs.find(p => p.cfg.screen) || passObjs[0];
      if (!po) throw new ShaderMateError(`setShader: unknown pass "${passName}"`);
      try {
         const { program, source, compiled } = await buildProgram(po.cfg, src, PASSES);
         if (disposed) { gl.deleteProgram(program); return; }
         pool.unref(po.programId);
         po.programId = pool.add(program, 'program');
         po.uniformInfo = getUniformInfo(gl, program);
         po.cfg.src = src; po.source = source; po.compiled = compiled;
         await loadPassChannels(po);
         clearError();
         emit('shader', { pass: po.name });
         if (!playing) scheduleRender();
      } catch (err) {
         reportError(err);
         throw err;
      }
   }

   async function setChannel(index, source, passName) {
      const po = passName ? byName.get(passName) : passObjs.find(p => p.cfg.screen) || passObjs[0];
      if (!po) throw new ShaderMateError(`setChannel: unknown pass "${passName}"`);
      const ch = normalizeChannel(source, [...byName.keys()], po.name);
      const old = po.texChannels[index];
      if (old) { if (old.dispose) old.dispose(); pool.unref(old.texId); po.texChannels[index] = null; }
      po.cfg.channels[index] = ch;
      if (ch && ch.pass == null) po.texChannels[index] = await loadChannel(gl, pool, ch, env);
      if (!playing) scheduleRender();
   }

   const api = {
      version: VERSION,
      canvas, gl, isWebGL2: isGL2,
      theme: options.theme,
      get camera() { return camera; },
      uniforms,
      get passes() { return passObjs; },
      get ready() { return readyPromise; },
      get loaded() { return loaded; },
      get error() { return lastError; },

      // playback
      play() { if (!playing) { playing = true; last = performance.now(); emit('play'); } return api; },
      pause() { if (playing) { playing = false; emit('pause'); } return api; },
      toggle() { return playing ? api.pause() : api.play(); },
      get playing() { return playing; },
      step(n = 1) { for (let i = 0; i < n; i++) frameStep(performance.now(), { advance: true, rawDt: fixedDelta || 1 / 60 }); return api; },
      render: renderNow,
      destroy, dispose: destroy,

      // time
      get time() { return time; }, set time(t) { time = t; if (!playing) scheduleRender(); },
      get frame() { return frame; },
      get timeScale() { return timeScale; }, set timeScale(s) { timeScale = s; },
      get maxFps() { return maxFps; }, set maxFps(v) { maxFps = v || 0; },
      get loop() { return loopLen; }, set loop(v) { loopLen = v || 0; },
      seek(t) { time = t; if (!playing) scheduleRender(); return api; },
      setFixedDelta(dt) { fixedDelta = dt || 0; return api; },

      // uniforms
      set, get, tween,
      setUniform: set, getUniform: get,

      // live editing
      setShader, setChannel,
      getPass: name => byName.get(name) || null,
      getTexture(name) {
         const po = name ? byName.get(name) : passObjs.find(p => !p.cfg.screen) || passObjs[0];
         return po && po.target ? pool.get(po.target.texId) : null;
      },
      readPixels({ pass, x = 0, y = 0, width, height, float } = {}) {
         const po = pass ? byName.get(pass) : null;
         renderNow();
         if (po && po.target) gl.bindFramebuffer(gl.FRAMEBUFFER, pool.get(po.target.fboId));
         else gl.bindFramebuffer(gl.FRAMEBUFFER, null);
         const w = width ?? (po && po.target ? po.target.width : canvas.width);
         const h = height ?? (po && po.target ? po.target.height : canvas.height);
         let out = new Uint8Array(w * h * 4);
         const isFloat = po && po.target && po.target.fmt.type !== gl.UNSIGNED_BYTE;
         if (isFloat) {
            // float / half-float targets can only be read back as floats
            const f = new Float32Array(w * h * 4);
            gl.readPixels(x, y, w, h, gl.RGBA, gl.FLOAT, f);
            if (float !== false) out = f;
            else for (let i = 0; i < f.length; i++) out[i] = Math.max(0, Math.min(255, Math.round(f[i] * 255)));
         } else gl.readPixels(x, y, w, h, gl.RGBA, gl.UNSIGNED_BYTE, out);
         gl.bindFramebuffer(gl.FRAMEBUFFER, null);
         return { data: out, width: w, height: h, float: out instanceof Float32Array };
      },

      // sizing / input
      resize: handleResize,
      setSize(w, h) { sizer.setFixed(w, h); handleResize(); return api; },
      get width() { return canvas.width; },
      get height() { return canvas.height; },
      pointer: pointer.state,
      domToShader: pointer.toShader,
      domToUV: pointer.toUV,

      // capture
      screenshot: capture.screenshot,
      toBlob: capture.toBlob,
      download: capture.download,
      record: capture.record,

      // events
      on, off, once,

      // dev
      stats: {
         show: (v = true) => { if (!stats) stats = createStats({ visible: false, key: options.statsKey === undefined ? 'F1' : options.statsKey, theme: options.theme }); stats.show(v); },
         toggle: () => api.stats.show(!(stats && stats.isVisible())),
      },
   };

   // ---- go --------------------------------------------------------------
   sizer.update();
   knownW = canvas.width; knownH = canvas.height;
   gl.viewport(0, 0, canvas.width, canvas.height);
   removeResize = sizer.observe(handleResize);

   const readyPromise = (async () => {
      await build();
      if (disposed) return api;
      loaded = true;
      clearError();
      emit('load', api);
      if (options.onReady) options.onReady(api);
      startLoop();
      if (!playing && ownsCanvas()) renderNow();
      return api;
   })();
   readyPromise.catch(err => { if (!disposed) reportError(err); });

   return api;
}
