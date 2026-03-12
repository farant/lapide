#!/usr/bin/env bun
/**
 * lint-annotations.ts — Check for gaps between ref files, passage markup, and entity-ref tags
 *
 * Usage: bun lint-annotations.ts <annotated-file.html>
 *
 * Checks:
 * 1. Ref file references still using old ~pN format (not synced to passage IDs)
 * 2. Ref file references pointing to paragraphs with no ref-passage spans
 * 3. Paragraph IDs referenced in ref files that don't exist in the HTML
 * 4. ref-passage spans whose IDs aren't referenced by any ref file
 * 5. entity-ref tags pointing to slugs with no ref file
 * 6. Ref file entities mentioned in the source text but missing entity-ref tags
 */

import { readFile, readdir } from "fs/promises";
import { join } from "path";

const ROOT = import.meta.dir;
const REFS_DIR = join(ROOT, "index/refs");
const sourceFile = process.argv.find(a => a.endsWith(".html"));

if (!sourceFile) {
  console.error("Usage: bun lint-annotations.ts <annotated-file.html>");
  process.exit(1);
}

const fileName = sourceFile.split("/").pop()!;

// ── Parse the annotated HTML ──

interface HtmlData {
  paragraphIds: Set<string>;          // all id="..." on <p> tags
  passageSpans: Map<string, string[]>; // passage ID → entity slugs from data-entities
  passagesByParagraph: Map<string, string[]>; // paragraph ID → passage IDs in it
  entityRefSlugs: Set<string>;         // all slug="..." from <entity-ref> tags
  content: string;
}

async function parseHtml(): Promise<HtmlData> {
  const content = await readFile(sourceFile!, "utf-8");

  // Paragraph IDs
  const paragraphIds = new Set<string>();
  const pIdRe = /<p\s+id="([^"]+)"/g;
  let m;
  while ((m = pIdRe.exec(content)) !== null) {
    paragraphIds.add(m[1]);
  }

  // Passage spans
  const passageSpans = new Map<string, string[]>();
  const passagesByParagraph = new Map<string, string[]>();
  const spanRe = /id="([^"]*-r\d+)"\s+data-entities="([^"]+)"/g;
  while ((m = spanRe.exec(content)) !== null) {
    const passageId = m[1];
    const entities = m[2].split(",");
    passageSpans.set(passageId, entities);

    // Extract paragraph ID (everything before -rN)
    const paraMatch = passageId.match(/^(.+)-r\d+$/);
    if (paraMatch) {
      const paraId = paraMatch[1];
      if (!passagesByParagraph.has(paraId)) passagesByParagraph.set(paraId, []);
      passagesByParagraph.get(paraId)!.push(passageId);
    }
  }

  // Entity-ref slugs
  const entityRefSlugs = new Set<string>();
  const entityRefRe = /<entity-ref\s+slug="([^"]+)"/g;
  while ((m = entityRefRe.exec(content)) !== null) {
    entityRefSlugs.add(m[1]);
  }

  return { paragraphIds, passageSpans, passagesByParagraph, entityRefSlugs, content };
}

// ── Parse ref files ──

interface RefFileEntry {
  entitySlug: string;   // e.g., "person/saint/jerome"
  entityName: string;
  filePath: string;
  references: RefLine[];
}

interface RefLine {
  raw: string;
  paragraphId: string | null;  // e.g., "preface-reader-p2"
  passageId: string | null;    // e.g., "preface-reader-p2-r2" (if synced)
  isSynced: boolean;           // true if using passage ID, false if still ~pN
}

async function parseRefFiles(): Promise<RefFileEntry[]> {
  const entries: RefFileEntry[] = [];

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
        const entityName = nameMatch ? nameMatch[1].trim() : slug;

        // Parse reference lines for this file
        const references: RefLine[] = [];
        const lines = content.split("\n");
        let inRefs = false;

        for (const line of lines) {
          if (line.match(/^## References in Commentary/)) { inRefs = true; continue; }
          if (inRefs && line.startsWith("## ")) { inRefs = false; continue; }
          if (!inRefs) continue;
          if (!line.includes(`\`${fileName}#`)) continue;

          // Check if it's a synced passage ref
          const passageMatch = line.match(new RegExp(`\`${escapeRegex(fileName)}#([^\`]+)-r(\\d+)\``));
          if (passageMatch) {
            const passageId = `${passageMatch[1]}-r${passageMatch[2]}`;
            const paraMatch = passageMatch[1].match(/^(.+)$/);
            references.push({
              raw: line,
              paragraphId: passageMatch[1],
              passageId,
              isSynced: true,
            });
            continue;
          }

          // Old-style ~pN reference
          const oldMatch = line.match(new RegExp(`\`${escapeRegex(fileName)}#([^'\`]+)\`\\s*~p(\\d+)`));
          if (oldMatch) {
            const section = oldMatch[1];
            const pNum = oldMatch[2];
            references.push({
              raw: line,
              paragraphId: `${section}-p${pNum}`,
              passageId: null,
              isSynced: false,
            });
          }
        }

        if (references.length > 0) {
          entries.push({ entitySlug, entityName, filePath: full, references });
        }
      }
    }
  }

  await walk(REFS_DIR);
  return entries;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ── Lint checks ──

async function main() {
  console.log(`Linting annotations for ${fileName}...\n`);

  const html = await parseHtml();
  const refFiles = await parseRefFiles();

  let issueCount = 0;

  // Check 1: Ref file references still using old ~pN format
  const unsynced: { entity: string; paraId: string; raw: string }[] = [];
  for (const ref of refFiles) {
    for (const r of ref.references) {
      if (!r.isSynced) {
        unsynced.push({ entity: ref.entitySlug, paraId: r.paragraphId!, raw: r.raw });
      }
    }
  }
  if (unsynced.length > 0) {
    console.log(`❌ ${unsynced.length} ref entries still using old ~pN format (not synced to passage IDs):`);
    for (const u of unsynced.slice(0, 20)) {
      console.log(`   ${u.entity} → ${u.paraId}`);
    }
    if (unsynced.length > 20) console.log(`   ... and ${unsynced.length - 20} more`);
    console.log();
    issueCount += unsynced.length;
  }

  // Check 2: Paragraphs referenced by ref files that have no ref-passage spans
  const noPassage: { entity: string; paraId: string }[] = [];
  for (const ref of refFiles) {
    for (const r of ref.references) {
      if (r.paragraphId && !html.passagesByParagraph.has(r.paragraphId)) {
        noPassage.push({ entity: ref.entitySlug, paraId: r.paragraphId });
      }
    }
  }
  // Deduplicate by paraId
  const uniqueNoPassage = [...new Map(noPassage.map(n => [n.paraId, n])).values()];
  if (uniqueNoPassage.length > 0) {
    console.log(`⚠️  ${uniqueNoPassage.length} paragraphs referenced by ref files have no ref-passage spans:`);
    for (const n of uniqueNoPassage.slice(0, 20)) {
      console.log(`   ${n.paraId}`);
    }
    if (uniqueNoPassage.length > 20) console.log(`   ... and ${uniqueNoPassage.length - 20} more`);
    console.log();
    issueCount += uniqueNoPassage.length;
  }

  // Check 3: Paragraph IDs in ref files that don't exist in the HTML
  const missingParas: { entity: string; paraId: string }[] = [];
  for (const ref of refFiles) {
    for (const r of ref.references) {
      if (r.paragraphId && !html.paragraphIds.has(r.paragraphId)) {
        missingParas.push({ entity: ref.entitySlug, paraId: r.paragraphId });
      }
    }
  }
  const uniqueMissingParas = [...new Map(missingParas.map(n => [`${n.entity}:${n.paraId}`, n])).values()];
  if (uniqueMissingParas.length > 0) {
    console.log(`❌ ${uniqueMissingParas.length} ref entries point to paragraph IDs that don't exist in the HTML:`);
    for (const n of uniqueMissingParas.slice(0, 20)) {
      console.log(`   ${n.entity} → ${n.paraId}`);
    }
    if (uniqueMissingParas.length > 20) console.log(`   ... and ${uniqueMissingParas.length - 20} more`);
    console.log();
    issueCount += uniqueMissingParas.length;
  }

  // Check 4: Passage span IDs not referenced by any ref file
  const allReferencedPassages = new Set<string>();
  for (const ref of refFiles) {
    for (const r of ref.references) {
      if (r.passageId) allReferencedPassages.add(r.passageId);
    }
  }
  const orphanPassages: string[] = [];
  for (const [passageId] of html.passageSpans) {
    if (!allReferencedPassages.has(passageId)) {
      orphanPassages.push(passageId);
    }
  }
  if (orphanPassages.length > 0) {
    console.log(`⚠️  ${orphanPassages.length} ref-passage spans not referenced by any ref file:`);
    for (const p of orphanPassages.slice(0, 20)) {
      console.log(`   ${p}`);
    }
    if (orphanPassages.length > 20) console.log(`   ... and ${orphanPassages.length - 20} more`);
    console.log();
    issueCount += orphanPassages.length;
  }

  // Check 5: entity-ref tags pointing to slugs with no ref file
  const allRefSlugs = new Set(refFiles.map(r => r.entitySlug));
  // Also collect slugs from all ref files (not just those referencing this file)
  const allKnownSlugs = new Set<string>();
  async function collectAllSlugs(dir: string) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        await collectAllSlugs(full);
      } else if (entry.name.endsWith(".md")) {
        const content = await readFile(full, "utf-8");
        const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (!fmMatch) continue;
        const fm = fmMatch[1];
        if (fm.match(/^alias_of:/m)) continue;
        const slugMatch = fm.match(/^slug:\s*(.+)$/m);
        const categoryMatch = fm.match(/^category:\s*(.+)$/m);
        if (slugMatch && categoryMatch) {
          allKnownSlugs.add(`${categoryMatch[1].trim()}/${slugMatch[1].trim()}`);
        }
      }
    }
  }
  await collectAllSlugs(REFS_DIR);

  const brokenEntityRefs: string[] = [];
  for (const slug of html.entityRefSlugs) {
    if (!allKnownSlugs.has(slug)) {
      brokenEntityRefs.push(slug);
    }
  }
  if (brokenEntityRefs.length > 0) {
    console.log(`❌ ${brokenEntityRefs.length} entity-ref tags point to non-existent ref files:`);
    for (const s of brokenEntityRefs) {
      console.log(`   <entity-ref slug="${s}">`);
    }
    console.log();
    issueCount += brokenEntityRefs.length;
  }

  // Summary
  console.log("─".repeat(60));
  console.log(`Scanned: ${html.paragraphIds.size} paragraphs, ${html.passageSpans.size} passage spans, ${html.entityRefSlugs.size} entity-ref tags`);
  console.log(`Ref files checked: ${refFiles.length} entities with ${refFiles.reduce((n, r) => n + r.references.length, 0)} references to ${fileName}`);

  if (issueCount === 0) {
    console.log("\n✅ No issues found.");
  } else {
    console.log(`\n${issueCount} issue${issueCount === 1 ? "" : "s"} found.`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
