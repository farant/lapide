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
 * 8. Generated index pages linking to stale/missing annotation hashes
 */

import { Glob } from "bun";
import { stripHtml, normalizeForMatch, parseTextLine } from "./pipeline-utils";

const REFS_DIR = "index/refs";
const fixQuotes = Bun.argv.includes("--fix-quotes");
const sourceFile = Bun.argv.find(a => a.endsWith(".html"));

if (!sourceFile) {
  console.error("Usage: bun lint-annotations.ts [--fix-quotes] <annotated-file.html>");
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
  paragraphTexts: Map<string, string>; // id → plain text content
  annotations: SidecarAnnotation[];
  annotationIds: Set<string>;
  annotationsByParagraph: Map<string, string[]>;
  entityRefSlugs: Set<string>;
  hasComponentsScript: boolean;
  content: string;
}

async function parseHtml(): Promise<HtmlData> {
  const content = await Bun.file(sourceFile!).text();

  // Paragraph IDs and plain text lengths
  const paragraphIds = new Set<string>();
  const paragraphTexts = new Map<string, string>();
  const pIdRe = /<p\s[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = pIdRe.exec(content)) !== null) {
    paragraphIds.add(m[1]);
    paragraphTexts.set(m[1], stripHtml(m[2]));
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
  const entityRefRe = /<span class="entity-ref" data-slug="([^"]+)"/g;
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
  expectedText: string | null; // the text: "..." field from the ref file
  textLineNumber: number;      // 0-indexed line number of the text: line in the ref file
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

    for (let li = 0; li < lines.length; li++) {
      const line = lines[li];
      if (line.match(/^## References in Commentary/)) { inRefs = true; continue; }
      if (inRefs && line.startsWith("## ")) { inRefs = false; continue; }
      if (!inRefs) continue;
      if (!line.includes(`\`${fileName}#`)) continue;

      // Extract text: "..." from the next line (if present)
      const textLineIdx = li + 1;
      const nextLine = textLineIdx < lines.length ? lines[textLineIdx] : "";
      const expectedText = parseTextLine(nextLine);

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
          expectedText,
          textLineNumber: textLineIdx,
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
          expectedText,
          textLineNumber: textLineIdx,
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
          expectedText,
          textLineNumber: textLineIdx,
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
    const textLen = (html.paragraphTexts.get(a.paragraph) || "").length;
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

  // Check 5b: Annotation text at offsets doesn't match ref file's expected text
  // Build a map from annotation ID → expected text from ref files
  const refExpectedTexts = new Map<string, { text: string; entity: string; filePath: string; textLineNumber: number }>();
  for (const ref of refFiles) {
    for (const r of ref.references) {
      if (r.annotationId && r.expectedText) {
        refExpectedTexts.set(r.annotationId, {
          text: r.expectedText,
          entity: ref.entitySlug,
          filePath: ref.filePath,
          textLineNumber: r.textLineNumber,
        });
      }
    }
  }

  interface TextMismatch {
    id: string;
    selected: string;
    expected: string;
    entity: string;
    diagnosis: string;
    quoteOnly: boolean;
    filePath: string;
    textLineNumber: number;
  }

  const textMismatches: TextMismatch[] = [];
  for (const a of html.annotations) {
    const plainText = html.paragraphTexts.get(a.paragraph);
    if (!plainText) continue;

    const expected = refExpectedTexts.get(a.id);
    if (!expected) continue;

    const selectedText = plainText.slice(a.start, a.end).replace(/\s+/g, " ").trim();
    const expectedText = expected.text.replace(/\s+/g, " ").trim();

    // Skip ellipsis matches (they span a range, text won't match exactly)
    if (expected.text.includes("...")) continue;

    if (selectedText === expectedText) continue;

    // Check if the only difference is quote/dash style (normalization-only mismatch)
    const quoteOnly = normalizeForMatch(selectedText) === normalizeForMatch(expectedText);

    // Diagnose the mismatch
    let diagnosis: string;
    if (selectedText.length !== expectedText.length && normalizeForMatch(selectedText).startsWith(normalizeForMatch(expectedText))) {
      diagnosis = `span extends ${selectedText.length - expectedText.length} chars beyond ref text (annotation span is longer than text: field)`;
    } else if (selectedText.length !== expectedText.length && normalizeForMatch(expectedText).startsWith(normalizeForMatch(selectedText))) {
      diagnosis = `ref text extends ${expectedText.length - selectedText.length} chars beyond span (text: field is longer than annotation span)`;
    } else {
      // Find first divergence point
      let divergeAt = 0;
      const normSel = normalizeForMatch(selectedText);
      const normExp = normalizeForMatch(expectedText);
      while (divergeAt < normSel.length && divergeAt < normExp.length && normSel[divergeAt] === normExp[divergeAt]) {
        divergeAt++;
      }
      if (divergeAt === normSel.length || divergeAt === normExp.length) {
        diagnosis = `length differs: span=${selectedText.length} vs ref=${expectedText.length}`;
      } else {
        diagnosis = `texts diverge at char ${divergeAt}`;
      }
    }

    textMismatches.push({
      id: a.id,
      selected: selectedText,
      expected: expectedText,
      entity: expected.entity,
      diagnosis,
      quoteOnly,
      filePath: expected.filePath,
      textLineNumber: expected.textLineNumber,
    });
  }

  if (textMismatches.length > 0) {
    const quoteOnlyMismatches = textMismatches.filter(m => m.quoteOnly);
    const realMismatches = textMismatches.filter(m => !m.quoteOnly);

    if (realMismatches.length > 0) {
      // Categorize by diagnosis type
      const spanLonger = realMismatches.filter(m => m.diagnosis.includes("span extends"));
      const refLonger = realMismatches.filter(m => m.diagnosis.includes("ref text extends"));
      const divergent = realMismatches.filter(m => m.diagnosis.includes("diverge") || m.diagnosis.includes("length differs"));

      console.log(`❌ ${realMismatches.length} annotations have text at offsets that doesn't match expected ref text:`);
      if (spanLonger.length > 0) console.log(`   Annotation span longer than ref text: ${spanLonger.length}`);
      if (refLonger.length > 0) console.log(`   Ref text longer than annotation span: ${refLonger.length}`);
      if (divergent.length > 0) console.log(`   Texts diverge: ${divergent.length}`);
      console.log();

      for (const m of realMismatches.slice(0, 10)) {
        // Show context around the difference, not just the first 60 chars
        const normSel = normalizeForMatch(m.selected);
        const normExp = normalizeForMatch(m.expected);
        let divergeAt = 0;
        while (divergeAt < normSel.length && divergeAt < normExp.length && normSel[divergeAt] === normExp[divergeAt]) {
          divergeAt++;
        }

        console.log(`   ${m.id}`);
        console.log(`     ${m.diagnosis}`);

        if (m.diagnosis.includes("span extends") || m.diagnosis.includes("ref text extends")) {
          // Show where the shorter text ends and what continues
          const shorter = m.selected.length < m.expected.length ? m.selected : m.expected;
          const longer = m.selected.length < m.expected.length ? m.expected : m.selected;
          const label = m.selected.length < m.expected.length ? "ref" : "span";
          const endContext = shorter.slice(-30);
          const extraText = longer.slice(shorter.length, shorter.length + 40);
          console.log(`     match ends: ...${endContext}`);
          console.log(`     ${label} continues: ${extraText}...`);
        } else {
          // Show text around the divergence point
          const start = Math.max(0, divergeAt - 15);
          const selContext = m.selected.slice(start, divergeAt + 25);
          const expContext = m.expected.slice(start, divergeAt + 25);
          console.log(`     span: ...${selContext}...`);
          console.log(`      ref: ...${expContext}...`);
        }
        console.log(`     in: ${m.filePath.replace(/.*\/refs\//, "")}`);
      }
      if (realMismatches.length > 10) console.log(`   ... and ${realMismatches.length - 10} more`);
      console.log();
      issueCount += realMismatches.length;
    }

    if (quoteOnlyMismatches.length > 0) {
      if (fixQuotes) {
        // Auto-fix: update ref file text to match the HTML source text
        const fileUpdates = new Map<string, string[]>(); // filePath → lines
        for (const m of quoteOnlyMismatches) {
          if (!fileUpdates.has(m.filePath)) {
            const content = await Bun.file(m.filePath).text();
            fileUpdates.set(m.filePath, content.split("\n"));
          }
          const lines = fileUpdates.get(m.filePath)!;
          // Replace the text: line with the selected (HTML source) text
          lines[m.textLineNumber] = `  text: "${m.selected}"`;
        }
        // Write updated files
        let fixedCount = 0;
        for (const [filePath, lines] of fileUpdates) {
          await Bun.write(filePath, lines.join("\n"));
          fixedCount++;
        }
        console.log(`✅ Fixed ${quoteOnlyMismatches.length} quote-style mismatches across ${fixedCount} ref files`);
        console.log();
      } else {
        console.log(`⚠️  ${quoteOnlyMismatches.length} annotations differ only in quote/dash style (cosmetic normalization differences)`);
        console.log(`   Run with --fix-quotes to auto-fix ref files to match the HTML source text.`);
        console.log();
        // Don't count quote-only mismatches as errors — they're cosmetic
      }
    }
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
      console.log(`   data-slug="${s}"`);;
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

  // Check 8: Generated index pages with stale/missing annotation hashes
  const indexGlob = new Glob("**/*.html");
  const staleIndexLinks: { indexPage: string; hash: string }[] = [];
  const linkRe = new RegExp(
    `/${escapeRegex(fileName)}[^"]*#([a-z0-9-]+-s-[a-f0-9]{7})`,
    "g"
  );
  for await (const path of indexGlob.scan("index")) {
    const pageContent = await Bun.file(`index/${path}`).text();
    let lm;
    while ((lm = linkRe.exec(pageContent)) !== null) {
      if (!html.annotationIds.has(lm[1])) {
        staleIndexLinks.push({ indexPage: `index/${path}`, hash: lm[1] });
      }
    }
  }
  if (staleIndexLinks.length > 0) {
    console.log(`❌ ${staleIndexLinks.length} generated index page links point to annotation hashes not in sidecar:`);
    for (const s of staleIndexLinks.slice(0, 20)) {
      console.log(`   ${s.indexPage} → #${s.hash}`);
    }
    if (staleIndexLinks.length > 20) console.log(`   ... and ${staleIndexLinks.length - 20} more`);
    console.log(`   Fix: re-run 'bun generate-index.ts' after 'bun annotate-source.ts ${sourceFile}'\n`);
    issueCount += staleIndexLinks.length;
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
