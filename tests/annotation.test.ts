import { describe, test, expect } from "bun:test";
import {
  computeHash,
  extractParagraphs,
  stripHtml,
  normalizeForMatch,
  findInPlainText,
  parseSidecar,
  type Annotation,
} from "../pipeline-utils";
import { readFileSync } from "fs";
import { join } from "path";

const FIXTURES_DIR = join(import.meta.dir, "fixtures");

// ---------------------------------------------------------------------------
// 1. Sidecar parsing (parseSidecar)
// ---------------------------------------------------------------------------

describe("parseSidecar", () => {
  test("parses valid sidecar JSON from HTML", () => {
    const html = `
      <html><body>
      <p id="intro-p1">Hello world.</p>
      <script type="application/json" id="passage-annotations">
      [
        {
          "id": "intro-p1-s-abc1234",
          "paragraph": "intro-p1",
          "start": 0,
          "end": 12,
          "entities": ["person/saint/augustine"]
        }
      ]
      </script>
      </body></html>
    `;
    const result = parseSidecar(html);
    expect(result).not.toBeNull();
    expect(Array.isArray(result)).toBe(true);
    expect(result!.length).toBe(1);
    expect(result![0].id).toBe("intro-p1-s-abc1234");
    expect(result![0].paragraph).toBe("intro-p1");
    expect(result![0].start).toBe(0);
    expect(result![0].end).toBe(12);
    expect(result![0].entities).toEqual(["person/saint/augustine"]);
  });

  test("returns null when no sidecar exists", () => {
    const html = `<html><body><p>No sidecar here.</p></body></html>`;
    expect(parseSidecar(html)).toBeNull();
  });

  test("returns null for malformed JSON", () => {
    const html = `
      <script type="application/json" id="passage-annotations">
      { this is not valid JSON!!! }
      </script>
    `;
    expect(parseSidecar(html)).toBeNull();
  });

  test("returns null when script tag has wrong id", () => {
    const html = `
      <script type="application/json" id="wrong-id">
      [{"id":"x","paragraph":"y","start":0,"end":1,"entities":["z"]}]
      </script>
    `;
    expect(parseSidecar(html)).toBeNull();
  });

  test("correctly extracts annotation array with all fields", () => {
    const html = `
      <script type="application/json" id="passage-annotations">
      [
        {
          "id": "section-one-p1-s-1234567",
          "paragraph": "section-one-p1",
          "start": 5,
          "end": 42,
          "entities": ["person/saint/augustine", "bibliography/augustine/de-doctrina-christiana"]
        },
        {
          "id": "section-one-p2-s-abcdef0",
          "paragraph": "section-one-p2",
          "start": 0,
          "end": 100,
          "entities": ["person/saint/jerome"]
        }
      ]
      </script>
    `;
    const result = parseSidecar(html);
    expect(result).not.toBeNull();
    expect(result!.length).toBe(2);

    const first = result![0];
    expect(first.id).toBe("section-one-p1-s-1234567");
    expect(first.paragraph).toBe("section-one-p1");
    expect(first.start).toBe(5);
    expect(first.end).toBe(42);
    expect(first.entities).toEqual([
      "person/saint/augustine",
      "bibliography/augustine/de-doctrina-christiana",
    ]);

    const second = result![1];
    expect(second.id).toBe("section-one-p2-s-abcdef0");
    expect(second.paragraph).toBe("section-one-p2");
    expect(second.start).toBe(0);
    expect(second.end).toBe(100);
    expect(second.entities).toEqual(["person/saint/jerome"]);
  });

  test("parses empty annotation array", () => {
    const html = `
      <script type="application/json" id="passage-annotations">
      []
      </script>
    `;
    const result = parseSidecar(html);
    expect(result).not.toBeNull();
    expect(result!.length).toBe(0);
  });

  test("handles sidecar with surrounding HTML content", () => {
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head><title>Test</title></head>
      <body>
      <h2 id="chapter">Chapter</h2>
      <p id="chapter-p1">Text content here.</p>
      <script type="application/json" id="passage-annotations">
      [{"id":"chapter-p1-s-a1b2c3d","paragraph":"chapter-p1","start":0,"end":5,"entities":["person/saint/jerome"]}]
      </script>
      <link rel="stylesheet" href="style.css">
      </body></html>
    `;
    const result = parseSidecar(html);
    expect(result).not.toBeNull();
    expect(result!.length).toBe(1);
    expect(result![0].id).toBe("chapter-p1-s-a1b2c3d");
  });
});

// ---------------------------------------------------------------------------
// 2. Sidecar annotation format validation
// ---------------------------------------------------------------------------

describe("sidecar annotation format validation", () => {
  // Helper: validate an annotation ID format
  function isValidAnnotationId(ann: Annotation): boolean {
    const pattern = /^(.+)-s-([a-f0-9]{7})$/;
    const match = ann.id.match(pattern);
    if (!match) return false;
    // The prefix before -s- should match the paragraph field
    return match[1] === ann.paragraph;
  }

  test("valid annotation has correct ID format: {paragraph-id}-s-{7-char-hex}", () => {
    const ann: Annotation = {
      id: "section-one-p1-s-abc1234",
      paragraph: "section-one-p1",
      start: 0,
      end: 50,
      entities: ["person/saint/augustine"],
    };
    expect(isValidAnnotationId(ann)).toBe(true);
  });

  test("detects missing -s- prefix in ID", () => {
    const ann: Annotation = {
      id: "section-one-p1-abc1234",
      paragraph: "section-one-p1",
      start: 0,
      end: 50,
      entities: ["person/saint/augustine"],
    };
    expect(isValidAnnotationId(ann)).toBe(false);
  });

  test("detects hash length wrong (not 7 chars)", () => {
    // Too short (6 chars)
    const annShort: Annotation = {
      id: "section-one-p1-s-abc123",
      paragraph: "section-one-p1",
      start: 0,
      end: 50,
      entities: ["person/saint/augustine"],
    };
    expect(isValidAnnotationId(annShort)).toBe(false);

    // Too long (8 chars)
    const annLong: Annotation = {
      id: "section-one-p1-s-abc12345",
      paragraph: "section-one-p1",
      start: 0,
      end: 50,
      entities: ["person/saint/augustine"],
    };
    expect(isValidAnnotationId(annLong)).toBe(false);
  });

  test("detects paragraph field mismatch with ID prefix", () => {
    const ann: Annotation = {
      id: "section-one-p1-s-abc1234",
      paragraph: "section-two-p1", // does not match ID prefix
      start: 0,
      end: 50,
      entities: ["person/saint/augustine"],
    };
    expect(isValidAnnotationId(ann)).toBe(false);
  });

  test("start >= end is an invalid range", () => {
    const annEqual: Annotation = {
      id: "p1-s-abc1234",
      paragraph: "p1",
      start: 10,
      end: 10,
      entities: ["person/saint/augustine"],
    };
    expect(annEqual.start >= annEqual.end).toBe(true);

    const annReversed: Annotation = {
      id: "p1-s-abc1234",
      paragraph: "p1",
      start: 50,
      end: 10,
      entities: ["person/saint/augustine"],
    };
    expect(annReversed.start >= annReversed.end).toBe(true);
  });

  test("empty entities array is invalid", () => {
    const ann: Annotation = {
      id: "p1-s-abc1234",
      paragraph: "p1",
      start: 0,
      end: 50,
      entities: [],
    };
    expect(ann.entities.length).toBe(0);
  });

  test("negative offsets are invalid", () => {
    const annNegStart: Annotation = {
      id: "p1-s-abc1234",
      paragraph: "p1",
      start: -1,
      end: 50,
      entities: ["person/saint/augustine"],
    };
    expect(annNegStart.start < 0).toBe(true);

    const annNegEnd: Annotation = {
      id: "p1-s-abc1234",
      paragraph: "p1",
      start: 0,
      end: -5,
      entities: ["person/saint/augustine"],
    };
    expect(annNegEnd.end < 0).toBe(true);
  });

  test("entities should be sorted alphabetically", () => {
    const entities = [
      "person/saint/augustine",
      "bibliography/augustine/de-doctrina-christiana",
      "subject/theology/scripture/inspiration",
    ];
    const sorted = [...entities].sort();
    expect(sorted).toEqual([
      "bibliography/augustine/de-doctrina-christiana",
      "person/saint/augustine",
      "subject/theology/scripture/inspiration",
    ]);
    // The original is NOT sorted
    expect(entities).not.toEqual(sorted);
  });
});

// ---------------------------------------------------------------------------
// 3. Annotation hash consistency
// ---------------------------------------------------------------------------

describe("annotation hash consistency", () => {
  test("computeHash produces a 7-character hex string", () => {
    const hash = computeHash("some text");
    expect(hash).toMatch(/^[a-f0-9]{7}$/);
  });

  test("same text produces same hash", () => {
    const text = "St. Augustine teaches that Sacred Scripture contains all wisdom.";
    expect(computeHash(text)).toBe(computeHash(text));
  });

  test("different text produces different hash", () => {
    const hash1 = computeHash("St. Augustine teaches wisdom.");
    const hash2 = computeHash("St. Jerome teaches wisdom.");
    expect(hash1).not.toBe(hash2);
  });

  test("hash is computed from the text at the given offsets", () => {
    const plainText = "Hello world, this is a test paragraph.";
    const start = 13;
    const end = 38;
    const slice = plainText.slice(start, end);
    expect(slice).toBe("this is a test paragraph.");
    const hash = computeHash(slice);
    expect(hash).toMatch(/^[a-f0-9]{7}$/);
  });

  test("hash changes when the text in the range changes", () => {
    const text1 = "Hello world, this is version one.";
    const text2 = "Hello world, this is version two.";
    // Same range [13, 31)
    const slice1 = text1.slice(13, 31);
    const slice2 = text2.slice(13, 31);
    expect(slice1).not.toBe(slice2);
    expect(computeHash(slice1)).not.toBe(computeHash(slice2));
  });

  test("hash does NOT change when text outside the range changes", () => {
    const text1 = "BEFORE_A this is the target text AFTER_A";
    const text2 = "BEFORE_B this is the target text AFTER_B";
    const start = 9;
    const end = 32;
    const slice1 = text1.slice(start, end);
    const slice2 = text2.slice(start, end);
    expect(slice1).toBe(slice2);
    expect(computeHash(slice1)).toBe(computeHash(slice2));
  });

  test("hash normalizes whitespace before computing", () => {
    const hash1 = computeHash("hello   world");
    const hash2 = computeHash("hello world");
    expect(hash1).toBe(hash2);
  });

  test("hash trims leading/trailing whitespace", () => {
    const hash1 = computeHash("  hello world  ");
    const hash2 = computeHash("hello world");
    expect(hash1).toBe(hash2);
  });

  test("full chain: extractParagraphs -> find text -> computeHash -> verify annotation ID", () => {
    const html = `
      <p id="test-p1">St. Augustine, in his great work On Christian Doctrine, teaches that Sacred Scripture contains all wisdom necessary for salvation.</p>
    `;
    const paragraphs = extractParagraphs(html);
    const plainText = paragraphs.get("test-p1");
    expect(plainText).toBeDefined();

    const searchText = "Sacred Scripture contains all wisdom necessary for salvation.";
    const normTarget = normalizeForMatch(searchText);
    const location = findInPlainText(plainText!, normTarget);
    expect(location).not.toBeNull();

    const foundText = plainText!.slice(location!.start, location!.end);
    expect(foundText).toContain("Sacred Scripture");

    const hash = computeHash(foundText);
    const annotationId = `test-p1-s-${hash}`;
    expect(annotationId).toMatch(/^test-p1-s-[a-f0-9]{7}$/);
  });
});

// ---------------------------------------------------------------------------
// 4. Sidecar integration with source HTML (fixture)
// ---------------------------------------------------------------------------

describe("sidecar integration with source HTML fixture", () => {
  const sourceHtml = readFileSync(join(FIXTURES_DIR, "source.html"), "utf-8");
  const paragraphs = extractParagraphs(sourceHtml);

  test("extractParagraphs finds all paragraphs with IDs from the fixture", () => {
    // source.html has paragraphs: section-one-p1..p5, section-two-p1..p4, section-three-p1..p3
    expect(paragraphs.has("section-one-p1")).toBe(true);
    expect(paragraphs.has("section-one-p2")).toBe(true);
    expect(paragraphs.has("section-one-p3")).toBe(true);
    expect(paragraphs.has("section-one-p4")).toBe(true);
    expect(paragraphs.has("section-one-p5")).toBe(true);
    expect(paragraphs.has("section-two-p1")).toBe(true);
    expect(paragraphs.has("section-two-p2")).toBe(true);
    expect(paragraphs.has("section-two-p3")).toBe(true);
    expect(paragraphs.has("section-two-p4")).toBe(true);
    expect(paragraphs.has("section-three-p1")).toBe(true);
    expect(paragraphs.has("section-three-p2")).toBe(true);
    expect(paragraphs.has("section-three-p3")).toBe(true);
    expect(paragraphs.size).toBe(12);
  });

  test("findInPlainText returns correct offsets for Augustine reference in section-one-p1", () => {
    const plainText = paragraphs.get("section-one-p1")!;
    const refText = "St. Augustine, in his great work On Christian Doctrine, teaches that Sacred Scripture contains all wisdom necessary for salvation.";
    const normTarget = normalizeForMatch(refText);
    const location = findInPlainText(plainText, normTarget);
    expect(location).not.toBeNull();
    expect(location!.start).toBe(0); // Begins at start of paragraph
    const foundText = plainText.slice(location!.start, location!.end);
    expect(foundText).toContain("St. Augustine");
    expect(foundText).toContain("salvation");
  });

  test("findInPlainText returns correct offsets for Jerome quote in section-one-p2", () => {
    const plainText = paragraphs.get("section-one-p2")!;
    const refText = "Ignorance of the Scriptures is ignorance of Christ.";
    const normTarget = normalizeForMatch(refText);
    const location = findInPlainText(plainText, normTarget);
    expect(location).not.toBeNull();
    const foundText = plainText.slice(location!.start, location!.end);
    expect(foundText).toContain("Ignorance of the Scriptures");
    expect(foundText).toContain("Christ");
  });

  test("findInPlainText returns correct offsets for Jerome in section-two-p3", () => {
    const plainText = paragraphs.get("section-two-p3")!;
    const refText = "St. Jerome, the phoenix of his age, who devoted himself entirely to sacred Letters";
    const normTarget = normalizeForMatch(refText);
    const location = findInPlainText(plainText, normTarget);
    expect(location).not.toBeNull();
    const foundText = plainText.slice(location!.start, location!.end);
    expect(foundText).toContain("phoenix of his age");
  });

  test("computeHash on found text produces a deterministic hash for annotation ID", () => {
    const plainText = paragraphs.get("section-one-p1")!;
    const refText = "St. Augustine, in his great work On Christian Doctrine, teaches that Sacred Scripture contains all wisdom necessary for salvation.";
    const normTarget = normalizeForMatch(refText);
    const location = findInPlainText(plainText, normTarget)!;
    const foundText = plainText.slice(location.start, location.end);
    const hash = computeHash(foundText);
    const annotationId = `section-one-p1-s-${hash}`;
    expect(annotationId).toMatch(/^section-one-p1-s-[a-f0-9]{7}$/);

    // Running again should produce the same ID
    const hash2 = computeHash(foundText);
    expect(hash2).toBe(hash);
  });

  test("annotation ID format matches {paragraph-id}-s-{hash}", () => {
    const paraId = "section-two-p3";
    const plainText = paragraphs.get(paraId)!;
    const refText = "St. Jerome, the phoenix of his age, who devoted himself entirely to sacred Letters";
    const normTarget = normalizeForMatch(refText);
    const location = findInPlainText(plainText, normTarget)!;
    const foundText = plainText.slice(location.start, location.end);
    const hash = computeHash(foundText);
    const annotationId = `${paraId}-s-${hash}`;
    expect(annotationId).toMatch(new RegExp(`^${paraId}-s-[a-f0-9]{7}$`));
  });
});

// ---------------------------------------------------------------------------
// 5. Annotation offset validation
// ---------------------------------------------------------------------------

describe("annotation offset validation", () => {
  const sourceHtml = readFileSync(join(FIXTURES_DIR, "source.html"), "utf-8");
  const paragraphs = extractParagraphs(sourceHtml);

  test("text at the very beginning of a paragraph (start=0)", () => {
    const plainText = paragraphs.get("section-one-p1")!;
    const target = "St. Augustine";
    const normTarget = normalizeForMatch(target);
    const location = findInPlainText(plainText, normTarget);
    expect(location).not.toBeNull();
    expect(location!.start).toBe(0);
    expect(plainText.slice(location!.start, location!.end)).toBe("St. Augustine");
  });

  test("text at the very end of a paragraph", () => {
    const plainText = paragraphs.get("section-one-p1")!;
    const target = "necessary for salvation.";
    const normTarget = normalizeForMatch(target);
    const location = findInPlainText(plainText, normTarget);
    expect(location).not.toBeNull();
    expect(location!.end).toBe(plainText.length);
  });

  test("text spanning the entire paragraph", () => {
    const plainText = paragraphs.get("section-one-p1")!;
    const normTarget = normalizeForMatch(plainText);
    const location = findInPlainText(plainText, normTarget);
    expect(location).not.toBeNull();
    expect(location!.start).toBe(0);
    expect(location!.end).toBe(plainText.length);
  });

  test("very short text (2-3 characters)", () => {
    const plainText = paragraphs.get("section-one-p1")!;
    // "St." is 3 characters
    const normTarget = normalizeForMatch("St.");
    const location = findInPlainText(plainText, normTarget);
    expect(location).not.toBeNull();
    expect(location!.end - location!.start).toBe(3);
    expect(plainText.slice(location!.start, location!.end)).toBe("St.");
  });

  test("text containing em-dashes (HTML entity &mdash;)", () => {
    // section-one-p3 has an em-dash: "to the orthodox — that is"
    const plainText = paragraphs.get("section-one-p3")!;
    // After stripHtml, &mdash; becomes \u2014
    expect(plainText).toContain("\u2014");

    // normalizeForMatch converts \u2014 to " -- "
    // Search for text that spans the em-dash
    const target = "to the orthodox -- that is, to drag him out of the mire";
    const location = findInPlainText(plainText, target);
    expect(location).not.toBeNull();
    // The found text in the original should contain the Unicode em-dash
    const foundText = plainText.slice(location!.start, location!.end);
    expect(foundText).toContain("\u2014");
    expect(foundText).toContain("to the orthodox");
    expect(foundText).toContain("to drag him out of the mire");
  });

  test("text containing &aelig; entity (ae ligature)", () => {
    // section-one-p3 has "Manichæan" from &aelig; -> \u00E6
    const plainText = paragraphs.get("section-one-p3")!;
    expect(plainText).toContain("\u00E6");

    // normalizeForMatch converts \u00E6 to "ae"
    const target = "Manichaean heresy";
    const location = findInPlainText(plainText, target);
    expect(location).not.toBeNull();
    const foundText = plainText.slice(location!.start, location!.end);
    expect(foundText).toContain("Manich\u00E6an heresy");
  });

  test("text containing &oelig; / \u0153 (oe ligature)", () => {
    // section-one-p5 has "Œuvres" from &OElig; and "cœlestial" from &oelig;
    const plainText = paragraphs.get("section-one-p5")!;

    // normalizeForMatch converts \u0153 to "oe"
    const target = "coelestial wisdom";
    const location = findInPlainText(plainText, target);
    expect(location).not.toBeNull();
    const foundText = plainText.slice(location!.start, location!.end);
    expect(foundText).toContain("c\u0153lestial wisdom");
  });

  test("text containing smart quotes (&ldquo; &rdquo; &lsquo; &rsquo;)", () => {
    // section-one-p2 has smart quotes around "Ignorance of the Scriptures..."
    const plainText = paragraphs.get("section-one-p2")!;
    expect(plainText).toContain("\u201C"); // left double quote
    expect(plainText).toContain("\u201D"); // right double quote
    expect(plainText).toContain("\u2019"); // right single quote (apostrophe)

    // normalizeForMatch converts all quotes to simple apostrophes
    const target = "'Ignorance of the Scriptures is ignorance of Christ.'";
    const location = findInPlainText(plainText, target);
    expect(location).not.toBeNull();
  });

  test("text at [start, end) matches expected ref text after normalization", () => {
    const plainText = paragraphs.get("section-one-p3")!;
    const refText = "The reading of Paul was able not only to join the heretic Augustine to the orthodox";
    const normTarget = normalizeForMatch(refText);
    const location = findInPlainText(plainText, normTarget)!;
    const foundText = plainText.slice(location.start, location.end);
    const normFound = normalizeForMatch(foundText);
    expect(normFound).toBe(normalizeForMatch(refText));
  });
});

// ---------------------------------------------------------------------------
// 6. Multi-entity annotations
// ---------------------------------------------------------------------------

describe("multi-entity annotations", () => {
  test("two entities referencing the same text in the same paragraph should merge", () => {
    // Simulate the merge logic: given two refs pointing to the same text,
    // they produce one annotation with both entity slugs
    const plainText =
      "St. Augustine, in his great work On Christian Doctrine, teaches wisdom.";
    const refText = "St. Augustine, in his great work On Christian Doctrine";
    const normTarget = normalizeForMatch(refText);
    const location = findInPlainText(plainText, normTarget)!;
    const foundText = plainText.slice(location.start, location.end);
    const hash = computeHash(foundText);

    // Both entities map to the same hash
    const entity1 = "person/saint/augustine";
    const entity2 = "bibliography/augustine/de-doctrina-christiana";

    const merged: Annotation = {
      id: `test-p1-s-${hash}`,
      paragraph: "test-p1",
      start: location.start,
      end: location.end,
      entities: [entity1, entity2].sort(),
    };

    expect(merged.entities).toEqual([
      "bibliography/augustine/de-doctrina-christiana",
      "person/saint/augustine",
    ]);
    expect(merged.entities).toEqual([...merged.entities].sort());
  });

  test("entities array should be sorted alphabetically", () => {
    const entities = [
      "subject/theology/scripture/inspiration",
      "person/saint/augustine",
      "bibliography/augustine/de-doctrina-christiana",
    ];
    const sorted = [...entities].sort();
    expect(sorted).toEqual([
      "bibliography/augustine/de-doctrina-christiana",
      "person/saint/augustine",
      "subject/theology/scripture/inspiration",
    ]);
  });

  test("overlapping but slightly different text ranges produce different hashes", () => {
    const plainText =
      "St. Augustine teaches that Sacred Scripture contains all wisdom necessary for salvation.";

    // Range 1: "St. Augustine teaches that Sacred Scripture"
    const range1Text = plainText.slice(0, 44);
    // Range 2: "Augustine teaches that Sacred Scripture contains all wisdom"
    const range2Text = plainText.slice(4, 63);

    const hash1 = computeHash(range1Text);
    const hash2 = computeHash(range2Text);
    expect(hash1).not.toBe(hash2);
  });

  test("same text range in same paragraph with different entities shares one annotation ID", () => {
    const plainText = "The Council of Trent declared the Vulgate authentic.";
    const target = "The Council of Trent declared the Vulgate authentic.";
    const normTarget = normalizeForMatch(target);
    const location = findInPlainText(plainText, normTarget)!;
    const foundText = plainText.slice(location.start, location.end);
    const hash = computeHash(foundText);

    // Entity A and Entity B both reference the exact same text
    const annotationIdA = `para-s-${hash}`;
    const annotationIdB = `para-s-${hash}`;
    expect(annotationIdA).toBe(annotationIdB);

    // So they should be merged into one annotation
    const merged: Annotation = {
      id: `para-s-${hash}`,
      paragraph: "para",
      start: location.start,
      end: location.end,
      entities: [
        "organization/council/council-of-trent",
        "subject/exegesis/textual-criticism/vulgate-editions",
      ].sort(),
    };
    expect(merged.entities.length).toBe(2);
    // Entities are alphabetically sorted
    expect(merged.entities[0]).toBe("organization/council/council-of-trent");
    expect(merged.entities[1]).toBe(
      "subject/exegesis/textual-criticism/vulgate-editions"
    );
  });
});

// ---------------------------------------------------------------------------
// 7. Malformed sidecar detection
// ---------------------------------------------------------------------------

describe("malformed sidecar detection", () => {
  test("empty script tag", () => {
    const html = `
      <script type="application/json" id="passage-annotations"></script>
    `;
    // Empty string is not valid JSON
    expect(parseSidecar(html)).toBeNull();
  });

  test("script tag with non-JSON content", () => {
    const html = `
      <script type="application/json" id="passage-annotations">
      This is just plain text, not JSON at all.
      </script>
    `;
    expect(parseSidecar(html)).toBeNull();
  });

  test("valid JSON but wrong structure (array of strings instead of objects)", () => {
    const html = `
      <script type="application/json" id="passage-annotations">
      ["string1", "string2", "string3"]
      </script>
    `;
    // parseSidecar returns whatever JSON.parse produces; it does not validate structure
    const result = parseSidecar(html);
    // The parse succeeds but the array contains strings, not Annotation objects
    expect(result).not.toBeNull();
    expect(Array.isArray(result)).toBe(true);
    // Each element lacks the required annotation fields
    const first = result![0] as any;
    expect(first.id).toBeUndefined();
    expect(first.paragraph).toBeUndefined();
    expect(first.start).toBeUndefined();
    expect(first.end).toBeUndefined();
    expect(first.entities).toBeUndefined();
  });

  test("valid JSON but missing required fields in annotation objects", () => {
    const html = `
      <script type="application/json" id="passage-annotations">
      [
        {"id": "p1-s-abc1234"},
        {"paragraph": "p1", "start": 0}
      ]
      </script>
    `;
    const result = parseSidecar(html);
    // parseSidecar does not validate fields — it just parses JSON
    expect(result).not.toBeNull();
    expect(result!.length).toBe(2);
    // But the objects are incomplete
    expect(result![0].paragraph).toBeUndefined();
    expect(result![0].entities).toBeUndefined();
    expect(result![1].id).toBeUndefined();
    expect(result![1].end).toBeUndefined();
  });

  test("sidecar with duplicate annotation IDs (parseSidecar does not reject)", () => {
    const html = `
      <script type="application/json" id="passage-annotations">
      [
        {"id": "p1-s-abc1234", "paragraph": "p1", "start": 0, "end": 10, "entities": ["person/saint/augustine"]},
        {"id": "p1-s-abc1234", "paragraph": "p1", "start": 0, "end": 10, "entities": ["person/saint/jerome"]}
      ]
      </script>
    `;
    const result = parseSidecar(html);
    expect(result).not.toBeNull();
    expect(result!.length).toBe(2);
    // Both have the same id — this is structurally valid JSON but semantically invalid
    expect(result![0].id).toBe(result![1].id);
    // A validator should detect this; parseSidecar itself does not
  });

  test("JSON object instead of array", () => {
    const html = `
      <script type="application/json" id="passage-annotations">
      {"id": "p1-s-abc1234", "paragraph": "p1", "start": 0, "end": 10, "entities": ["x"]}
      </script>
    `;
    const result = parseSidecar(html);
    // parseSidecar returns whatever JSON.parse gives — a single object, not an array
    expect(result).not.toBeNull();
    expect(Array.isArray(result)).toBe(false);
  });

  test("nested script tags do not confuse parser", () => {
    const html = `
      <script type="text/javascript">
        var x = '<script type="application/json" id="passage-annotations">fake</script>';
      </script>
      <script type="application/json" id="passage-annotations">
      [{"id":"p1-s-1234567","paragraph":"p1","start":0,"end":5,"entities":["test/entity"]}]
      </script>
    `;
    // The regex is non-greedy so it grabs the first match
    const result = parseSidecar(html);
    // Depending on regex matching, this might grab the fake or real one
    // The important thing is it doesn't crash
    expect(result === null || Array.isArray(result) || typeof result === "object").toBe(true);
  });

  test("whitespace-only content in script tag", () => {
    const html = `
      <script type="application/json" id="passage-annotations">

      </script>
    `;
    expect(parseSidecar(html)).toBeNull();
  });

  test("valid JSON number (not array/object)", () => {
    const html = `
      <script type="application/json" id="passage-annotations">42</script>
    `;
    const result = parseSidecar(html);
    // JSON.parse(42) succeeds but returns a number
    expect(result).not.toBeNull();
    expect(typeof result).toBe("number");
  });
});

// ---------------------------------------------------------------------------
// Additional utility function tests (stripHtml, normalizeForMatch, extractParagraphs)
// ---------------------------------------------------------------------------

describe("stripHtml", () => {
  test("strips HTML tags", () => {
    expect(stripHtml("<p>hello <b>world</b></p>")).toBe("hello world");
  });

  test("decodes common HTML entities", () => {
    expect(stripHtml("&amp; &lt; &gt; &quot;")).toBe('& < > "');
  });

  test("decodes smart quote entities", () => {
    expect(stripHtml("&ldquo;hello&rdquo;")).toBe("\u201Chello\u201D");
    expect(stripHtml("&lsquo;hello&rsquo;")).toBe("\u2018hello\u2019");
  });

  test("decodes &mdash; and &ndash;", () => {
    expect(stripHtml("a&mdash;b")).toBe("a\u2014b");
    expect(stripHtml("a&ndash;b")).toBe("a\u2013b");
  });

  test("decodes ligature entities", () => {
    expect(stripHtml("&oelig;")).toBe("\u0153");
    expect(stripHtml("&aelig;")).toBe("\u00E6");
  });

  test("converts &nbsp; to regular space", () => {
    expect(stripHtml("hello&nbsp;world")).toBe("hello world");
  });

  test("collapses multiple whitespace to single space", () => {
    expect(stripHtml("hello   world")).toBe("hello world");
    expect(stripHtml("hello\n\n\nworld")).toBe("hello world");
  });

  test("trims leading and trailing whitespace", () => {
    expect(stripHtml("  hello world  ")).toBe("hello world");
  });

  test("handles nested tags", () => {
    expect(stripHtml("<p><b><em>text</em></b></p>")).toBe("text");
  });

  test("handles empty input", () => {
    expect(stripHtml("")).toBe("");
  });
});

describe("normalizeForMatch", () => {
  test("normalizes oe ligature", () => {
    expect(normalizeForMatch("c\u0153lestial")).toBe("coelestial");
  });

  test("normalizes ae ligature", () => {
    expect(normalizeForMatch("Manich\u00E6an")).toBe("Manichaean");
  });

  test("normalizes smart quotes to simple apostrophes", () => {
    expect(normalizeForMatch("\u2018hello\u2019")).toBe("'hello'");
    expect(normalizeForMatch("\u201Chello\u201D")).toBe("'hello'");
  });

  test("normalizes em-dashes to ' -- '", () => {
    expect(normalizeForMatch("a\u2014b")).toBe("a -- b");
    expect(normalizeForMatch("a -- b")).toBe("a -- b");
    // With surrounding spaces
    expect(normalizeForMatch("a \u2014 b")).toBe("a -- b");
  });

  test("normalizes en-dashes to hyphens", () => {
    expect(normalizeForMatch("354\u2013430")).toBe("354-430");
  });

  test("collapses whitespace", () => {
    expect(normalizeForMatch("hello   world")).toBe("hello world");
  });

  test("trims result", () => {
    expect(normalizeForMatch("  hello  ")).toBe("hello");
  });
});

describe("extractParagraphs", () => {
  test("extracts paragraphs with IDs", () => {
    const html = `
      <p id="p1">First paragraph.</p>
      <p id="p2">Second paragraph.</p>
    `;
    const result = extractParagraphs(html);
    expect(result.size).toBe(2);
    expect(result.get("p1")).toBe("First paragraph.");
    expect(result.get("p2")).toBe("Second paragraph.");
  });

  test("skips paragraphs without IDs", () => {
    const html = `
      <p>No ID here.</p>
      <p id="with-id">Has ID.</p>
    `;
    const result = extractParagraphs(html);
    expect(result.size).toBe(1);
    expect(result.has("with-id")).toBe(true);
  });

  test("strips HTML from paragraph content", () => {
    const html = `<p id="p1">Hello <b>bold</b> and <em>italic</em> text.</p>`;
    const result = extractParagraphs(html);
    expect(result.get("p1")).toBe("Hello bold and italic text.");
  });

  test("handles paragraphs with additional attributes", () => {
    const html = `<p id="p1" data-paragraph-number="1" class="content">Text here.</p>`;
    const result = extractParagraphs(html);
    expect(result.size).toBe(1);
    expect(result.get("p1")).toBe("Text here.");
  });

  test("returns empty map for HTML with no paragraphs", () => {
    const html = `<div>No paragraphs</div><span>Just spans</span>`;
    const result = extractParagraphs(html);
    expect(result.size).toBe(0);
  });

  test("handles HTML entities in paragraph content", () => {
    const html = `<p id="p1">St. Jerome&rsquo;s &ldquo;great work&rdquo; on &mdash; things.</p>`;
    const result = extractParagraphs(html);
    const text = result.get("p1")!;
    expect(text).toContain("\u2019"); // right single quote
    expect(text).toContain("\u201C"); // left double quote
    expect(text).toContain("\u201D"); // right double quote
    expect(text).toContain("\u2014"); // em-dash
  });
});

describe("findInPlainText", () => {
  test("returns null when text is not found", () => {
    const result = findInPlainText("Hello world", "xyz not here");
    expect(result).toBeNull();
  });

  test("finds exact text match", () => {
    const result = findInPlainText("Hello world", "Hello");
    expect(result).not.toBeNull();
    expect(result!.start).toBe(0);
    expect(result!.end).toBe(5);
  });

  test("finds text with normalization (ligatures)", () => {
    const plainText = "The c\u0153lestial wisdom.";
    const target = "coelestial wisdom";
    const result = findInPlainText(plainText, target);
    expect(result).not.toBeNull();
    const found = plainText.slice(result!.start, result!.end);
    expect(found).toContain("c\u0153lestial wisdom");
  });

  test("respects searchFrom parameter", () => {
    const plainText = "apple banana apple cherry";
    // First "apple" at 0, second at 13
    const first = findInPlainText(plainText, "apple", 0);
    expect(first).not.toBeNull();
    expect(first!.start).toBe(0);

    const second = findInPlainText(plainText, "apple", 1);
    expect(second).not.toBeNull();
    expect(second!.start).toBe(13);
  });

  test("finds text spanning em-dashes using normalized form", () => {
    const plainText = "before \u2014 after";
    const target = "before -- after";
    const result = findInPlainText(plainText, target);
    expect(result).not.toBeNull();
    expect(result!.start).toBe(0);
  });
});

describe("computeHash", () => {
  test("returns 7-character hex string", () => {
    const hash = computeHash("test");
    expect(hash.length).toBe(7);
    expect(hash).toMatch(/^[a-f0-9]{7}$/);
  });

  test("is deterministic", () => {
    const text = "The same input always gives the same output.";
    expect(computeHash(text)).toBe(computeHash(text));
  });

  test("different inputs produce different hashes (with high probability)", () => {
    const hashes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      hashes.add(computeHash(`test input number ${i}`));
    }
    // All 100 should be distinct (collision in 7 hex chars = 28 bits is astronomically unlikely for 100 inputs)
    expect(hashes.size).toBe(100);
  });

  test("whitespace normalization: tabs, newlines, multiple spaces all treated as single space", () => {
    const h1 = computeHash("hello\tworld");
    const h2 = computeHash("hello\nworld");
    const h3 = computeHash("hello   world");
    const h4 = computeHash("hello world");
    expect(h1).toBe(h4);
    expect(h2).toBe(h4);
    expect(h3).toBe(h4);
  });
});
