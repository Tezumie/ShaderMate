import { createProgram } from './shader.js';
import { VERT_GL1, VERT_GL2 } from '../glsl/templates.js';

const FRAG_GL2 = `#version 300 es
precision highp float;
uniform sampler2D u_tex; uniform vec2 u_size; out vec4 o;
void main(){ o = texture(u_tex, gl_FragCoord.xy / u_size); }`;
const FRAG_GL1 = `precision highp float;
uniform sampler2D u_tex; uniform vec2 u_size;
void main(){ gl_FragColor = texture2D(u_tex, gl_FragCoord.xy / u_size); }`;

/** Copies a texture to the default framebuffer (used when the screen pass also needs a readable backbuffer). */
export function createBlit(gl, isGL2, quad) {
   const r = createProgram(gl, isGL2 ? VERT_GL2 : VERT_GL1, isGL2 ? FRAG_GL2 : FRAG_GL1, { label: 'blit' });
   if (r.error) throw r.error;
   const program = r.program;
   const uTex = gl.getUniformLocation(program, 'u_tex');
   const uSize = gl.getUniformLocation(program, 'u_size');
   return {
      draw(tex, w, h) {
         gl.bindFramebuffer(gl.FRAMEBUFFER, null);
         gl.viewport(0, 0, w, h);
         gl.useProgram(program);
         gl.activeTexture(gl.TEXTURE0);
         gl.bindTexture(gl.TEXTURE_2D, tex);
         gl.uniform1i(uTex, 0);
         gl.uniform2f(uSize, w, h);
         quad.bind(program);
         quad.draw();
      },
      dispose() { gl.deleteProgram(program); }
   };
}
