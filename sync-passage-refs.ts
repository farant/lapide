#!/usr/bin/env bun
/**
 * sync-passage-refs.ts — Update ref file occurrence entries with passage IDs
 *
 * Usage: bun sync-passage-refs.ts <annotated-file.html>
 *
 * Scans an annotated source HTML file for <span class="ref-passage"> tags,
 * extracts their IDs and data-entities, then updates the corresponding
 * ref files under index/refs/ to include the exact passage fragment ID
 * in their "References in Commentary" section.
 *
 * This enables generate-index.ts to produce deep links to the exact
 * passage (e.g., #preface-reader-p2-r2) instead of just the paragraph
 * (e.g., #preface-reader-p2).
 */

import { readFile, writeFile, readdir } from "fs/promises";
import { join } from "path";

const ROOT = import.meta.dir;
const REFS_DIR = join(ROOT, "index/refs");
const sourceFile = process.argv.find(a => a.endsWith(".html"));

if (!sourceFile) {
  console.error("Usage: bun sync-passage-refs.ts <annotated-file.html>");
  process.exit(1);
}

// Extract just the filename (e.g., "01_Preliminares.html")
const fileName = sourceFile.split("/").pop()!;

interface PassageRef {
  passageId: string;     // e.g., "preface-reader-p2-r2"
  paragraphId: string;   // e.g., "preface-reader-p2"
  section: string;       // e.g., "preface-reader"
  pNum: string;          // e.g., "2"
  rNum: string;          // e.g., "2"
  entities: string[];    // e.g., ["person/saint/jerome", ...]
}

// ── Step 1: Scan annotated HTML for ref-passage spans ──

async function extractPassageRefs(): Promise<PassageRef[]> {
  const content = await readFile(sourceFile!, "utf-8");
  const refs: PassageRef[] = [];

  // Match: id="dedicatory-letter-p5-r1" data-entities="slug1,slug2"
  const re = /id="([^"]+)-r(\d+)"\s+data-entities="([^"]+)"/g;
  let match;
  while ((match = re.exec(content)) !== null) {
    const paragraphId = match[1];          // e.g., "preface-reader-p2"
    const rNum = match[2];                 // e.g., "2"
    const entities = match[3].split(",");  // e.g., ["person/saint/jerome", ...]
    const passageId = `${paragraphId}-r${rNum}`;

    // Extract section and paragraph number
    const pMatch = paragraphId.match(/^(.+)-p(\d+)$/);
    const section = pMatch ? pMatch[1] : paragraphId;
    const pNum = pMatch ? pMatch[2] : "0";

    refs.push({ passageId, paragraphId, section, pNum, rNum, entities });
  }

  return refs;
}

// ── Step 2: Build paragraph → passage mapping ──
// Maps paragraph IDs to their passage spans (regardless of entity)

function buildParagraphMap(passages: PassageRef[]): Map<string, PassageRef[]> {
  const map = new Map<string, PassageRef[]>();
  for (const p of passages) {
    if (!map.has(p.paragraphId)) map.set(p.paragraphId, []);
    map.get(p.paragraphId)!.push(p);
  }
  return map;
}

// ── Step 3: Update ref files ──

async function updateRefFiles(paragraphMap: Map<string, PassageRef[]>) {
  let updatedCount = 0;

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
        if (fm.match(/^alias_of:/m)) continue;

        const slugMatch = fm.match(/^slug:\s*(.+)$/m);
        const categoryMatch = fm.match(/^category:\s*(.+)$/m);
        if (!slugMatch || !categoryMatch) continue;

        const slug = slugMatch[1].trim();
        const category = categoryMatch[1].trim();
        const entityKey = `${category}/${slug}`;

        // Update the "References in Commentary" section
        // Match by paragraph ID — any passage in the same paragraph works
        const newContent = updateReferencesSection(content, fileName, paragraphMap);
        if (newContent !== content) {
          await writeFile(full, newContent, "utf-8");
          updatedCount++;
          console.log(`Updated: ${entityKey}`);
        }
      }
    }
  }

  await walk(REFS_DIR);
  return updatedCount;
}

function updateReferencesSection(content: string, file: string, paragraphMap: Map<string, PassageRef[]>): string {
  const lines = content.split("\n");
  const result: string[] = [];
  let inReferences = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.match(/^## References in Commentary/)) {
      inReferences = true;
      result.push(line);
      continue;
    }

    if (inReferences && line.startsWith("## ")) {
      inReferences = false;
    }

    if (inReferences && line.includes(`\`${file}#`)) {
      // Already updated to passage ref? Skip.
      if (line.match(new RegExp(`\`${escapeRegex(file)}#[^']*-r\\d+\``))) {
        result.push(line);
        continue;
      }

      // Extract section and ~pN from old-style reference
      const refMatch = line.match(new RegExp(`\`${escapeRegex(file)}#([^'\`]+)\`\\s*~p(\\d+)`));
      if (refMatch) {
        const section = refMatch[1];
        const pNum = refMatch[2];
        const paraId = `${section}-p${pNum}`;

        // Find ANY passage span in this paragraph
        const passages = paragraphMap.get(paraId);
        if (passages && passages.length > 0) {
          // Use the first passage as the anchor
          const passage = passages[0];
          const descMatch = line.match(/\s—\s(.+)$/);
          const desc = descMatch ? descMatch[1] : "";
          result.push(`- \`${file}#${passage.passageId}\` — ${desc}`);
        } else {
          // No passage spans in this paragraph — keep as-is
          result.push(line);
        }
      } else {
        result.push(line);
      }
    } else {
      result.push(line);
    }
  }

  return result.join("\n");
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ── Main ──

async function main() {
  console.log(`Scanning ${sourceFile} for passage refs...`);
  const passages = await extractPassageRefs();
  console.log(`Found ${passages.length} passage refs`);

  const paragraphMap = buildParagraphMap(passages);
  console.log(`Covering ${paragraphMap.size} paragraphs\n`);

  const count = await updateRefFiles(paragraphMap);
  console.log(`\nUpdated ${count} ref files`);
  console.log("Run 'bun generate-index.ts' to regenerate index pages with deep links.");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
