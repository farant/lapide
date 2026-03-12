#!/usr/bin/env bun
/**
 * fix-index-links.ts — Auto-fix broken related links in index ref files
 *
 * Usage: bun fix-index-links.ts [--dry-run]
 *
 * Reads all ref files, builds a slug lookup, then for each broken related
 * link tries to find the correct slug by matching the last path segment.
 * With --dry-run, only reports what would be changed.
 */

import { readdir, readFile, writeFile } from "fs/promises";
import { join, relative } from "path";

const ROOT = import.meta.dir;
const REFS_DIR = join(ROOT, "index/refs");
const dryRun = process.argv.includes("--dry-run");

interface RefInfo {
  slug: string;         // e.g. "saint/jerome"
  category: string;     // e.g. "person"
  fullSlug: string;     // e.g. "person/saint/jerome" (category + slug)
  filePath: string;
  name: string;
}

// Collect all ref files
async function collectRefs(): Promise<RefInfo[]> {
  const refs: RefInfo[] = [];

  async function walk(dir: string) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.name.endsWith(".md")) {
        const content = await readFile(full, "utf-8");
        const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (!fmMatch) continue;
        const fm = fmMatch[1];

        // Check for alias
        const aliasMatch = fm.match(/^alias_of:\s*(.+)$/m);
        if (aliasMatch) continue; // skip aliases

        const slugMatch = fm.match(/^slug:\s*(.+)$/m);
        const categoryMatch = fm.match(/^category:\s*(.+)$/m);
        const nameMatch = fm.match(/^name:\s*(.+)$/m);
        if (!slugMatch || !categoryMatch) continue;

        refs.push({
          slug: slugMatch[1].trim(),
          category: categoryMatch[1].trim(),
          fullSlug: `${categoryMatch[1].trim()}/${slugMatch[1].trim()}`,
          filePath: full,
          name: nameMatch ? nameMatch[1].trim() : "",
        });
      }
    }
  }

  await walk(REFS_DIR);
  return refs;
}

// Map relation key to category
function relKeyToCategory(key: string): string {
  const map: Record<string, string> = {
    people: "person",
    places: "place",
    organizations: "organization",
    works: "bibliography",
    verses: "verse",
    subjects: "subject",
    years: "year",
  };
  return map[key] || key;
}

async function main() {
  const refs = await collectRefs();
  console.log(`Loaded ${refs.length} ref files\n`);

  // Build lookup tables
  const byFullSlug = new Map<string, RefInfo>();      // "person/saint/jerome"
  const bySlug = new Map<string, RefInfo[]>();         // "saint/jerome" → [...]
  const byLastSegment = new Map<string, RefInfo[]>();  // "jerome" → [...]

  for (const ref of refs) {
    byFullSlug.set(ref.fullSlug, ref);

    if (!bySlug.has(ref.slug)) bySlug.set(ref.slug, []);
    bySlug.get(ref.slug)!.push(ref);

    const last = ref.slug.split("/").pop()!;
    if (!byLastSegment.has(last)) byLastSegment.set(last, []);
    byLastSegment.get(last)!.push(ref);
  }

  let fixCount = 0;
  let unfixable: string[] = [];

  for (const ref of refs) {
    const content = await readFile(ref.filePath, "utf-8");
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) continue;

    // Find all related slugs in the frontmatter
    const relatedMatch = content.match(/^related:\n((?:  [\s\S]*?)?)(?=\n[a-z]|\n---|\n$)/m);
    if (!relatedMatch) continue;

    let newContent = content;
    let fileChanged = false;

    // Parse related section to find slugs and their categories
    const relatedLines = content.split("\n");
    let inRelated = false;
    let currentRelKey = "";

    for (const line of relatedLines) {
      if (line.match(/^related:\s*$/)) { inRelated = true; continue; }
      if (inRelated && line.match(/^[a-z]/)) { inRelated = false; continue; }
      if (line === "---" && inRelated) { inRelated = false; continue; }
      if (!inRelated) continue;

      // Relation key (e.g., "  people:")
      const keyMatch = line.match(/^\s{2,4}(\w+):\s*$/);
      if (keyMatch) { currentRelKey = keyMatch[1]; continue; }

      // Slug entry (e.g., "    - saint/jerome")
      const slugMatch = line.match(/^\s{4,8}-\s+(.+)$/);
      if (!slugMatch) continue;

      const relSlug = slugMatch[1].trim();
      const category = relKeyToCategory(currentRelKey);
      const expectedFull = `${category}/${relSlug}`;

      // Check if this slug resolves
      if (byFullSlug.has(expectedFull)) continue; // link is fine

      // Try to find the correct slug
      const lastSeg = relSlug.split("/").pop()!;
      const candidates = (byLastSegment.get(lastSeg) || [])
        .filter(c => c.category === category);

      if (candidates.length === 1) {
        // Unambiguous same-category match — fix it
        const correctSlug = candidates[0].slug;
        if (correctSlug !== relSlug) {
          const relPath = relative(ROOT, ref.filePath);
          console.log(`FIX  ${relPath}`);
          console.log(`     ${currentRelKey}: ${relSlug}`);
          console.log(`  →  ${currentRelKey}: ${correctSlug}\n`);
          newContent = newContent.replace(
            new RegExp(`(- +)${escapeRegex(relSlug)}(\\s*$)`, "m"),
            `$1${correctSlug}$2`
          );
          fileChanged = true;
          fixCount++;
        }
      } else if (candidates.length === 0) {
        const relPath = relative(ROOT, ref.filePath);
        unfixable.push(`UNRESOLVED  ${relPath}  ${currentRelKey}: ${relSlug}  (no match in ${category})`);
      } else {
        const relPath = relative(ROOT, ref.filePath);
        unfixable.push(
          `AMBIGUOUS  ${relPath}  ${currentRelKey}: ${relSlug}  (${candidates.map(c => c.slug).join(", ")})`
        );
      }
    }

    if (fileChanged && !dryRun) {
      await writeFile(ref.filePath, newContent, "utf-8");
    }
  }

  console.log("─".repeat(60));
  console.log(`${dryRun ? "Would fix" : "Fixed"} ${fixCount} broken links`);

  if (unfixable.length > 0) {
    console.log(`\n${unfixable.length} unresolved (no matching ref file exists):\n`);
    for (const msg of unfixable.sort()) {
      console.log(`  ${msg}`);
    }
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
