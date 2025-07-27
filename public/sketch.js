// ShaderMate Demo Configurations
// ==============================
// This file contains multiple shader pipeline setups for ShaderMate.
// Each pipeline is an array of passes (render steps) with relevant settings.
// Use `startShaderMate(passesArray)` to start a specific pipeline.
//
// Each pass object includes:
// - `name`:     Identifier of the pass (used in `channels` or for ping-pong)
// - `src`:      Path to the fragment shader file
// - `size`:     Render size ("screen", "half", or [w, h])
// - `screen`:   Whether this is the final pass (renders to screen)
// - `channels`: Inputs to the shader: either other passes or external textures
// - `pingpong`: Enables read/write feedback (used in animated buffers)
// - `float`:    Use floating point textures (needed for some buffer math)


// ========== Texture Example: Voronoi Shader ==========
const voronoiPasses = [
   {
      name: "Image",
      src: "/example-shaders/Voronoi-distances.glsl",
      size: "screen",
      screen: true,
      channels: [
         { url: "/assets/rgbanoise.png", wrap: "repeat", filter: "nearest" }, // iChannel0 = noise texture
         null, null, null
      ]
   }
];
//startShaderMate(voronoiPasses);
// Reference: https://www.shadertoy.com/view/ldl3W8


// ========== #include Example: Snub City ==========
const snubCity = [
   {
      name: "SnubCity",
      src: "/example-shaders/multipass/snubcity/snubCity.glsl",
      size: "screen",
      screen: true,
      float: false,
      channels: [
         {
            url: 'https://www.shadertoy.com/media/ap/95b90082f799f48677b4f206d856ad572f1d178c676269eac6347631d4447258.jpg',
            wrap: 'repeat',
            filter: 'mipmap'
         }, // iChannel0 = city texture
         null, null, null
      ]
   }
];
// startShaderMate(snubCity); 
// Reference: https://www.shadertoy.com/view/W3V3zR


// ========== Multi-pass Example: Simple Feedback Loop ==========
const multipassExample = [
   {
      name: "A",
      src: "/example-shaders/multipass/simple/bufferA.glsl",
      size: "screen",
      pingpong: true,  // Enables feedback (reads previous frame)
      float: true,     // Enables high precision buffers
      channels: [
         { pass: "A", buffer: "prev" }, // iChannel0 = previous frame from A
         null, null, null
      ]
   },
   {
      name: "Image",
      src: "/example-shaders/multipass/simple/image.glsl",
      size: "screen",
      screen: true,
      channels: [
         { pass: "A" }, // iChannel0 = current frame from A
         null, null, null
      ]
   }
];

startShaderMate(multipassExample); // Run this setup


// ========== Other Available Shader Demos ==========
// Uncomment any of these to preview individual effects:

// startShaderMate('/example-shaders/Just_another_cube.glsl'); // https://www.shadertoy.com/view/3XdXRr
// startShaderMate('/example-shaders/Cyber_Fuji_2020.glsl');   // https://www.shadertoy.com/view/Wt33Wf
// startShaderMate('/example-shaders/Clearly_a_bug.glsl');     // https://www.shadertoy.com/view/33cGDj
// startShaderMate('/example-shaders/Seascape.glsl');          // https://www.shadertoy.com/view/Ms2SD1
// startShaderMate('/example-shaders/Wolfenstein_3D.glsl');    // https://www.shadertoy.com/view/4sfGWX
// startShaderMate('/example-shaders/Shader_Art_Coding_Introduction.glsl'); // https://www.shadertoy.com/view/mtyGWy

// startShaderMate('frag.glsl'); //README Example

// No-auto-setup example:
// startShaderMate('/example-shaders/manual-setup.glsl', { autoSetup: false }); 
