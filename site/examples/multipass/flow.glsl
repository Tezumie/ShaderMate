// Advect the previous frame through a curl-noise field and inject ink.
uniform float u_decay;
uniform float u_speed;
uniform float u_scaleN;
uniform float u_brush;
uniform bool  u_emit;
uniform float u_clear;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + 1.0), f.x), f.y);
}
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.0 + 7.3; a *= 0.5; } return v; }

// curl of a scalar noise field = divergence-free velocity (swirly, no sinks)
vec2 curl(vec2 p) {
    float e = 0.02;
    float dx = fbm(p + vec2(e, 0.0)) - fbm(p - vec2(e, 0.0));
    float dy = fbm(p + vec2(0.0, e)) - fbm(p - vec2(0.0, e));
    return vec2(dy, -dx) / (2.0 * e);
}
vec3 pal(float t) { return 0.5 + 0.5 * cos(6.2831 * (t + vec3(0.0, 0.33, 0.67))); }

void mainImage(out vec4 o, in vec2 fc) {
    vec2 uv = fc / iResolution.xy;
    vec2 asp = vec2(iResolution.x / iResolution.y, 1.0);
    float t = iTime * 0.15;

    // where did the ink at this pixel come from?
    vec2 vel = curl(uv * asp * u_scaleN + t) * u_speed;
    vec2 src = uv - vel * 0.0025;
    vec4 prev = texture(iChannel0, src) * u_decay;

    // paint with the mouse
    vec2 m = iMouse.xy / iResolution.xy;
    if (iMouse.z > 0.0) {
        float d = distance(uv * asp, m * asp);
        prev.rgb += pal(iTime * 0.1 + m.x) * smoothstep(u_brush, 0.0, d) * 0.9;
    }

    // two orbiting emitters so the piece is alive without interaction
    if (u_emit) {
        vec2 e1 = 0.5 + 0.32 * vec2(cos(iTime * 0.6), sin(iTime * 0.9));
        vec2 e2 = 0.5 + 0.28 * vec2(sin(iTime * 0.5 + 2.0), cos(iTime * 0.7 + 1.0));
        prev.rgb += pal(iTime * 0.07) * smoothstep(0.05, 0.0, distance(uv * asp, e1 * asp)) * 0.25;
        prev.rgb += pal(iTime * 0.07 + 0.5) * smoothstep(0.05, 0.0, distance(uv * asp, e2 * asp)) * 0.25;
    }

    if (u_clear > 0.5 || iFrame < 2) prev = vec4(0.0);
    o = vec4(prev.rgb, 1.0);
}
