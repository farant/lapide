#!/usr/bin/env bun
/**
 * audit-refs.ts — Show each ref file reference alongside the actual passage text it links to
 *
 * Usage: bun audit-refs.ts <annotated-file.html> [--mismatches] [--entity slug]
 *
 * For each entity that references the given HTML file, shows:
 *   - The entity slug and ref description
 *   - The passage span ID it links to
 *   - The actual text wrapped in that passage span
 *
 * Flags:
 *   --mismatches   Only show entries where the description likely doesn't match the passage text
 *   --entity slug  Only show entries for a specific entity (e.g., --entity person/saint/jerome)
 *   --unlinked     Only show entries still using old ~pN format (not linked to passage spans)
 *   --orphans      Show passage spans not referenced by any ref file
 */

import { readFile, readdir } from "fs/promises";
import { join } from "path";

const ROOT = import.meta.dir;
const REFS_DIR = join(ROOT, "index/refs");

const sourceFile = process.argv.find(a => a.endsWith(".html"));
const showMismatches = process.argv.includes("--mismatches");
const showUnlinked = process.argv.includes("--unlinked");
const showOrphans = process.argv.includes("--orphans");
const entityFilter = (() => {
  const idx = process.argv.indexOf("--entity");
  return idx !== -1 && process.argv[idx + 1] ? process.argv[idx + 1] : null;
})();

if (!sourceFile) {
  console.error("Usage: bun audit-refs.ts <annotated-file.html> [--mismatches] [--entity slug] [--unlinked] [--orphans]");
  process.exit(1);
}

const fileName = sourceFile.split("/").pop()!;

// ── Parse HTML for passage spans ──

interface PassageSpan {
  id: string;           // e.g., "dedicatory-letter-p1-r1"
  paragraphId: string;  // e.g., "dedicatory-letter-p1"
  entities: string[];   // from data-entities
  text: string;         // plain text content (tags stripped)
}

async function parsePassageSpans(): Promise<Map<string, PassageSpan>> {
  const content = await readFile(sourceFile!, "utf-8");
  const spans = new Map<string, PassageSpan>();

  // Match passage spans and extract their text content
  const spanRe = /<span\s+class="ref-passage"\s+id="([^"]+)"\s+data-entities="([^"]+)">([\s\S]*?)<\/span>/g;
  let m;
  while ((m = spanRe.exec(content)) !== null) {
    const id = m[1];
    const entities = m[2].split(",");
    const rawText = m[3];
    // Strip HTML tags to get plain text
    const text = rawText.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

    const paraMatch = id.match(/^(.+)-r\d+$/);
    const paragraphId = paraMatch ? paraMatch[1] : id;

    spans.set(id, { id, paragraphId, entities, text });
  }

  return spans;
}

// Also build paragraph → passage spans mapping
function buildParagraphMap(spans: Map<string, PassageSpan>): Map<string, PassageSpan[]> {
  const map = new Map<string, PassageSpan[]>();
  for (const span of spans.values()) {
    if (!map.has(span.paragraphId)) map.set(span.paragraphId, []);
    map.get(span.paragraphId)!.push(span);
  }
  return map;
}

// ── Parse ref files ──

interface RefEntry {
  entitySlug: string;
  entityName: string;
  description: string;    // text after the — dash
  passageId: string | null;  // if synced (has -rN)
  paragraphId: string | null; // extracted paragraph ID
  isSynced: boolean;
  raw: string;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function parseRefFiles(): Promise<RefEntry[]> {
  const entries: RefEntry[] = [];

  async function walk(dir: string) {
    const dirEntries = await readdir(dir, { withFileTypes: true });
    for (const entry of dirEntries) {
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
        const nameMatch = fm.match(/^name:\s*(.+)$/m);
        if (!slugMatch || !categoryMatch) continue;

        const slug = slugMatch[1].trim();
        const category = categoryMatch[1].trim();
        const entitySlug = `${category}/${slug}`;
        const entityName = nameMatch ? nameMatch[1].trim().replace(/^["']|["']$/g, "") : slug;

        if (entityFilter && entitySlug !== entityFilter) continue;

        const lines = content.split("\n");
        let inRefs = false;

        for (const line of lines) {
          if (line.match(/^## References in Commentary/)) { inRefs = true; continue; }
          if (inRefs && line.startsWith("## ")) { inRefs = false; continue; }
          if (!inRefs) continue;
          if (!line.includes(`\`${fileName}#`)) continue;

          const descMatch = line.match(/\s—\s(.+)$/);
          const description = descMatch ? descMatch[1] : "";

          // Synced passage ref: `file.html#section-pN-rM`
          const passageMatch = line.match(new RegExp(`\`${escapeRegex(fileName)}#([^\`]+)-r(\\d+)\``));
          if (passageMatch) {
            const passageId = `${passageMatch[1]}-r${passageMatch[2]}`;
            const paraMatch = passageMatch[1].match(/^(.+)$/);
            entries.push({
              entitySlug, entityName, description,
              passageId,
              paragraphId: passageMatch[1],
              isSynced: true,
              raw: line,
            });
            continue;
          }

          // Old-style ~pN reference
          const oldMatch = line.match(new RegExp(`\`${escapeRegex(fileName)}#([^\`]+)\`\\s*~p(\\d+)`));
          if (oldMatch) {
            entries.push({
              entitySlug, entityName, description,
              passageId: null,
              paragraphId: `${oldMatch[1]}-p${oldMatch[2]}`,
              isSynced: false,
              raw: line,
            });
          }
        }
      }
    }
  }

  await walk(REFS_DIR);
  return entries;
}

// ── Display ──

function truncate(s: string, len: number): string {
  if (s.length <= len) return s;
  return s.slice(0, len - 1) + "…";
}

function stripQuotes(s: string): string {
  return s.replace(/[""''«»「」]/g, "").toLowerCase();
}

// Simple heuristic: check if key words from the description appear in the passage text
function likelyMismatch(description: string, passageText: string): boolean {
  if (!description || !passageText) return true;

  const descClean = stripQuotes(description);
  const textClean = stripQuotes(passageText);

  // Extract quoted phrases from the description
  const quotedPhrases = description.match(/"([^"]+)"|"([^"]+)"|«([^»]+)»/g);
  if (quotedPhrases) {
    for (const phrase of quotedPhrases) {
      const clean = stripQuotes(phrase).trim();
      if (clean.length > 5 && !textClean.includes(clean)) {
        return true; // quoted phrase not found in passage
      }
    }
    return false; // all quoted phrases found
  }

  // Extract significant words from description (skip short/common words)
  const skipWords = new Set(["the", "and", "for", "that", "with", "from", "his", "her", "its",
    "this", "was", "were", "are", "been", "being", "have", "has", "had", "not", "but",
    "who", "whom", "which", "what", "where", "when", "how", "all", "each", "every",
    "listed", "among", "mentioned", "described", "noted", "cited", "named", "called",
    "same", "also", "both", "such", "than", "into", "upon", "about", "after", "before"]);

  const descWords = descClean.split(/\s+/)
    .filter(w => w.length > 3 && !skipWords.has(w))
    .slice(0, 8); // check first 8 significant words

  if (descWords.length === 0) return false;

  let matches = 0;
  for (const word of descWords) {
    if (textClean.includes(word)) matches++;
  }

  // If less than 25% of significant words match, likely mismatch
  return matches / descWords.length < 0.25;
}

async function main() {
  const spans = await parsePassageSpans();
  const paragraphMap = buildParagraphMap(spans);
  const refs = await parseRefFiles();

  // Sort by entity slug for readable output
  refs.sort((a, b) => a.entitySlug.localeCompare(b.entitySlug));

  if (showOrphans) {
    const referencedSpans = new Set<string>();
    for (const ref of refs) {
      if (ref.passageId) referencedSpans.add(ref.passageId);
    }
    const orphans = [...spans.values()].filter(s => !referencedSpans.has(s.id));
    console.log(`\n${orphans.length} passage spans not referenced by any ref file:\n`);
    for (const span of orphans) {
      console.log(`  ${span.id}`);
      console.log(`  Text: ${truncate(span.text, 120)}`);
      console.log(`  Entities: ${span.entities.join(", ")}`);
      console.log();
    }
    return;
  }

  if (showUnlinked) {
    const unlinked = refs.filter(r => !r.isSynced);
    console.log(`\n${unlinked.length} ref entries still using old ~pN format:\n`);
    for (const ref of unlinked) {
      console.log(`  ${ref.entitySlug} (${ref.entityName})`);
      console.log(`  Ref: ${ref.paragraphId}`);
      console.log(`  Desc: ${ref.description}`);
      const passages = ref.paragraphId ? paragraphMap.get(ref.paragraphId) : null;
      if (passages) {
        console.log(`  Available passages in paragraph:`);
        for (const p of passages) {
          console.log(`    ${p.id}: ${truncate(p.text, 100)}`);
        }
      } else {
        console.log(`  ⚠ No passage spans in paragraph ${ref.paragraphId}`);
      }
      console.log();
    }
    return;
  }

  // Default: show all synced refs with their passage text
  let shown = 0;
  let mismatchCount = 0;

  for (const ref of refs) {
    if (!ref.isSynced) continue;

    const span = ref.passageId ? spans.get(ref.passageId) : null;
    const isMismatch = span ? likelyMismatch(ref.description, span.text) : true;

    if (showMismatches && !isMismatch) continue;
    if (isMismatch) mismatchCount++;

    shown++;
    const marker = isMismatch ? "⚠" : "✓";
    console.log(`${marker} ${ref.entitySlug} (${ref.entityName})`);
    console.log(`  Link: ${ref.passageId}`);
    console.log(`  Desc: ${ref.description}`);
    if (span) {
      console.log(`  Text: ${span.text}`);
    } else {
      console.log(`  Text: ❌ PASSAGE SPAN NOT FOUND`);
    }
    console.log();
  }

  console.log("─".repeat(60));
  console.log(`Shown: ${shown} entries${showMismatches ? " (mismatches only)" : ""}`);
  console.log(`Total synced refs: ${refs.filter(r => r.isSynced).length}`);
  console.log(`Likely mismatches: ${mismatchCount}`);
  console.log(`Passage spans in HTML: ${spans.size}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
