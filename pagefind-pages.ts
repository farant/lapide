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
