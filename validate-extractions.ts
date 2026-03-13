/**
 * validate-extractions.ts — Validate extraction markdown files against source HTML
 *
 * Checks:
 * 1. Every referenced paragraph ID exists in the source HTML
 * 2. Every quoted text ("text: ...") appears in the referenced paragraph
 *
 * Usage: bun validate-extractions.ts <source.html> [extraction-dir]
 *
 * If extraction-dir is omitted, infers from source filename:
 *   01_Preliminares.html → index/extractions/01_Preliminares/
 *
 * Can also validate a single extraction file:
 *   bun validate-extractions.ts 01_Preliminares.html index/extractions/01_Preliminares/people.md
 */

import { Glob } from "bun";

const sourceFile = Bun.argv[2];
if (!sourceFile) {
  console.error("Usage: bun validate-extractions.ts <source.html> [extraction-dir-or-file]");
  process.exit(1);
}

// Infer extraction directory from source filename
const baseName = sourceFile.replace(/\.html$/, "").replace(/^.*\//, "");
const extractionArg = Bun.argv[3] || `index/extractions/${baseName}/`;

// --- Shared normalization (same as validate-refs.ts) ---

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

function normalize(s: string): string {
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

  const normQuote = normalize(ref.text);
  const normPara = normalize(paraText);

  if (normPara.includes(normQuote)) {
    matched++;
  } else if (normQuote.includes("...")) {
    // Ellipsis abbreviation — check segments
    const segments = normQuote.split(/\.{3,}/).map(s => s.trim()).filter(s => s.length > 10);
    const allFound = segments.length > 0 && segments.every(seg => normPara.includes(seg));
    if (allFound) {
      matched++;
    } else {
      const firstSeg = segments[0];
      if (firstSeg && normPara.includes(firstSeg)) {
        console.log(`WARN  ${ref.file}:${ref.line} — text partially matches at "#${ref.paragraphId}" (first segment OK)`);
        warnings++;
        matched++;
      } else {
        console.log(`ERROR ${ref.file}:${ref.line} — text not found in "#${ref.paragraphId}": "${normQuote.slice(0, 80)}..."`);
        errors++;
      }
    }
  } else {
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
}

console.log(`\nSource: ${sourceFile}`);
console.log(`Checked: ${checked} quotes across ${refs.length} references`);
console.log(`Matched: ${matched}/${checked}`);
if (errors > 0) console.log(`Errors: ${errors}`);
if (warnings > 0) console.log(`Warnings: ${warnings}`);

if (errors === 0 && warnings === 0) {
  console.log("All quotes verified.");
}

process.exit(errors > 0 ? 1 : 0);
