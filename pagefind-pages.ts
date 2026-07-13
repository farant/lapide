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
if (new URLSearchParams(location.search).has('highlight')) {
  await import('/pagefind/pagefind-highlight.js');
  new PagefindHighlight({ highlightParam: 'highlight' });
  const scrollToFirst = (t = 0) => {
    const marks = [...document.querySelectorAll('mark.pagefind-highlight')];
    const m = marks.find((el) => !el.closest('.nav, h1')) || marks[0];
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

export function setNavIgnore(html: string, present: boolean): string {
  const re = /<div class="nav"(?: data-pagefind-ignore)?>/g;
  return html.replace(re, present ? '<div class="nav" data-pagefind-ignore>' : '<div class="nav">');
}

async function fix() {
  const files = await collectHtml();
  let changed = 0;
  for (const full of files) {
    const rel = relative(ROOT, full);
    const canonical = isEnglishLapidePage(rel);
    const before = await readFile(full, "utf-8");
    const after = setNavIgnore(setHighlightScript(setBodyMarker(before, canonical), canonical), canonical);
    if (after !== before) { await writeFile(full, after, "utf-8"); changed++; }
  }
  console.log(`Normalized ${changed} file(s).`);
}

if (import.meta.main) {
  const mode = process.argv.includes("--fix") ? "fix" : "check";
  if (mode === "check") {
    const drift = await audit();
    console.log(`\n${drift === 0 ? "OK: no drift" : `DRIFT: ${drift} file(s)`}`);
    process.exit(drift === 0 ? 0 : 1);
  }
  await fix();
}
