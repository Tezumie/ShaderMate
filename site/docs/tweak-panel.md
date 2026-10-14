---
title: Tweak panel
group: Integrations
order: 31
description: Turn uniforms into sliders and colour pickers with the optional GUI add-on.
---

# Tweak panel

The add-on builds a [lil-gui](https://lil-gui.georgealways.com/) panel from your uniforms. It is optional and kept out of the core bundle.

```js
import { createGui } from 'shadermate/gui';        // npm i lil-gui
const gui = await createGui(sm, { title: 'Hero', controls: true });
```

For `<script>` users:

```html
<script src="https://cdn.jsdelivr.net/npm/shadermate@2/dist/shadermate.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/shadermate@2/dist/shadermate-gui.min.js"></script>
<script>ShaderMate.createGui(sm);</script>
```

## Describing controls

Uniform hints turn plain values into the right control:

```js
uniforms: {
  u_glow:  { value: 1,         min: 0, max: 4, step: 0.01, label: 'Glow' },   // slider
  u_tint:  { value: [1, 1, 1], color: true },                                  // colour picker
  u_wire:  true,                                                                // checkbox
}
```

## Options

| Option | Meaning |
| --- | --- |
| `title` | Panel title. |
| `container` | Mount inside an element instead of the page corner. |
| `width`, `open` | Size and initial open state. |
| `controls` | Add a Playback folder: play and pause, time scale, screenshot, record, stats. Default `true`. |
| `uniforms` | `true`, `false`, or an array of names to expose. |
| `theme` | Colours. Defaults to the instance's `theme`. Pass `false` to keep lil-gui's own look. |

`createGui` resolves with the lil-gui instance, so you can add your own folders and controllers.
