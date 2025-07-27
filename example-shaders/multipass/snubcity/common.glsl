////////////////////////////
#define PI 3.14159265
#define TAU 6.2831853

// Standard 2D rotation formula.
mat2 rot2(in float a){
   float c = cos(a), s = sin(a);
   return mat2(c, -s, s, c);
}

// A slight variation on one of Dave Hoskins's hash functions,
// which you can find here:
//
// Hash without Sine -- Dave Hoskins
// https://www.shadertoy.com/view/4djSRW
// 1 out, 2 in...

#define STATIC
float hash21(vec2 p){

   vec3 p3 = fract(vec3(p.xyx)*.1031);
   p3 += dot(p3, p3.yzx + 42.123);

#ifdef STATIC
   return fract((p3.x + p3.y) * p3.z);
#else
   p3.x = fract((p3.x + p3.y) * p3.z);
   return sin(p3.x*TAU + iTime);
   // Animation, if desired.
#endif
}

// Distance to a polygon.

// A modified, stripped back version of IQ's
// function here:

// Polygon - distance 2D -- iq.
// https://www.shadertoy.com/view/wdBXRW

float sdPoly(in vec2 p, in vec2[8] v){

   // Initial minimum distance.
   float d = dot(p - v[0], p - v[0]);
   for( int i = 0; i < 6; i++){

      // Edge (squared) distance.
      vec2 e = v[i + 1] - v[i];
      vec2 w = p - v[i];
      w -= e*clamp(dot(w, e)/dot(e, e), 0., 1.);
      d = min( d, dot(w, w));

   }

   // Distance.
   return -sqrt(d);
}

// Signed distance to a pyramid of base "scl" and height "h".
// IQ's (double) pyramid function, modified by myself to take in
// variable base values. Trust IQ's original below, but not this one. :)
//
// Pyramid - distance -- iq
// https://www.shadertoy.com/view/Ws3SDl
//
// IQ goes to a lot of trouble to write these, and they always
// work as advertised. :)
float sdOctahedron(vec3 p, float h, float scl){

   /*
    // Hacky bound version: It seems to work, and also appears to run
    // faster. However, I don't feel it looks as nice... Plus, I don't
    // trust anything I write myself. :D
    p = abs(p);
    p.xz -= max(scl/2. - p.y, 0.);
    return max(max(p.x, p.z), p.y - h);
*/

   scl /= 2.;
   float m2 = (h*h + scl*scl);

   // Symmetry.
   p = abs(p);
   // p = abs(p), for a double pyramid.
   p.xz = (p.z>p.x) ? p.zx : p.xz;
   p.xz -= scl;

   // Project into face plane (2D).
   vec3 q = vec3( p.z, h*p.y - p.x*scl, h*p.x + p.y*scl);

   float s = max(-q.x, 0.);
   float t = clamp((q.y - q.x*scl)/(m2 + scl*scl), 0., 1.);

   float a = m2*(q.x + s)*(q.x + s) + q.y*q.y;
   float b = m2*(q.x + t*scl)*(q.x + t*scl) + (q.y - m2*t)*(q.y - m2*t);

   float d2 = max(-q.y, q.x*m2 + q.y*scl) < 0. ? 0. : min(a, b);

   // recover 3D and scale, and add sign
   return sqrt((d2 + q.z*q.z)/m2)*sign(max(q.z, -p.y));
}

