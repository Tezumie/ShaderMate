uniform vec3 iResolution;
uniform float iTime;
uniform int iFrame;
uniform vec4 iMouse;
uniform sampler2D iChannel0;
// previous frame (ping-pong)

// Smooth brush
float brush(vec2 uv, vec2 pos, float size) {
   float d = distance(uv, pos);
   return exp(-d * size);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
   vec2 uv = fragCoord / iResolution.xy;

   vec4 prev = TEX(iChannel0, uv);

   // Auto-seed to avoid black start
   if (iFrame < 2) {
      prev = vec4(0.0);
   }

   // Animate subtle warp
   vec2 flow = 0.0035 * vec2(sin(iTime + uv.y * 10.0), cos(iTime + uv.x * 10.0));
   vec4 warped = TEX(iChannel0, uv + flow);

   // Mouse brush
   vec2 m = iMouse.xy / iResolution.xy;
   float b = brush(uv, m, 40.0);
   vec3 paint = vec3(0.5 + 0.5 * sin(iTime * 3.0), 0.2, 1.0) * b;
   paint *= step(0.0, iMouse.z);

   // Feedback blend
   vec3 col = warped.rgb * 0.99 + paint;

   fragColor = vec4(col, 1.0);
}
