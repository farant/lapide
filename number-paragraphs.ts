/**
 * number-paragraphs.ts — Stage 0: Prep
 *
 * Adds paragraph-level IDs and data-paragraph-number attributes to every <p>
 * tag in a source HTML file. Idempotent — safe to run repeatedly.
 *
 * Usage: bun number-paragraphs.ts <file.html>
 *
 * Sections are identified by <p id="..."> tags (the section anchors).
 * Within each section, every <p> gets:
 *   - data-paragraph-number="N" (1-indexed within the section)
 *   - id="{section-id}-pN" if it doesn't already have an id
 *     (the section anchor <p> keeps its original id, gets data-paragraph-number="1")
 */

const file = Bun.argv[2];
if (!file) {
  console.error("Usage: bun number-paragraphs.ts <file.html>");
  process.exit(1);
}

let html = await Bun.file(file).text();

// We'll work line-by-line since the HTML is simple (no nested <p> tags, no
// <p> tags split across complex structures beyond normal multiline).
// Strategy: find all <p ...> opening tags, group them by section, number them.

// First, identify section boundaries. A section starts at a <p id="..."> that
// is a known section anchor (not a generated -pN id). We collect their ids and
// line positions.

const lines = html.split("\n");

// Regex to match a <p> opening tag (possibly with attributes)
const pOpenRegex = /^(<p)([\s>])/i;
const pWithIdRegex = /^<p\s[^>]*\bid="([^"]+)"/i;

// First pass: find all section anchor <p> tags.
// A section anchor is a <p id="..."> where the id does NOT match the pattern
// {something}-p{number} (those are generated paragraph ids).
const generatedIdPattern = /^.+-p\d+$/;

interface ParagraphInfo {
  lineIndex: number;
  existingId: string | null;
  isSectionAnchor: boolean;
}

const paragraphs: ParagraphInfo[] = [];

for (let i = 0; i < lines.length; i++) {
  const trimmed = lines[i].trimStart();
  if (!pOpenRegex.test(trimmed) && !trimmed.startsWith("<p>") && !trimmed.startsWith("<p ")) continue;
  // This line starts a <p> tag
  const idMatch = trimmed.match(pWithIdRegex);
  const existingId = idMatch ? idMatch[1] : null;
  const isSectionAnchor = existingId !== null && !generatedIdPattern.test(existingId);

  paragraphs.push({ lineIndex: i, existingId, isSectionAnchor });
}

// Group paragraphs by section. Paragraphs before the first section anchor
// belong to a "preamble" section (no section id — we'll use "preamble").
// Each section anchor starts a new section.

interface Section {
  sectionId: string;
  paragraphs: ParagraphInfo[];
}

const sections: Section[] = [];
let currentSection: Section | null = null;

for (const p of paragraphs) {
  if (p.isSectionAnchor) {
    currentSection = { sectionId: p.existingId!, paragraphs: [p] };
    sections.push(currentSection);
  } else if (currentSection) {
    currentSection.paragraphs.push(p);
  } else {
    // Before any section anchor — preamble
    if (!sections.length || sections[0].sectionId !== "preamble") {
      currentSection = { sectionId: "preamble", paragraphs: [p] };
      sections.unshift(currentSection);
    } else {
      sections[0].paragraphs.push(p);
    }
  }
}

// Second pass: apply numbering
let changes = 0;

for (const section of sections) {
  let n = 0;
  for (const p of section.paragraphs) {
    n++;
    const line = lines[p.lineIndex];

    // Check if data-paragraph-number already exists on this line
    if (/data-paragraph-number="/.test(line)) {
      // Already numbered — update the number if it changed (idempotent)
      const updated = line.replace(
        /data-paragraph-number="\d+"/,
        `data-paragraph-number="${n}"`
      );
      if (updated !== line) {
        lines[p.lineIndex] = updated;
        changes++;
      }
      continue;
    }

    // Need to add data-paragraph-number (and possibly id)
    if (p.isSectionAnchor) {
      // Section anchor: keep existing id, add data-paragraph-number
      // Insert data-paragraph-number after the existing id attribute
      const updated = line.replace(
        /(<p\s[^>]*\bid="[^"]+")([^>]*>)/i,
        `$1 data-paragraph-number="${n}"$2`
      );
      if (updated !== line) {
        lines[p.lineIndex] = updated;
        changes++;
      }
    } else if (p.existingId && generatedIdPattern.test(p.existingId)) {
      // Already has a generated id — just add data-paragraph-number
      const updated = line.replace(
        /(<p\s[^>]*\bid="[^"]+")([^>]*>)/i,
        `$1 data-paragraph-number="${n}"$2`
      );
      if (updated !== line) {
        lines[p.lineIndex] = updated;
        changes++;
      }
    } else {
      // No id — add both id and data-paragraph-number
      const newId = `${section.sectionId}-p${n}`;
      const updated = line.replace(
        /(<p)([\s>])/i,
        `$1 id="${newId}" data-paragraph-number="${n}"$2`
      );
      if (updated !== line) {
        lines[p.lineIndex] = updated;
        changes++;
      }
    }
  }
}

const result = lines.join("\n");
await Bun.write(file, result);

console.log(`${file}: ${paragraphs.length} paragraphs across ${sections.length} sections, ${changes} changes`);
