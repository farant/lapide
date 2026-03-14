/**
 * annotate-source.ts — Stage 3: Annotate
 *
 * Reads all ref files that reference a source HTML document, finds each
 * quoted text within its paragraph, computes a content hash, and embeds
 * a JSON sidecar into the HTML. No markup is added to the text itself.
 *
 * The sidecar is a <script type="application/json" id="passage-annotations">
 * block inserted before </body>.
 *
 * After embedding, updates each ref file's link to include the hash:
 *   #dedicatory-letter-p8 → #dedicatory-letter-p8-s-a3f2b1c
 *
 * Usage: bun annotate-source.ts <source.html>
 *        bun annotate-source.ts --check <source.html>
 *
 * Flags:
 *   --check   Dry-run mode. Reports what would change without modifying
 *             any files. Exits 0 if everything is in sync, 1 if not.
 *
 * Idempotent — replaces any existing passage-annotations block and
 * re-derives all hashes from current text.
 */

import { Glob } from "bun";
import { stripHtml, normalizeForMatch, normalizeForPosition, computeHash, findInPlainText, parseTextLine } from "./pipeline-utils";

const checkMode = Bun.argv.includes("--check");
const sourceFile = Bun.argv.find(a => a.endsWith(".html"));
if (!sourceFile) {
  console.error("Usage: bun annotate-source.ts [--check] <source.html>");
  process.exit(1);
}

const REFS_DIR = "index/refs";

// --- Parse source HTML ---

let html = await Bun.file(sourceFile).text();

// Remove any existing passage-annotations block before parsing
html = html.replace(/<script type="application\/json" id="passage-annotations">[\s\S]*?<\/script>\n?/, "");

// Extract paragraph plain text
const paragraphs = new Map<string, string>(); // id → plain text
const pPattern = /<p\s[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/p>/gi;
let pMatch;
while ((pMatch = pPattern.exec(html)) !== null) {
  paragraphs.set(pMatch[1], stripHtml(pMatch[2]));
}

// --- Collect text references from ref files ---

interface RefEntry {
  refFilePath: string;
  paragraphId: string;
  quotedText: string;
  entitySlug: string;
  refLineIndex: number;  // line index of the `source.html#id` link
}

const refEntries: RefEntry[] = [];
const sourceBasename = sourceFile.replace(/^.*\//, "");
const sourcePattern = new RegExp(
  "`" + sourceBasename.replace(/\./g, "\\.") + "#([^`]+)`"
);

const glob = new Glob("**/*.md");
for await (const path of glob.scan(REFS_DIR)) {
  const fullPath = `${REFS_DIR}/${path}`;
  const content = await Bun.file(fullPath).text();

  // Skip aliases
  if (/^alias_of:/m.test(content)) continue;

  // Get slug
  const slugMatch = content.match(/^slug:\s*(.+)$/m);
  const slug = slugMatch ? slugMatch[1].trim() : "";
  if (!slug) continue;

  const lines = content.split("\n");
  let lastParaId = "";
  let lastLineIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match: `source.html#paragraph-id` or `source.html#paragraph-id-s-hash`
    const refMatch = line.match(new RegExp(
      "`" + sourceBasename.replace(/\./g, "\\.") + "#([^`]+)`"
    ));
    if (refMatch) {
      // Strip any existing -s-XXXXXXX suffix to get the base paragraph ID
      lastParaId = refMatch[1].replace(/-s-[a-f0-9]{7}$/, "");
      lastLineIndex = i;
      continue;
    }

    // If this line is a ref to a DIFFERENT source file, clear lastParaId
    // so the next text: line doesn't get associated with our source
    if (line.match(/- `[^`]+\.html#/)) {
      lastParaId = "";
      continue;
    }

    const parsedText = parseTextLine(line);
    if (parsedText && lastParaId) {
      refEntries.push({
        refFilePath: fullPath,
        paragraphId: lastParaId,
        quotedText: parsedText,
        entitySlug: slug,
        refLineIndex: lastLineIndex,
      });
    }
  }
}

console.log(`Found ${refEntries.length} text references to ${sourceBasename}`);

// --- Find each quote in its paragraph ---

interface PendingAnnotation {
  paragraph: string;
  start: number;
  end: number;
  matchedText: string;
  entities: Set<string>;
  refFileEntries: RefEntry[];
}

const pendingByKey = new Map<string, PendingAnnotation>();
let missed = 0;

for (const entry of refEntries) {
  const plainText = paragraphs.get(entry.paragraphId);
  if (!plainText) {
    console.error(`  SKIP: paragraph "${entry.paragraphId}" not found`);
    missed++;
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
    console.error(`  MISS: "${entry.quotedText.slice(0, 60)}..." in #${entry.paragraphId} (${entry.refFilePath})`);
    missed++;
    continue;
  }

  const matchedText = plainText.slice(result.start, result.end);

  // Group by paragraph + start + end to merge entities pointing to same text
  const key = `${entry.paragraphId}:${result.start}:${result.end}`;
  if (pendingByKey.has(key)) {
    const existing = pendingByKey.get(key)!;
    existing.entities.add(entry.entitySlug);
    existing.refFileEntries.push(entry);
  } else {
    pendingByKey.set(key, {
      paragraph: entry.paragraphId,
      start: result.start,
      end: result.end,
      matchedText,
      entities: new Set([entry.entitySlug]),
      refFileEntries: [entry],
    });
  }
}

// --- Build annotations and compute hashes ---

interface Annotation {
  id: string;
  paragraph: string;
  start: number;
  end: number;
  entities: string[];
}

const annotations: Annotation[] = [];
const refFileUpdates: { filePath: string; lineIndex: number; paraId: string; newId: string }[] = [];

for (const [, pending] of pendingByKey) {
  const hash = computeHash(pending.matchedText);
  const id = `${pending.paragraph}-s-${hash}`;

  annotations.push({
    id,
    paragraph: pending.paragraph,
    start: pending.start,
    end: pending.end,
    entities: [...pending.entities].sort(),
  });

  for (const entry of pending.refFileEntries) {
    refFileUpdates.push({
      filePath: entry.refFilePath,
      lineIndex: entry.refLineIndex,
      paraId: entry.paragraphId,
      newId: id,
    });
  }
}

// Sort by paragraph then start position
annotations.sort((a, b) => {
  if (a.paragraph !== b.paragraph) return a.paragraph.localeCompare(b.paragraph);
  return a.start - b.start;
});

console.log(`Generated ${annotations.length} annotations (${missed} missed)`);

// --- Check mode: compare against existing state ---

if (checkMode) {
  let issues = 0;

  // Parse existing sidecar from original file
  const originalHtml = await Bun.file(sourceFile).text();
  const sidecarMatch = originalHtml.match(
    /<script type="application\/json" id="passage-annotations">([\s\S]*?)<\/script>/
  );
  let existingAnnotations: Annotation[] = [];
  if (sidecarMatch) {
    try { existingAnnotations = JSON.parse(sidecarMatch[1]); } catch {}
  }

  const existingById = new Map(existingAnnotations.map(a => [a.id, a]));
  const newById = new Map(annotations.map(a => [a.id, a]));

  // Annotations that would be added
  const added = annotations.filter(a => !existingById.has(a.id));
  if (added.length > 0) {
    console.log(`\n+ ${added.length} new annotation(s) would be added:`);
    for (const a of added) {
      console.log(`   ${a.id} (${a.entities.join(", ")})`);
    }
    issues += added.length;
  }

  // Annotations that would be removed
  const removed = existingAnnotations.filter(a => !newById.has(a.id));
  if (removed.length > 0) {
    console.log(`\n- ${removed.length} annotation(s) would be removed:`);
    for (const a of removed) {
      console.log(`   ${a.id} (${a.entities.join(", ")})`);
    }
    issues += removed.length;
  }

  // Annotations with changed offsets or entities
  const changed: { id: string; reason: string }[] = [];
  for (const a of annotations) {
    const existing = existingById.get(a.id);
    if (!existing) continue;
    if (existing.start !== a.start || existing.end !== a.end) {
      changed.push({ id: a.id, reason: `offsets ${existing.start}:${existing.end} → ${a.start}:${a.end}` });
    } else if (JSON.stringify(existing.entities) !== JSON.stringify(a.entities)) {
      changed.push({ id: a.id, reason: `entities [${existing.entities}] → [${a.entities}]` });
    }
  }
  if (changed.length > 0) {
    console.log(`\n~ ${changed.length} annotation(s) would be updated:`);
    for (const c of changed) {
      console.log(`   ${c.id}: ${c.reason}`);
    }
    issues += changed.length;
  }

  // Ref file links that would change (check line-by-line)
  const updatesByFile = new Map<string, { lineIndex: number; paraId: string; newId: string }[]>();
  for (const u of refFileUpdates) {
    if (!updatesByFile.has(u.filePath)) updatesByFile.set(u.filePath, []);
    updatesByFile.get(u.filePath)!.push(u);
  }

  let staleLinks = 0;
  for (const [filePath, updates] of updatesByFile) {
    const lines = (await Bun.file(filePath).text()).split("\n");
    for (const { lineIndex, paraId, newId } of updates) {
      const line = lines[lineIndex];
      if (!line) continue;
      const pattern = new RegExp(
        "`" + sourceBasename.replace(/\./g, "\\.") + "#" + paraId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(-s-[a-f0-9]{7})?`"
      );
      const expected = "`" + sourceBasename + "#" + newId + "`";
      const match = line.match(pattern);
      if (match && match[0] !== expected) {
        if (staleLinks === 0) console.log(`\n⚠ Ref file links that need updating:`);
        console.log(`   ${filePath.replace(REFS_DIR + "/", "")}: ${match[0]} → ${expected}`);
        staleLinks++;
      }
    }
  }
  issues += staleLinks;

  if (!sidecarMatch && annotations.length > 0) {
    console.log(`\n⚠ No existing sidecar block — ${annotations.length} annotations would be embedded`);
    issues += annotations.length;
  }

  // Summary
  console.log("\n" + "─".repeat(60));
  if (issues === 0 && missed === 0) {
    console.log("✅ Everything in sync.");
  } else {
    if (issues > 0) console.log(`${issues} annotation/link change(s) needed.`);
    if (missed > 0) console.log(`${missed} reference(s) could not be matched.`);
    process.exit(1);
  }
} else {
  // --- Normal mode: write changes ---

  // Embed sidecar JSON
  const jsonBlock = `<script type="application/json" id="passage-annotations">\n${JSON.stringify(annotations, null, 2)}\n</script>`;

  html = html.replace(/(\s*)<\/body>/, `\n${jsonBlock}\n$1</body>`);

  await Bun.write(sourceFile, html);
  console.log(`Embedded ${annotations.length} annotations in ${sourceFile}`);

  // Update ref file links (line-targeted to handle multiple annotations per paragraph)
  const updatesByFile = new Map<string, { lineIndex: number; paraId: string; newId: string }[]>();
  for (const u of refFileUpdates) {
    if (!updatesByFile.has(u.filePath)) updatesByFile.set(u.filePath, []);
    updatesByFile.get(u.filePath)!.push(u);
  }

  let filesUpdated = 0;
  for (const [filePath, updates] of updatesByFile) {
    const lines = (await Bun.file(filePath).text()).split("\n");
    let changed = false;

    for (const { lineIndex, paraId, newId } of updates) {
      const line = lines[lineIndex];
      if (!line) continue;
      const pattern = new RegExp(
        "`" + sourceBasename.replace(/\./g, "\\.") + "#" + paraId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(-s-[a-f0-9]{7})?`"
      );
      const replacement = "`" + sourceBasename + "#" + newId + "`";
      const newLine = line.replace(pattern, replacement);
      if (newLine !== line) {
        lines[lineIndex] = newLine;
        changed = true;
      }
    }

    if (changed) {
      await Bun.write(filePath, lines.join("\n"));
      filesUpdated++;
    }
  }

  console.log(`Updated links in ${filesUpdated} ref files`);
  console.log(`\nDone. Run 'bun validate-refs.ts' to verify.`);
}
