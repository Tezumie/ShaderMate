// Demo sketch: colorful raymarched blobs
// Uses: iTime, iResolution
uniform vec3 iResolution;
uniform float iTime;
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / iResolution.xy;
    fragColor = vec4(uv, 0.5 + 0.5 * sin(iTime), 1.0);
}