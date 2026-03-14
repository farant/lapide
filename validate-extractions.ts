/**
 * validate-extractions.ts — Validate extraction markdown files against source HTML
 *
 * Checks:
 * 1. Every referenced paragraph ID exists in the source HTML
 * 2. Every quoted text ("text: ...") appears in the referenced paragraph
 *
 * Usage: bun validate-extractions.ts [--fix-quotes] <source.html> [extraction-dir]
 *
 * Flags:
 *   --fix-quotes   Auto-fix text quotes that differ only in quote/dash style
 *                  by replacing them with the actual text from the paragraph
 *
 * If extraction-dir is omitted, infers from source filename:
 *   01_Preliminares.html → index/extractions/01_Preliminares/
 *
 * Can also validate a single extraction file:
 *   bun validate-extractions.ts 01_Preliminares.html index/extractions/01_Preliminares/people.md
 */

import { Glob } from "bun";
import { stripHtml, normalizeForMatch } from "./pipeline-utils";

const fixQuotes = Bun.argv.includes("--fix-quotes");
const args = Bun.argv.filter(a => !a.startsWith("--"));
const sourceFile = args[2];
if (!sourceFile) {
  console.error("Usage: bun validate-extractions.ts [--fix-quotes] <source.html> [extraction-dir-or-file]");
  process.exit(1);
}

// Infer extraction directory from source filename
const baseName = sourceFile.replace(/\.html$/, "").replace(/^.*\//, "");
const extractionArg = args[3] || `index/extractions/${baseName}/`;

// Aggressive normalization for finding fixable text — strips backslash escapes too
function normalizeAggressive(s: string): string {
  return normalizeForMatch(s)
    .replace(/\\/g, "")       // strip backslash escapes
    .replace(/\s+/g, " ")
    .trim();
}

// --- Parse source HTML paragraphs ---

const htmlContent = await Bun.file(sourceFile).text();
const paragraphs = new Map<string, string>(); // id → plain text
const allIds = new Set<string>();

// Collect all IDs
const idPattern = /\bid="([^"]+)"/g;
let idMatch;
while ((idMatch = idPattern.exec(htmlContent)) !== null) {
  allIds.add(idMatch[1]);
}

// Extract <p> content by id
const pPattern = /<p\s[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/p>/gi;
let pMatch;
while ((pMatch = pPattern.exec(htmlContent)) !== null) {
  paragraphs.set(pMatch[1], stripHtml(pMatch[2]));
}

// --- Parse extraction files ---

interface QuoteRef {
  file: string;
  line: number;
  lineIndex: number;  // 0-indexed for file editing
  paragraphId: string;
  text: string;
}

const refs: QuoteRef[] = [];

async function parseExtractionFile(filePath: string) {
  const content = await Bun.file(filePath).text();
  const lines = content.split("\n");

  let lastParaId = "";
  let lastParaLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match: - `#paragraph-id` — synopsis
    const refMatch = line.match(/`#([^`]+)`/);
    if (refMatch) {
      lastParaId = refMatch[1];
      lastParaLine = i + 1;
      continue;
    }

    // Match: text: "quoted text"
    const textMatch = line.match(/^\s*text:\s*"(.+)"$/);
    if (textMatch && lastParaId) {
      refs.push({
        file: filePath,
        line: i + 1,
        lineIndex: i,
        paragraphId: lastParaId,
        text: textMatch[1],
      });
    }
  }
}

// Determine if extractionArg is a file or directory
const stat = await Bun.file(extractionArg).exists();
if (stat) {
  // Single file
  await parseExtractionFile(extractionArg);
} else {
  // Directory — scan for .md files
  const glob = new Glob("*.md");
  for await (const path of glob.scan(extractionArg)) {
    await parseExtractionFile(`${extractionArg}${extractionArg.endsWith("/") ? "" : "/"}${path}`);
  }
}

// --- Validate ---

let errors = 0;
let warnings = 0;
let checked = 0;
let matched = 0;

// Track fixable mismatches for --fix-quotes
interface Fixable {
  ref: QuoteRef;
  actualText: string;
}
const fixable: Fixable[] = [];

for (const ref of refs) {
  checked++;

  // Check paragraph ID exists
  if (!allIds.has(ref.paragraphId)) {
    console.log(`ERROR ${ref.file}:${ref.line} — paragraph ID "#${ref.paragraphId}" not found in ${sourceFile}`);
    errors++;
    continue;
  }

  // Check text exists in paragraph
  const paraText = paragraphs.get(ref.paragraphId);
  if (!paraText) {
    console.log(`WARN  ${ref.file}:${ref.line} — ID "#${ref.paragraphId}" exists but no <p> content to verify`);
    warnings++;
    continue;
  }

  // Direct match in raw text
  if (paraText.includes(ref.text)) {
    matched++;
    continue;
  }

  const normQuote = normalizeForMatch(ref.text);
  const normPara = normalizeForMatch(paraText);

  if (normPara.includes(normQuote)) {
    // Normalization-only difference (quotes, dashes, ligatures)
    // Find the actual text from the paragraph that matches
    const normIdx = normPara.indexOf(normQuote);
    // Walk through the original to find the corresponding substring
    let actualText: string | null = null;
    for (let start = 0; start < paraText.length; start++) {
      for (let end = start + 1; end <= paraText.length; end++) {
        const candidate = paraText.slice(start, end);
        if (normalizeForMatch(candidate) === normQuote) {
          actualText = candidate;
          break;
        }
      }
      if (actualText) break;
    }

    if (actualText) {
      fixable.push({ ref, actualText });
      matched++;
    } else {
      matched++; // still a match via normalization
    }
    continue;
  }

  // Try aggressive normalization (strips backslash escapes)
  const aggressiveQuote = normalizeAggressive(ref.text);
  const aggressivePara = normalizeAggressive(paraText);
  if (aggressivePara.includes(aggressiveQuote)) {
    // Fixable via aggressive normalization
    let actualText: string | null = null;
    for (let start = 0; start < paraText.length; start++) {
      for (let end = start + 1; end <= paraText.length; end++) {
        const candidate = paraText.slice(start, end);
        if (normalizeAggressive(candidate) === aggressiveQuote) {
          actualText = candidate;
          break;
        }
      }
      if (actualText) break;
    }

    if (actualText) {
      fixable.push({ ref, actualText });
      matched++;
    } else {
      matched++;
    }
    continue;
  }

  // Ellipsis abbreviation — check segments
  if (normQuote.includes("...")) {
    const segments = normQuote.split(/\.{3,}/).map(s => s.trim()).filter(s => s.length > 10);
    const allFound = segments.length > 0 && segments.every(seg => normPara.includes(seg));
    if (allFound) {
      matched++;
      continue;
    }
    const firstSeg = segments[0];
    if (firstSeg && normPara.includes(firstSeg)) {
      console.log(`WARN  ${ref.file}:${ref.line} — text partially matches at "#${ref.paragraphId}" (first segment OK)`);
      warnings++;
      matched++;
      continue;
    }
  }

  // Prefix match fallback
  const prefix = normQuote.slice(0, 50);
  if (normPara.includes(prefix)) {
    console.log(`WARN  ${ref.file}:${ref.line} — text partially matches at "#${ref.paragraphId}" (prefix OK, tail differs)`);
    warnings++;
    matched++;
  } else {
    console.log(`ERROR ${ref.file}:${ref.line} — text not found in "#${ref.paragraphId}": "${normQuote.slice(0, 80)}..."`);
    errors++;
  }
}

// Handle fixable mismatches
if (fixable.length > 0) {
  if (fixQuotes) {
    // Group by file and apply fixes
    const fileUpdates = new Map<string, string[]>();
    for (const { ref, actualText } of fixable) {
      if (!fileUpdates.has(ref.file)) {
        const content = await Bun.file(ref.file).text();
        fileUpdates.set(ref.file, content.split("\n"));
      }
      const lines = fileUpdates.get(ref.file)!;
      lines[ref.lineIndex] = `    text: "${actualText}"`;
    }
    let fixedFiles = 0;
    for (const [filePath, lines] of fileUpdates) {
      await Bun.write(filePath, lines.join("\n"));
      fixedFiles++;
    }
    console.log(`\n✅ Fixed ${fixable.length} quote-style mismatches across ${fixedFiles} files`);
  } else {
    console.log(`\n⚠️  ${fixable.length} quotes differ only in quote/dash style (cosmetic)`);
    console.log(`   Run with --fix-quotes to auto-fix extraction files to match the HTML source text.`);
  }
}

console.log(`\nSource: ${sourceFile}`);
console.log(`Checked: ${checked} quotes across ${refs.length} references`);
console.log(`Matched: ${matched}/${checked}`);
if (errors > 0) console.log(`Errors: ${errors}`);
if (warnings > 0) console.log(`Warnings: ${warnings}`);

if (errors === 0 && warnings === 0 && fixable.length === 0) {
  console.log("All quotes verified.");
}

process.exit(errors > 0 ? 1 : 0);
