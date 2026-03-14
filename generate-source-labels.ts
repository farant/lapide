#!/usr/bin/env bun
/**
 * generate-source-labels.ts — Auto-generate index/source-labels.json
 *
 * Scans index.html for linked source files and their display names,
 * then scans each source file for section headings (data-paragraph-number="1").
 *
 * Usage: bun generate-source-labels.ts
 */

import { readFile, writeFile } from "fs/promises";
import { Glob } from "bun";

const INDEX_FILE = "index.html";
const OUTPUT_FILE = "index/source-labels.json";

async function main() {
  const indexHtml = await readFile(INDEX_FILE, "utf-8");

  // Find all source file links in index.html and their display text
  // Pattern: <a href="filename.html">\n  Display Text
  const linkPattern = /<a\s+href="([^"]+\.html)"[^>]*>\s*\n?\s*([^<]+)/g;
  const fileTitles = new Map<string, string>();
  let m;
  while ((m = linkPattern.exec(indexHtml)) !== null) {
    const filename = m[1];
    const title = m[2].trim();
    // Skip language-suffixed files, quote files, index files
    if (filename.includes("/") || filename === "index.html") continue;
    if (/_[a-z]{2}\.html$/.test(filename) || /_[a-z]{3}\.html$/.test(filename)) continue;
    // Keep the first (English) title found for each file
    if (!fileTitles.has(filename)) {
      fileTitles.set(filename, title);
    }
  }

  // Also find source files that are indexed (have extractions or refs pointing to them)
  // but might not be linked from index.html
  const refsGlob = new Glob("**/*.md");
  const referencedFiles = new Set<string>();
  for await (const path of refsGlob.scan("index/refs")) {
    const content = await readFile(`index/refs/${path}`, "utf-8");
    const refMatches = content.matchAll(/`([^`]+\.html)#/g);
    for (const rm of refMatches) {
      referencedFiles.add(rm[1]);
    }
  }

  // Add referenced files not in index.html (use <title> tag as fallback)
  for (const file of referencedFiles) {
    if (!fileTitles.has(file)) {
      try {
        const html = await readFile(file, "utf-8");
        const titleMatch = html.match(/<title>([^<]+)<\/title>/);
        if (titleMatch) {
          // Strip " — Cornelius a Lapide" suffix
          const title = titleMatch[1].replace(/\s*[—–-]\s*Cornelius a Lapide.*$/i, "").trim();
          fileTitles.set(file, title);
        }
      } catch {
        // File doesn't exist locally
      }
    }
  }

  const result: Record<string, { title: string; sections: Record<string, string> }> = {};

  for (const [filename, title] of fileTitles) {
    let html: string;
    try {
      html = await readFile(filename, "utf-8");
    } catch {
      console.warn(`  Skipping ${filename} (file not found)`);
      continue;
    }

    // Find section headings: <p id="..." data-paragraph-number="1"><b>...</b></p>
    const sections: Record<string, string> = {};
    const sectionPattern = /<p\s[^>]*\bid="([^"]+)"[^>]*data-paragraph-number="1"[^>]*>\s*<b>([^]*?)<\/b>/gi;
    // Also match when data-paragraph-number comes before id
    const sectionPattern2 = /<p\s[^>]*data-paragraph-number="1"[^>]*\bid="([^"]+)"[^>]*>\s*<b>([^]*?)<\/b>/gi;

    for (const pattern of [sectionPattern, sectionPattern2]) {
      let sm;
      while ((sm = pattern.exec(html)) !== null) {
        const id = sm[1];
        // Strip HTML tags (entity-ref, em, etc.) from the heading text
        let heading = sm[2]
          .replace(/<[^>]+>/g, "")
          .replace(/\s+/g, " ")
          .trim();
        if (heading && !sections[id]) {
          sections[id] = heading;
        }
      }
    }

    result[filename] = { title, sections };
    console.log(`  ${filename}: "${title}" — ${Object.keys(sections).length} sections`);
  }

  await writeFile(OUTPUT_FILE, JSON.stringify(result, null, 2) + "\n", "utf-8");
  console.log(`\nWritten to ${OUTPUT_FILE} (${Object.keys(result).length} files)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
