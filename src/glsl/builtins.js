// Built-in uniforms. They are declared automatically when a shader uses them
// (and not already declared), and uploaded every frame when present in the program.
//
// ShaderToy names                      short names
//   vec3  iResolution                    vec2  u_resolution
//   float iTime                          float u_time
//   float iTimeDelta                     float u_delta
//   int   iFrame                         int   u_frame
//   float iFrameRate                     float u_fps
//   vec4  iMouse  (x,y, click.x,click.y) vec2  u_mouse        pixels, bottom-left origin
//                                        vec2  u_mouseUV      0..1
//                                        float u_mouseDown    0/1
//   vec4  iDate                          vec4  u_date
//   vec2  iScroll                        vec2  u_scroll       page scroll in px
//                                        float u_pixelRatio
//                                        float u_aspect       width / height
//   float iChannelTime[4]
//   vec3  iChannelResolution[4]
//   samplerX iChannel0..3

export const BUILTIN_UNIFORMS = {
   iResolution: 'vec3', iTime: 'float', iTimeDelta: 'float', iFrame: 'int', iFrameRate: 'float',
   iMouse: 'vec4', iDate: 'vec4', iScroll: 'vec2', iSampleRate: 'float',
   iChannelTime: 'float[4]', iChannelResolution: 'vec3[4]',
   u_resolution: 'vec2', u_time: 'float', u_delta: 'float', u_frame: 'int', u_fps: 'float',
   u_mouse: 'vec2', u_mouseUV: 'vec2', u_mouseDown: 'float', u_date: 'vec4', u_scroll: 'vec2',
   u_pixelRatio: 'float', u_aspect: 'float',
   // FragCoord.xyz-style names (declare `uniform vec4 u_mouse;` / `uniform float u_scroll;` yourself to get those shapes)
   u_time_delta: 'float', u_refresh_rate: 'float', u_drag: 'vec2', u_wheel: 'float',
};

const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

/** ShaderToy legacy aliases. */
export const BUILTIN_DEFINES = '#define iGlobalTime iTime\n';

/** `out vec4 fragColor` (FragCoord.xyz / GLSL 3 style) when a shader writes to fragColor from its own main(). */
export function declareFragColor(src, isGL2) {
   const code = stripComments(src);
   if (!/\bfragColor\b/.test(code) || !/\bvoid\s+main\s*\(/.test(code)) return '';
   if (/\bout\s+vec4\s+fragColor\b/.test(code) || /#define\s+fragColor\b/.test(code)) return '';
   return isGL2 ? 'out vec4 fragColor;\n' : '#define fragColor gl_FragColor\n';
}


/**
 * Return GLSL declaring every built-in the source uses but doesn't declare itself.
 * channelTypes: ['2D' | 'cube' | null] x4 picks sampler2D / samplerCube for iChannelN.
 */
/** FragCoord.xyz-only built-ins (declared when used in a FragCoord-style shader or when dialect: 'fragcoord'). */
export const FRAGCOORD_UNIFORMS = {
   u_camera_pos: 'vec3', u_camera_dir: 'vec3', u_camera_view: 'mat4',
   u_recursion: 'int', u_max_recursion: 'int', u_color_gamut: 'int',
};
/** Sampler built-ins bound by name (see core/samplers.js). */
export const SAMPLER_BUILTINS = ['u_audio', 'u_keyboard', 'u_webcam', 'u_main'];

/**
 * Heuristic: a FragCoord.xyz sketch writes `fragColor` from its own `main()` and never uses mainImage.
 */
export function looksLikeFragCoord(src) {
   const code = stripComments(src);
   return /\bfragColor\b/.test(code) && /\bvoid\s+main\s*\(/.test(code) && !/\bmainImage\s*\(/.test(code);
}

/**
 * Return GLSL declaring every built-in the source uses but doesn't declare itself.
 * channelTypes: ['2D' | 'cube' | null] x4 picks sampler2D / samplerCube for iChannelN.
 * opts.mouseVec4 / opts.scrollFloat switch u_mouse / u_scroll to the FragCoord.xyz shapes.
 * opts.samplerNames: extra sampler2D names to declare when used (pass samplers like u_pass1, u_blur).
 * opts.passCount: size for `u_passes[N]`.
 */
export function declareBuiltins(src, channelTypes = [], opts = {}) {
   const code = stripComments(src);
   let out = '';
   const declared = name => new RegExp('uniform\\s+(?:\\w+\\s+)*' + name + '\\b').test(code);
   const used = name => new RegExp('\\b' + name + '\\b').test(code);
   const types = Object.assign({}, BUILTIN_UNIFORMS, opts.fragcoord ? FRAGCOORD_UNIFORMS : null);
   if (opts.mouseVec4) types.u_mouse = 'vec4';
   if (opts.scrollFloat) types.u_scroll = 'float';

   for (const name in types) {
      if (!used(name) || declared(name)) continue;
      const t = types[name];
      const m = /^(\w+)\[(\d+)\]$/.exec(t);
      out += m ? `uniform ${m[1]} ${name}[${m[2]}];\n` : `uniform ${t} ${name};\n`;
   }
   for (let i = 0; i < 4; i++) {
      const name = 'iChannel' + i;
      if (!used(name) || declared(name)) continue;
      out += `uniform ${channelTypes[i] === 'cube' ? 'samplerCube' : 'sampler2D'} ${name};\n`;
   }
   for (const name of new Set([...SAMPLER_BUILTINS, ...(opts.samplerNames || [])])) {
      if (used(name) && !declared(name)) out += `uniform sampler2D ${name};\n`;
   }
   if (opts.passCount > 0 && /\bu_passes\b/.test(code) && !declared('u_passes')) out += `uniform sampler2D u_passes[${opts.passCount}];\n`;
   return out;
}
