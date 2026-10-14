---
title: Contributing
group: Project
order: 53
description: How the repo and this site are laid out, and how to add an example or a docs page.
---

# Contributing

```
src/          the library (ES modules)       → built to dist/ by esbuild
types/        TypeScript declarations
test/         node --test unit tests
site/         this website (deployed as-is)
  index.html          landing page
  docs/*.md           documentation (Markdown + front matter)
  examples/<slug>/    one folder per example
  assets/             shared CSS and scripts
scripts/      site build and dev server
```

`src/shaderMate.js` is the unchanged 1.x single-file library, still served from the old CDN path. Please don't edit it.

## Develop

```bash
npm install
npm run dev          # library watch + site at http://localhost:8080/
npm test             # build + unit tests
npm run build:site   # full static site → _site/
```

The dev server renders docs and the example gallery on the fly and serves `/lib/` straight from `dist/`, so edits to `src/`, `site/docs/` and `site/examples/` show up on reload.

## Add an example

1. Create `site/examples/<slug>/index.html`. Load the library from `../../lib/shadermate.js` (or `shadermate.esm.js`) and the shared styles from `../../assets/site.css`.
2. Add `example.json` next to it:

   ```json
   { "title": "Plasma tunnel", "tag": "Shaders", "description": "One sentence for the card.",
     "code": "createShader · pointer.smooth", "order": 8, "featured": false }
   ```

   `tag` groups it in the gallery filter bar (reuse an existing tag where one fits).
3. Add `thumb.glsl`, a tiny shader used for the live card thumbnail.
4. Put `<!--BACK-->` just inside `<body>`. The build replaces it with the floating "Examples / Docs / View source" bar.

The gallery and the home page's featured row are generated from those files; there is no list to edit. Set `"featured": true` to show it on the home page. In the build, `<!--HEAD-->` style markers in a page are replaced with shared head tags; look at an existing example before adding a new kind of page.

## Add a docs page

Create `site/docs/<name>.md` with front matter:

```md
---
title: Page title
group: Guide        # sidebar section
order: 11           # position in the sidebar (global, across groups)
description: One line for search engines and link previews.
---
```

Use relative links between pages (`../options/`). Headings become anchors and the right-hand table of contents. Callouts use GitHub's syntax:

```md
> [!NOTE]
> Also TIP, WARNING and IMPORTANT.
```

The page is added to the sidebar, the search index (`Ctrl K`), the sitemap and the previous/next links automatically.

## Fonts and design tokens

Fonts are self-hosted variable files in `site/assets/fonts/`. Colours, spacing and type scale are CSS custom properties at the top of `site/assets/site.css`. Change a token there rather than a literal in a page.

## Deploy

Pushing to `main` runs `.github/workflows/site.yml`, which tests the library, builds `_site/` and publishes it with GitHub Pages. All links are relative, so it works at `https://<user>.github.io/ShaderMate/` or on a custom domain without changes.
