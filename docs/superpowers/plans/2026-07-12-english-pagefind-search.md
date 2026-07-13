# English Pagefind Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full-text search over the English Cornelius a Lapide biblical commentary (~1,250 pages), where clicking a result scrolls to and highlights the matched text on the target page.

**Architecture:** Pagefind indexes the built HTML at rest. A page-marker tool (`pagefind-pages.ts`) makes `data-pagefind-body` mean exactly "English Lapide commentary page" and injects a per-page highlight+scroll script. `bunx pagefind` builds a committed `pagefind/` index (GitHub Pages serves the repo directly). A dedicated `search.html` uses Pagefind's Default UI with `highlightParam` so result links carry the search terms; the injected page script highlights matches (`mark.pagefind-highlight`) and scrolls the first into view.

**Tech Stack:** Static HTML, `bun` (TypeScript scripts + `bun test`), Pagefind (`bunx pagefind`), GitHub Pages.

## Global Constraints

- Search scope is **English Lapide commentary only**: root-level, English (no language suffix), basename matches `^[0-9]{2}_`, not `index*`, not `02_Clemens_Hieronymi_Du_Culte`. Quotes (`quotes_*/`) and author subdirectories are excluded.
- No build system beyond `bun` scripts. Follow the existing script style of `update-site.ts` / `fix-quotes.ts` (self-contained bun/TS, run via `bun <script>.ts`).
- The `pagefind/` output directory **must be committed** (GH Pages serves the repo; CNAME `lapide.org`, no CI).
- The canonical rule lives in exactly one function (`isEnglishLapidePage`) shared by audit and normalize — never duplicate it.
- Pagefind facts (verified 2026-07-12 against pagefind.app):
  - CLI: `bunx pagefind --site . --glob "*.html"`; output default dir `pagefind/`.
  - Default UI: `new PagefindUI({ element, showSubResults, highlightParam })`; assets `/pagefind/pagefind-ui.js`, `/pagefind/pagefind-ui.css`.
  - Highlight: `import('/pagefind/pagefind-highlight.js')` then `new PagefindHighlight({ highlightParam: 'highlight' })`; applies class `pagefind-highlight`; scopes to `[data-pagefind-body]` by default. **It does NOT scroll — we add `scrollIntoView` ourselves.**
  - `data-pagefind-body`: if present on any page, only pages with it are indexed, and only that element's subtree.
- Do not commit anything to `main` without the user's go-ahead; work on a feature branch.

---

## Task 1: Remove leftover translation cruft

Delete stray temp files that carry the marker and could contaminate the index. Independent, reversible-by-git.

**Files:**
- Delete: `tmp_*.html` (root)
- Delete: `.tmp-ch3lt/`, `.tmp-ch4lt/`, `.tmp-ch5lt/`, `.tmp-ch6lt/` (and any other `.tmp-*` dirs)

- [ ] **Step 1: List what will be deleted (verify before removing)**

Run:
```bash
ls tmp_*.html 2>/dev/null; find . -maxdepth 1 -type d -name '.tmp-*'
```
Expected: the 8 `tmp_gen*`/`tmp_genesis*` files and the four `.tmp-ch{3,4,5,6}lt` dirs. If anything unexpected appears, stop and report.

- [ ] **Step 2: Delete the cruft**

Run:
```bash
rm -f tmp_*.html
find . -maxdepth 1 -type d -name '.tmp-*' -exec rm -rf {} +
```

- [ ] **Step 3: Verify no marker remains in temp locations**

Run:
```bash
ls tmp_*.html .tmp-* 2>/dev/null; echo "exit: $?"
```
Expected: no matches (nonzero exit / empty).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove leftover tmp_ / .tmp-* translation cruft"
```

---

## Task 2: `pagefind-pages.ts` — canonical rule + audit (`--check`)

Create the tool with the shared canonical function and a read-only audit that reports MISSING/EXTRA and exits nonzero on drift. TDD the pure rule with `bun test`.

**Files:**
- Create: `pagefind-pages.ts`
- Test: `pagefind-pages.test.ts`

**Interfaces:**
- Produces: `isEnglishLapidePage(relPath: string): boolean` (used by Task 3 normalize and by the audit).
- Produces: CLI `bun pagefind-pages.ts --check` printing MISSING/EXTRA, exit code `1` if any drift, `0` if clean.

- [ ] **Step 1: Write the failing test**

Create `pagefind-pages.test.ts`:
```ts
import { test, expect } from "bun:test";
import { isEnglishLapidePage } from "./pagefind-pages";

test("canonical English Lapide pages are included", () => {
  expect(isEnglishLapidePage("01_genesis_01.html")).toBe(true);
  expect(isEnglishLapidePage("81_apocalypsis_22.html")).toBe(true);
  expect(isEnglishLapidePage("77_i_joannis_argumentum.html")).toBe(true);
  expect(isEnglishLapidePage("27_Isaias_Preliminares.html")).toBe(true);
});

test("non-English root pages are excluded", () => {
  expect(isEnglishLapidePage("01_genesis_01_lt.html")).toBe(false);
  expect(isEnglishLapidePage("01_genesis_01_fr.html")).toBe(false);
  expect(isEnglishLapidePage("01_genesis_01_he.html")).toBe(false);
});

test("index, related works, subdirs, tmp are excluded", () => {
  expect(isEnglishLapidePage("index.html")).toBe(false);
  expect(isEnglishLapidePage("index_es.html")).toBe(false);
  expect(isEnglishLapidePage("02_Clemens_Hieronymi_Du_Culte.html")).toBe(false);
  expect(isEnglishLapidePage("guigo_i/Meditationes.html")).toBe(false);
  expect(isEnglishLapidePage("tmp_gen19_ar_part1.html")).toBe(false);
  expect(isEnglishLapidePage("search.html")).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test pagefind-pages.test.ts`
Expected: FAIL — cannot resolve `./pagefind-pages` / `isEnglishLapidePage` is not exported.

- [ ] **Step 3: Write minimal implementation (rule + audit)**

Create `pagefind-pages.ts`:
```ts
#!/usr/bin/env bun
// pagefind-pages.ts — audit/normalize the data-pagefind-body marker + highlight
// script so they cover EXACTLY the English Lapide commentary pages.
//   bun pagefind-pages.ts --check   (default) read-only audit; exit 1 on drift
//   bun pagefind-pages.ts --fix     normalize markers + highlight script
import { readdir, readFile, writeFile } from "fs/promises";
import { join, relative } from "path";

const ROOT = import.meta.dir;

const LANG_SUFFIXES = new Set([
  "lt","es","fr","pt","it","id","ar","hi","tl","ja","ko","de","zh","pl","ru",
  "ro","el","he","hu","nl","tr","vi","sv","sw","fa","th","ceb","yo","ig","bn",
  "ta","ml","rw","gu",
]);

// Root English pages that are NOT Lapide's own commentary.
const EXCLUDE_BASENAMES = new Set([
  "02_Clemens_Hieronymi_Du_Culte", // Jerome/Lacordaire related work
]);

export function isEnglishLapidePage(relPath: string): boolean {
  if (relPath.includes("/")) return false;      // root-level only
  if (!relPath.endsWith(".html")) return false;
  const base = relPath.slice(0, -5);
  if (base.startsWith("tmp_")) return false;
  if (/^index/.test(base)) return false;
  if (!/^[0-9]{2}_/.test(base)) return false;   // NN_ prefix = biblical books + front matter
  const li = base.lastIndexOf("_");
  if (li > 0 && LANG_SUFFIXES.has(base.slice(li + 1))) return false; // non-English
  if (EXCLUDE_BASENAMES.has(base)) return false;
  return true;
}

async function collectHtml(): Promise<string[]> {
  const out: string[] = [];
  async function walk(dir: string) {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, e.name);
      if (e.isDirectory()) {
        if (!e.name.startsWith(".") && e.name !== "node_modules") await walk(full);
      } else if (e.name.endsWith(".html")) out.push(full);
    }
  }
  await walk(ROOT);
  return out;
}

function hasMarker(html: string): boolean {
  return /<body\b[^>]*\sdata-pagefind-body/i.test(html);
}

async function audit() {
  const files = await collectHtml();
  const missing: string[] = [];
  const extra: string[] = [];
  for (const full of files) {
    const rel = relative(ROOT, full);
    const canonical = isEnglishLapidePage(rel);
    const marked = hasMarker(await readFile(full, "utf-8"));
    if (canonical && !marked) missing.push(rel);
    if (!canonical && marked) extra.push(rel);
  }
  console.log(`MISSING (canonical, no marker): ${missing.length}`);
  missing.sort().forEach((r) => console.log("  + " + r));
  console.log(`\nEXTRA (marker, not canonical): ${extra.length}`);
  extra.sort().forEach((r) => console.log("  - " + r));
  return missing.length + extra.length;
}

if (import.meta.main) {
  const mode = process.argv.includes("--fix") ? "fix" : "check";
  if (mode === "check") {
    const drift = await audit();
    console.log(`\n${drift === 0 ? "OK: no drift" : `DRIFT: ${drift} file(s)`}`);
    process.exit(drift === 0 ? 0 : 1);
  }
  // --fix implemented in Task 3
  console.log("--fix not yet implemented");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test pagefind-pages.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Run the audit against the repo (sanity)**

Run: `bun pagefind-pages.ts --check | tail -5`
Expected: reports `MISSING ... 36` and `EXTRA ... ~304` (index.html, 02_Clemens, 273 non-English root, 29 subdir authors), ends `DRIFT: 340 file(s)`, exit 1. (Exact totals may vary slightly if content changed; the point is it runs and categorizes.)

- [ ] **Step 6: Commit**

```bash
git add pagefind-pages.ts pagefind-pages.test.ts
git commit -m "feat: add pagefind-pages.ts audit (--check) for English Lapide marker set"
```

---

## Task 3: `pagefind-pages.ts` — normalize (`--fix`) with body marker + highlight script

Add the mutation mode: set/remove `data-pagefind-body` and the sentinel-wrapped highlight+scroll script so both match the canonical set. TDD the pure HTML transforms.

**Files:**
- Modify: `pagefind-pages.ts`
- Modify: `pagefind-pages.test.ts`

**Interfaces:**
- Consumes: `isEnglishLapidePage` (Task 2).
- Produces: `setBodyMarker(html: string, present: boolean): string`, `setHighlightScript(html: string, present: boolean): string`, and CLI `bun pagefind-pages.ts --fix`.

- [ ] **Step 1: Write the failing tests**

Append to `pagefind-pages.test.ts`:
```ts
import { setBodyMarker, setHighlightScript } from "./pagefind-pages";

test("setBodyMarker adds/removes idempotently", () => {
  const on = setBodyMarker("<body>\nx", true);
  expect(on).toBe("<body data-pagefind-body>\nx");
  expect(setBodyMarker(on, true)).toBe(on);                 // idempotent add
  expect(setBodyMarker(on, false)).toBe("<body>\nx");        // remove
  expect(setBodyMarker('<body class="a">\nx', true)).toBe('<body class="a" data-pagefind-body>\nx');
});

test("setHighlightScript injects before </body> and removes cleanly", () => {
  const base = "<body>\nhi\n</body></html>";
  const on = setHighlightScript(base, true);
  expect(on).toContain("pagefind-highlight.js");
  expect(on).toContain("mark.pagefind-highlight");
  expect(on.indexOf("pagefind-highlight:start")).toBeLessThan(on.indexOf("</body>"));
  expect(setHighlightScript(on, true)).toBe(on);            // idempotent
  expect(setHighlightScript(on, false)).toBe(base);         // full removal
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test pagefind-pages.test.ts`
Expected: FAIL — `setBodyMarker` / `setHighlightScript` not exported.

- [ ] **Step 3: Implement the transforms + `--fix` loop**

In `pagefind-pages.ts`, add before the `if (import.meta.main)` block:
```ts
export function setBodyMarker(html: string, present: boolean): string {
  return html.replace(/<body\b([^>]*)>/i, (_m, attrs: string) => {
    const cleaned = attrs.replace(/\s+data-pagefind-body(?:="[^"]*")?/i, "");
    return present ? `<body${cleaned} data-pagefind-body>` : `<body${cleaned}>`;
  });
}

const HL_START = "<!-- pagefind-highlight:start -->";
const HL_END = "<!-- pagefind-highlight:end -->";
const HL_BLOCK = `${HL_START}
<script type="module">
await import('/pagefind/pagefind-highlight.js');
new PagefindHighlight({ highlightParam: 'highlight' });
if (new URLSearchParams(location.search).has('highlight')) {
  const scrollToFirst = (t = 0) => {
    const m = document.querySelector('mark.pagefind-highlight');
    if (m) return m.scrollIntoView({ block: 'center' });
    if (t < 20) requestAnimationFrame(() => scrollToFirst(t + 1));
  };
  scrollToFirst();
}
</script>
${HL_END}`;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function setHighlightScript(html: string, present: boolean): string {
  const re = new RegExp(`\\n?${escapeRegExp(HL_START)}[\\s\\S]*?${escapeRegExp(HL_END)}`, "i");
  let out = html.replace(re, "");
  if (present) {
    const idx = out.lastIndexOf("</body>");
    if (idx !== -1) out = out.slice(0, idx) + HL_BLOCK + "\n" + out.slice(idx);
  }
  return out;
}

async function fix() {
  const files = await collectHtml();
  let changed = 0;
  for (const full of files) {
    const rel = relative(ROOT, full);
    const canonical = isEnglishLapidePage(rel);
    const before = await readFile(full, "utf-8");
    const after = setHighlightScript(setBodyMarker(before, canonical), canonical);
    if (after !== before) { await writeFile(full, after, "utf-8"); changed++; }
  }
  console.log(`Normalized ${changed} file(s).`);
}
```

Then replace the placeholder line `console.log("--fix not yet implemented");` with:
```ts
  await fix();
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test pagefind-pages.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Normalize the repo, then confirm zero drift**

Run:
```bash
bun pagefind-pages.ts --fix
bun pagefind-pages.ts --check
```
Expected: `--fix` reports ~340 changed; `--check` prints `OK: no drift`, exit 0.

- [ ] **Step 6: Spot-check the changes**

Run:
```bash
grep -c data-pagefind-body index.html 01_genesis_01_lt.html guigo_i/Meditationes.html   # expect 0 each
grep -c data-pagefind-body 81_apocalypsis_22.html                                        # expect 1
grep -c pagefind-highlight 81_apocalypsis_22.html                                        # expect >=1 (script present)
```
Expected: markers stripped from index/Latin/subdir; present on the Apocalypse chapter with the highlight script.

- [ ] **Step 7: Commit**

```bash
git add pagefind-pages.ts pagefind-pages.test.ts
git add -A   # the normalized content pages
git commit -m "feat: normalize pagefind markers + inject highlight/scroll script (--fix)"
```

---

## Task 4: Build and commit the Pagefind index

Add `.nojekyll`, build the index restricted to root-level HTML, verify it indexes only English Lapide pages, commit `pagefind/`.

**Files:**
- Create: `.nojekyll`
- Create: `pagefind/` (generated, committed)
- Check: `.gitignore` (ensure `pagefind/` is not ignored)

- [ ] **Step 1: Add `.nojekyll`**

Run:
```bash
touch .nojekyll
```

- [ ] **Step 2: Ensure `pagefind/` will be committed**

Run: `git check-ignore pagefind || echo "not ignored"`
Expected: `not ignored`. If it prints a matching rule, edit `.gitignore` to stop ignoring `pagefind/`.

- [ ] **Step 3: Build the index**

Run:
```bash
bunx pagefind --site . --glob "*.html"
```
Expected: downloads Pagefind on first run, then reports "Indexed N pages" where **N ≈ 1,250** (English Lapide only). `--glob "*.html"` restricts the crawl to root-level files (excludes `quotes_*/`, author subdirs); the `data-pagefind-body` markers further restrict to English Lapide.

- [ ] **Step 4: Verify only English Lapide pages were indexed**

Run:
```bash
bunx pagefind --site . --glob "*.html" 2>&1 | grep -iE 'indexed|page'
grep -o '"page_count":[0-9]*' pagefind/pagefind-entry.json 2>/dev/null || true
```
Expected: page count ≈ 1,250. If it is far higher (e.g. thousands), the marker normalization (Task 3) did not run — stop and re-check. If Pagefind reports multiple language indexes, re-run adding `--force-language en`.

- [ ] **Step 5: Commit the index**

```bash
git add .nojekyll pagefind
git commit -m "feat: build and commit Pagefind index for English Lapide commentary"
```

---

## Task 5: Search UI page (`search.html`)

Create the dedicated English search page using the Default UI with `highlightParam`, styled with the site stylesheet.

**Files:**
- Create: `search.html`

- [ ] **Step 1: Create `search.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Search — Cornelius a Lapide</title>
<link rel="stylesheet" href="style.css" />
<link rel="icon" type="image/svg+xml" href="favicon.svg">
<link rel="canonical" href="https://lapide.org/search.html">
<meta name="description" content="Search Cornelius a Lapide's English biblical commentary.">
<link href="/pagefind/pagefind-ui.css" rel="stylesheet">
</head>
<body>
<h1>Search the Commentary</h1>
<p><a href="index.html">← Back to index</a></p>
<div id="search"></div>
<script src="/pagefind/pagefind-ui.js"></script>
<script>
  window.addEventListener('DOMContentLoaded', () => {
    new PagefindUI({ element: "#search", showSubResults: true, highlightParam: "highlight" });
  });
</script>
</body>
</html>
```

- [ ] **Step 2: Serve locally and load the page**

Run (from repo root, in a separate terminal):
```bash
bunx pagefind --site . --glob "*.html" --serve
```
Then open `http://localhost:1414/search.html` (Pagefind prints the exact port). If `--serve` is unavailable, use `python3 -m http.server 8000` and open `http://localhost:8000/search.html`.
Expected: the search box renders with Pagefind UI styling.

- [ ] **Step 3: Manually verify search + highlight + scroll**

In the browser:
1. Type a distinctive term that appears deep in a long chapter (e.g. search a word from late in an Isaiah chapter).
2. Confirm results appear; click one on a large page.
3. Confirm the URL gained `?highlight=<term>`, the page **scrolls to** the matched text, and the match is wrapped in a highlight (`mark.pagefind-highlight`).

Expected: all three hold. If the term highlights but does not scroll, re-check the injected script from Task 3 (the `scrollToFirst` block and that `?highlight=` is present).

- [ ] **Step 4: Commit**

```bash
git add search.html
git commit -m "feat: add English search page (search.html) using Pagefind UI"
```

---

## Task 6: Link the search page + document the workflow

Add a search link to the English index and record the three-step rebuild ritual in `CLAUDE.md`.

**Files:**
- Modify: `index.html` (insert search link after the `<h2>Commentaries on the Bible</h2>` line)
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add the search link to `index.html`**

Find (near line 112):
```html
		<h2>Commentaries on the Bible</h2>
		<p class="epub"><a href="lapide.epub">Download epub</a></p>
```
Replace with:
```html
		<h2>Commentaries on the Bible</h2>
		<p class="epub"><a href="lapide.epub">Download epub</a></p>
		<p><a href="search.html">Search the commentary →</a></p>
```

- [ ] **Step 2: Document the rebuild workflow in `CLAUDE.md`**

Add a new top-level section to `CLAUDE.md` (e.g. after "Adding a New Language Translation"):
```markdown
## Search (Pagefind)

English Lapide commentary search is powered by Pagefind. The index lives in the
committed `pagefind/` directory and is served by GitHub Pages. The search page is
`search.html`.

**Which pages are searchable** is controlled by the `data-pagefind-body` attribute
plus an injected highlight script, both managed by `pagefind-pages.ts`. A page is
searchable iff it is English Lapide commentary (root-level, no language suffix,
`NN_` prefix, not `index*`, not `02_Clemens_Hieronymi_Du_Culte`).

**After adding or changing commentary pages, rebuild search:**

1. `bun update-site.ts` — hreflang + sitemap + favicon.
2. `bun pagefind-pages.ts --check` — audit the marker set (lists MISSING/EXTRA).
3. `bun pagefind-pages.ts --fix` — add the marker + highlight script to new English
   Lapide pages; strip it from everything else.
4. `bunx pagefind --site . --glob "*.html"` — rebuild the committed `pagefind/` index.

Then commit, including `pagefind/`. The `--glob "*.html"` restricts the crawl to
root-level files; do not remove it (it keeps `quotes_*/` and author subdirectories
out of the index). Translations must NOT carry `data-pagefind-body` — `--fix`
strips it, but avoid copying it when creating new translated files.
```

- [ ] **Step 3: Verify the index page link works**

Reload `search.html`'s sibling `index.html` on the local server; click "Search the commentary →".
Expected: navigates to the working search page.

- [ ] **Step 4: Commit**

```bash
git add index.html CLAUDE.md
git commit -m "docs: link search page from index and document Pagefind rebuild workflow"
```

---

## Self-Review notes (author)

- Spec coverage: Component A → Tasks 2–3; B → Task 4; C → Task 5; D (highlight+scroll) → Task 3 inject + Task 5 UI `highlightParam`; canonical rule → Task 2; cruft cleanup → Task 1; workflow docs → Task 6. All covered.
- Approach 1 (anchor deep-link URLs) and `data-pagefind-meta` titles are explicitly out of v1 scope (spec §Out of scope); no tasks — intentional.
- Type consistency: `isEnglishLapidePage`, `setBodyMarker`, `setHighlightScript`, sentinel constants `HL_START`/`HL_END`, class `mark.pagefind-highlight`, param `highlight` used consistently across Tasks 2/3/5.
- Deferred confirmations at implementation time: exact Pagefind "Indexed N pages" wording / entry-json key name (Task 4 Step 4 handles both); `--serve` availability (Task 5 Step 2 has a fallback).
