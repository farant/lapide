#!/usr/bin/env bun
/**
 * annotate-source.ts — Add paragraph IDs and inline ref links to source HTML
 *
 * Usage: bun annotate-source.ts <file.html> [--dry-run]
 *
 * 1. Adds id="{section}-p{n}" to paragraphs within each section
 * 2. Wraps entity mentions with <entity-ref> tags for the side panel
 *    (first occurrence per section, conservative matching)
 * 3. Injects <script src="/index/components.js"> if not already present
 *
 * Reads entity names from index/refs/ to build the annotation map.
 * Idempotent — safe to run repeatedly (skips already-annotated refs).
 */

import { readdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

const ROOT = import.meta.dir;
const REFS_DIR = join(ROOT, "index/refs");
const dryRun = process.argv.includes("--dry-run");
const sourceFile = process.argv.find(a => a.endsWith(".html"));

if (!sourceFile) {
  console.error("Usage: bun annotate-source.ts <file.html> [--dry-run]");
  process.exit(1);
}

// ── Build entity annotation map from ref files ──

interface EntityPattern {
  name: string;
  slug: string;     // e.g. "person/cleric/cornelius-a-lapide"
  priority: number; // longer patterns match first
}

async function buildEntityMap(): Promise<EntityPattern[]> {
  const entities: EntityPattern[] = [];

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

        // Skip aliases
        if (fm.match(/^alias_of:/m)) continue;

        const nameMatch = fm.match(/^name:\s*(.+)$/m);
        const slugMatch = fm.match(/^slug:\s*(.+)$/m);
        const categoryMatch = fm.match(/^category:\s*(.+)$/m);
        if (!nameMatch || !slugMatch || !categoryMatch) continue;

        const name = nameMatch[1].trim();
        const slug = slugMatch[1].trim();
        const category = categoryMatch[1].trim();
        const entitySlug = `${category}/${slug}`;

        // Collect all name variants
        const names: string[] = [name];

        // also_known_as
        const akaSection = content.match(/^also_known_as:\n((?:\s+-\s+.+\n?)*)/m);
        if (akaSection) {
          const akaLines = akaSection[1].matchAll(/^\s+-\s+(.+)$/gm);
          for (const m of akaLines) {
            names.push(m[1].trim());
          }
        }

        for (const n of names) {
          // Skip very short names that would cause false matches
          if (n.length < 4) continue;
          // Skip names that are too generic
          if (/^(The |A |An )/.test(n) && n.length < 10) continue;

          entities.push({
            name: n,
            slug: entitySlug,
            priority: n.length, // longer matches first
          });
        }
      }
    }
  }

  await walk(REFS_DIR);

  // Sort by priority (longest first) so "Saint Basil the Great" matches before "Basil"
  entities.sort((a, b) => b.priority - a.priority);
  return entities;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ── Paragraph ID assignment ──

interface Section {
  id: string;
  startLine: number; // line of the section anchor
  pCount: number;
}

function addParagraphIds(lines: string[]): string[] {
  const result = [...lines];
  let currentSection = "";
  let pCount = 0;

  for (let i = 0; i < result.length; i++) {
    const line = result[i];

    // Detect section anchors: <p id="something"> or <h2 id="something"> etc.
    const sectionMatch = line.match(/^<(?:p|h[1-6])\s+id="([^"]+)"/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      pCount = 0; // reset counter for new section
      continue;
    }

    // Skip if no current section
    if (!currentSection) continue;

    // Match bare <p> tags (no id attribute)
    if (line.match(/^<p>\s*$/)) {
      pCount++;
      result[i] = `<p id="${currentSection}-p${pCount}">`;
    }
    // Also handle <p> with content on same line
    else if (line.match(/^<p>/) && !line.match(/^<p\s+id="/)) {
      pCount++;
      result[i] = line.replace(/^<p>/, `<p id="${currentSection}-p${pCount}">`);
    }
  }

  return result;
}

// ── Entity annotation ──

function annotateEntities(lines: string[], entities: EntityPattern[]): { lines: string[]; count: number } {
  const result = [...lines];
  let currentSection = "";
  const taggedInSection = new Set<string>(); // track which entities tagged per section
  let totalCount = 0;

  for (let i = 0; i < result.length; i++) {
    const line = result[i];

    // Detect section boundaries
    const sectionMatch = line.match(/id="([^"]+)"/);
    if (sectionMatch && (line.startsWith("<p") || line.startsWith("<h"))) {
      const newSection = sectionMatch[1];
      // Only reset if this is a section anchor (not a paragraph id like "section-p3")
      if (!newSection.match(/-p\d+$/)) {
        currentSection = newSection;
        taggedInSection.clear();
      }
    }

    if (!currentSection) continue;

    // Skip lines that are just HTML tags, headings, or very short
    if (line.trim().startsWith("<hr") || line.trim().startsWith("</") || line.trim() === "") continue;
    if (line.match(/^<[^>]+>\s*$/)) continue;

    // Don't annotate inside the TOC (ul/li section)
    if (line.trim().startsWith("<li>") || line.trim().startsWith("<ul>") || line.trim().startsWith("</ul>")) continue;

    // Try each entity (longest first)
    for (const entity of entities) {
      if (taggedInSection.has(entity.slug)) continue;

      const idx = result[i].indexOf(entity.name);
      if (idx === -1) continue;

      // Skip if already annotated for this entity
      if (result[i].includes(`slug="${entity.slug}"`)) continue;

      // Check word boundaries
      const before = result[i][idx - 1];
      const after = result[i][idx + entity.name.length];
      if (before && /\w/.test(before)) continue;
      if (after && /\w/.test(after)) continue;

      // Check we're not inside an HTML tag
      const textBefore = result[i].substring(0, idx);
      const openBrackets = (textBefore.match(/</g) || []).length;
      const closeBrackets = (textBefore.match(/>/g) || []).length;
      if (openBrackets > closeBrackets) continue;

      // Check we're not inside an existing <a> or <entity-ref>
      const lastAOpen = textBefore.lastIndexOf("<a ");
      const lastAClose = textBefore.lastIndexOf("</a>");
      if (lastAOpen >= 0 && lastAOpen > lastAClose) continue;
      const lastRefOpen = textBefore.lastIndexOf("<entity-ref ");
      const lastRefClose = textBefore.lastIndexOf("</entity-ref>");
      if (lastRefOpen >= 0 && lastRefOpen > lastRefClose) continue;

      // Apply annotation
      const annotated = `<entity-ref slug="${entity.slug}">${entity.name}</entity-ref>`;
      result[i] = textBefore + annotated + result[i].substring(idx + entity.name.length);
      taggedInSection.add(entity.slug);
      totalCount++;
    }
  }

  return { lines: result, count: totalCount };
}

// ── Main ──

async function main() {
  console.log(`Building entity map from ${REFS_DIR}...`);
  const entities = await buildEntityMap();
  console.log(`Loaded ${entities.length} entity patterns`);

  console.log(`\nReading ${sourceFile}...`);
  const content = await readFile(sourceFile!, "utf-8");
  const lines = content.split("\n");
  console.log(`${lines.length} lines`);

  // Step 1: Add paragraph IDs
  const withIds = addParagraphIds(lines);
  const idsAdded = withIds.filter((l, i) => l !== lines[i]).length;
  console.log(`\nParagraph IDs: ${idsAdded} added`);

  // Step 2: Annotate entities
  const { lines: annotated, count } = annotateEntities(withIds, entities);
  console.log(`Entity refs: ${count} annotations`);

  // Step 3: Inject components.js script if not present
  const scriptTag = '<script src="/index/components.js" type="module"></script>';
  const hasScript = annotated.some(l => l.includes('/index/components.js'));
  if (!hasScript && count > 0) {
    const headClose = annotated.findIndex(l => l.includes('</head>'));
    if (headClose >= 0) {
      annotated.splice(headClose, 0, scriptTag);
      console.log(`Injected components.js script tag`);
    }
  }

  if (dryRun) {
    console.log("\n[DRY RUN] No changes written.");
    // Show a sample of changes
    let shown = 0;
    for (let i = 0; i < annotated.length && shown < 20; i++) {
      if (annotated[i] !== lines[i]) {
        console.log(`\n  Line ${i + 1}:`);
        if (lines[i].length < 200) {
          console.log(`  - ${lines[i].substring(0, 150)}`);
          console.log(`  + ${annotated[i].substring(0, 150)}`);
        } else {
          // Show just the diff portion
          const diffStart = findDiffStart(lines[i], annotated[i]);
          const context = 40;
          console.log(`  - ...${lines[i].substring(Math.max(0, diffStart - context), diffStart + 100)}...`);
          console.log(`  + ...${annotated[i].substring(Math.max(0, diffStart - context), diffStart + 140)}...`);
        }
        shown++;
      }
    }
  } else {
    await writeFile(sourceFile!, annotated.join("\n"), "utf-8");
    console.log(`\nWrote ${sourceFile}`);
  }
}

function findDiffStart(a: string, b: string): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) return i;
  }
  return Math.min(a.length, b.length);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
