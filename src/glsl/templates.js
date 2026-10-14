export const VERT_GL2 = `#version 300 es
layout(location=0) in vec2 a_position;
void main(){ gl_Position = vec4(a_position,0.0,1.0); }`;

export const VERT_GL1 = `attribute vec2 a_position;
void main(){ gl_Position = vec4(a_position,0.0,1.0); }`;

/** Texture-sampling compatibility macros so the same source compiles as GLSL ES 1.00 and 3.00. */
export const BUILTIN_MACROS_GL2 = `#define texture2D(s,u)   texture(s,u)
#define textureCube(s,u) texture(s,u)
#define TEX(s,u)         texture(s,u)
#define TEX_LOD(s,u,l)   textureLod(s,u,l)
`;

export const BUILTIN_MACROS_GL1 = `#define texture(s,u)     texture2D(s,u)
#define TEX(s,u)         texture2D(s,u)
#define TEX_LOD(s,u,l)   texture2D(s,u)
`;

export const MAIN_WRAP_GL2 = `
#line 100000
void main(){
  vec4 c = vec4(0.0);
  mainImage(c, gl_FragCoord.xy);
  outColor = c;
}`;

export const MAIN_WRAP_GL1 = `
#line 100000
void main(){
  vec4 c = vec4(0.0);
  mainImage(c, gl_FragCoord.xy);
  gl_FragColor = c;
}`;
