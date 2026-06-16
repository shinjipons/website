# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Personal website and blog for Shinji Pons (a product designer), built with **Astro 6** and deployed to **Vercel** at `shinjipons.com`. The site is a small, content-driven static site: a single home page listing work/projects/experiments plus a Markdown-backed `writing` (blog) collection. There is no UI framework — pages are `.astro` components with vanilla TypeScript for client-side behavior.

## Commands

```bash
npm run dev      # Start the Astro dev server (local development)
npm run build    # Production build to dist/
npm run preview  # Preview the production build locally
```

There is **no test suite, linter, or typecheck script** configured. Formatting is enforced by Prettier (`.prettierrc`: hard tabs, tab width 2). Run `npx prettier --write .` to format. `npx astro check` can be used for type diagnostics, but it is not wired into a script.

## Architecture

### Routing & pages
- `src/pages/index.astro` — the entire home page. All non-blog content (social links, work experience, work projects, side projects, experiments) is hardcoded as **arrays in the frontmatter** of this file and rendered into `<section>`s. To edit the home page content, edit these arrays directly. The "Updated on …" date is derived at build time from `git log -1` via `execSync`.
- `src/pages/writing/[...slug].astro` — dynamic route that renders each blog post. Uses `getStaticPaths()` over the `writing` collection. Also builds a client-side scroll-spy side-nav from the rendered headings (only headings with an `id` are included).
- `src/layouts/BaseLayout.astro` — shared HTML shell: `<head>` meta (OpenGraph/Twitter cards), Google Fonts (Inter + Google Sans Code), Vercel `<Analytics />`, and scroll/hash-restoration scripts. Accepts `title`, optional `description`, and optional `ogImage` props.

### Content collection
- Blog posts live in `src/content/writing/*.md` and are loaded via the glob loader in `src/content.config.ts`. The frontmatter schema (Zod) requires `title`, `pubDate`, `description`, and allows optional `author` (default "Anonymous") and `ogImage`. The post's `id` (filename slug) becomes its URL: `/writing/<id>`.
- Markdown code blocks use Shiki with `github-light`/`github-dark` themes (configured in `astro.config.mjs`).
- Per-post images/videos live under `public/media/writing/<slug>/` and are referenced by absolute path (e.g. `/media/writing/.../image.png`).

### Page reveal animation
- `src/scripts/page-reveal.ts` (`initPageReveal`) drives the staggered fade-in used on both the home page and blog posts. It tags matched elements with `data-page-reveal` and a `--page-reveal-index` CSS var, then adds `page-reveal-ready` to trigger the CSS animation. It **respects `prefers-reduced-motion`** (skips the animation entirely). Each page calls it in an inline `<script>` with a CSS selector listing the elements to reveal — keep that selector in sync with the markup when adding/removing sections.
- The matching CSS lives in `src/styles/page-reveal.css`, including the `:not(.page-reveal-ready)` rules that hide elements on first paint to avoid a flash. A `from-left` variant exists for the blog side-nav.

### Styling
- Plain CSS, no preprocessor or utility framework. `src/styles/global.css` defines the design system as CSS custom properties on `:root`: spacing scale, font families/sizes, and an OkLCH color palette driven by `--principal-hue`. **Reuse these variables** rather than hardcoding values.
- `--html-font-size: 10px` makes `1rem = 10px`; sizes are expressed in `rem` accordingly (do not change this base).
- Per-area stylesheets (`home-page.css`, `blog-post.css`) are imported directly by the page/layout that uses them; `global.css` (imported by `BaseLayout`) `@import`s `page-reveal.css`.

### Unused / staged-for-future code
`src/lib/github-weekly-stats.ts` (GitHub GraphQL weekly-activity stats) and `src/lib/gallery-sphere-layout.ts` (3D sphere gallery math), plus the `gsap`, `masonry-layout`, and `split-type` dependencies, are **not currently imported anywhere**. They are scaffolding for unfinished features tracked in `.todo` (interactive canvas, sphere gallery, scroll-driven 3D). Don't assume they're wired in.

## Conventions

- **Animations**: follow `.cursor/rules/animation-guidelines.mdc`. Key points: default to `ease-out`; keep durations 0.2–0.3s (never >1s unless illustrative); use `ease` 200ms for simple hover transitions; avoid built-in CSS easings other than `ease`/`linear` (prefer the named cubic-beziers in that file); animate `transform`/`opacity` (not `top`/`left`); disable hover transitions on touch via `@media (hover: hover) and (pointer: fine)`; disable `transform` animations under `prefers-reduced-motion`.
- **Formatting**: tabs, not spaces (matches `.prettierrc` and all existing files).
- **External links** open in a new tab with `target="_blank" rel="noopener noreferrer"`.
- **Config via env**: `PUBLIC_SITE_URL` overrides the production `site` URL in `astro.config.mjs`; `GITHUB_TOKEN` is read by the (unused) stats lib. `.env` is gitignored.

## Caching (vercel.json)
`/media/*` is served `immutable` for 1 year. Favicons, `og-image.png`, and `resume-*.pdf` use a 1-day cache with `stale-while-revalidate`. Keep media filenames stable (or version them) since they are cached aggressively.
