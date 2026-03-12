#!/usr/bin/env bun
/**
 * update-site.ts — Updates hreflang tags and regenerates sitemap.xml
 *
 * Usage: bun update-site.ts
 *
 * 1. Scans all HTML files (excluding quotes_*, tmp_*)
 * 2. Groups multilingual files by base filename
 * 3. Updates hreflang <link> tags in each file's <head>
 * 4. Regenerates sitemap.xml
 */

import { readdir, readFile, writeFile, stat } from "fs/promises";
import { join, relative } from "path";

const ROOT = import.meta.dir;
const BASE_URL = "https://lapide.org";

// Language suffix → hreflang code
const SUFFIX_TO_LANG: Record<string, string> = {
  "": "en",
  _lt: "la",
  _es: "es",
  _fr: "fr",
  _pt: "pt",
  _it: "it",
  _id: "id",
  _ar: "ar",
  _hi: "hi",
  _tl: "tl",
  _ja: "ja",
  _ko: "ko",
  _de: "de",
  _zh: "zh",
  _pl: "pl",
  _ru: "ru",
  _ro: "ro",
  _el: "el",
  _he: "he",
  _hu: "hu",
  _nl: "nl",
  _tr: "tr",
  _vi: "vi",
  _sv: "sv",
  _sw: "sw",
  _fa: "fa",
  _th: "th",
  _ceb: "ceb",
  _yo: "yo",
  _ig: "ig",
  _bn: "bn",
  _ta: "ta",
};

const KNOWN_SUFFIXES = new Set(
  Object.keys(SUFFIX_TO_LANG).filter((s) => s !== "")
);

// Prefixes to skip
const SKIP_PREFIXES = ["tmp_"];

function shouldSkip(filepath: string): boolean {
  const rel = relative(ROOT, filepath);
  if (SKIP_PREFIXES.some((p) => rel.startsWith(p))) return true;
  if (rel.startsWith("quotes")) return true;
  if (rel.startsWith(".")) return true;
  return false;
}

/**
 * Parse a filename into [baseName, langSuffix].
 * E.g. "01_Preliminares_fr.html" → ["01_Preliminares", "_fr"]
 *      "01_genesis_01.html" → ["01_genesis_01", ""]
 *      "index.html" → ["index", ""]
 */
function parseFilename(filename: string): [string, string] | null {
  if (!filename.endsWith(".html")) return null;
  const name = filename.slice(0, -5); // strip .html

  // Check if the last _XX matches a known language suffix
  const lastUnderscore = name.lastIndexOf("_");
  if (lastUnderscore > 0) {
    const suffix = name.slice(lastUnderscore);
    if (KNOWN_SUFFIXES.has(suffix)) {
      return [name.slice(0, lastUnderscore), suffix];
    }
  }

  return [name, ""];
}

/**
 * Get the URL for a file.
 * index.html → https://lapide.org/
 * others → https://lapide.org/filename.html
 */
function fileToUrl(filepath: string): string {
  const rel = relative(ROOT, filepath);
  if (rel === "index.html") return `${BASE_URL}/`;
  return `${BASE_URL}/${rel}`;
}

/**
 * Get the hreflang URL for a file.
 * index.html → https://lapide.org/
 * others → https://lapide.org/filename.html
 */
function hreflangUrl(filename: string): string {
  if (filename === "index.html") return `${BASE_URL}/`;
  return `${BASE_URL}/${filename}`;
}

async function collectHtmlFiles(): Promise<string[]> {
  const files: string[] = [];

  async function walk(dir: string) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (
          !entry.name.startsWith(".") &&
          !entry.name.startsWith("quotes") &&
          entry.name !== "node_modules"
        ) {
          await walk(full);
        }
      } else if (entry.name.endsWith(".html") && !shouldSkip(full)) {
        files.push(full);
      }
    }
  }

  await walk(ROOT);
  return files;
}

// ── Hreflang update ──

async function updateHreflang(files: string[]) {
  // Group files by base name (relative path without lang suffix)
  const groups = new Map<string, Map<string, string>>(); // basePath → Map<langSuffix, fullPath>

  for (const filepath of files) {
    const rel = relative(ROOT, filepath);
    const dir = rel.includes("/") ? rel.slice(0, rel.lastIndexOf("/") + 1) : "";
    const filename = rel.includes("/") ? rel.slice(rel.lastIndexOf("/") + 1) : rel;
    const parsed = parseFilename(filename);
    if (!parsed) continue;
    const [baseName, suffix] = parsed;
    const groupKey = dir + baseName;

    if (!groups.has(groupKey)) groups.set(groupKey, new Map());
    groups.get(groupKey)!.set(suffix, rel);
  }

  let updatedCount = 0;

  for (const [_groupKey, langFiles] of groups) {
    // Only process groups with multiple languages
    if (langFiles.size <= 1) continue;

    // Build the set of hreflang links for this group
    const hreflangLinks: string[] = [];
    // Sort by lang code for consistent ordering
    const sortedEntries = [...langFiles.entries()].sort((a, b) => {
      const langA = SUFFIX_TO_LANG[a[0]] || a[0];
      const langB = SUFFIX_TO_LANG[b[0]] || b[0];
      return langA.localeCompare(langB);
    });

    for (const [suffix, relPath] of sortedEntries) {
      const lang = SUFFIX_TO_LANG[suffix];
      if (!lang) continue;
      const url = hreflangUrl(relPath);
      hreflangLinks.push(
        `<link rel="alternate" hreflang="${lang}" href="${url}">`
      );
    }

    // Update each file in the group
    for (const [_suffix, relPath] of langFiles) {
      const fullPath = join(ROOT, relPath);
      let content = await readFile(fullPath, "utf-8");

      // Remove existing hreflang links
      const hreflangRegex =
        /\s*<link\s+rel="alternate"\s+hreflang="[^"]*"\s+href="[^"]*"\s*\/?>\s*/g;
      content = content.replace(hreflangRegex, "\n");

      // Find insertion point: before </head>
      const headCloseIdx = content.indexOf("</head>");
      if (headCloseIdx === -1) continue;

      // Clean up multiple blank lines that might result from removal
      const before = content.slice(0, headCloseIdx).replace(/\n{3,}/g, "\n\n");
      const after = content.slice(headCloseIdx);

      const newContent =
        before.trimEnd() + "\n" + hreflangLinks.join("\n") + "\n" + after;

      if (newContent !== content) {
        await writeFile(fullPath, newContent, "utf-8");
        updatedCount++;
      }
    }
  }

  console.log(`Hreflang: updated ${updatedCount} files across ${groups.size} groups (${[...groups.values()].filter(g => g.size > 1).length} multilingual)`);
}

// ── Favicon ──

function faviconLink(filepath: string): string {
  const rel = relative(ROOT, filepath);
  const depth = rel.split("/").length - 1;
  const prefix = depth > 0 ? "../".repeat(depth) : "";
  return `<link rel="icon" type="image/svg+xml" href="${prefix}favicon.svg">`;
}

async function updateFavicon(files: string[]) {
  let updatedCount = 0;

  for (const filepath of files) {
    let content = await readFile(filepath, "utf-8");
    const expectedLink = faviconLink(filepath);

    // Fix incorrect favicon paths or add missing favicon
    const faviconRegex = /<link\s+rel="icon"\s+type="image\/svg\+xml"\s+href="[^"]*favicon\.svg"\s*\/?>/;
    const match = content.match(faviconRegex);

    if (match) {
      if (match[0] === expectedLink) continue; // already correct
      // Replace incorrect path
      content = content.replace(faviconRegex, expectedLink);
      await writeFile(filepath, content, "utf-8");
      updatedCount++;
      continue;
    }

    // No favicon link at all — add one
    const headCloseIdx = content.indexOf("</head>");
    if (headCloseIdx === -1) continue;

    const before = content.slice(0, headCloseIdx);
    const after = content.slice(headCloseIdx);
    content = before.trimEnd() + "\n" + expectedLink + "\n" + after;

    await writeFile(filepath, content, "utf-8");
    updatedCount++;
  }

  console.log(`Favicon: added to ${updatedCount} files`);
}

// ── Sitemap generation ──

async function generateSitemap(files: string[]) {
  const entries: { url: string; lastmod: string; priority: string }[] = [];

  for (const filepath of files) {
    const rel = relative(ROOT, filepath);
    const url = fileToUrl(filepath);
    const fileStat = await stat(filepath);
    const lastmod = fileStat.mtime.toISOString().slice(0, 10);

    let priority = "0.8";
    if (rel === "index.html" || rel.match(/^index_\w+\.html$/)) {
      priority = rel === "index.html" ? "1.0" : "0.8";
    } else if (rel.includes("/")) {
      // Subdirectory files (non-quote, e.g. guigo_i/, adamus_scotus/)
      priority = "0.6";
    }

    entries.push({ url, lastmod, priority });
  }

  // Sort alphabetically by URL
  entries.sort((a, b) => a.url.localeCompare(b.url));

  // Put index.html first
  const indexIdx = entries.findIndex((e) => e.url === `${BASE_URL}/`);
  if (indexIdx > 0) {
    const [indexEntry] = entries.splice(indexIdx, 1);
    entries.unshift(indexEntry);
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map(
      (e) =>
        `  <url>\n    <loc>${e.url}</loc>\n    <lastmod>${e.lastmod}</lastmod>\n    <priority>${e.priority}</priority>\n  </url>`
    ),
    "</urlset>",
    "",
  ].join("\n");

  await writeFile(join(ROOT, "sitemap.xml"), xml, "utf-8");
  console.log(`Sitemap: ${entries.length} URLs written to sitemap.xml`);
}

// ── Main ──

async function main() {
  const files = await collectHtmlFiles();
  console.log(`Found ${files.length} HTML files`);

  await updateFavicon(files);
  await updateHreflang(files);
  await generateSitemap(files);

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
