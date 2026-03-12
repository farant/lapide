#!/usr/bin/env bun
/**
 * fix-ref-links.ts — Automatically fix ref file passage links by matching descriptions to actual passage text
 *
 * Usage: bun fix-ref-links.ts <annotated-file.html> [--dry-run] [--entity slug]
 *
 * For each ref file entry that references the given HTML file, this script:
 *   1. Extracts quoted phrases and key terms from the description
 *   2. Scores each passage span in the HTML for how well it matches
 *   3. If a better match exists than the current link, updates the ref file
 *
 * Flags:
 *   --dry-run      Show what would change without writing files
 *   --entity slug  Only fix entries for a specific entity
 */

import { readFile, writeFile, readdir } from "fs/promises";
import { join } from "path";

const ROOT = import.meta.dir;
const REFS_DIR = join(ROOT, "index/refs");

const sourceFile = process.argv.find(a => a.endsWith(".html"));
const dryRun = process.argv.includes("--dry-run");
const entityFilter = (() => {
  const idx = process.argv.indexOf("--entity");
  return idx !== -1 && process.argv[idx + 1] ? process.argv[idx + 1] : null;
})();

if (!sourceFile) {
  console.error("Usage: bun fix-ref-links.ts <annotated-file.html> [--dry-run] [--entity slug]");
  process.exit(1);
}

const fileName = sourceFile.split("/").pop()!;

// ── Parse HTML ──

interface PassageSpan {
  id: string;
  paragraphId: string;
  entities: string[];
  text: string;        // plain text, tags stripped
  textLower: string;   // lowercase for matching
}

async function parsePassageSpans(): Promise<PassageSpan[]> {
  const content = await readFile(sourceFile!, "utf-8");
  const spans: PassageSpan[] = [];

  const spanRe = /<span\s+class="ref-passage"\s+id="([^"]+)"\s+data-entities="([^"]+)">([\s\S]*?)<\/span>/g;
  let m;
  while ((m = spanRe.exec(content)) !== null) {
    const id = m[1];
    const entities = m[2].split(",");
    const text = m[3].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    const paraMatch = id.match(/^(.+)-r\d+$/);
    const paragraphId = paraMatch ? paraMatch[1] : id;

    spans.push({ id, paragraphId, entities, text, textLower: text.toLowerCase() });
  }

  return spans;
}

// ── Scoring ──

function extractQuotedPhrases(desc: string): string[] {
  const phrases: string[] = [];
  const re = /[""«]([^""»]+)[""»]/g;
  let m;
  while ((m = re.exec(desc)) !== null) {
    if (m[1].length > 3) phrases.push(m[1]);
  }
  return phrases;
}

function extractKeyWords(desc: string): string[] {
  const skip = new Set([
    "the", "and", "for", "that", "with", "from", "his", "her", "its", "this",
    "was", "were", "are", "been", "being", "have", "has", "had", "not", "but",
    "who", "whom", "which", "what", "where", "when", "how", "all", "each",
    "every", "listed", "among", "mentioned", "described", "noted", "cited",
    "named", "called", "same", "also", "both", "such", "than", "into", "upon",
    "about", "after", "before", "their", "they", "them", "then", "there",
    "these", "those", "would", "could", "should", "will", "shall", "may",
    "might", "must", "can", "does", "did", "done", "like", "just", "only",
    "more", "most", "very", "much", "many", "some", "other", "another",
    "first", "last", "next", "over", "under", "between", "through",
  ]);

  // Strip quoted phrases first to avoid double-counting
  const stripped = desc.replace(/[""«][^""»]+[""»]/g, "");
  return stripped
    .replace(/[^a-zA-ZÀ-ÿ\s'-]/g, " ")
    .split(/\s+/)
    .map(w => w.toLowerCase())
    .filter(w => w.length > 3 && !skip.has(w));
}

// Extract proper names (capitalized words) from description
function extractProperNames(desc: string): string[] {
  const names: string[] = [];
  // Strip quoted text to focus on the descriptive part
  const stripped = desc.replace(/[""«][^""»]+[""»]/g, "");
  const re = /\b([A-Z][a-zA-ZÀ-ÿ'-]+(?:\s+(?:of|the|de|von|van|a|à)\s+[A-Z][a-zA-ZÀ-ÿ'-]+)*)\b/g;
  let m;
  while ((m = re.exec(stripped)) !== null) {
    // Skip common non-name words that start sentences
    const skip = new Set(["The", "This", "That", "These", "Those", "His", "Her", "Its",
      "Van", "For", "But", "And", "Not", "Also", "Same", "Such", "Among",
      "Listed", "Mentioned", "Described", "Noted", "Cited", "Named", "Called"]);
    if (!skip.has(m[1].split(/\s/)[0])) {
      names.push(m[1]);
    }
  }
  return names;
}

function scoreMatch(desc: string, span: PassageSpan, entitySlug: string): number {
  let score = 0;
  const textLower = span.textLower;

  // 1. Quoted phrases (strongest signal)
  const quotes = extractQuotedPhrases(desc);
  for (const phrase of quotes) {
    const phraseLower = phrase.toLowerCase();
    if (textLower.includes(phraseLower)) {
      score += 50; // exact quoted phrase match
    } else {
      // Check for partial match (at least 60% of words)
      const words = phraseLower.split(/\s+/).filter(w => w.length > 2);
      const matching = words.filter(w => textLower.includes(w));
      if (words.length > 0 && matching.length / words.length >= 0.6) {
        score += 25;
      }
    }
  }

  // 2. Proper names from description found in passage text
  const names = extractProperNames(desc);
  for (const name of names) {
    if (textLower.includes(name.toLowerCase())) {
      score += 15;
    }
  }

  // 3. Key words match
  const keywords = extractKeyWords(desc);
  for (const word of keywords) {
    if (textLower.includes(word)) {
      score += 3;
    }
  }

  // 4. Entity slug appears in span's data-entities
  if (span.entities.includes(entitySlug)) {
    score += 10;
  }

  return score;
}

function findBestMatch(desc: string, entitySlug: string, spans: PassageSpan[]): { span: PassageSpan; score: number } | null {
  let best: { span: PassageSpan; score: number } | null = null;

  for (const span of spans) {
    const score = scoreMatch(desc, span, entitySlug);
    if (score > 0 && (!best || score > best.score)) {
      best = { span, score };
    }
  }

  return best;
}

// ── Parse and fix ref files ──

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

interface RefLine {
  lineIndex: number;
  line: string;
  currentPassageId: string | null;
  currentParagraphId: string | null;
  description: string;
  entitySlug: string;
  isSynced: boolean;
}

async function processRefFiles(spans: PassageSpan[]) {
  let fixedCount = 0;
  let checkedCount = 0;
  let unchangedCount = 0;
  let noMatchCount = 0;

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
        if (!slugMatch || !categoryMatch) continue;

        const slug = slugMatch[1].trim();
        const category = categoryMatch[1].trim();
        const entitySlug = `${category}/${slug}`;

        if (entityFilter && entitySlug !== entityFilter) continue;

        const lines = content.split("\n");
        let inRefs = false;
        let changed = false;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.match(/^## References in Commentary/)) { inRefs = true; continue; }
          if (inRefs && line.startsWith("## ")) { inRefs = false; continue; }
          if (!inRefs) continue;
          if (!line.includes(`\`${fileName}#`)) continue;

          checkedCount++;

          const descMatch = line.match(/\s—\s(.+)$/);
          const description = descMatch ? descMatch[1] : "";

          // Extract current target
          let currentId: string | null = null;
          const passageMatch = line.match(new RegExp(`\`${escapeRegex(fileName)}#([^\`]+)\``));
          if (passageMatch) {
            currentId = passageMatch[1];
          }

          // Find best matching passage span
          const best = findBestMatch(description, entitySlug, spans);

          if (!best || best.score < 15) {
            noMatchCount++;
            continue;
          }

          if (currentId === best.span.id) {
            unchangedCount++;
            continue;
          }

          // Replace the reference
          const oldRef = `\`${fileName}#${currentId}\``;
          // Remove any trailing ~pN
          const oldWithTilde = new RegExp(
            escapeRegex(`\`${fileName}#`) + `[^\`]+\`(\\s*~p\\d+)?`
          );
          const newRef = `\`${fileName}#${best.span.id}\``;

          const newLine = line.replace(oldWithTilde, newRef);
          if (newLine !== line) {
            lines[i] = newLine;
            changed = true;
            fixedCount++;

            const truncText = best.span.text.length > 80 ? best.span.text.slice(0, 79) + "…" : best.span.text;
            console.log(`${entitySlug}`);
            console.log(`  ${currentId} → ${best.span.id} (score: ${best.score})`);
            console.log(`  Desc: ${description.slice(0, 100)}`);
            console.log(`  Text: ${truncText}`);
            console.log();
          }
        }

        if (changed && !dryRun) {
          await writeFile(full, lines.join("\n"), "utf-8");
        }
      }
    }
  }

  await walk(REFS_DIR);

  console.log("─".repeat(60));
  console.log(`Checked: ${checkedCount} ref entries`);
  console.log(`Fixed: ${fixedCount}${dryRun ? " (dry run)" : ""}`);
  console.log(`Already correct: ${unchangedCount}`);
  console.log(`No match found: ${noMatchCount}`);
}

async function main() {
  console.log(`Parsing passage spans from ${fileName}...`);
  const spans = await parsePassageSpans();
  console.log(`Found ${spans.length} passage spans\n`);

  await processRefFiles(spans);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
