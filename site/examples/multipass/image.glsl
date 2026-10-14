// Tone-map the flow buffer and add a cheap glow.
uniform float u_exposure;
uniform float u_glow;

void mainImage(out vec4 o, in vec2 fc) {
    vec2 uv = fc / iResolution.xy;
    vec3 c = texture(iChannel0, uv).rgb;

    // 5-tap blur for glow (the buffer is half-res + linear, so taps are cheap and soft)
    vec2 px = 4.0 / iResolution.xy;
    vec3 g = texture(iChannel0, uv + vec2(px.x, 0.0)).rgb + texture(iChannel0, uv - vec2(px.x, 0.0)).rgb
           + texture(iChannel0, uv + vec2(0.0, px.y)).rgb + texture(iChannel0, uv - vec2(0.0, px.y)).rgb;
    c += g * 0.25 * u_glow;

    c *= u_exposure;
    c = c / (1.0 + c);                      // Reinhard
    c = pow(c, vec3(0.9));
    c *= 1.0 - 0.4 * dot(uv - 0.5, uv - 0.5); // vignette
    o = vec4(c, 1.0);
}
