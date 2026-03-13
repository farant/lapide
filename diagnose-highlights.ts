#!/usr/bin/env bun
/**
 * diagnose-highlights.ts — Show what text each sidecar annotation actually selects
 *
 * Usage: bun diagnose-highlights.ts <source.html> [--annotation-id <id>]
 *
 * For each annotation, extracts the paragraph text (stripped of HTML tags),
 * slices with start/end offsets, and displays the result. Optionally cross-references
 * with ref files to show expected vs actual text.
 */

import { readFile, readdir } from "fs/promises";
import { join, relative } from "path";

const ROOT = import.meta.dir;
const REFS_DIR = join(ROOT, "index/refs");

// --- Strip HTML to plain text (must match annotate-source.ts exactly) ---
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

// --- Parse paragraphs from HTML ---
function parseParagraphs(html: string): Map<string, { plain: string; raw: string }> {
  const result = new Map<string, { plain: string; raw: string }>();
  const pPattern = /<p\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/p>/g;
  let m;
  while ((m = pPattern.exec(html)) !== null) {
    result.set(m[1], { plain: stripHtml(m[2]), raw: m[2] });
  }
  return result;
}

// --- Parse sidecar annotations from HTML ---
function parseAnnotations(html: string): any[] {
  const m = html.match(/<script\s+type="application\/json"\s+id="passage-annotations">([\s\S]*?)<\/script>/);
  if (!m) return [];
  return JSON.parse(m[1]);
}

// --- Check if the annotation range crosses HTML element boundaries ---
function checkCrossElement(rawHtml: string, start: number, end: number): boolean {
  // Walk through raw HTML, tracking text position vs tags
  let textPos = 0;
  let inTag = false;
  let startInTag = false;
  let endInTag = false;
  let openTags = 0;
  let tagsInRange = 0;
  let rangeStarted = false;

  for (let i = 0; i < rawHtml.length; i++) {
    if (rawHtml[i] === '<') {
      inTag = true;
      if (rangeStarted && textPos < end) {
        tagsInRange++;
      }
      continue;
    }
    if (rawHtml[i] === '>') {
      inTag = false;
      continue;
    }
    if (!inTag) {
      if (textPos === start) rangeStarted = true;
      textPos++;
    }
  }
  return tagsInRange > 0;
}

// --- Collect ref file text quotes pointing to a specific annotation ---
async function collectRefTexts(sourceFile: string): Promise<Map<string, string>> {
  const result = new Map<string, string>(); // annotation-id → expected text
  const basename = sourceFile.replace(/^.*\//, "");

  async function walkDir(dir: string) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walkDir(full);
      } else if (entry.name.endsWith(".md")) {
        const content = await readFile(full, "utf-8");
        // Find references to this source file with annotation hashes
        const refPattern = new RegExp(
          `\`${basename.replace(/\./g, "\\.")}#([\\w-]+-s-[a-f0-9]+)\`[^\\n]*\\n\\s*text:\\s*"([^"]*)"`,
          "g"
        );
        let rm;
        while ((rm = refPattern.exec(content)) !== null) {
          result.set(rm[1], rm[2]);
        }
      }
    }
  }
  await walkDir(REFS_DIR);
  return result;
}

// --- Main ---
const args = process.argv.slice(2);
const sourceFile = args[0];
if (!sourceFile) {
  console.error("Usage: bun diagnose-highlights.ts <source.html> [--annotation-id <id>]");
  process.exit(1);
}

const filterId = args.indexOf("--annotation-id") >= 0 ? args[args.indexOf("--annotation-id") + 1] : null;

const html = await readFile(sourceFile, "utf-8");
const paragraphs = parseParagraphs(html);
const annotations = parseAnnotations(html);
const refTexts = await collectRefTexts(sourceFile);

console.log(`Found ${annotations.length} annotations, ${refTexts.size} ref texts\n`);

let truncatedCount = 0;
let crossElementCount = 0;
let mismatchCount = 0;
let okCount = 0;

for (const ann of annotations) {
  if (filterId && ann.id !== filterId) continue;

  const para = paragraphs.get(ann.paragraph);
  if (!para) {
    console.log(`❌ ${ann.id}: paragraph "${ann.paragraph}" not found`);
    continue;
  }

  const selectedText = para.plain.slice(ann.start, ann.end);
  const expectedText = refTexts.get(ann.id);
  const spanLength = ann.end - ann.start;
  const paraLength = para.plain.length;
  const isFullPara = ann.start === 0 && ann.end === paraLength;
  const crossesElements = checkCrossElement(para.raw, ann.start, ann.end);

  // Check for issues
  const issues: string[] = [];

  if (expectedText) {
    // Check if the selected text matches the expected text
    const normSelected = selectedText.replace(/\s+/g, " ").trim();
    const normExpected = expectedText.replace(/\s+/g, " ").trim();
    if (!normSelected.includes(normExpected) && !normExpected.includes(normSelected)) {
      issues.push("MISMATCH");
      mismatchCount++;
    } else if (normSelected.length < normExpected.length - 2) {
      issues.push(`TRUNCATED (selected ${normSelected.length} chars, expected ~${normExpected.length})`);
      truncatedCount++;
    } else if (normSelected.length > normExpected.length + 50) {
      issues.push(`OVER-SELECTED (selected ${normSelected.length} chars, expected ~${normExpected.length})`);
    }
  }

  if (crossesElements) {
    issues.push("CROSSES-ELEMENTS (surroundContents will fail → whole-paragraph highlight)");
    crossElementCount++;
  }

  if (issues.length === 0) {
    okCount++;
    if (!filterId) continue; // Only show problems unless filtering
  }

  console.log(`${ issues.length > 0 ? "⚠️" : "✅"} ${ann.id}`);
  console.log(`   Paragraph: ${ann.paragraph} (${paraLength} chars)`);
  console.log(`   Offsets: ${ann.start}–${ann.end} (${spanLength} chars)`);
  console.log(`   Selected: "${selectedText.slice(0, 120)}${selectedText.length > 120 ? "..." : ""}"`);
  if (expectedText) {
    console.log(`   Expected: "${expectedText.slice(0, 120)}${expectedText.length > 120 ? "..." : ""}"`);
  }
  if (issues.length > 0) {
    for (const issue of issues) console.log(`   ⚠ ${issue}`);
  }
  console.log();
}

console.log("────────────────────────────────────────");
console.log(`✅ OK: ${okCount}`);
console.log(`⚠️  Truncated: ${truncatedCount}`);
console.log(`⚠️  Cross-element: ${crossElementCount}`);
console.log(`⚠️  Mismatch: ${mismatchCount}`);
console.log(`Total: ${annotations.length}`);
