# ShaderMate

[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-♥-EA4AAA?logo=githubsponsors&logoColor=white)](https://github.com/sponsors/Tezumie)
[![npm](https://img.shields.io/npm/v/shadermate?color=c6ff3d&labelColor=05050a)](https://www.npmjs.com/package/shadermate)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Drop a GLSL shader on any canvas. ShaderToy and FragCoord.xyz compatible, multi-pass, zero dependencies. Works in plain HTML, ES modules, React, and next to other canvas libraries.

**[Website](https://tezumie.github.io/ShaderMate/)** · **[Docs](https://tezumie.github.io/ShaderMate/docs/)** · **[Examples](https://tezumie.github.io/ShaderMate/examples/)** · [Playground](https://tezumie.github.io/ShaderMate/examples/livecode/) · [Changelog](https://tezumie.github.io/ShaderMate/docs/changelog/) · [npm](https://www.npmjs.com/package/shadermate)

```html
<canvas id="hero"></canvas>
<script src="https://cdn.jsdelivr.net/npm/shadermate@2/dist/shadermate.min.js"></script>
<script>
  ShaderMate.createShader({
    canvas: '#hero',
    shader: `
      void mainImage(out vec4 fragColor, in vec2 fragCoord) {
        vec2 uv = fragCoord / iResolution.xy;
        fragColor = vec4(0.5 + 0.5 * cos(iTime + uv.xyx + vec3(0, 2, 4)), 1.0);
      }`
  });
</script>
```

```bash
npm i shadermate
```

```js
import { createShader } from 'shadermate';
import { createGui } from 'shadermate/gui';                 // optional tweak panel (needs `npm i lil-gui`)
import { ShaderCanvas, useShader } from 'shadermate/react';   // optional React bindings
```

Built-in uniforms (`iTime`, `iResolution`, `iMouse`, `u_time`, `u_mouse` …) are declared for you. Paste a ShaderToy shader, or a whole FragCoord.xyz multi-pass export, and it runs.

What's in the box: multipass and ping-pong float buffers, images / video / webcam / audio / canvas channels, tweenable uniforms, pointer input scoped to any element, screenshots and WebM recording, pause-when-hidden, inline compile errors, a tweak panel, React bindings and TypeScript types. Many instances can share one canvas (one WebGL context) and switch with `play()` / `pause()`.

## Documentation

| | |
| --- | --- |
| [Getting started](https://tezumie.github.io/ShaderMate/docs/getting-started/) | Install, first shader, compile errors |
| [Writing shaders](https://tezumie.github.io/ShaderMate/docs/writing-shaders/) | `mainImage` vs `main`, built-in uniforms, includes |
| [Uniforms](https://tezumie.github.io/ShaderMate/docs/uniforms/) | Types, live updates, tweens |
| [Multipass & channels](https://tezumie.github.io/ShaderMate/docs/multipass/) | Passes, ping-pong, video / audio / canvas inputs |
| [Options](https://tezumie.github.io/ShaderMate/docs/options/) · [Instance API](https://tezumie.github.io/ShaderMate/docs/instance-api/) | Reference |
| [ShaderToy & FragCoord.xyz](https://tezumie.github.io/ShaderMate/docs/shadertoy-fragcoord/) | Paste-compatibility |
| [Recipes](https://tezumie.github.io/ShaderMate/docs/recipes/) | Backgrounds, hover buttons, trails, many scenes on one canvas |

The docs live in [`site/docs/`](site/docs/) as Markdown and the examples in [`site/examples/`](site/examples/).

## Development

```bash
npm install
npm run dev          # library watch + the whole site at http://localhost:8080/
npm test             # build + unit tests
npm run build:site   # static site → _site/  (what GitHub Pages serves)
npm run preview      # serve _site/ locally
```

See [Contributing](https://tezumie.github.io/ShaderMate/docs/contributing/) for the repo layout and how to add an example or a docs page. `src/shaderMate.js` is the unchanged 1.x single-file library, still served from the old CDN path.

## License

MIT. The GUI script build bundles [lil-gui](https://github.com/georgealways/lil-gui) (MIT).