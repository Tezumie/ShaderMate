# ShaderMate

Drop a GLSL shader on any canvas. ShaderToy and FragCoord.xyz compatible, multi-pass, zero dependencies. Works in plain HTML, ES modules, React, and next to other canvas libraries.

**[Docs](https://tezumie.github.io/ShaderMate/docs/)** · **[Examples](https://tezumie.github.io/ShaderMate/examples/)** · [npm](https://www.npmjs.com/package/shadermate)

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
import { createGui } from 'shadermate/gui';                   // optional tweak panel (needs `npm i lil-gui`)
import { ShaderCanvas, useShader } from 'shadermate/react';   // optional React bindings
```

Built-in uniforms (`iTime`, `iResolution`, `iMouse`, `u_time`, `u_mouse` …) are declared for you. Paste a ShaderToy shader, or a whole FragCoord.xyz multi-pass export, and it runs.

## Documentation

| | |
| --- | --- |
| [Getting started](https://tezumie.github.io/ShaderMate/docs/getting-started/) | Install, first shader, compile errors |
| [Writing shaders](https://tezumie.github.io/ShaderMate/docs/writing-shaders/) | `mainImage` vs `main`, built-in uniforms, includes |
| [Uniforms](https://tezumie.github.io/ShaderMate/docs/uniforms/) | Types, live updates, tweens |
| [Multipass & channels](https://tezumie.github.io/ShaderMate/docs/multipass/) | Passes, ping-pong, video / audio / canvas inputs |
| [Options](https://tezumie.github.io/ShaderMate/docs/options/) · [Instance API](https://tezumie.github.io/ShaderMate/docs/instance-api/) | Reference |
| [ShaderToy & FragCoord.xyz](https://tezumie.github.io/ShaderMate/docs/shadertoy-fragcoord/) | Paste-compatibility |

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
