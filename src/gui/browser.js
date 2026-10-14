// <script> build of the GUI addon (bundles lil-gui). Load after shadermate.js:
//   <script src="dist/shadermate.js"></script>
//   <script src="dist/shadermate-gui.js"></script>
//   const gui = await ShaderMate.createGui(sm, { title: 'Hero' });
//
// Same name as the module export (`import { createGui } from 'shadermate/gui'`).

import { createGui, GUI } from './index.js';

const ns = globalThis.ShaderMate || (globalThis.ShaderMate = {});
ns.createGui = createGui;
ns.GUI = GUI;
