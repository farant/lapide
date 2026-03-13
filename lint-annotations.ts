#!/usr/bin/env bun
/**
 * lint-annotations.ts — Check for gaps between ref files, sidecar annotations, and entity-ref tags
 *
 * Usage: bun lint-annotations.ts <annotated-file.html>
 *
 * Checks:
 * 1. Ref file references still using old ~pN format (not synced to sidecar hashes)
 * 2. Ref file references pointing to paragraphs with no sidecar annotation
 * 3. Paragraph IDs in ref files that don't exist in the HTML
 * 4. Sidecar annotations not referenced by any ref file (orphans)
 * 5. Sidecar annotations with invalid paragraph IDs or out-of-range offsets
 * 6. entity-ref tags pointing to slugs with no ref file
 * 7. components.js script tag missing from <head>
 */

import { Glob } from "bun";

const REFS_DIR = "index/refs";
const sourceFile = Bun.argv.find(a => a.endsWith(".html"));

if (!sourceFile) {
  console.error("Usage: bun lint-annotations.ts <annotated-file.html>");
  process.exit(1);
}

const fileName = sourceFile.split("/").pop()!;

// ── Parse the annotated HTML ──

interface SidecarAnnotation {
  id: string;
  paragraph: string;
  start: number;
  end: number;
  entities: string[];
}

interface HtmlData {
  paragraphIds: Set<string>;
  paragraphTexts: Map<string, number>; // id → plain text length
  annotations: SidecarAnnotation[];
  annotationIds: Set<string>;
  annotationsByParagraph: Map<string, string[]>;
  entityRefSlugs: Set<string>;
  hasComponentsScript: boolean;
  content: string;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&rsquo;/g, "\u2019")
    .replace(/&lsquo;/g, "\u2018")
    .replace(/&rdquo;/g, "\u201D")
    .replace(/&ldquo;/g, "\u201C")
    .replace(/&mdash;/g, "\u2014")
    .replace(/&ndash;/g, "\u2013")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function parseHtml(): Promise<HtmlData> {
  const content = await Bun.file(sourceFile!).text();

  // Paragraph IDs and plain text lengths
  const paragraphIds = new Set<string>();
  const paragraphTexts = new Map<string, number>();
  const pIdRe = /<p\s[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = pIdRe.exec(content)) !== null) {
    paragraphIds.add(m[1]);
    paragraphTexts.set(m[1], stripHtml(m[2]).length);
  }

  // Parse sidecar JSON
  let annotations: SidecarAnnotation[] = [];
  const sidecarMatch = content.match(
    /<script type="application\/json" id="passage-annotations">([\s\S]*?)<\/script>/
  );
  if (sidecarMatch) {
    try {
      annotations = JSON.parse(sidecarMatch[1]);
    } catch {
      annotations = [];
    }
  }

  const annotationIds = new Set(annotations.map(a => a.id));
  const annotationsByParagraph = new Map<string, string[]>();
  for (const a of annotations) {
    if (!annotationsByParagraph.has(a.paragraph)) annotationsByParagraph.set(a.paragraph, []);
    annotationsByParagraph.get(a.paragraph)!.push(a.id);
  }

  // Entity-ref slugs
  const entityRefSlugs = new Set<string>();
  const entityRefRe = /<entity-ref\s+slug="([^"]+)"/g;
  while ((m = entityRefRe.exec(content)) !== null) {
    entityRefSlugs.add(m[1]);
  }

  // Components script tag
  const hasComponentsScript = content.includes("/index/components.js");

  return {
    paragraphIds, paragraphTexts, annotations, annotationIds,
    annotationsByParagraph, entityRefSlugs, hasComponentsScript, content,
  };
}

// ── Parse ref files ──

interface RefFileEntry {
  entitySlug: string;
  entityName: string;
  filePath: string;
  references: RefLine[];
}

interface RefLine {
  raw: string;
  paragraphId: string | null;
  annotationId: string | null; // e.g., "preface-reader-p2-s-a3f2b1c"
  isSynced: boolean;           // true if using -s-hash, false if old format
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function parseRefFiles(): Promise<RefFileEntry[]> {
  const entries: RefFileEntry[] = [];
  const glob = new Glob("**/*.md");

  for await (const path of glob.scan(REFS_DIR)) {
    const full = `${REFS_DIR}/${path}`;
    const content = await Bun.file(full).text();
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) continue;
    const fm = fmMatch[1];
    if (fm.match(/^alias_of:/m)) continue;

    const slugMatch = fm.match(/^slug:\s*(.+)$/m);
    const nameMatch = fm.match(/^name:\s*(.+)$/m);
    if (!slugMatch) continue;

    const slug = slugMatch[1].trim();
    const entityName = nameMatch ? nameMatch[1].trim().replace(/^["']|["']$/g, "") : slug;

    const references: RefLine[] = [];
    const lines = content.split("\n");
    let inRefs = false;

    for (const line of lines) {
      if (line.match(/^## References in Commentary/)) { inRefs = true; continue; }
      if (inRefs && line.startsWith("## ")) { inRefs = false; continue; }
      if (!inRefs) continue;
      if (!line.includes(`\`${fileName}#`)) continue;

      // Sidecar hash ref: `source.html#paragraph-id-s-XXXXXXX`
      const sidecarMatch = line.match(new RegExp(
        "`" + escapeRegex(fileName) + "#([^`]+)-s-([a-f0-9]{7})`"
      ));
      if (sidecarMatch) {
        const paraId = sidecarMatch[1];
        const annotationId = `${paraId}-s-${sidecarMatch[2]}`;
        references.push({
          raw: line,
          paragraphId: paraId,
          annotationId,
          isSynced: true,
        });
        continue;
      }

      // Bare paragraph ref (no hash): `source.html#paragraph-id`
      const bareMatch = line.match(new RegExp(
        "`" + escapeRegex(fileName) + "#([^`]+)`"
      ));
      if (bareMatch) {
        references.push({
          raw: line,
          paragraphId: bareMatch[1],
          annotationId: null,
          isSynced: false,
        });
        continue;
      }

      // Old-style ~pN reference
      const oldMatch = line.match(new RegExp(
        "`" + escapeRegex(fileName) + "#([^`]+)`\\s*~p(\\d+)"
      ));
      if (oldMatch) {
        references.push({
          raw: line,
          paragraphId: `${oldMatch[1]}-p${oldMatch[2]}`,
          annotationId: null,
          isSynced: false,
        });
      }
    }

    if (references.length > 0) {
      entries.push({ entitySlug: slug, entityName, filePath: full, references });
    }
  }

  return entries;
}

// ── Lint checks ──

async function main() {
  console.log(`Linting annotations for ${fileName}...\n`);

  const html = await parseHtml();
  const refFiles = await parseRefFiles();

  let issueCount = 0;

  // Check 1: Ref file references not synced to sidecar hashes
  const unsynced: { entity: string; paraId: string }[] = [];
  for (const ref of refFiles) {
    for (const r of ref.references) {
      if (!r.isSynced) {
        unsynced.push({ entity: ref.entitySlug, paraId: r.paragraphId! });
      }
    }
  }
  if (unsynced.length > 0) {
    console.log(`❌ ${unsynced.length} ref entries not synced to sidecar hashes (missing -s-XXXXXXX suffix):`);
    for (const u of unsynced.slice(0, 20)) {
      console.log(`   ${u.entity} → ${u.paraId}`);
    }
    if (unsynced.length > 20) console.log(`   ... and ${unsynced.length - 20} more`);
    console.log();
    issueCount += unsynced.length;
  }

  // Check 2: Ref file references pointing to paragraphs with no sidecar annotation
  const noAnnotation: { entity: string; paraId: string }[] = [];
  for (const ref of refFiles) {
    for (const r of ref.references) {
      if (r.isSynced && r.annotationId && !html.annotationIds.has(r.annotationId)) {
        noAnnotation.push({ entity: ref.entitySlug, paraId: r.paragraphId! });
      }
    }
  }
  if (noAnnotation.length > 0) {
    console.log(`❌ ${noAnnotation.length} ref entries have sidecar hash that doesn't match any annotation:`);
    for (const n of noAnnotation.slice(0, 20)) {
      console.log(`   ${n.entity} → ${n.paraId}`);
    }
    if (noAnnotation.length > 20) console.log(`   ... and ${noAnnotation.length - 20} more`);
    console.log();
    issueCount += noAnnotation.length;
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

  // Check 4: Sidecar annotations not referenced by any ref file (orphans)
  const allReferencedAnnotations = new Set<string>();
  for (const ref of refFiles) {
    for (const r of ref.references) {
      if (r.annotationId) allReferencedAnnotations.add(r.annotationId);
    }
  }
  const orphanAnnotations: string[] = [];
  for (const a of html.annotations) {
    if (!allReferencedAnnotations.has(a.id)) {
      orphanAnnotations.push(a.id);
    }
  }
  if (orphanAnnotations.length > 0) {
    console.log(`⚠️  ${orphanAnnotations.length} sidecar annotations not referenced by any ref file:`);
    for (const p of orphanAnnotations.slice(0, 20)) {
      console.log(`   ${p}`);
    }
    if (orphanAnnotations.length > 20) console.log(`   ... and ${orphanAnnotations.length - 20} more`);
    console.log();
    issueCount += orphanAnnotations.length;
  }

  // Check 5: Sidecar annotations with invalid paragraph IDs or out-of-range offsets
  const invalidAnnotations: { id: string; reason: string }[] = [];
  for (const a of html.annotations) {
    if (!html.paragraphIds.has(a.paragraph)) {
      invalidAnnotations.push({ id: a.id, reason: `paragraph "${a.paragraph}" not found` });
      continue;
    }
    const textLen = html.paragraphTexts.get(a.paragraph) || 0;
    if (a.start < 0 || a.end < 0 || a.start > a.end) {
      invalidAnnotations.push({ id: a.id, reason: `invalid offsets start=${a.start} end=${a.end}` });
    } else if (a.end > textLen + 5) {
      // +5 tolerance for whitespace normalization differences
      invalidAnnotations.push({ id: a.id, reason: `end offset ${a.end} exceeds paragraph text length ${textLen}` });
    }
  }
  if (invalidAnnotations.length > 0) {
    console.log(`❌ ${invalidAnnotations.length} sidecar annotations have invalid data:`);
    for (const a of invalidAnnotations.slice(0, 20)) {
      console.log(`   ${a.id}: ${a.reason}`);
    }
    if (invalidAnnotations.length > 20) console.log(`   ... and ${invalidAnnotations.length - 20} more`);
    console.log();
    issueCount += invalidAnnotations.length;
  }

  // Check 6: entity-ref tags pointing to slugs with no ref file
  const allKnownSlugs = new Set<string>();
  const slugGlob = new Glob("**/*.md");
  for await (const path of slugGlob.scan(REFS_DIR)) {
    const content = await Bun.file(`${REFS_DIR}/${path}`).text();
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) continue;
    const fm = fmMatch[1];
    if (fm.match(/^alias_of:/m)) continue;
    const slugMatch = fm.match(/^slug:\s*(.+)$/m);
    if (slugMatch) {
      allKnownSlugs.add(slugMatch[1].trim());
    }
  }

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

  // Check 7: components.js script tag missing
  if (!html.hasComponentsScript) {
    console.log(`⚠️  Missing <script src="/index/components.js" type="module"></script> in <head>`);
    console.log(`   Run 'bun tag-entity-refs.ts ${sourceFile}' to auto-insert it.\n`);
    issueCount++;
  }

  // Summary
  console.log("─".repeat(60));
  console.log(`Scanned: ${html.paragraphIds.size} paragraphs, ${html.annotations.length} sidecar annotations, ${html.entityRefSlugs.size} entity-ref tags`);
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
