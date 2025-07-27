//https://www.shadertoy.com/view/W3V3zR
uniform vec3 iResolution;
uniform float iTime;
uniform int iFrame;
uniform sampler2D iChannel0;

#include "/example-shaders/multipass/snubcity/common.glsl"

/*

    Snub Polygon Raymarch Traversal
    -------------------------------

    Raymarch traversing a snub based 3,3,4,3,4 prism tessellation, then
    adding some very minor detail to give the impression of a mountainous
    city, or something to that effect.

    If there were any such thing as an infinitely sprawling citadel, then I
    guess that's what it'd be reminiscent of. :) I would have liked to add
    more detail, but I ran out of frame rate. :D

    I wrote this ages ago. The intention is to eventually improve the
    frame rate in order to add more detail, but for now, I'll post what I
    have then revisit it later.



    Other examples:

    // Mrange has a good eye for aesthetics, and a heap of really nice
    // examples on Shadertoy worth looking at. I had his simple example
    // below in mind when applying the lighting.
    //
    Sandstone city -- mrange
    https://www.shadertoy.com/view/ddtGDB


    // The following example is based on similar principles, which is
    // populating a less common grid-based tessellation with objects in
    // order to use it as the basis for a city, or something like that.
    //
    random asymmetric block cylinder -- jt
    https://www.shadertoy.com/view/t3G3Rz


*/

// PI and 2PI.
#define PI 3.14159265
#define TAU 6.2831853

#define FAR 24.

//////////////

// Placing abstract minaret style structures on top of the polygon
// pylons to give it more of a sprawling city feel.
#define MINARET

///////////////

// Global tile scale.
const vec2 gSc = vec2(1)/1.5;

// The path is a 2D sinusoid that varies over time, depending upon the frequencies,
// and amplitudes.
vec2 path(in float z){

   //return vec2(0); // Straight path.

   // Windy weaved path.
   float c = cos(z*3.14159265/32.);
   float s = sin(z*3.14159265/24.);
   return vec2(c*4. - s*2., 0);
   //return vec2(1. + c*2. - .0, 1. + s*2. - .0);

}

// Tri-Planar blending function: Based on an old Nvidia writeup:
// GPU Gems 3 - Ryan Geiss: http://http.developer.nvidia.com/GPUGems3/gpugems3_ch01.html
vec3 tex3D(sampler2D tex, in vec3 p, in vec3 n){

   // Abosolute normal with a bit of tightning.
   n = max(n*n - .2, .001);
   // max(abs(n), 0.001), etc.
   n /= dot(n, vec3(1));
   //n /= length(n);

   // Texure samples. One for each plane.
   vec3 tx = texture(tex, p.zy).xyz;
   vec3 ty = texture(tex, p.xz).xyz;
   vec3 tz = texture(tex, p.xy).xyz;

   // Multiply each texture plane by its normal dominance factor.... or however you wish
   // to describe it. For instance, if the normal faces up or down, the "ty" texture
   // sample, represnting the XZ plane, will be used, which makes sense.

   // Textures are stored in sRGB (I think), so you have to convert them to linear space
   // (squaring is a rough approximation) prior to working with them... or something like
   // that. :) Once the final color value is gamma corrected, you should see correct
   // looking colors.
   return mat3(tx*tx, ty*ty, tz*tz)*n;
}

// IQ's 3D box function.
float sBoxS(vec3 p, vec3 b, float sm){
   vec3 q = abs(p) - b + sm;
   return min(max(max(q.x, q.y), q.z), 0.) + length(max(q, 0.)) - sm;
}

// Commutative smooth maximum function. Provided by Tomkh, and taken
// from Alex Evans's (aka Statix) talk:
// http://media.lolrus.mediamolecule.com/AlexEvans_SIGGRAPH-2015.pdf
// Credited to Dave Smith @media molecule.
float smax(float a, float b, float k){

   float f = max(0., 1. - abs(b - a)/k);
   return max(a, b) + k*.25*f*f;
}

// Tone mapper, lightly based on something from Unreal Tournament.
vec3 uTone(vec3 x){
   return ((x*(x*.6 + .1) + .004)/(x*(x*.6 + 1.) + .06) - .0667)*1.933526;
}

// I made this function up pretty quickly. It's just a combination of
// two sine layers, combined in a similar manner to fBM noise layers.
float sinNoise(vec2 f){
   /*
    float tm = iTime;
    float d = dot(sin(f*. + tm*.5 - cos(f.yx*.7 - tm*.5)), vec2(.25)) + .5;
    d = mix(d, dot(sin(f + tm*1. - cos(f.yx*1.4 - tm*1.)), vec2(.25)) + .5, 1./3.);
*/

   float d = dot(sin(f*.5 - cos(f.yx*.7)), vec2(.25)) + .5;
   d = mix(d, dot(sin(f - cos(f.yx*1.4)), vec2(.25)) + .5, 1./3.);

   return d;
   //floor(d*15.999)/15.;

}

// Height map value.
float hm(in vec2 p){
   return sinNoise(p);
}

// IQ's extrusion formula.
float opExtrusion(in float sdf, in float pz, in float h){

   vec2 w = vec2( sdf, abs(pz) - h );
   return min(max(w.x, w.y), 0.) + length(max(w, 0.));

   /*
    // Slight rounding. A little nicer, but slower.
    const float sf = .015;
    vec2 w = vec2( sdf, abs(pz) - h - sf/2.);
  	return min(max(w.x, w.y), 0.) + length(max(w + sf, 0.)) - sf;
    */
}

// Ray origin, ray direction, point on the line, normal.
float rayLine(vec2 ro, vec2 rd, vec2 p, vec2 n){

   // This it trimmed down, and can be trimmed down more. Note that
   // "1./dot(rd, n)" can be precalculated outside the loop.
   //return dot(p - ro, n)/dot(rd, n);
   float dn = dot(rd, n);
   return dn>0.? dot(p - ro, n)/dn : 1e8;

}

// Unsigned distance to the segment joining "a" and "b".
// This is basically IQ's well known formula.
float distLineS(vec2 p, vec2 a, vec2 b){

   p -= a, b -= a;
   float h = clamp(dot(p, b)/dot(b, b), 0., 1.);
   // JT's GPU determinant-based sign. Not sure if it's faster, or not.
   //float s = determinant(mat2(b, p))<0.? -1. : 1.;
   // Unfortunately, the GPU "sign" function returns zero for certain pixel.
   // which we can't have for this function, so this is the workaround.
   float s = b.x*p.y<b.y*p.x? -1. : 1.;
   return length(p - b*h)*s;
}

/*
// Signed distance to a line passing through A and B.
float distLineSF(vec2 p, vec2 a, vec2 b){

   //b -= a;
   //return dot(p - a, vec2(-b.y, b.x))/sqrt(min(dot(b, b), 1.));

   //if(a == b) return -1e5;
   b = min(b - a, 1.);
   return dot(p - a, vec2(-b.y, b.x)/length(b));
}
*/

// Global cell boundary distance variables.
vec3 gDir;
// Cell traversing direction.
vec3 gRd;
// Ray direction.
float gCD;
// Cell boundary distance.

//////////////////////////////////

float vert = 1e5;

// Polygon ID.
int pID;

//////////////////////////

// Grid square vertices.
const mat4x2 vID = mat4x2(vec2(-.5), vec2(-.5, .5), vec2(.5), vec2(.5, -.5));
const mat4x2 eID = mat4x2(vec2(-.5, 0), vec2(0, .5), vec2(.5, 0), vec2(0, -.5));
const mat4x2 v = mat4x2(vec2(-.5)*gSc, vec2(-.5, .5)*gSc, vec2(.5)*gSc, vec2(.5, -.5)*gSc);

int swtch;

mat4x2 e;

// A container for the polygon vertex points. It needs to be big enough
// to hold six hexagon vertex points. It's a little bigger for wrapping
// purposes. A lot of GPUs don't like things like vP[(i + 1)%6], so we'll
// use some trickery to get around that.
vec2[8] vP;

// Initialization hexagon object vertices: This is precalculated once in the
// "main" function at startup. By the way, we only need six array spots, but
// we're using the seventh for wrapping purposes, then adding an eighth dummy
// position, since computers like computer numbers... Well, they used to, so
// I'm assuming they still do. :)
vec2[8] vPInit;

// I adapted this particular routine from one that I wrote ages ago,
// which was specifically designed to work with variable polygons.
// It's reasonably quick, but if I rewrote it for the specific purpose
// I'm using it for here, it'd probably be faster, and tidier.
//
// Anyway, this algorithm is reasonably simple: Three elongated hexagons
// cover any square grid cell, so step over some lines to determine which
// hexagon the pixel is in, then translate and rotate the local coordinates
// to match. Once you have the hexagon, subdivide it into a square and two
// triangles.
vec4 df(inout vec2 p){

   // Set to the precalculated hexagon verticies.
   vP = vPInit;

   // Scale, cell ID and local coordinates.
   vec2 ip = floor(p/gSc) + .5;
   p -= (ip)*gSc;

   // Inititialize the ID to the square cell center.
   vec2 id = ip;

   // Flipping coordinate flag.
   swtch = -1;

   // We need to switch and reverse the coordinates in each checkered
   // cell. This is a common move when working with some patterns.
   int check = mod(ip.x + ip.y, 2.)==0.? 0 : 1;
   if(check==1){
      p = -p.yx;
      swtch *= -1;
   }

   // Six hexagon sides.
   pID = 6;

   ///////////////

   // The two diagonal lines separating the three hexagons. One
   // is in the center, and the other two are in opposite corners.
   float ln1 = distLineS(p, e[1], e[2]);
   float ln3 = distLineS(p, e[3], e[0]);

   // If we're on the outside of either of the lines above, we are
   // in one of the outside hexagons, so we need to move the local
   // coordinates. If we're not, then we don't have to move anything.

   // Outside of line. Hesagon one.
   if(ln1>0.){

      // Flip back and move to the neighboring cell.
      p = -p.yx - eID[0]*2.*gSc;
      swtch *= -1;
      // Switch coordinates, or switch back.

      id += eID[1 - check]*2.;
      //if(check==0) id = ip + eID[1 -  flip]*2.;
      //else id = ip + eID[flip]*2.;

   }
   else if(ln3>0.){
      // Outside the other line. Hexagon two.

      // Flip back and move to the neighboring cell.
      p = -p.yx - eID[2]*2.*gSc;
      swtch *= -1;
      // Switch coordinates, or switch back.

      id += eID[3 - check]*2.;
      //if(check==0) id = ip + eID[(3 - flip)]*2.;
      //else id = ip + eID[2 + flip]*2.;

   }

   // Create the hexagon using IQ's reasonably fast polygon formula.
   float d = sdPoly(p, vP);

   // The geometry won't make a lot of sense when not
   // subdivided, but the option is there.
#define SUBDIV

   // Subdividing each hexagon into a central square and
   // two flanking triangles.
#ifdef SUBDIV
   //if(hash21(id + .12)<.5){ // Random subdivision.

   // Left and right square boundary lines.
   float ln0 = distLineS(p, e[0], e[1]);
   float ln2 = distLineS(p, e[3], e[2]);

   if(ln0>0.){

      // The left triangle.

      // Update the polygon distance.
      d = max(d, -ln0);

      // Set the three triangle vertices. We're also setting
      // the forth vertex to the first for faster looping.
      //vP[0] = vP[0];
      //vP[1] = vP[1];
      vP[2] = vP[5];
      vP[3] = vP[0];
      // Setting the fourth vertex for speed.

      // Update the position based ID.
      //id += vP[0]*2./3./sc;//eID[(0 + chI)%4]*.75;
      //id += mix(v[1], v[2], ratio)*2./3.;
      vec2 offs = swtch==1? -vP[0].yx : vP[0];
      id += offs*(1./sqrt(3.))/gSc;

      pID = 3;
      // Triangle.

   }
   else if(ln2<0.){

      // The right triangle (relatively speaking).

      d = max(d, ln2);

      vP[0] = vP[3];
      vP[1] = vP[4];
      //vP[2] = vP[2];
      vP[3] = vP[0];

      // Right.
      //id += vP[3]*2./3./sc;// eID[(2 + chI + 2)%4]*.75;
      //id += mix(v[3], v[0], ratio)*2./3.;
      //id += (vP[0] + vP[1] + vP[2])/3.;
      vec2 offs = swtch==1? -vP[3].yx : vP[3];
      id += offs*(1./sqrt(3.))/gSc;

      pID = 3;
      // Triangle.

   }
   else {

      // The remaining middle square.

      // Distance.
      d = max(d, ln0);
      d = max(d, -ln2);

      // Vertices.
      vP[0] = vP[1];
      vP[1] = vP[2];
      vP[2] = vP[4];
      vP[3] = vP[5];
      vP[4] = vP[0];
      // Setting the fifth vertex for speed.

      pID = 4;
      // Square.

   }
   //}
#endif

   // Distance, dummy variable and ID.
   return vec4(d, 1e5, id);
}

///////////////////////////////////

// Global coordinates and general value holders.
vec3 gP;
vec4 gVal;

int objID;
// Object ID.

float map(vec3 p) {

   // Floor, or ground.
   float fl = p.y + 4.;

   // The tessellated distance field.
   vec2 q = p.xz;
   vec4 d4 = df(q);
   vec2 id = d4.zw;

   ////////
   // Save the direction ray, then align it to match flipped cell coordinates.
   vec3 svRd = swtch==1? -gRd.zyx : gRd;

   // The minimum cell wall distance: This distance is used as a ray jump
   // delimiter. It can slow things down a bit, but not by anywhere near as
   // much as you'd think. The upside is artifact free traversal. The towering
   // geometry you see wouldn't be possible at reasonable frame rates without it.
   float rC = 1e5;
   for(int i = 0; i<pID; i++){
      // Minimum wall distance.
      float rCI = rayLine(q, svRd.xz, vP[i],
      normalize(vP[i] - vP[i + 1]).yx*vec2(1, -1));
      // Overall miimum cell wall distance.
      rC = min(rC, rCI);
      //min(rC, max(rCI, 0.));
   }
   // Capping above zero (probably not necessary here), then adding a touch
   // extra to ensure the ray moves to the next cell.
   gCD = max(rC, 0.) + .0001;
   //////////

   // 2D polygon distance.
   float d2 = d4.x;
   //float d2 = length(q) - (gSc.x/3.); // Debug

   // Extruding the 2D field.
   float h = hm(id)*6.;
   h = floor(h/gSc.y*2.)*gSc.y/2. + .05;

   float d = opExtrusion(d2, p.y - h/2. + 4., h/2.);

   ///////////
   // Save the 3D coordinate.
   gP = vec3(q.x, p.y, q.y);

   // Roof top.
   float top = 1e5;

   // Adding minurets to random square pylons.
   int hit = 0;
#ifdef MINARET
   if(pID>3 && hash21(id + .2)<.4){

      // Top pylon.
      float ySc = gSc.y/2.;
      float oD2 = d2 + gSc.x*gSc.x*.25;
      float rndR = hash21(id + .27);
      float rndN = floor(rndR*3.) + 1.;
      d = min(d, opExtrusion(oD2 + gSc.x*.0, p.y - h/2. + 4., h/2. + ySc*rndN));

      // Roof.
      vec2 q2 = rot2(atan(1. - .5/sqrt(2.), .5/sqrt(2.)))*q;
      top = sdOctahedron(vec3(q2.x, p.y - h + 4. - ySc*rndN, q2.y),
      gSc.x*(.05 + rndR*.45), gSc.x/2.48);

      hit = 1;

   }
#endif

   /*
    if(hit==0){
    //d += d2*.25; // Raised tops.
    d += max(d2, -.025);
    }
    */

   // Saving some values for rendering purposes.
   // 2D field value, height, ID.
   gVal = vec4(d2, h, id);

   // Overall object ID.
   objID = fl<d && fl<top? 0 : d<top? 1 : 2;

   // Combining the floor with the extruded object.
   return min(fl, min(d, top));

}

// Raymarching traversal function.
float trace(vec3 ro, vec3 rd){

   float tmin = 0.;
   float tmax = FAR;

   // IQ's bounding plane addition, to help give some extra performance.
   //
   // If ray starts above bounding plane, skip all the empty space.
   // If ray starts below bounding plane, never march beyond it.
   const float boundY = 3.;
   //1.5;
   float h = (boundY - ro.y)/rd.y;
   if(h>0.){

      if( ro.y>boundY ) tmin = max(tmin, h);
      else tmax = min(h, FAR);
   }

   float d, t = tmin;

   vec2 dt = vec2(1e8, 0);
   int i = 0;

   // Set the global ray direction varibles -- Used to calculate
   // the cell boundary distance inside the "map" function.
   gDir = step(0., rd) - .5;
   gRd = rd;

   const int rmIter = 128;
   for(i = min(iFrame, 0);
   i<rmIter;
   i++){

      d = map(ro + rd*t);
      // IQ's clever edge desparkle trick. :)
      // if (d<dt.x) { dt = vec2(min(d, gCD), dt.x); }

      if (abs(d)<.001 || t>FAR) break;

      //t += min(d*.5, .25);
      t += min(d*.8, gCD);
      //t += t<.5? d*.35 : d*.7;
   }

   //if(i == rmIter - 1) { t = dt.y; }
   //else
   t = min(t, FAR);

   return t;
}

// Cheap shadows are hard. In fact, I'd almost say, shadowing particular scenes with limited
// iterations is impossible... However, I'd be very grateful if someone could prove me wrong. :)
float softShadow(vec3 ro, vec3 lp, vec3 n, float k){

   // More would be nicer. More is always nicer, but not always affordable. :)
   const int iter = 48;

   ro += n*.0015;
   // Coincides with the hit condition in the "trace" function.
   float shade = 1., t = 0.;
#if 0
   vec3 rd = lp - ro;
   // Unnormalized direction ray.
   float end = max(length(rd), .0001);
   //float stepDist = end/float(maxIterationsShad);
   rd /= end;
#else
   vec3 rd = lp;
   float end = FAR;
#endif

   // Set the global ray direction varibles -- Used to calculate
   // the cell boundary distance inside the "map" function.
   gDir = step(0., rd) - .5;
   gRd = rd;

   // Max shadow iterations - More iterations make nicer shadows, but slow things down. Obviously,
   // the lowest number to give a decent shadow is the best one to choose.
   for(int i = min(iFrame, 0);
   i<iter;
   i++){

      float d = map(ro + rd*t);

      shade = min(shade, k*d/t);

      // Early exits from accumulative distance function calls tend to be a good thing.
      if (d<0. || t>end) break;

      //shade = min(shade, smoothstep(0., 1., k*d/t)); // Thanks to IQ for this tidbit.
      // So many options here, and none are perfect: dist += clamp(d, .01, stepDist), etc.
      t += clamp(min(d*.9, gCD), .01, .25);

   }

   // Sometimes, I'll add a constant to the final shade value, which lightens the shadow a bit --
   // It's a preference thing. Really dark shadows look too brutal to me. Sometimes, I'll add
   // AO also just for kicks. :)
   return max(shade, 0.);
}

// Standard normal function. It's not as fast as the tetrahedral calculation, but more symmetrical.
vec3 normal(in vec3 p) {

   //const vec2 e = vec2(.001, 0);
   //return normalize(vec3(map(p + e.xyy) - map(p - e.xyy), map(p + e.yxy) - map(p - e.yxy),
   //                      map(p + e.yyx) - map(p - e.yyx)));

   // This mess is an attempt to speed up compiler time by contriving a break... It's
   // based on a suggestion by IQ. I think it works, but I really couldn't say for sure.
   float sgn = 1.;
   // Due to the nature of this traversal, better normal sample accuracy is needed.
   vec3 e = vec3(.001, 0, 0), mp = e.zzz;
   // Spalmer's clever zeroing.
   for(int i = min(iFrame, 0);
   i<6;
   i++){
      mp.x += map(p + sgn*e)*sgn;
      sgn = -sgn;
      if((i&1)==1){
         mp = mp.yzx;
         e = e.zxy;
      }
   }

   return normalize(mp);
}

// I'm using a rough version of XT95's really nice ambient occlusion
// function, and a simpler one for comparisson. Change the one to a zero.
//
// Hemispherical SDF AO - XT95
// https://www.shadertoy.com/view/4sdGWN
#if 1

// Hash without Sine -- Dave Hoskins
// https://www.shadertoy.com/view/4djSRW
//  2 out, 3 in...
vec2 hash23(vec3 p3){

   p3 = fract(p3*vec3(.1031, .1030, .0973));
   p3 += dot(p3, p3.yzx + 527.1273);
   return fract((p3.xx+p3.yz)*p3.zy);
}

// A nice random hemispherical routine taken out of one of IQ's examples.
// The routine itself was written by Fizzer.
vec3 cosDir(in vec3 p, in vec3 n){

   vec2 rnd = hash23(p);
   float u = rnd.x;
   float v = rnd.y;

   // Method 1 and 2 first generate a frame of reference to use with an arbitrary
   // distribution, cosine in this case. Method 3 (invented by fizzer) specializes
   // the whole math to the cosine distribution and simplfies the result to a more
   // compact version that does not depend on a full frame of reference.

   // Method by fizzer: http://www.amietia.com/lambertnotangent.html
   float a = 6.2831853*v;
   u = 2.*u - 1.;
   return normalize(n + vec3(sqrt(1. - u*u)*vec2(cos(a), sin(a)), u));

}

// This  is heavily based on XT95's pseudo path tracing ambient occlusion
// function. It's a faux effect, but it can give a scene a slight multiple
// bounce path traced feel.
float calcAO(in vec3 p, in vec3 n){

   float sca = 2., occ = 0.;
   for(int i = 0; i<16; i++){

      float hr = float(i + 1)*.5/16.;
      //float fi = float(i + 1);
      //vec3 rnd = vec3(hash31(p + fi), hash31(p + fi + .1), hash31(p + fi + .3)) - .5;
      //vec3 rn = normalize(n + rnd*.15);
      vec3 rn = cosDir(p + n*hr, n);
      // Random half hemisphere vector.
      float d = map(p + rn*hr);

      occ = occ + max(hr - d, 0.)*sca;
      sca *= .7;
   }

   return clamp(1. - occ, 0., 1.);

}
#else
// I keep a collection of occlusion routines... OK, that sounded really nerdy. :)
// Anyway, I like this one. I'm assuming it's based on IQ's original.
float calcAO(in vec3 p, in vec3 n){

   float sca = 2., occ = 0.;
   for( int i = 0; i<6; i++ ){

      float hr = float(i + 1)*.25/6.;
      float d = map(p + n*hr);
      occ += (hr - d)*sca;
      sca *= .7;
   }

   return clamp(1. - occ, 0., 1.);
}
#endif

/////////////

// Surface bump function: To save cycles, I was forced to take the
// window routine outside of the raymarching function, and apply
// it in bump mapped form. It works, I guess, but it would have been
// nice to raymarch the windows... Maybe next time, or next decade. :)
float bumpSurf3D(in vec3 p, in vec3 n){

   // Calling the map function to obtain some values.
   map(p);
   vec4 svVal = gVal;
   vec3 svP = gP;
   // Local 2D coorindates.
   int svPID = pID;
   // ID.
   vec2[8] svVp = vP;
   // Vertices. Those things are important.

   // vec4(d2, h, id)
   float h2 = svVal.y;
   vec2 id = svVal.zw;
   float window = 1e5;
   float py = svP.y - h2;
   float ySc = gSc.y/2.;

   // Rooftop window override.
   float rndN = floor(hash21(id + .27)*3.) + 1.;
   if(py - rndN*ySc + ySc*12.>0.) return 1.;

   // Repeat Y levels.
   float ipy = floor(py/ySc);
   py -= (ipy + .5)*ySc;
   //mod(py, ySc) - ySc/2.;
   vec3 q3 = vec3(svP.x, py, svP.z);

   // Placing random windows on each side of the square
   // or triangle cells.
   //for(int j = 0, i = pID - 1; j < pID; i = j, j++){
   for(int i = 0; i<svPID; i++){

      float rndI = hash21(id + vec2(i, ipy)/47.3);
      if(rndI<.6){

         // Mid edge points.
         vec2 mid = mix(svVp[i], svVp[i + 1], .5);

         vec3 qi = q3 - vec3(mid.x, 0, mid.y);

         // Normal rotation angle. Used to orientate
         // windows to the correct wall position.
         qi.xz = rot2(-atan(mid.x, mid.y))*qi.xz;
         float hole = sBoxS(qi, vec3(gSc.yy/vec2(12., 12.), gSc.x/4.), 0.);

         // Carve out the window.
         window = min(window, hole);
      }
   }

   return smoothstep(0., .1, window + .1);

}

// Standard function-based bump mapping routine: This is the cheaper four tap version.
// There's a six tap version (samples taken from either side of each axis), but this
// works well enough.
vec3 doBumpMap(in vec3 p, in vec3 n, float bumpfactor){

   // Larger sample distances give a less defined bump, but can sometimes lessen the
   // aliasing.
   const vec2 e = vec2(.001, 0);
   vec3 v0 = e.xyy;
   vec3 v1 = e.yxy;
   vec3 v2 = e.yyx;

   mat4x3 p4 = mat4x3(p, p - v0, p - v1, p - v2);

   // This utter mess is to avoid longer compile times. It's kind of
   // annoying that the compiler can't figure out that it shouldn't
   // unroll loops containing large blocks of code.

   vec4 b4;
   for(int i = 0; i<4; i++){
      b4[i] = bumpSurf3D(p4[i], n);
      if(n.x>1e5) break;
      // Fake break to trick the compiler.
   }

   // Gradient vector: vec3(df/dx, df/dy, df/dz);
   vec3 grad = (b4.yzw - b4.x)/e.x;

   // Six tap version, for comparisson. No discernible visual difference, in a lot of
   //cases.
   //vec3 grad = vec3(bumpSurf3D(p - e.xyy) - bumpSurf3D(p + e.xyy),
   //                 bumpSurf3D(p - e.yxy) - bumpSurf3D(p + e.yxy),
   //                 bumpSurf3D(p - e.yyx) - bumpSurf3D(p + e.yyx))/e.x*.5;

   // Adjusting the tangent vector so that it's perpendicular to the normal. It's some
   // kind of orthogonal space fix using the Gram-Schmidt process, or something to that
   // effect.
   grad -= n*dot(n, grad);

   // Applying the gradient vector to the normal. Larger bump factors make things more
   // bumpy.
   return normalize(n + grad*bumpfactor);

}

vec3 render(vec3 ro, vec3 rd) {

   // Direct lighting.
   const vec3 ld = normalize(-vec3(5, -4, -2));

   // Raymarch.
   float t = trace(ro, rd);

   // Saving various values.
   vec4 svVal = gVal;
   vec3 svP = gP;
   // Local coordinates.
   vec2[8] svVp = vP;
   // 2D polygon vertices.
   int svPID = pID;
   // Polygon ID.
   int svObjID = objID;
   // Object ID.

   // Sky.
   vec3 sky = vec3(1, .475, .251)*1.5;
   sky = mix(sky, sky.xzy, rd.y*.35 + .35)*3.;

   // Initialize the scene color to that of the sky.
   vec3 col = sky;

   // We've hit a scene object, so light it up.
   if (t<FAR){

      // Position and normal.
      vec3 p = ro + rd*t;
      vec3 n = normal(p);

      // Function based bump mapping.
      n = doBumpMap(p, n, .5);

      // Shadows and ambient occlusion.
      float shd = softShadow(p, ld, n, 8.);
      float ao = calcAO(p, n);

      // Diffuse.
      float dif = max(dot(ld, n), 0.);

      // Half vector specular.
      vec3 hf = (ld - rd)/2.;
      float spe = pow(max(dot(hf, n), 0.), 8.);

      // Polygon color.
      vec3 oCol = sky;

      /*
        // Mixed colors.
        float rnd = hash21(svVal.zw + float(svObjID) + .1);
        vec3 pCol = .5 + .45*cos(6.2831*rnd/2. + vec3(0, 1, 2)*.7);
        pCol /= (pCol + 1.)/2.5;//
        vec3 oCol = pCol*1.5 + sky*.5;
        oCol *= 1. + .25*n.yzx;
        oCol = mix(oCol*1., sky, .5);
        */

      // Pointed roof color.
      if(svObjID==2) oCol *= .8;

      // Polygon edges.
      float ew = .008;
      //.008;
      float bord = abs(svVal.x) - ew;
      float h = abs(p.y - svVal.y + 4. + ew/2.) - ew;
      float edge = max(bord, h);

      // Polygon vertical vertex-based edges.
      float vertLn = 1e5;
      // Local 2D cell coordinates.
      vec2 q2 = svP.xz;

#ifdef MINARET
      if(svPID>3 && hash21(svVal.zw + .2)<.4){
         // Rooftop edges.
         float ySc = gSc.y/2.;
         float rndN = floor(hash21(svVal.zw + .27)*3.) + 1.;
         float h2 = p.y - svVal.y + 4. - rndN*ySc + ew/2.;

         edge = min(edge, abs(h2) - ew);

         for(int i = 0; i<svPID; i++){

            // Polygon sides.
            //vertLn = min(vertLn, length(q2 - svVp[i]) - ew);
            // Minaret sides.
            //float l = (gSc.x/2. - gSc.x*gSc.x*.25);
            //vertLn = min(vertLn, length(q2 - normalize(svVp[i])*gSc.x*.275) - ew);

            // Roof edges.
            float lnRf = distLineS(q2, vec2(0), normalize(svVp[i])*gSc.x*.275);
            edge = min(edge, abs(lnRf) - ew);

         }

      }
#endif

      // All vertical polygon sides.
      for(int i = 0; i<svPID; i++){

         edge = min(edge, length(q2 - svVp[i]) - ew);
      }

      // Back scatter.
      float bl = max(dot(vec3(-ld.x, 0., -ld.z), n), 0.);
      oCol += oCol*sky*bl/3.;

      //oCol = vec3(.4, .1, 1) + sky*.1;
      vec3 tx = tex3D(iChannel0, p/2. + .5, n);
      //float gr = dot(tx, vec3(.299, .587, .114));
      oCol *= min(tx*2. + .45, 1.);

      /*
        // Rim lighting. Kind of cool, but no for this example. By the
        // way, if you want to see some nice examples that use rim lighting,
        // have a look at SL0ANE's demonstrations.
        vec3 rimColor = vec3(1, .1, .2);
        // Edge glow.
        float edgeG = 1. - max(dot(n, -rd), 0.0);
        edgeG = pow(edgeG, 5.);
        oCol += oCol*rimColor*edgeG*8.;
        */

      // Applying the lighgting above... incorrectly, but it looks OK. :)
      col = oCol*(.1 + dif*shd + spe*shd + (shd*.5 + .5)*sky*.05);
      col *= ao;

      // Apply the edges.
      col = mix(col, col*.5, 1. - smoothstep(0., .003, edge));

   }

   // Exponential fog.
   col = mix(sky, col, exp(min(7. - t, 0.)/4.));
   //col = mix(col, sky, smoothstep(.25, .65, t/FAR));

   // Scene color.
   return col;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord){

   // Aspect correct coordinates.
   vec2 uv = (fragCoord - iResolution.xy*.5)/iResolution.y;

   // Poor man's fancy cinema effect. :D
   //if(abs(uv.y)>.4){ fragColor = vec4(0); return; }

   // Storage for polygon vertices. Usually, you need enough to handle the one with
   // the largest number of sides, which in this case is a hexagon. However, some
   // GPUs hate wrapping, so I've put in a couple of extra spaces, then set the
   // seventh position to the first. When subdivding, into triangles or squares,
   // we'll set the fourth and fifth positions to the first... GPUs are fast, but
   // can be really annoying to code for. :)
   //
   // Initialize the hexagon vertices.
   //float ratio = fract(iTime/2.);// 1./2. + sin(iTime)/4.;//fract(iTime);//
   float ratio = sqrt(2.)/4.;
   // 1./4.;//
   vec2 e0 = mix(v[0], v[1], ratio);
   e = mat4x2(e0, vec2(e0.y, -e0.x), -e0.xy, vec2(-e0.y, e0.x));

   vPInit = vec2[8](v[1] + (v[1] - e[1]), e[1], e[2], v[3] + (v[3] - e[3]), e[3], e[0],
   v[1] + (v[1] - e[1]), vec2(0));

   // Camera Setup.
   vec3 lk = vec3(0, 1, iTime/2.);
   // Camera position, doubling as the ray origin.
   vec3 ro = lk + vec3(0, 2, -2);
   // "Look At" position.

   // Using the Z-value o perturb the XY-plane.
   // Sending the camera, "look at," and light vector down the path. The "path" function is
   // synchronized with the distance function.
   ro.xy += path(ro.z);
   lk.xy += path(lk.z);

   // Using the above to produce the unit ray-direction vector.
   float FOV = 3.14159/3.;
   // FOV - Field of view.
   vec3 fwd = normalize(lk - ro);
   vec3 rgt = normalize(vec3(fwd.z, 0., -fwd.x ));
   vec3 up = cross(fwd, rgt);

   // rd - Ray direction.
   vec3 rd = normalize(uv.x*rgt + uv.y*up + fwd/FOV);

   // Camera swivel - based on path position.
   vec2 sw = path(lk.z);
   rd.xy *= rot2(sw.x/16.);
   rd.yz *= rot2(-sw.y/16.);

   // Scene render.
   vec3 col = render(ro, rd);

   // Rough vignette and tone mapping.
   col *= smoothstep(.88, .25, length(fragCoord/iResolution.xy - .5));
   col = uTone(col);

   // Rough gamma correction and screen presentation.
   fragColor = vec4(pow(max(col, 0.), vec3(1)/2.2), 1);

}
