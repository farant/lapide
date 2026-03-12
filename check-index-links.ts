#!/usr/bin/env bun
/**
 * check-index-links.ts — Finds broken internal links in generated index HTML
 *
 * Usage: bun check-index-links.ts
 *
 * Scans all .html files under index/ (excluding refs/, extractions/) for
 * <a href="..."> links that point to other index pages, and checks whether
 * the target file exists on disk. Reports all broken links with source file
 * and line number.
 */

import { readdir, readFile } from "fs/promises";
import { join, resolve, dirname } from "path";
import { existsSync } from "fs";

const ROOT = import.meta.dir;
const INDEX_DIR = join(ROOT, "index");

// Collect all HTML files under index/, skipping refs/ and extractions/
async function collectHtmlFiles(dir: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(d: string) {
    const entries = await readdir(d, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(d, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "refs" || entry.name === "extractions") continue;
        await walk(full);
      } else if (entry.name.endsWith(".html")) {
        files.push(full);
      }
    }
  }

  await walk(dir);
  return files;
}

// Extract all href values from <a> tags, with line numbers
function extractLinks(content: string): Array<{ href: string; line: number }> {
  const links: Array<{ href: string; line: number }> = [];
  const lines = content.split("\n");
  const hrefRe = /<a\s[^>]*href="([^"]+)"/g;

  for (let i = 0; i < lines.length; i++) {
    let match;
    hrefRe.lastIndex = 0;
    while ((match = hrefRe.exec(lines[i])) !== null) {
      links.push({ href: match[1], line: i + 1 });
    }
  }
  return links;
}

// Resolve href to a file path on disk
function resolveHref(href: string, sourceFile: string): string | null {
  // Skip external links, anchors, mailto, etc.
  if (href.startsWith("http://") || href.startsWith("https://")) return null;
  if (href.startsWith("mailto:")) return null;
  if (href.startsWith("#")) return null;

  // Strip fragment
  const noFragment = href.split("#")[0];
  if (!noFragment) return null;

  // Absolute paths (start with /)
  if (noFragment.startsWith("/")) {
    const resolved = join(ROOT, noFragment);
    // Directory links (ending with /) check for index.html
    if (noFragment.endsWith("/")) return join(resolved, "index.html");
    return resolved;
  }

  // Relative paths
  const sourceDir = dirname(sourceFile);
  const resolved = resolve(sourceDir, noFragment);
  if (noFragment.endsWith("/")) return join(resolved, "index.html");
  return resolved;
}

async function main() {
  const files = await collectHtmlFiles(INDEX_DIR);
  console.log(`Scanning ${files.length} HTML files for broken links...\n`);

  let brokenCount = 0;
  let checkedCount = 0;

  for (const file of files) {
    const content = await readFile(file, "utf-8");
    const links = extractLinks(content);
    const relFile = file.replace(ROOT + "/", "");

    for (const { href, line } of links) {
      const target = resolveHref(href, file);
      if (!target) continue; // external or anchor-only

      checkedCount++;
      if (!existsSync(target)) {
        console.log(`BROKEN  ${relFile}:${line}`);
        console.log(`        href="${href}"`);
        console.log(`        → ${target.replace(ROOT + "/", "")}\n`);
        brokenCount++;
      }
    }
  }

  console.log(`Checked ${checkedCount} internal links across ${files.length} files.`);
  if (brokenCount === 0) {
    console.log("No broken links found.");
  } else {
    console.log(`Found ${brokenCount} broken link${brokenCount === 1 ? "" : "s"}.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
