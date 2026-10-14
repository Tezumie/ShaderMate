// Shared look for ShaderMate's own UI (stats overlay, error overlay, GUI addon).
// Dark editor palette: VS Code "Dark Modern" tones. Override per instance with options.theme.
export const DEFAULT_THEME = {
   font: '"Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
   mono: '"Geist Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace',
   bg: '#1f1f1f',
   bgAlt: '#181818',
   raised: '#2a2d2e',
   hover: '#37373d',
   border: '#3c3c3c',
   text: '#cccccc',
   textStrong: '#ececec',
   label: '#9d9d9d',
   accent: '#4daafc',
   number: '#4daafc',
   string: '#d1977f',
   red: '#e46962',
   redSoft: '#4e3534',
   redText: '#f9dedc',
   radius: '8px',
   shadow: '0 1px 0 rgba(255,255,255,.03) inset, 0 16px 40px -16px rgba(0,0,0,.7), 0 4px 14px rgba(0,0,0,.3)',
};

export function resolveTheme(t) {
   return Object.assign({}, DEFAULT_THEME, t && typeof t === 'object' ? t : null);
}
