import { describe, test, expect } from "bun:test";
import { join } from "path";
import {
  parseSidecar,
  stripHashSuffix,
  extractParagraphs,
  findInPlainText,
  normalizeForMatch,
  computeHash,
  stripHtml,
  type Annotation,
} from "../pipeline-utils";

const FIXTURE = join(import.meta.dir, "fixtures/source.html");

// ── Regex for sidecar annotation fragment detection ──

const SIDECAR_RE = /-s-[a-f0-9]{7}$/;

describe("Hash-fragment detection", () => {
  test("recognizes a valid sidecar annotation fragment", () => {
    expect(SIDECAR_RE.test("section-one-p3-s-a3f2b1c")).toBe(true);
  });

  test("recognizes another valid fragment with all digits", () => {
    expect(SIDECAR_RE.test("section-one-p3-s-1234567")).toBe(true);
  });

  test("rejects uppercase hex characters", () => {
    expect(SIDECAR_RE.test("section-one-p3-s-ABCDEF0")).toBe(false);
  });

  test("rejects fragment with no hash suffix", () => {
    expect(SIDECAR_RE.test("section-one-p3")).toBe(false);
  });

  test("rejects hash that is too short (3 chars)", () => {
    expect(SIDECAR_RE.test("section-one-p3-s-abc")).toBe(false);
  });

  test("rejects hash that is too long (8 chars)", () => {
    expect(SIDECAR_RE.test("section-one-p3-s-abcdefgh")).toBe(false);
  });

  test("rejects fragment with -s- in the middle but no trailing hash", () => {
    expect(SIDECAR_RE.test("section-s-one-p3")).toBe(false);
  });

  test("accepts hash with mixed valid hex chars", () => {
    expect(SIDECAR_RE.test("verse-12-s-0f1e2d3")).toBe(true);
  });
});

describe("Non-annotation fragments", () => {
  test("plain section ID does not match sidecar pattern", () => {
    expect(SIDECAR_RE.test("section-one")).toBe(false);
  });

  test("paragraph ID without hash does not match", () => {
    expect(SIDECAR_RE.test("section-one-p3")).toBe(false);
  });

  test("hash.includes('-s-') is false for plain anchors", () => {
    expect("section-one".includes("-s-")).toBe(false);
    expect("section-one-p3".includes("-s-")).toBe(false);
  });
});

// ── stripHashSuffix ──

describe("stripHashSuffix", () => {
  test("strips a valid 7-char hex suffix", () => {
    expect(stripHashSuffix("section-one-p3-s-a3f2b1c")).toBe("section-one-p3");
  });

  test("leaves a non-sidecar fragment unchanged", () => {
    expect(stripHashSuffix("section-one-p3")).toBe("section-one-p3");
  });

  test("leaves a plain section ID unchanged", () => {
    expect(stripHashSuffix("section-one")).toBe("section-one");
  });

  test("does not strip an uppercase hash", () => {
    expect(stripHashSuffix("section-one-p3-s-ABCDEF0")).toBe(
      "section-one-p3-s-ABCDEF0"
    );
  });
});

// ── parseSidecar ──

describe("parseSidecar (annotation lookup)", () => {
  const sampleAnnotations: Annotation[] = [
    {
      id: "section-one-p1-s-abc1234",
      paragraph: "section-one-p1",
      start: 0,
      end: 14,
      entities: ["person/saint/augustine"],
    },
    {
      id: "section-one-p2-s-def5678",
      paragraph: "section-one-p2",
      start: 3,
      end: 65,
      entities: ["person/saint/jerome"],
    },
  ];

  const sidecarHtml = `<html><head></head><body>
<p id="section-one-p1">St. Augustine is great.</p>
<script type="application/json" id="passage-annotations">${JSON.stringify(sampleAnnotations)}</script>
</body></html>`;

  test("parseSidecar extracts annotations from HTML", () => {
    const result = parseSidecar(sidecarHtml);
    expect(result).not.toBeNull();
    expect(result!.length).toBe(2);
  });

  test("parseSidecar returns null when no sidecar script exists", () => {
    const noSidecar = "<html><body><p>Hello</p></body></html>";
    expect(parseSidecar(noSidecar)).toBeNull();
  });

  test("parseSidecar returns null for malformed JSON", () => {
    const badJson = `<html><body>
<script type="application/json" id="passage-annotations">{not valid json</script>
</body></html>`;
    expect(parseSidecar(badJson)).toBeNull();
  });

  test("find annotation by ID from parsed sidecar", () => {
    const annotations = parseSidecar(sidecarHtml)!;
    const found = annotations.find(
      (a) => a.id === "section-one-p1-s-abc1234"
    );
    expect(found).toBeDefined();
    expect(found!.paragraph).toBe("section-one-p1");
    expect(found!.start).toBe(0);
    expect(found!.end).toBe(14);
  });

  test("returns undefined for nonexistent annotation ID", () => {
    const annotations = parseSidecar(sidecarHtml)!;
    const found = annotations.find(
      (a) => a.id === "nonexistent-p1-s-0000000"
    );
    expect(found).toBeUndefined();
  });
});

// ── Offset-to-text mapping ──

describe("Offset-to-text mapping", () => {
  test("extracts correct substring at given offsets", () => {
    const plainText =
      "St. Augustine, in his great work On Christian Doctrine, teaches that Sacred Scripture contains all wisdom necessary for salvation.";
    const start = 0;
    const end = 14;
    const extracted = plainText.slice(start, end);
    expect(extracted).toBe("St. Augustine,");
  });

  test("offset at paragraph start (start=0)", () => {
    const text = "Ignorance of the Scriptures is ignorance of Christ.";
    expect(text.slice(0, 9)).toBe("Ignorance");
  });

  test("offset at paragraph end (end=text.length)", () => {
    const text = "Ignorance of the Scriptures is ignorance of Christ.";
    expect(text.slice(0, text.length)).toBe(text);
  });

  test("single character range", () => {
    const text = "Sacred Scripture";
    expect(text.slice(0, 1)).toBe("S");
    expect(text.slice(7, 8)).toBe("S");
  });

  test("range spanning the entire paragraph", () => {
    const text = "The reading of Paul was able to transform him.";
    expect(text.slice(0, text.length)).toBe(text);
  });

  test("offsets work with HTML-stripped text from fixture", async () => {
    const html = await Bun.file(FIXTURE).text();
    const paragraphs = extractParagraphs(html);
    const p1 = paragraphs.get("section-one-p1")!;
    // p1 after stripHtml: "St. Augustine, in his great work On Christian Doctrine, teaches that Sacred Scripture contains all wisdom necessary for salvation."
    expect(p1.startsWith("St. Augustine")).toBe(true);
    expect(p1.endsWith("salvation.")).toBe(true);

    // Extract "On Christian Doctrine"
    const start = p1.indexOf("On Christian Doctrine");
    expect(start).toBeGreaterThan(-1);
    const end = start + "On Christian Doctrine".length;
    expect(p1.slice(start, end)).toBe("On Christian Doctrine");
  });
});

// ── Hash verification ──

describe("Hash verification", () => {
  test("computeHash of extracted text matches annotation hash", async () => {
    const html = await Bun.file(FIXTURE).text();
    const paragraphs = extractParagraphs(html);
    const p2 = paragraphs.get("section-one-p2")!;

    // Extract the famous dictum
    const target = "Ignorance of the Scriptures is ignorance of Christ.";
    const start = p2.indexOf(target);
    expect(start).toBeGreaterThanOrEqual(0);
    const extracted = p2.slice(start, start + target.length);
    const hash = computeHash(extracted);

    // Hash should be 7 lowercase hex chars
    expect(hash).toMatch(/^[a-f0-9]{7}$/);

    // Same text should produce the same hash
    expect(computeHash(target)).toBe(hash);
  });

  test("different texts produce different hashes", () => {
    const hash1 = computeHash("Ignorance of the Scriptures");
    const hash2 = computeHash("Sacred Scripture contains all wisdom");
    expect(hash1).not.toBe(hash2);
  });

  test("hash is deterministic", () => {
    const text = "St. Jerome, the phoenix of his age";
    expect(computeHash(text)).toBe(computeHash(text));
  });

  test("hash normalizes whitespace before hashing", () => {
    const text1 = "Sacred  Scripture   contains";
    const text2 = "Sacred Scripture contains";
    expect(computeHash(text1)).toBe(computeHash(text2));
  });
});

// ── Cross-paragraph fallback ──

describe("Cross-paragraph fallback detection", () => {
  test("text contained within a single paragraph is found", async () => {
    const html = await Bun.file(FIXTURE).text();
    const paragraphs = extractParagraphs(html);
    const p1 = paragraphs.get("section-one-p1")!;
    const result = findInPlainText(
      p1,
      normalizeForMatch("Sacred Scripture contains all wisdom")
    );
    expect(result).not.toBeNull();
  });

  test("text NOT contained in a paragraph returns null (fallback condition)", async () => {
    const html = await Bun.file(FIXTURE).text();
    const paragraphs = extractParagraphs(html);
    const p1 = paragraphs.get("section-one-p1")!;
    // This text is from paragraph p2, not p1
    const result = findInPlainText(
      p1,
      normalizeForMatch("Ignorance of the Scriptures is ignorance of Christ")
    );
    expect(result).toBeNull();
  });

  test("when findInPlainText returns null, highlighting should fall back to full-paragraph highlight", () => {
    // Simulates the condition in components.js where startPos or endPos is null:
    // if (!startPos || !endPos) { para.scrollIntoView(...); return; }
    const plainText = "Short paragraph.";
    const result = findInPlainText(
      plainText,
      normalizeForMatch("This text does not exist in the paragraph at all")
    );
    expect(result).toBeNull();
    // In the actual DOM code, null result triggers scrollIntoView + paragraph-level highlight
  });
});

// ── Full chain test ──

describe("Full chain: sidecar → parse → find → extract → verify", () => {
  test("builds a small HTML with sidecar, parses, and verifies extracted text", async () => {
    // Step 1: Read the fixture and extract paragraphs
    const html = await Bun.file(FIXTURE).text();
    const paragraphs = extractParagraphs(html);

    // Step 2: Simulate building a sidecar annotation for section-one-p3
    const p3 = paragraphs.get("section-one-p3")!;
    const target = "heretic Augustine";
    const normTarget = normalizeForMatch(target);
    const location = findInPlainText(p3, normTarget);
    expect(location).not.toBeNull();

    const extractedText = p3.slice(location!.start, location!.end);
    const hash = computeHash(extractedText);

    // Step 3: Build annotation
    const annotation: Annotation = {
      id: `section-one-p3-s-${hash}`,
      paragraph: "section-one-p3",
      start: location!.start,
      end: location!.end,
      entities: ["person/saint/augustine"],
    };

    // Step 4: Build HTML with sidecar
    const sidecarHtml = `<html><body>
<p id="section-one-p3">${p3}</p>
<script type="application/json" id="passage-annotations">${JSON.stringify([annotation])}</script>
</body></html>`;

    // Step 5: Parse sidecar
    const parsed = parseSidecar(sidecarHtml);
    expect(parsed).not.toBeNull();
    expect(parsed!.length).toBe(1);

    // Step 6: Look up annotation by ID
    const found = parsed!.find((a) => a.id === annotation.id);
    expect(found).toBeDefined();
    expect(found!.paragraph).toBe("section-one-p3");

    // Step 7: Verify the ID matches the sidecar regex pattern
    expect(SIDECAR_RE.test(found!.id)).toBe(true);

    // Step 8: Extract text at offsets and verify
    const reExtracted = p3.slice(found!.start, found!.end);
    expect(reExtracted).toContain("heretic Augustine");

    // Step 9: Verify hash matches
    const reHash = computeHash(reExtracted);
    expect(found!.id.endsWith(`-s-${reHash}`)).toBe(true);

    // Step 10: stripHashSuffix recovers the paragraph ID
    expect(stripHashSuffix(found!.id)).toBe("section-one-p3");
  });

  test("end-to-end with fixture: Jerome quote", async () => {
    const html = await Bun.file(FIXTURE).text();
    const paragraphs = extractParagraphs(html);
    const p2 = paragraphs.get("section-one-p2")!;

    // The famous dictum, after HTML entity decoding
    const target =
      "\u201CIgnorance of the Scriptures is ignorance of Christ.\u201D";
    const normTarget = normalizeForMatch(target);
    const location = findInPlainText(p2, normTarget);
    expect(location).not.toBeNull();

    const extracted = p2.slice(location!.start, location!.end);
    expect(extracted).toContain("Ignorance of the Scriptures");

    const hash = computeHash(extracted);
    const annotationId = `section-one-p2-s-${hash}`;
    expect(SIDECAR_RE.test(annotationId)).toBe(true);
    expect(stripHashSuffix(annotationId)).toBe("section-one-p2");
  });
});

// ── Edge cases with inline markup ──

describe("Paragraphs with inline markup", () => {
  test("extractParagraphs strips HTML tags from paragraph content", async () => {
    const html = await Bun.file(FIXTURE).text();
    const paragraphs = extractParagraphs(html);

    // section-three-p1 has <b> and <em> tags
    const p1 = paragraphs.get("section-three-p1")!;
    expect(p1).not.toContain("<b>");
    expect(p1).not.toContain("<em>");
    expect(p1).toContain("bold text");
    expect(p1).toContain("italic text");
    expect(p1).toContain("bold italic");
  });

  test("text search works on HTML-stripped content with entities", async () => {
    const html = await Bun.file(FIXTURE).text();
    const paragraphs = extractParagraphs(html);

    // section-one-p3 contains &mdash; and &aelig;
    const p3 = paragraphs.get("section-one-p3")!;
    // After stripHtml: em-dash becomes \u2014, aelig becomes \u00E6
    expect(p3).toContain("\u2014");
    expect(p3).toContain("\u00E6");

    // normalizeForMatch converts these for fuzzy matching
    const norm = normalizeForMatch(p3);
    expect(norm).toContain(" -- ");
    expect(norm).toContain("ae");
  });

  test("findInPlainText handles em-dash normalization", async () => {
    const html = await Bun.file(FIXTURE).text();
    const paragraphs = extractParagraphs(html);
    const p3 = paragraphs.get("section-one-p3")!;

    // Search with double-dash should match the em-dash in the text
    const result = findInPlainText(
      p3,
      normalizeForMatch("orthodox -- that is, to drag him")
    );
    expect(result).not.toBeNull();
  });

  test("findInPlainText handles ligature normalization (oe/œ)", async () => {
    const html = await Bun.file(FIXTURE).text();
    const paragraphs = extractParagraphs(html);
    const p5 = paragraphs.get("section-one-p5")!;

    // p5 contains Œuvres (from &OElig;) and cœlestial (from &oelig;)
    const result = findInPlainText(
      p5,
      normalizeForMatch("coelestial wisdom")
    );
    expect(result).not.toBeNull();
  });
});
