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
 *
 * Idempotent — replaces any existing passage-annotations block and
 * re-derives all hashes from current text.
 */

import { Glob } from "bun";

const sourceFile = Bun.argv[2];
if (!sourceFile) {
  console.error("Usage: bun annotate-source.ts <source.html>");
  process.exit(1);
}

const REFS_DIR = "index/refs";

// --- Utilities ---

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
    .replace(/&oelig;/g, "\u0153")
    .replace(/&aelig;/g, "\u00E6")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Normalize for fuzzy matching (same as validate-refs.ts / validate-extractions.ts)
function normalizeForMatch(s: string): string {
  return s
    .replace(/\u0153/g, "oe")
    .replace(/\u00E6/g, "ae")
    .replace(/[\u2018\u2019\u0060\u00B4']/g, "'")
    .replace(/[\u201C\u201D\u00AB\u00BB"]/g, "'")
    .replace(/\s*[\u2014]\s*/g, " -- ")
    .replace(/\s*--\s*/g, " -- ")
    .replace(/[\u2013]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function computeHash(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  const data = new TextEncoder().encode(normalized);
  const hash = new Bun.CryptoHasher("sha256").update(data).digest("hex");
  return hash.slice(0, 7);
}

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

    const textMatch = line.match(/^\s*text:\s*"(.+)"$/);
    if (textMatch && lastParaId) {
      refEntries.push({
        refFilePath: fullPath,
        paragraphId: lastParaId,
        quotedText: textMatch[1],
        entitySlug: slug,
        refLineIndex: lastLineIndex,
      });
    }
  }
}

console.log(`Found ${refEntries.length} text references to ${sourceBasename}`);

// --- Find each quote in its paragraph ---

// Helper: find where a normalized target starts in the original plain text
function findInPlainText(plainText: string, normTarget: string, searchFrom: number): { start: number; end: number } | null {
  const normPlain = normalizeForMatch(plainText);

  // Find position in normalized space
  const normIdx = normPlain.indexOf(normTarget, searchFrom > 0 ? normalizeForMatch(plainText.slice(0, searchFrom)).length : 0);
  if (normIdx < 0) return null;

  // Map normalized offset back to original offset
  // Walk through the original text, tracking normalized length
  let origStart = -1;
  let origEnd = -1;

  for (let i = 0, normLen = 0; i <= plainText.length; i++) {
    const normSoFar = normalizeForMatch(plainText.slice(0, i));
    if (origStart < 0 && normSoFar.length >= normIdx) {
      origStart = i;
    }
    if (origStart >= 0 && normSoFar.length >= normIdx + normTarget.length) {
      origEnd = i;
      break;
    }
  }

  if (origStart < 0 || origEnd < 0) return null;
  return { start: origStart, end: origEnd };
}

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

  // Prefix fallback: match first 50 normalized chars
  if (!result) {
    const prefix = normQuote.slice(0, 50);
    const prefixResult = findInPlainText(plainText, prefix, 0);
    if (prefixResult) {
      // Extend end by approximate remaining length
      const approxEnd = Math.min(
        prefixResult.start + entry.quotedText.length + 30,
        plainText.length
      );
      result = { start: prefixResult.start, end: approxEnd };
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
const refFileUpdates: { filePath: string; paraId: string; newId: string }[] = [];

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

// --- Embed sidecar JSON ---

const jsonBlock = `<script type="application/json" id="passage-annotations">\n${JSON.stringify(annotations, null, 2)}\n</script>`;

html = html.replace(/(\s*)<\/body>/, `\n${jsonBlock}\n$1</body>`);

await Bun.write(sourceFile, html);
console.log(`Embedded ${annotations.length} annotations in ${sourceFile}`);

// --- Update ref file links ---

// Group by file
const updatesByFile = new Map<string, { paraId: string; newId: string }[]>();
for (const u of refFileUpdates) {
  if (!updatesByFile.has(u.filePath)) updatesByFile.set(u.filePath, []);
  updatesByFile.get(u.filePath)!.push(u);
}

let filesUpdated = 0;
for (const [filePath, updates] of updatesByFile) {
  let content = await Bun.file(filePath).text();
  let changed = false;

  for (const { paraId, newId } of updates) {
    // Match both the bare paragraph ID and any existing -s-hash version
    const pattern = new RegExp(
      "`" + sourceBasename.replace(/\./g, "\\.") + "#" + paraId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(-s-[a-f0-9]{7})?`",
      "g"
    );
    const replacement = "`" + sourceBasename + "#" + newId + "`";
    const newContent = content.replace(pattern, replacement);
    if (newContent !== content) {
      content = newContent;
      changed = true;
    }
  }

  if (changed) {
    await Bun.write(filePath, content);
    filesUpdated++;
  }
}

console.log(`Updated links in ${filesUpdated} ref files`);
console.log(`\nDone. Run 'bun validate-refs.ts' to verify.`);
