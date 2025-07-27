uniform vec3 iResolution;
uniform sampler2D iChannel0;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
   vec2 uv = fragCoord / iResolution.xy;

   vec3 col = TEX(iChannel0, uv).rgb;

   // Soft bloom-style tone mapping
   col = col / (1.0 + col);

   // Mild chromatic offset
   float offset = 1.5 / iResolution.x;
   float aspect = iResolution.x / iResolution.y;

   float r = TEX(iChannel0, uv + vec2(-offset, 0.0)).r;
   float g = TEX(iChannel0, uv).g;
   float b = TEX(iChannel0, uv + vec2(offset, 0.0)).b;
   col = vec3(r, g, b);

   // Vignette
   vec2 toCenter = uv - 0.5;
   col *= 0.85 + 0.15 * exp(-8.0 * dot(toCenter * vec2(aspect, 1.0), toCenter));

   // Gamma correction
   col = pow(col, vec3(0.4545));

   fragColor = vec4(col, 1.0);
}
