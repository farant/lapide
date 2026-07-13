# English Pagefind Search for the Lapide Commentary — Design

**Date:** 2026-07-12
**Status:** Design (approved for planning)

## Goal

Add full-text search to lapide.org, scoped to the **English Cornelius a Lapide
biblical commentary** (Genesis through Apocalypse, chapters + front-matter).
Search must, on click, **scroll to and highlight the matched text** on the
(often very large) target page — not just open the page at the top.

Search is powered by [Pagefind](https://pagefind.app), a static-site search
library that indexes built HTML at rest and serves a fully client-side,
low-bandwidth chunked index. This fits the site's constraints: plain static
HTML, no build system, served directly from the repo via GitHub Pages
(`lapide.org`, CNAME, no CI).

## Scope

**In scope (v1):**
- Marker audit/normalize tooling so the search index covers exactly the English
  Lapide corpus.
- Building and committing the Pagefind index.
- A dedicated English search page.
- Scroll-to-match **and** term highlighting on result pages (Pagefind highlight
  feature — "Approach 2").

**Out of scope (v1, candidate fast-follows):**
- Search for non-English languages.
- Search for the related patristic/medieval author works (`*/` subdirectories).
- Anchor-based deep-link URLs (`page.html#verse-18`) for shareable/no-JS-fallback
  links ("Approach 1"). The `id` anchors remain available for this later.
- Clean `data-pagefind-meta` result titles.
- Embedding the search box into `index.html` (v1 uses a standalone page).

## Canonical page definition

A page is an **English Lapide commentary page** (and therefore search-indexed)
iff ALL of:
- root-level (not in a subdirectory), and
- English (filename has no known language suffix — reuses the suffix set from
  `update-site.ts`), and
- basename matches `^[0-9]{2}_` (all biblical books + front-matter are numbered
  `NN_…`; covers both `NN_book_NN.html` chapters and `NN_Book_Argumentum.html`
  etc.), and
- not an index page (`^index`), and
- not in a small explicit exclusion list.

**Exclusion list (reviewable):**
- `02_Clemens_Hieronymi_Du_Culte.html` — Jerome/Lacordaire related work, not
  Lapide's commentary.
- `index.html` — multilingual landing page (excluded by the `^index` rule).

This rule was validated against the repo: the only English root pages it drops
are `index.html` and leftover `tmp_*` translation stragglers — **no real
commentary is hidden**.

## Current-state audit (measured 2026-07-12)

`data-pagefind-body` was previously stamped onto page `<body>` tags in
anticipation of this work, but indiscriminately. The marker is Pagefind's
page-selection mechanism: *if any page has it, Pagefind indexes only marked
pages.* So the marker set must be made to mean exactly the canonical set.

- Canonical English-Lapide set: **1,250 pages**, of which **1,214 already marked**.
- **MISSING (36):** canonical pages lacking the marker — almost all Apocalypse
  chapters + front-matter, plus late Catholic epistles (I–III John, Jude),
  i.e. commentary added after the original stamping. → add marker.
- **EXTRA (308):** marked but not canonical →
  - 273 non-English root (Latin 201, Polish 24, Italian 22, Japanese 14,
    German 12) — marker copied during translation. → strip.
  - 29 author-subdir pages (Bede, Bernard, Basil, Guigo *Meditationes*, Adam
    Scotus, …). → strip.
  - 4 leftover `.tmp-ch{3,4,5,6}lt/frag1.html` — Latin translation fragments in
    hidden temp dirs (cruft). → **delete** (see Risks/notes); not merely strip.
  - `02_Clemens_Hieronymi_Du_Culte.html` — related work. → strip.
  - `index.html` — landing page. → strip.
- Quotes (`quotes_*/`): 0 marked. → unchanged.

## Components

### A. `pagefind-pages.ts` — audit + normalize tool

A single bun/TypeScript script, sibling to `update-site.ts` / `fix-quotes.ts`,
with one shared `isEnglishLapidePage(relPath)` function (single source of truth
for the canonical rule). Two modes:

- **`--check` (default, read-only):** prints MISSING and EXTRA (categorized),
  exits non-zero on any drift. Run anytime to eyeball the boundary.
- **`--fix`:** normalizes the two per-page markers on the `<body>` tag / page:
  1. `data-pagefind-body` on `<body>` — present iff canonical.
  2. Pagefind highlight `<script>` include before `</body>` — present iff
     canonical (see Component D).
  Adds to canonical pages missing them; strips from non-canonical pages that
  have them. Idempotent; safe to re-run. Run after adding new commentary pages.

Operates specifically on the `<body>` open tag (not arbitrary occurrences) and
handles `<body>` with/without existing attributes.

### B. Index build & serve

- Build: `bunx pagefind --site .` → writes the `pagefind/` output directory
  (index chunks + `pagefind-ui.js/css` + `pagefind-highlight.js`). Pagefind
  honors `data-pagefind-body`, so only the normalized canonical set is indexed.
- **Commit `pagefind/`** — GH Pages serves the repo directly, so the index must
  be in the repo. It is a committed build artifact (a few MB across many small
  chunk files) that changes wholesale on rebuild.
- **Add `.nojekyll`** at repo root so GH Pages serves the index files without
  Jekyll processing.

### C. Search UI — `search.html`

Dedicated English page using Pagefind's drop-in UI, styled to match `style.css`,
linked from the nav / `index.html`. Configures the highlight param so result
links carry the search terms:

```html
<link href="/pagefind/pagefind-ui.css" rel="stylesheet">
<script src="/pagefind/pagefind-ui.js"></script>
<div id="search"></div>
<script>
  window.addEventListener('DOMContentLoaded', () => {
    new PagefindUI({ element: "#search", showSubResults: true,
                     highlightParam: "highlight" });
  });
</script>
```

### D. Scroll-to-match + highlight (Approach 2)

Pagefind's highlight feature, which is **text-based and requires no `id`
anchors** — it works uniformly across dense-anchor (Genesis) and sparse-anchor
(Isaiah, Ecclesiasticus) pages alike.

- The UI's `highlightParam` appends `?highlight=<terms>` to each result URL.
- Each canonical content page includes the Pagefind highlight script (injected
  by `pagefind-pages.ts --fix`), which reads the param, wraps matches in
  `<mark>`, and scrolls the first into view. Scoped to the content region
  (e.g. the `data-pagefind-body` element) to avoid highlighting nav.
- Overhead on normal (non-search) page views is negligible: the script
  early-returns when `?highlight=` is absent.

*Exact Pagefind highlight API (script filename, constructor/init signature,
scope option) to be confirmed against the installed Pagefind version during
implementation; the approach is version-independent.*

## Rebuild workflow (three explicit steps)

Kept separate — each does one thing; the slow, large-artifact index build should
not fire on every hreflang tweak. Documented in `CLAUDE.md`:

1. `bun update-site.ts` — hreflang + sitemap + favicon (unchanged).
2. `bun pagefind-pages.ts --fix` — normalize search markers + highlight script.
3. `bunx pagefind --site .` — rebuild the committed `pagefind/` index.

Then commit (including `pagefind/`).

## Risks / notes

- `pagefind/` is a committed binary-ish artifact; rebuilds produce large diffs.
  Acceptable for a static GH Pages site.
- `data-pagefind-body` is assumed to be a Pagefind-only marker with no other
  effect on the site (confirmed: only the Pagefind attribute name; the site's
  other JS concerns `entity-ref`/components, unrelated).
- Injecting a script into 1,250 pages is a broad change, but mechanical and
  reversible via `pagefind-pages.ts --fix` on the canonical set.
- Leftover translation cruft exists in the repo: root `tmp_*` files and hidden
  `.tmp-ch*lt/` directories (the latter contain marked Latin fragments). The
  canonical rule / `update-site.ts` convention skips `tmp_` and dot-dirs, but
  **Pagefind's default crawler may descend into hidden dirs** — if so, those 4
  marked fragments would contaminate the English index. Mitigation: delete the
  `tmp_*` files and `.tmp-ch*lt/` dirs as a cleanup step, and verify Pagefind's
  dot-directory behavior (add a `--glob`/exclude if needed).

## Verification

- `bun pagefind-pages.ts --check` reports 0 MISSING / 0 EXTRA after `--fix`.
- Spot-check: a non-English page (e.g. a `_lt.html`), a subdir author page, and
  `index.html` no longer contain `data-pagefind-body`; an Apocalypse chapter now
  does.
- After build, `pagefind/pagefind-entry.json` reflects ~1,250 indexed pages
  (English only).
- Manual: on `search.html`, query a term; click a result on a large page (e.g.
  an Isaiah chapter); confirm the page opens **scrolled to and highlighting** the
  matched text.
```
