#!/usr/bin/env bun
/**
 * lint.ts — Consolidated lint tool for the Lapide index pipeline
 *
 * Replaces running validate-refs.ts, lint-annotations.ts, and
 * annotate-source.ts --check separately.
 *
 * Usage:
 *   bun lint.ts                     # global ref file checks only
 *   bun lint.ts <source.html>       # global + source-file checks
 *   bun lint.ts --fix <source.html> # auto-fix ref file text: fields
 */

import { Glob } from "bun";
import {
  stripHtml,
  normalizeForMatch,
  findInPlainText,
  parseTextLine,
  encodeForRefFile,
  extractParagraphs,
  parseSidecar,
  computeHash,
  type Annotation,
} from "./pipeline-utils";

// ── CLI parsing ──

const fixMode = Bun.argv.includes("--fix");
const sourceFile = Bun.argv.find(a => a.endsWith(".html"));

const REFS_DIR = "index/refs";

// ── Types ──

interface RefFileParsed {
  path: string;
  slug: string;
  name: string;
  category: string;
  isAlias: boolean;
  aliasOf?: string;
  related: Record<string, string[]>;
  /** raw body lines referencing any source, keyed as "file.html#paraId" */
  references: RefReference[];
  rawContent: string;
  rawLines: string[];
}

interface RefReference {
  /** e.g. "01_Preliminares.html#dedicatory-letter-p3" (base, no hash suffix) */
  sourceRef: string;
  /** base paragraph ID (no -s- hash suffix) */
  paragraphId: string;
  /** source filename */
  sourceFile: string;
  /** decoded text from text: line, or null */
  quotedText: string | null;
  /** line index in the ref file of the `file.html#id` line */
  refLineIndex: number;
  /** line index of the text: line (if present) */
  textLineIndex: number;
  /** whether the ref already has a -s-XXXXXXX sidecar hash */
  hasSidecarHash: boolean;
  /** the full annotation id including hash, if present */
  annotationId: string | null;
}

interface LintResult {
  errors: LintMessage[];
  warnings: LintMessage[];
}

interface LintMessage {
  message: string;
}

// ── Minimal YAML frontmatter parser (copied from validate-refs.ts) ──

function parseFrontmatter(content: string): { meta: Record<string, any>; body: string } | null {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return null;

  const yamlStr = match[1];
  const body = match[2];
  const meta: Record<string, any> = {};

  let currentKey = "";
  let currentList: string[] | null = null;
  let currentNested: Record<string, string[]> | null = null;
  let nestedKey = "";
  let nestedList: string[] | null = null;

  for (const line of yamlStr.split("\n")) {
    // Nested list item (8 spaces or 2 tabs + "- ")
    if (/^(        |\t\t)\s*- /.test(line) && nestedKey) {
      const val = line.replace(/^\s*- /, "").trim();
      if (nestedList) nestedList.push(val);
      continue;
    }

    // Nested key (4 spaces or 1 tab + "key:")
    if (/^(    |\t)\s*\w/.test(line) && currentNested !== null) {
      if (nestedKey && nestedList) {
        currentNested[nestedKey] = nestedList;
      }
      const nestedMatch = line.match(/^\s+(\w[\w-]*):\s*$/);
      if (nestedMatch) {
        nestedKey = nestedMatch[1];
        nestedList = [];
        continue;
      }
      const nestedInline = line.match(/^\s+(\w[\w-]*):\s*(.+)$/);
      if (nestedInline) {
        nestedKey = nestedInline[1];
        nestedList = null;
        currentNested[nestedKey] = [nestedInline[2].trim()];
        continue;
      }
    }

    // Top-level list item (2 spaces + "- ")
    if (/^\s{2}- /.test(line) && currentList !== null) {
      currentList.push(line.replace(/^\s*- /, "").trim());
      continue;
    }

    // Save any pending nested data
    if (nestedKey && nestedList && currentNested) {
      currentNested[nestedKey] = nestedList;
      nestedKey = "";
      nestedList = null;
    }
    if (currentKey && currentNested) {
      meta[currentKey] = currentNested;
      currentNested = null;
    }
    if (currentKey && currentList !== null && currentNested === null) {
      meta[currentKey] = currentList;
      currentList = null;
    }

    // Top-level key: value
    const kvMatch = line.match(/^(\w[\w_-]*):\s*(.*)$/);
    if (kvMatch) {
      currentKey = kvMatch[1];
      const val = kvMatch[2].trim();

      if (val === "") {
        currentList = [];
        currentNested = null;
        continue;
      }

      if (currentKey === "related" || currentKey === "aliases") {
        if (val === "") {
          currentNested = {};
          currentList = null;
        } else {
          meta[currentKey] = val.replace(/^["']|["']$/g, "");
          currentList = null;
        }
        continue;
      }

      meta[currentKey] = val.replace(/^["']|["']$/g, "");
      currentList = null;
      continue;
    }

    if (line.trim() === "" && currentList !== null && currentList.length === 0) {
      continue;
    }
  }

  // Flush remaining
  if (nestedKey && nestedList && currentNested) {
    currentNested[nestedKey] = nestedList;
  }
  if (currentKey && currentNested) {
    meta[currentKey] = currentNested;
  } else if (currentKey && currentList !== null) {
    meta[currentKey] = currentList;
  }

  return { meta, body };
}

// ── Scan all ref files (once) ──

async function scanRefFiles(): Promise<RefFileParsed[]> {
  const refs: RefFileParsed[] = [];
  const glob = new Glob("**/*.md");

  for await (const path of glob.scan(REFS_DIR)) {
    const fullPath = `${REFS_DIR}/${path}`;
    const content = await Bun.file(fullPath).text();
    const parsed = parseFrontmatter(content);

    if (!parsed) {
      refs.push({
        path: fullPath,
        slug: "",
        name: "",
        category: "",
        isAlias: false,
        related: {},
        references: [],
        rawContent: content,
        rawLines: content.split("\n"),
      });
      continue;
    }

    const { meta, body } = parsed;

    // Alias file
    if (meta.alias_of) {
      refs.push({
        path: fullPath,
        slug: "",
        name: "",
        category: "",
        isAlias: true,
        aliasOf: meta.alias_of,
        related: {},
        references: [],
        rawContent: content,
        rawLines: content.split("\n"),
      });
      continue;
    }

    const slug = meta.slug || "";
    const name = meta.name ? String(meta.name).replace(/^["']|["']$/g, "") : "";
    const category = meta.category || "";

    // Collect related
    const related: Record<string, string[]> = {};
    if (meta.related && typeof meta.related === "object") {
      for (const [key, vals] of Object.entries(meta.related)) {
        if (Array.isArray(vals)) {
          related[key] = vals;
        }
      }
    }

    // Parse references from body
    const references: RefReference[] = [];
    const bodyLines = body.split("\n");
    const allLines = content.split("\n");
    // Find where the body starts in the full file
    const fmEndMatch = content.match(/^---\n[\s\S]*?\n---\n?/);
    const bodyStartLine = fmEndMatch ? fmEndMatch[0].split("\n").length - 1 : 0;

    let lastRef = "";
    let lastParaId = "";
    let lastSourceFile = "";
    let lastLineIndex = 0;
    let lastHasSidecarHash = false;
    let lastAnnotationId: string | null = null;

    for (let i = 0; i < bodyLines.length; i++) {
      const line = bodyLines[i];
      const absoluteLineIndex = bodyStartLine + i;

      // Match: `source.html#paragraph-id` or `source.html#paragraph-id-s-hash`
      const refMatch = line.match(/`([^`]+\.html)#([^`]+)`/);
      if (refMatch) {
        const srcFile = refMatch[1];
        const rawAnchor = refMatch[2];
        const baseAnchor = rawAnchor.replace(/-s-[a-f0-9]{7}$/, "");
        const hasSidecarHash = /-s-[a-f0-9]{7}$/.test(rawAnchor);
        const annotationId = hasSidecarHash ? rawAnchor : null;

        lastRef = `${srcFile}#${baseAnchor}`;
        lastParaId = baseAnchor;
        lastSourceFile = srcFile;
        lastLineIndex = absoluteLineIndex;
        lastHasSidecarHash = hasSidecarHash;
        lastAnnotationId = annotationId;

        // Check if next line has text:
        const nextLine = i + 1 < bodyLines.length ? bodyLines[i + 1] : "";
        const parsedText = parseTextLine(nextLine);

        references.push({
          sourceRef: lastRef,
          paragraphId: baseAnchor,
          sourceFile: srcFile,
          quotedText: parsedText,
          refLineIndex: absoluteLineIndex,
          textLineIndex: parsedText ? absoluteLineIndex + 1 : -1,
          hasSidecarHash,
          annotationId,
        });
        continue;
      }

      // If we have a pending ref and this line has text:, associate it
      // (Already handled above by peeking ahead)
    }

    refs.push({
      path: fullPath,
      slug,
      name,
      category,
      isAlias: false,
      related,
      references,
      rawContent: content,
      rawLines: allLines,
    });
  }

  return refs;
}

// ── Global checks ──

function runGlobalChecks(refs: RefFileParsed[]): LintResult {
  const errors: LintMessage[] = [];
  const warnings: LintMessage[] = [];

  const canonicalRefs = refs.filter(r => !r.isAlias);
  const aliasRefs = refs.filter(r => r.isAlias);

  // Build slug -> path map
  const slugToPath = new Map<string, string>();
  const allSlugs = new Set<string>();

  // Check 1: Valid YAML frontmatter — required fields
  for (const ref of canonicalRefs) {
    const parsed = parseFrontmatter(ref.rawContent);
    if (!parsed) {
      errors.push({ message: `${ref.path}: No valid YAML frontmatter found` });
      continue;
    }
    const { meta } = parsed;
    for (const field of ["name", "slug", "category"]) {
      if (!meta[field]) {
        errors.push({ message: `${ref.path}: Missing required field: ${field}` });
      }
    }
  }

  // Check 2: Slug matches file path
  for (const ref of canonicalRefs) {
    if (!ref.slug) continue;
    const expectedPath = `${REFS_DIR}/${ref.slug}.md`;
    if (ref.path !== expectedPath) {
      warnings.push({ message: `${ref.path}: Slug "${ref.slug}" doesn't match file path (expected ${expectedPath})` });
    }
  }

  // Check 3: No duplicate slugs
  for (const ref of canonicalRefs) {
    if (!ref.slug) continue;
    if (slugToPath.has(ref.slug)) {
      errors.push({ message: `${ref.path}: Duplicate slug "${ref.slug}" -- also in ${slugToPath.get(ref.slug)}` });
    } else {
      slugToPath.set(ref.slug, ref.path);
      allSlugs.add(ref.slug);
    }
  }

  // Check 4: Cross-references in related: point to existing ref files
  for (const ref of canonicalRefs) {
    for (const [relType, slugs] of Object.entries(ref.related)) {
      for (const relSlug of slugs) {
        if (!allSlugs.has(relSlug)) {
          warnings.push({ message: `${ref.path}: Related ${relType} reference "${relSlug}" not found` });
        }
      }
    }
  }

  // Check 5: Alias files point to valid canonical entries
  for (const ref of aliasRefs) {
    if (ref.aliasOf && !allSlugs.has(ref.aliasOf)) {
      errors.push({ message: `${ref.path}: Alias target "${ref.aliasOf}" not found` });
    }
  }

  return { errors, warnings };
}

// ── Source file checks ──

async function runSourceChecks(
  refs: RefFileParsed[],
  sourceFilePath: string,
  fix: boolean,
): Promise<LintResult> {
  const errors: LintMessage[] = [];
  const warnings: LintMessage[] = [];

  const sourceBasename = sourceFilePath.replace(/^.*\//, "");
  const html = await Bun.file(sourceFilePath).text();

  // Parse paragraphs from HTML
  const paragraphs = extractParagraphs(html);

  // Also collect all IDs (not just <p> tags)
  const allIds = new Set<string>();
  const idPattern = /\bid="([^"]+)"/g;
  let idMatch;
  while ((idMatch = idPattern.exec(html)) !== null) {
    allIds.add(idMatch[1]);
  }

  // Collect all references to this source file
  const relevantRefs: { ref: RefFileParsed; entry: RefReference }[] = [];
  for (const ref of refs) {
    if (ref.isAlias) continue;
    for (const entry of ref.references) {
      if (entry.sourceFile === sourceBasename) {
        relevantRefs.push({ ref, entry });
      }
    }
  }

  // Build slug set for entity-ref validation
  const allSlugs = new Set<string>();
  for (const ref of refs) {
    if (!ref.isAlias && ref.slug) allSlugs.add(ref.slug);
  }

  // ── Check 6: Paragraph IDs exist ──
  let paraIdErrors = 0;
  const checkedParaIds = new Set<string>();
  for (const { ref, entry } of relevantRefs) {
    const key = `${ref.path}:${entry.paragraphId}`;
    if (checkedParaIds.has(key)) continue;
    checkedParaIds.add(key);

    if (!allIds.has(entry.paragraphId)) {
      errors.push({
        message: `Paragraph ID not found: ${ref.path}:${entry.refLineIndex + 1}\n  paragraph: #${entry.paragraphId}\n  not found in ${sourceBasename}`,
      });
      paraIdErrors++;
    }
  }

  // ── Check 7: Text quotes match ──
  let textChecked = 0;
  let textMatched = 0;
  let textErrors = 0;

  // Track fixes for --fix mode
  const fixes: { refPath: string; lineIndex: number; oldText: string; newText: string }[] = [];

  for (const { ref, entry } of relevantRefs) {
    if (!entry.quotedText) continue;
    textChecked++;

    const paraText = paragraphs.get(entry.paragraphId);
    if (paraText === undefined) {
      // Paragraph not found as <p> -- might be on a non-<p> tag
      if (allIds.has(entry.paragraphId)) {
        warnings.push({
          message: `ID "${entry.paragraphId}" exists but no <p> content found to verify text\n  in: ${ref.path}`,
        });
      }
      // If the ID doesn't exist at all, check 6 already reported it
      continue;
    }

    const normQuote = normalizeForMatch(entry.quotedText);

    // Try direct match via findInPlainText
    let found = findInPlainText(paraText, normQuote, 0);

    // Try ellipsis segments
    if (!found && normQuote.includes("...")) {
      const segments = normQuote.split(/\.{3,}/).map(s => s.trim()).filter(s => s.length > 5);
      if (segments.length > 0) {
        const allSegmentsFound = segments.every(seg => findInPlainText(paraText, seg, 0) !== null);
        if (allSegmentsFound) {
          // For ellipsis patterns, finding all segments counts as a match
          found = { start: 0, end: 0 }; // placeholder -- we verified all segments
        }
      }
    }

    if (found) {
      textMatched++;
    } else {
      textErrors++;
      // Build diagnostic
      const normPara = normalizeForMatch(paraText);
      let divergeAt = 0;
      while (divergeAt < normQuote.length && divergeAt < normPara.length && normQuote[divergeAt] === normPara[divergeAt]) {
        divergeAt++;
      }

      // For --fix mode: try to find a close match by looking for a prefix
      if (fix && entry.textLineIndex >= 0) {
        // Try to find where the ref text roughly starts in the paragraph
        const prefix = normQuote.slice(0, Math.min(30, normQuote.length));
        const prefixMatch = findInPlainText(paraText, prefix, 0);
        if (prefixMatch) {
          // Extract the actual text from the paragraph at approximately the right length
          const actualText = paraText.slice(prefixMatch.start, prefixMatch.start + entry.quotedText.length);
          const encoded = encodeForRefFile(actualText);
          fixes.push({
            refPath: ref.path,
            lineIndex: entry.textLineIndex,
            oldText: entry.quotedText,
            newText: encoded,
          });
        } else {
          errors.push({
            message: `Text mismatch (unfixable): ${ref.path}:${entry.textLineIndex + 1}\n  paragraph: #${entry.paragraphId}\n  could not locate text in paragraph to auto-fix`,
          });
        }
      } else {
        // Show context around divergence
        const start = Math.max(0, divergeAt - 20);
        const refContext = normQuote.slice(start, divergeAt + 30);
        const htmlContext = normPara.length > start ? normPara.slice(start, divergeAt + 30) : "(paragraph too short)";

        errors.push({
          message: `Text mismatch: ${ref.path}:${entry.textLineIndex >= 0 ? entry.textLineIndex + 1 : entry.refLineIndex + 1}\n  paragraph: #${entry.paragraphId}\n  texts diverge at char ${divergeAt}\n    ref:  ...${refContext}...\n    html: ...${htmlContext}...`,
        });
      }
    }
  }

  // Apply fixes if in --fix mode
  if (fix && fixes.length > 0) {
    // Group fixes by ref file
    const byFile = new Map<string, typeof fixes>();
    for (const f of fixes) {
      if (!byFile.has(f.refPath)) byFile.set(f.refPath, []);
      byFile.get(f.refPath)!.push(f);
    }

    let fixedCount = 0;
    for (const [filePath, fileFixes] of byFile) {
      const content = await Bun.file(filePath).text();
      const lines = content.split("\n");

      for (const f of fileFixes) {
        if (f.lineIndex >= 0 && f.lineIndex < lines.length) {
          lines[f.lineIndex] = `  text: "${f.newText}"`;
          fixedCount++;
        }
      }

      await Bun.write(filePath, lines.join("\n"));
    }

    console.log(`  Fixed ${fixedCount} text quote(s) across ${byFile.size} ref file(s)`);
  }

  // ── Check 8: Sidecar annotations in sync ──
  // Replicate annotate-source.ts --check logic:
  // Build what the sidecar SHOULD contain from ref files, then compare to existing sidecar.

  const htmlStripped = html.replace(
    /<script type="application\/json" id="passage-annotations">[\s\S]*?<\/script>\n?/,
    ""
  );
  const cleanParagraphs = extractParagraphs(htmlStripped);

  interface PendingAnnotation {
    paragraph: string;
    start: number;
    end: number;
    matchedText: string;
    entities: Set<string>;
  }

  const pendingByKey = new Map<string, PendingAnnotation>();
  let sidecarMissed = 0;

  for (const { ref, entry } of relevantRefs) {
    if (!entry.quotedText) continue;

    const plainText = cleanParagraphs.get(entry.paragraphId);
    if (!plainText) {
      sidecarMissed++;
      continue;
    }

    const normQuote = normalizeForMatch(entry.quotedText);
    let result: { start: number; end: number } | null = null;

    // Direct match
    result = findInPlainText(plainText, normQuote, 0);

    // Ellipsis: match first and last segments, span the range
    if (!result && normQuote.includes("...")) {
      const segments = normQuote.split(/\.{3,}/).map(s => s.trim()).filter(s => s.length > 5);
      if (segments.length > 0) {
        const first = findInPlainText(plainText, segments[0], 0);
        const last = segments.length > 1
          ? findInPlainText(plainText, segments[segments.length - 1], first?.start || 0)
          : first;
        if (first && last) {
          result = { start: first.start, end: last.end };
        }
      }
    }

    if (!result) {
      sidecarMissed++;
      continue;
    }

    const matchedText = plainText.slice(result.start, result.end);
    const key = `${entry.paragraphId}:${result.start}:${result.end}`;

    if (pendingByKey.has(key)) {
      pendingByKey.get(key)!.entities.add(ref.slug);
    } else {
      pendingByKey.set(key, {
        paragraph: entry.paragraphId,
        start: result.start,
        end: result.end,
        matchedText,
        entities: new Set([ref.slug]),
      });
    }
  }

  // Build expected annotations
  const expectedAnnotations: Annotation[] = [];
  for (const [, pending] of pendingByKey) {
    const hash = computeHash(pending.matchedText);
    const id = `${pending.paragraph}-s-${hash}`;
    expectedAnnotations.push({
      id,
      paragraph: pending.paragraph,
      start: pending.start,
      end: pending.end,
      entities: [...pending.entities].sort(),
    });
  }
  expectedAnnotations.sort((a, b) => {
    if (a.paragraph !== b.paragraph) return a.paragraph.localeCompare(b.paragraph);
    return a.start - b.start;
  });

  // Parse existing sidecar
  const existingAnnotations = parseSidecar(html) || [];
  const existingById = new Map(existingAnnotations.map(a => [a.id, a]));
  const expectedById = new Map(expectedAnnotations.map(a => [a.id, a]));

  const sidecarAdded = expectedAnnotations.filter(a => !existingById.has(a.id));
  const sidecarRemoved = existingAnnotations.filter(a => !expectedById.has(a.id));
  const sidecarChanged: { id: string; reason: string }[] = [];

  for (const a of expectedAnnotations) {
    const existing = existingById.get(a.id);
    if (!existing) continue;
    if (existing.start !== a.start || existing.end !== a.end) {
      sidecarChanged.push({ id: a.id, reason: `offsets ${existing.start}:${existing.end} -> ${a.start}:${a.end}` });
    } else if (JSON.stringify(existing.entities) !== JSON.stringify(a.entities)) {
      sidecarChanged.push({ id: a.id, reason: `entities [${existing.entities}] -> [${a.entities}]` });
    }
  }

  const sidecarIssues = sidecarAdded.length + sidecarRemoved.length + sidecarChanged.length;

  if (sidecarAdded.length > 0) {
    for (const a of sidecarAdded) {
      errors.push({ message: `Sidecar out of sync: annotation ${a.id} would be added (${a.entities.join(", ")})` });
    }
  }
  if (sidecarRemoved.length > 0) {
    for (const a of sidecarRemoved) {
      errors.push({ message: `Sidecar out of sync: annotation ${a.id} would be removed (${a.entities.join(", ")})` });
    }
  }
  if (sidecarChanged.length > 0) {
    for (const c of sidecarChanged) {
      errors.push({ message: `Sidecar out of sync: annotation ${c.id} would change: ${c.reason}` });
    }
  }

  // ── Check 9: Annotation offsets valid ──
  let offsetErrors = 0;
  for (const a of existingAnnotations) {
    if (!paragraphs.has(a.paragraph)) {
      errors.push({ message: `Annotation offset invalid: ${a.id} -- paragraph "${a.paragraph}" not found` });
      offsetErrors++;
      continue;
    }
    const textLen = paragraphs.get(a.paragraph)!.length;
    if (a.start < 0 || a.end < 0 || a.start > a.end) {
      errors.push({ message: `Annotation offset invalid: ${a.id} -- start=${a.start} end=${a.end}` });
      offsetErrors++;
    } else if (a.end > textLen + 5) {
      errors.push({ message: `Annotation offset invalid: ${a.id} -- end offset ${a.end} exceeds paragraph text length ${textLen}` });
      offsetErrors++;
    }
  }

  // ── Check 10: No orphaned annotations ──
  const allReferencedAnnotationIds = new Set<string>();
  for (const { entry } of relevantRefs) {
    if (entry.annotationId) {
      allReferencedAnnotationIds.add(entry.annotationId);
    }
  }

  let orphanCount = 0;
  for (const a of existingAnnotations) {
    if (!allReferencedAnnotationIds.has(a.id)) {
      warnings.push({ message: `Orphaned annotation: ${a.id} -- not referenced by any ref file` });
      orphanCount++;
    }
  }

  // ── Check 11: Entity-ref slugs resolve ──
  const entityRefRe = /<entity-ref\s+slug="([^"]+)"/g;
  const entityRefSlugs = new Set<string>();
  let entityRefMatch;
  while ((entityRefMatch = entityRefRe.exec(html)) !== null) {
    entityRefSlugs.add(entityRefMatch[1]);
  }

  let brokenEntityRefCount = 0;
  for (const slug of entityRefSlugs) {
    if (!allSlugs.has(slug)) {
      errors.push({ message: `Entity-ref slug not found: <entity-ref slug="${slug}"> has no matching ref file` });
      brokenEntityRefCount++;
    }
  }

  // ── Check 12: components.js present ──
  const hasEntityRefs = entityRefSlugs.size > 0;
  const hasComponentsScript = html.includes("/index/components.js");

  if (hasEntityRefs && !hasComponentsScript) {
    errors.push({ message: `Missing components.js: entity-ref tags found but <script src="/index/components.js"> not in <head>` });
  }

  // ── Check 13: Extraction files ──
  const baseName = sourceBasename.replace(/\.html$/, "");
  const extractionDir = `index/extractions/${baseName}/`;
  let extractionChecked = 0;
  let extractionMatched = 0;
  let extractionFixed = 0;

  // Build map of corrected ref file texts by paragraph ID (for --fix fallback)
  const refTextsByPara = new Map<string, string[]>();
  for (const { entry } of relevantRefs) {
    if (entry.quotedText) {
      if (!refTextsByPara.has(entry.paragraphId)) refTextsByPara.set(entry.paragraphId, []);
      refTextsByPara.get(entry.paragraphId)!.push(entry.quotedText);
    }
  }

  try {
    const extractionGlob = new Glob("*.md");
    const extractionFiles: string[] = [];
    for await (const path of extractionGlob.scan(extractionDir)) {
      extractionFiles.push(`${extractionDir}${path}`);
    }

    if (extractionFiles.length > 0) {
      for (const filePath of extractionFiles) {
        const content = await Bun.file(filePath).text();
        const lines = content.split("\n");
        let lastParaId = "";

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const refMatch = line.match(/`#([^`]+)`/);
          if (refMatch) {
            lastParaId = refMatch[1];
            continue;
          }

          const parsedText = parseTextLine(line);
          if (parsedText && lastParaId) {
            extractionChecked++;

            if (!allIds.has(lastParaId)) {
              errors.push({ message: `Extraction error: ${filePath}:${i + 1} — paragraph ID "#${lastParaId}" not found in HTML` });
              continue;
            }

            const paraText = paragraphs.get(lastParaId);
            if (!paraText) {
              extractionChecked--;
              continue;
            }

            // Use findInPlainText for exact normalized matching
            const normQuote = normalizeForMatch(parsedText);
            const result = findInPlainText(paraText, normQuote, 0);

            if (result) {
              extractionMatched++;
              // Check if the raw text differs (fixable)
              const actualText = paraText.slice(result.start, result.end);
              if (actualText !== parsedText && fix) {
                const encoded = encodeForRefFile(actualText);
                lines[i] = `    text: "${encoded}"`;
                extractionFixed++;
              }
            } else if (normQuote.includes("...")) {
              // Ellipsis: check segments
              const segments = normQuote.split(/\.{3,}/).map(s => s.trim()).filter(s => s.length > 5);
              const normPara = normalizeForMatch(paraText);
              if (segments.length > 0 && segments.every(seg => normPara.includes(seg))) {
                extractionMatched++;
              } else {
                errors.push({ message: `Extraction mismatch: ${filePath}:${i + 1} — text not found in #${lastParaId}: "${parsedText.slice(0, 60)}..."` });
              }
            } else if (fix) {
              // Try to find a corrected version from ref files for the same paragraph
              const refEntries = refTextsByPara.get(lastParaId) || [];
              // Find a ref entry whose text contains a significant overlap with the extraction text
              const normExtraction = normalizeForMatch(parsedText);
              const extractionWords = normExtraction.split(/\s+/).filter(w => w.length > 4);
              let bestMatch: string | null = null;
              let bestScore = 0;
              for (const refText of refEntries) {
                const normRef = normalizeForMatch(refText);
                // Score by counting shared significant words
                const score = extractionWords.filter(w => normRef.includes(w)).length;
                if (score > bestScore && score >= 3) {
                  bestScore = score;
                  bestMatch = refText;
                }
              }
              if (bestMatch) {
                const encoded = encodeForRefFile(bestMatch);
                lines[i] = `    text: "${encoded}"`;
                extractionFixed++;
                extractionMatched++;
              } else {
                errors.push({ message: `Extraction mismatch: ${filePath}:${i + 1} — text not found in #${lastParaId}: "${parsedText.slice(0, 60)}..."` });
              }
            } else {
              errors.push({ message: `Extraction mismatch: ${filePath}:${i + 1} — text not found in #${lastParaId}: "${parsedText.slice(0, 60)}..."` });
            }
          }
        }

        // Write back fixed file
        if (fix && extractionFixed > 0) {
          await Bun.write(filePath, lines.join("\n"));
        }
      }
    }
  } catch {
    // No extraction directory — that's fine, skip this check
  }

  // ── Summary line items ──
  const paraIdCount = relevantRefs.reduce((s, r) => { s.add(r.entry.paragraphId); return s; }, new Set<string>()).size;

  // Inject summary data as special messages (we'll parse these in main)
  const summaryPrefix = "__SUMMARY__:";
  warnings.push({ message: `${summaryPrefix}paraIds:${paraIdCount}` });
  warnings.push({ message: `${summaryPrefix}textChecked:${textChecked}` });
  warnings.push({ message: `${summaryPrefix}textMatched:${textMatched}` });
  warnings.push({ message: `${summaryPrefix}sidecarTotal:${existingAnnotations.length}` });
  warnings.push({ message: `${summaryPrefix}sidecarIssues:${sidecarIssues}` });
  warnings.push({ message: `${summaryPrefix}entityRefCount:${entityRefSlugs.size}` });
  warnings.push({ message: `${summaryPrefix}extractionChecked:${extractionChecked}` });
  warnings.push({ message: `${summaryPrefix}extractionMatched:${extractionMatched}` });
  if (fix && extractionFixed > 0) {
    warnings.push({ message: `${summaryPrefix}extractionFixed:${extractionFixed}` });
  }

  return { errors, warnings };
}

// ── Main ──

async function main() {
  const refs = await scanRefFiles();
  const canonicalRefs = refs.filter(r => !r.isAlias);
  const aliasRefs = refs.filter(r => r.isAlias);

  const allErrors: LintMessage[] = [];
  const allWarnings: LintMessage[] = [];

  // Header
  if (sourceFile) {
    console.log(`Lint: ${sourceFile.replace(/^.*\//, "")}\n`);
  } else {
    console.log("Lint: global checks\n");
  }

  // ── Global checks ──
  console.log("Global checks:");
  console.log(`  ${canonicalRefs.length} ref files, ${aliasRefs.length} aliases`);

  const globalResult = runGlobalChecks(refs);

  // Check 1: YAML frontmatter
  const fmErrors = globalResult.errors.filter(e => e.message.includes("frontmatter") || e.message.includes("Missing required field"));
  if (fmErrors.length === 0) {
    console.log("  \u2713 YAML frontmatter valid");
  } else {
    console.log(`  \u2717 YAML frontmatter: ${fmErrors.length} error(s)`);
  }

  // Check 2: Slugs match paths
  const slugPathWarnings = globalResult.warnings.filter(w => w.message.includes("doesn't match file path"));
  if (slugPathWarnings.length === 0) {
    console.log("  \u2713 Slugs match paths");
  } else {
    console.log(`  \u2717 Slugs match paths: ${slugPathWarnings.length} warning(s)`);
  }

  // Check 3: No duplicate slugs
  const dupErrors = globalResult.errors.filter(e => e.message.includes("Duplicate slug"));
  if (dupErrors.length === 0) {
    console.log("  \u2713 No duplicate slugs");
  } else {
    console.log(`  \u2717 No duplicate slugs: ${dupErrors.length} error(s)`);
  }

  // Check 4: Cross-references valid
  const xrefWarnings = globalResult.warnings.filter(w => w.message.includes("Related") && w.message.includes("not found"));
  if (xrefWarnings.length === 0) {
    console.log("  \u2713 Cross-references valid");
  } else {
    console.log(`  \u2717 Cross-references valid: ${xrefWarnings.length} warning(s)`);
  }

  // Check 5: Aliases valid
  const aliasErrors = globalResult.errors.filter(e => e.message.includes("Alias target"));
  if (aliasErrors.length === 0) {
    console.log("  \u2713 Aliases valid");
  } else {
    console.log(`  \u2717 Aliases valid: ${aliasErrors.length} error(s)`);
  }

  allErrors.push(...globalResult.errors);
  allWarnings.push(...globalResult.warnings);

  // ── Source file checks ──
  if (sourceFile) {
    console.log("\nSource file checks:");

    const sourceResult = await runSourceChecks(refs, sourceFile, fixMode);

    // Extract summary data from special messages
    const summaryPrefix = "__SUMMARY__:";
    const summaryData: Record<string, number> = {};
    const realWarnings: LintMessage[] = [];
    for (const w of sourceResult.warnings) {
      if (w.message.startsWith(summaryPrefix)) {
        const [key, val] = w.message.slice(summaryPrefix.length).split(":");
        summaryData[key] = parseInt(val, 10);
      } else {
        realWarnings.push(w);
      }
    }

    // Check 6: Paragraph IDs
    const paraIdErrors = sourceResult.errors.filter(e => e.message.startsWith("Paragraph ID not found"));
    if (paraIdErrors.length === 0) {
      console.log(`  \u2713 ${summaryData.paraIds || 0} paragraph IDs verified`);
    } else {
      console.log(`  \u2717 Paragraph IDs: ${paraIdErrors.length} error(s)`);
    }

    // Check 7: Text quotes
    const textErrors = sourceResult.errors.filter(e => e.message.startsWith("Text mismatch"));
    if (textErrors.length === 0) {
      console.log(`  \u2713 ${summaryData.textMatched || 0} text quotes matched`);
    } else {
      console.log(`  \u2717 Text quotes: ${textErrors.length} error(s) (${summaryData.textMatched || 0}/${summaryData.textChecked || 0} matched)`);
    }

    // Check 8: Sidecar in sync
    const sidecarErrors = sourceResult.errors.filter(e => e.message.startsWith("Sidecar out of sync"));
    if (sidecarErrors.length === 0) {
      console.log(`  \u2713 ${summaryData.sidecarTotal || 0} sidecar annotations in sync`);
    } else {
      console.log(`  \u2717 Sidecar annotations: ${sidecarErrors.length} out of sync`);
    }

    // Check 9: Annotation offsets
    const offsetErrors = sourceResult.errors.filter(e => e.message.startsWith("Annotation offset invalid"));
    if (offsetErrors.length === 0) {
      console.log("  \u2713 Annotation offsets valid");
    } else {
      console.log(`  \u2717 Annotation offsets: ${offsetErrors.length} error(s)`);
    }

    // Check 10: Orphaned annotations
    const orphanWarnings = realWarnings.filter(w => w.message.startsWith("Orphaned annotation"));
    if (orphanWarnings.length === 0) {
      console.log("  \u2713 No orphaned annotations");
    } else {
      console.log(`  \u2717 Orphaned annotations: ${orphanWarnings.length} warning(s)`);
    }

    // Check 11: Entity-ref slugs
    const entityRefErrors = sourceResult.errors.filter(e => e.message.startsWith("Entity-ref slug not found"));
    if (entityRefErrors.length === 0) {
      const entityRefCount = summaryData.entityRefCount || 0;
      if (entityRefCount > 0) {
        console.log(`  \u2713 ${entityRefCount} entity-ref slugs valid`);
      } else {
        console.log("  \u2713 Entity-ref slugs valid (none found)");
      }
    } else {
      console.log(`  \u2717 Entity-ref slugs: ${entityRefErrors.length} error(s)`);
    }

    // Check 12: components.js
    const componentErrors = sourceResult.errors.filter(e => e.message.startsWith("Missing components.js"));
    if (componentErrors.length === 0) {
      console.log("  \u2713 components.js present");
    } else {
      console.log(`  \u2717 components.js missing`);
    }

    // Check 13: Extractions
    const extractionChecked = summaryData.extractionChecked || 0;
    const extractionMatched = summaryData.extractionMatched || 0;
    const extractionFixed = summaryData.extractionFixed || 0;
    const extractionErrors = sourceResult.errors.filter(e => e.message.startsWith("Extraction"));
    if (extractionChecked > 0) {
      if (extractionFixed > 0) {
        console.log(`  Fixed ${extractionFixed} extraction text quote(s)`);
      }
      if (extractionErrors.length === 0) {
        console.log(`  \u2713 ${extractionMatched} extraction quotes matched`);
      } else {
        console.log(`  \u2717 Extraction quotes: ${extractionErrors.length} error(s) (${extractionMatched}/${extractionChecked} matched)`);
      }
    } else {
      console.log("  \u2713 Extractions valid (none found)");
    }

    allErrors.push(...sourceResult.errors);
    allWarnings.push(...realWarnings);
  }

  // ── Final summary ──
  const errorCount = allErrors.length;
  const warningCount = allWarnings.length;

  console.log(`\n${errorCount} error${errorCount === 1 ? "" : "s"}, ${warningCount} warning${warningCount === 1 ? "" : "s"}`);

  // Print details for errors
  if (errorCount > 0) {
    console.log("\nErrors:");
    for (const e of allErrors) {
      console.log(`  \u2717 ${e.message}`);
    }
  }

  // Print details for warnings
  if (warningCount > 0) {
    console.log("\nWarnings:");
    for (const w of allWarnings) {
      console.log(`  ! ${w.message}`);
    }
  }

  process.exit(errorCount > 0 ? 1 : 0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
