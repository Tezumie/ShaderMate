#version 300 es
precision highp float;
precision highp int;
#if __VERSION__ >= 300
#define texture2D(s,u) texture(s,u)
#define textureCube(s,u) texture(s,u)
#define TEX(s,u) texture(s,u)
#define TEX_LOD(s,u,l) textureLod(s,u,l)
#else
#define TEX(s,u) texture2D(s,u)
#define TEX_LOD(s,u,l) texture2D(s,u)
#endif
out vec4 outColor;

uniform vec3 iResolution;
uniform float iTime;

// Demo sketch: colorful raymarched blobs
// Uses: iTime, iResolution

//////////////////////////////////////////////////////////////
// Small utils
float hash(vec2 p){
   return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453);
}

vec3 palette(float t){
   // iq-style palette
   vec3 a = vec3(0.5, 0.5, 0.5);
   vec3 b = vec3(0.5, 0.5, 0.5);
   vec3 c = vec3(1.0, 1.0, 1.0);
   vec3 d = vec3(0.263, 0.416, 0.557);
   return a + b * cos(6.28318 * (c * t + d));
}

// 3D rotation matrix around Y
mat3 rotY(float a){
   float c = cos(a), s = sin(a);
   return mat3(c,0.,-s, 0.,1.,0., s,0.,c);
}

// Signed distance to a moving blobby field (metaballs-ish)
float sdf(vec3 p){
   vec3 q = p;
   float t = iTime * 0.7;
   float d = 1e9;
   for(int i=0;i<6;i++){
      float fi = float(i);
      vec3 off = vec3(sin(t+fi*1.1), cos(t*1.3+fi), sin(t*0.7+fi*2.3));
      float r = 0.45 + 0.25*sin(t*1.2+fi);
      d = min(d, length(q - off) - r);
   }
   // add a floor
   d = min(d, p.y + 1.3);
   return d;
}

// Basic raymarcher
float march(vec3 ro, vec3 rd){
   float t = 0.;
   for(int i=0;i<96;i++){
      vec3 p = ro + rd * t;
      float dist = sdf(p);
      if(dist < 0.001){
         return t;
      }
      t += dist * 0.6;
      // step
      if(t > 25.) break;
   }
   return -1.;
}

// Est normal from SDF
vec3 getNormal(vec3 p){
   const vec2 e = vec2(1e-3,0.);
   return normalize(vec3(
   sdf(p+e.xyy)-sdf(p-e.xyy),
   sdf(p+e.yxy)-sdf(p-e.yxy),
   sdf(p+e.yyx)-sdf(p-e.yyx)
   ));
}

//////////////////////////////////////////////////////////////

void mainImage(out vec4 fragColor, in vec2 fragCoord){
   vec2 uv = fragCoord / iResolution.xy;
   vec2 p = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

   // Camera
   float time = iTime * 0.6;
   vec3 ro = vec3(0., 1.0 + 0.3*sin(time*0.7), 3.5);
   vec3 ta = vec3(0., 0.0, 0.);
   vec3 cw = normalize(ta - ro);
   vec3 cp = vec3(0.,1.,0.);
   vec3 cu = normalize(cross(cw, cp));
   vec3 cv = cross(cu, cw);
   vec3 rd = normalize(p.x * cu + p.y * cv + 1.8 * cw);
   rd = rotY(time * 0.4) * rd;
   ro = rotY(time * 0.4) * ro;

   vec3 col;
   float tHit = march(ro, rd);
   if(tHit > 0.0){
      vec3 pos = ro + rd * tHit;
      vec3 n = getNormal(pos);
      vec3 lightDir = normalize(vec3(0.8, 1.2, 0.6));
      float diff = clamp(dot(n, lightDir), 0., 1.);
      float rim = pow(clamp(1.0 - dot(n, -rd), 0., 1.), 2.0);
      float h = hash(floor(pos.xz*2.0));
      vec3 base = palette(h + time*0.1);
      col = base * (0.2 + 0.8*diff) + rim*0.3;

   }
   else {
      // background gradient
      col = mix(vec3(0.1,0.1,0.15), vec3(0.3,0.4,0.6), uv.y);
   }

   // Gamma-ish
   col = pow(col, vec3(0.4545));
   fragColor = vec4(col, 1.0);
}

void main() {
   mainImage(outColor, gl_FragCoord.xy);

}
