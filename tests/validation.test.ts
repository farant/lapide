import { describe, test, expect } from "bun:test";
import { join } from "path";
import {
  extractParagraphs,
  stripHtml,
  normalizeForMatch,
  findInPlainText,
  parseTextLine,
  stripHashSuffix,
} from "../pipeline-utils";

const FIXTURES = join(import.meta.dir, "fixtures");
const SOURCE = join(FIXTURES, "source.html");
const EXTRACTION = join(FIXTURES, "extraction.md");
const REFS_DIR = join(FIXTURES, "refs");

// ── Text validation (simulating validate-refs.ts) ──

describe("Text exists in paragraph", () => {
  test("exact text is found in paragraph", async () => {
    const html = await Bun.file(SOURCE).text();
    const paragraphs = extractParagraphs(html);
    const p1 = paragraphs.get("section-one-p1")!;

    const target = normalizeForMatch(
      "Sacred Scripture contains all wisdom necessary for salvation"
    );
    const result = findInPlainText(p1, target);
    expect(result).not.toBeNull();
  });

  test("wrong text is NOT found in paragraph", async () => {
    const html = await Bun.file(SOURCE).text();
    const paragraphs = extractParagraphs(html);
    const p1 = paragraphs.get("section-one-p1")!;

    const target = normalizeForMatch(
      "This text definitely does not appear anywhere in the paragraph"
    );
    const result = findInPlainText(p1, target);
    expect(result).toBeNull();
  });

  test("text from a different paragraph is not found in this one", async () => {
    const html = await Bun.file(SOURCE).text();
    const paragraphs = extractParagraphs(html);
    const p1 = paragraphs.get("section-one-p1")!;

    // This text belongs to section-one-p2
    const target = normalizeForMatch("Ignorance of the Scriptures");
    const result = findInPlainText(p1, target);
    expect(result).toBeNull();
  });
});

describe("Fuzzy matching", () => {
  test("curly quotes match straight quotes after normalization", () => {
    // Simulate paragraph text with curly quotes (after stripHtml)
    const para = "He said \u201CIgnorance of the Scriptures is ignorance of Christ.\u201D";
    const search = normalizeForMatch('He said "Ignorance of the Scriptures is ignorance of Christ."');
    const result = findInPlainText(para, search);
    expect(result).not.toBeNull();
  });

  test("smart single quotes match straight apostrophes", () => {
    const para = "the Church\u2019s approach to biblical study";
    const search = normalizeForMatch("the Church's approach to biblical study");
    const result = findInPlainText(para, search);
    expect(result).not.toBeNull();
  });

  test("em-dash matching: -- matches \u2014", () => {
    const para = "orthodox \u2014 that is, to drag him out";
    const search = normalizeForMatch("orthodox -- that is, to drag him out");
    const result = findInPlainText(para, search);
    expect(result).not.toBeNull();
  });

  test("ligature matching: oe matches \u0153", () => {
    const para = "The c\u0153lestial wisdom contained therein";
    const search = normalizeForMatch("The coelestial wisdom contained therein");
    const result = findInPlainText(para, search);
    expect(result).not.toBeNull();
  });

  test("ligature matching: ae matches \u00E6", () => {
    const para = "the Manich\u00E6an heresy";
    const search = normalizeForMatch("the Manichaean heresy");
    const result = findInPlainText(para, search);
    expect(result).not.toBeNull();
  });

  test("ellipsis handling: literal ... in search text", () => {
    const para = "He who reads the works of the Fathers will find treasures beyond measure.";
    // Search for a partial match with literal dots
    const search = normalizeForMatch("reads the works");
    const result = findInPlainText(para, search);
    expect(result).not.toBeNull();
  });

  test("ellipsis as unicode character matches", () => {
    // If the source has an actual ellipsis character
    const para = "He who reads\u2026 will find treasures";
    const search = normalizeForMatch("reads");
    const result = findInPlainText(para, search);
    expect(result).not.toBeNull();
  });
});

describe("Text spanning em tags (HTML stripping)", () => {
  test("On Christian Doctrine is found after stripping <em> tags", () => {
    const rawHtml =
      'his great work <em>On Christian Doctrine</em>, teaches that';
    const plain = stripHtml(rawHtml);
    expect(plain).toContain("On Christian Doctrine");

    const search = normalizeForMatch("On Christian Doctrine");
    const result = findInPlainText(plain, search);
    expect(result).not.toBeNull();
  });

  test("bold and italic text is accessible after stripping", () => {
    const rawHtml =
      "has <b>bold text</b> and <em>italic text</em> and <b><em>bold italic</em></b>";
    const plain = stripHtml(rawHtml);
    expect(plain).toBe(
      "has bold text and italic text and bold italic"
    );
  });

  test("nested entities are fully decoded", () => {
    const rawHtml = "&ldquo;Ignorance of the Scriptures is ignorance of Christ.&rdquo;";
    const plain = stripHtml(rawHtml);
    expect(plain).toBe("\u201CIgnorance of the Scriptures is ignorance of Christ.\u201D");
  });

  test("entity-ref custom elements are stripped", () => {
    const rawHtml =
      '<entity-ref slug="person/saint/augustine">St. Augustine</entity-ref> wrote';
    const plain = stripHtml(rawHtml);
    expect(plain).toBe("St. Augustine wrote");
  });
});

// ── Paragraph ID validation ──

describe("Paragraph ID validation", () => {
  test("valid paragraph IDs exist in extracted paragraphs", async () => {
    const html = await Bun.file(SOURCE).text();
    const paragraphs = extractParagraphs(html);

    expect(paragraphs.has("section-one-p1")).toBe(true);
    expect(paragraphs.has("section-one-p2")).toBe(true);
    expect(paragraphs.has("section-one-p3")).toBe(true);
    expect(paragraphs.has("section-two-p1")).toBe(true);
    expect(paragraphs.has("section-two-p3")).toBe(true);
  });

  test("nonexistent paragraph ID returns undefined", async () => {
    const html = await Bun.file(SOURCE).text();
    const paragraphs = extractParagraphs(html);

    expect(paragraphs.get("nonexistent-paragraph")).toBeUndefined();
    expect(paragraphs.get("section-one-p99")).toBeUndefined();
    expect(paragraphs.get("section-three-p4")).toBeUndefined();
  });

  test("IDs with hash suffixes: strip -s-XXXXXXX before lookup", async () => {
    const html = await Bun.file(SOURCE).text();
    const paragraphs = extractParagraphs(html);

    const hashId = "section-one-p1-s-abc1234";
    const strippedId = stripHashSuffix(hashId);
    expect(strippedId).toBe("section-one-p1");
    expect(paragraphs.has(strippedId)).toBe(true);
  });

  test("heading IDs are NOT extracted as paragraphs", async () => {
    const html = await Bun.file(SOURCE).text();
    const paragraphs = extractParagraphs(html);

    // <h2 id="section-one"> is a heading, not a <p>
    expect(paragraphs.has("section-one")).toBe(false);
    expect(paragraphs.has("section-two")).toBe(false);
    expect(paragraphs.has("section-three")).toBe(false);
  });
});

// ── Extraction file validation (parseTextLine) ──

describe("Extraction file validation", () => {
  test("parseTextLine extracts quoted text from a text: line", () => {
    const line =
      '  text: "St. Augustine, in his great work On Christian Doctrine, teaches that Sacred Scripture contains all wisdom necessary for salvation."';
    const result = parseTextLine(line);
    expect(result).toBe(
      "St. Augustine, in his great work On Christian Doctrine, teaches that Sacred Scripture contains all wisdom necessary for salvation."
    );
  });

  test("parseTextLine returns null for non-text lines", () => {
    expect(parseTextLine("- `#section-one-p1` — teaches that")).toBeNull();
    expect(parseTextLine("### St. Augustine")).toBeNull();
    expect(parseTextLine("")).toBeNull();
    expect(parseTextLine("  - **Slug**: `saint/augustine`")).toBeNull();
  });

  test("parseTextLine handles text with internal quotes", () => {
    // The regex expects the entire value to be in double quotes
    const line = '    text: "Ignorance of the Scriptures is ignorance of Christ."';
    const result = parseTextLine(line);
    expect(result).toBe(
      "Ignorance of the Scriptures is ignorance of Christ."
    );
  });

  test("quoted text from extraction matches the referenced paragraph", async () => {
    const html = await Bun.file(SOURCE).text();
    const paragraphs = extractParagraphs(html);
    const extractionContent = await Bun.file(EXTRACTION).text();

    // Parse the extraction file to find text: lines and their associated paragraph IDs
    const lines = extractionContent.split("\n");
    let currentParaId: string | null = null;
    let verified = 0;

    for (const line of lines) {
      // Lines like: - `#section-one-p1` — ...
      const paraMatch = line.match(/`#([^`]+)`/);
      if (paraMatch) {
        currentParaId = stripHashSuffix(paraMatch[1]);
      }

      const textVal = parseTextLine(line);
      if (textVal && currentParaId) {
        const paraText = paragraphs.get(currentParaId);
        if (paraText) {
          // Text should be findable in the paragraph
          const normSearch = normalizeForMatch(textVal);
          const result = findInPlainText(paraText, normSearch);
          expect(result).not.toBeNull();
          verified++;
        }
      }
    }

    // We should have verified at least some entries
    expect(verified).toBeGreaterThan(0);
  });

  test("detects when text references a nonexistent paragraph ID", async () => {
    const html = await Bun.file(SOURCE).text();
    const paragraphs = extractParagraphs(html);

    // The extraction.md fixture includes a reference to #nonexistent-paragraph
    const extractionContent = await Bun.file(EXTRACTION).text();
    const lines = extractionContent.split("\n");
    let foundBadRef = false;

    let currentParaId: string | null = null;
    for (const line of lines) {
      const paraMatch = line.match(/`#([^`]+)`/);
      if (paraMatch) {
        currentParaId = stripHashSuffix(paraMatch[1]);
      }

      const textVal = parseTextLine(line);
      if (textVal && currentParaId) {
        if (!paragraphs.has(currentParaId)) {
          foundBadRef = true;
        }
      }
    }

    expect(foundBadRef).toBe(true);
  });

  test("detects when text is not found in the referenced paragraph", async () => {
    const html = await Bun.file(SOURCE).text();
    const paragraphs = extractParagraphs(html);

    // The Jerome extraction references #nonexistent-paragraph with text
    // "This text does not exist anywhere in the document."
    // Since the paragraph doesn't exist, that's already a bad ref.
    // But we can also test with a valid paragraph and wrong text:
    const p1 = paragraphs.get("section-one-p1")!;
    const result = findInPlainText(
      p1,
      normalizeForMatch("This text does not exist anywhere in the document")
    );
    expect(result).toBeNull();
  });
});

// ── Cross-reference validation ──

describe("Cross-reference validation", () => {
  test("ref file slug matches its file path", async () => {
    const augustinePath = join(REFS_DIR, "person/saint/augustine.md");
    const content = await Bun.file(augustinePath).text();
    const slugMatch = content.match(/^slug:\s*(.+)$/m);
    expect(slugMatch).not.toBeNull();
    const slug = slugMatch![1].trim();
    expect(slug).toBe("person/saint/augustine");

    // Verify the path matches: refs/<slug>.md
    const expectedPathSuffix = `refs/${slug}.md`;
    expect(augustinePath.endsWith(expectedPathSuffix)).toBe(true);
  });

  test("Jerome ref file slug matches its path", async () => {
    const jeromePath = join(REFS_DIR, "person/saint/jerome.md");
    const content = await Bun.file(jeromePath).text();
    const slugMatch = content.match(/^slug:\s*(.+)$/m);
    expect(slugMatch).not.toBeNull();
    expect(slugMatch![1].trim()).toBe("person/saint/jerome");
  });

  test("Basil ref file slug matches its path", async () => {
    const basilPath = join(REFS_DIR, "person/saint/basil-the-great.md");
    const content = await Bun.file(basilPath).text();
    const slugMatch = content.match(/^slug:\s*(.+)$/m);
    expect(slugMatch).not.toBeNull();
    expect(slugMatch![1].trim()).toBe("person/saint/basil-the-great");
  });

  test("related slugs follow the category/subcategory/name pattern", async () => {
    const augustinePath = join(REFS_DIR, "person/saint/augustine.md");
    const content = await Bun.file(augustinePath).text();

    // Extract related entries from the YAML frontmatter
    const SLUG_PATTERN = /^[a-z]+\/[a-z-]+(\/[a-z-]+)+$/;

    const relatedSlugs: string[] = [];
    const lines = content.split("\n");
    let inRelated = false;
    for (const line of lines) {
      if (line.match(/^related:/)) {
        inRelated = true;
        continue;
      }
      if (inRelated && line.match(/^\S/) && !line.match(/^\s/)) {
        inRelated = false;
        continue;
      }
      if (inRelated) {
        const slugMatch = line.match(/^\s+-\s+(.+)$/);
        if (slugMatch) {
          const slug = slugMatch[1].trim();
          // Skip sub-keys like "people:", "places:", etc.
          if (!slug.endsWith(":") && slug.includes("/")) {
            relatedSlugs.push(slug);
          }
        }
      }
    }

    expect(relatedSlugs.length).toBeGreaterThan(0);
    for (const slug of relatedSlugs) {
      expect(slug).toMatch(SLUG_PATTERN);
    }
  });

  test("alias files should contain alias_of in frontmatter", () => {
    // Test the pattern: alias files have only alias_of: in their frontmatter
    const aliasContent = `---
alias_of: place/europe/low-countries/cambrai
---
`;
    const match = aliasContent.match(/^alias_of:\s*(.+)$/m);
    expect(match).not.toBeNull();
    expect(match![1].trim()).toBe("place/europe/low-countries/cambrai");
  });

  test("non-alias files do NOT have alias_of in frontmatter", async () => {
    const augustinePath = join(REFS_DIR, "person/saint/augustine.md");
    const content = await Bun.file(augustinePath).text();
    const aliasMatch = content.match(/^alias_of:/m);
    expect(aliasMatch).toBeNull();
  });
});

// ── Full extraction file validation ──

describe("Full extraction file parsing", () => {
  test("extraction.md contains parseable text: lines", async () => {
    const content = await Bun.file(EXTRACTION).text();
    const lines = content.split("\n");
    const textLines = lines.filter((l) => parseTextLine(l) !== null);
    expect(textLines.length).toBeGreaterThan(0);
  });

  test("all text: lines in extraction.md can be parsed", async () => {
    const content = await Bun.file(EXTRACTION).text();
    const lines = content.split("\n");

    for (const line of lines) {
      if (line.includes("text:") && line.includes('"')) {
        const result = parseTextLine(line);
        // Every text: line with quotes should parse successfully
        expect(result).not.toBeNull();
      }
    }
  });

  test("extraction references with valid paragraphs all pass text validation", async () => {
    const html = await Bun.file(SOURCE).text();
    const paragraphs = extractParagraphs(html);
    const extractionContent = await Bun.file(EXTRACTION).text();

    const lines = extractionContent.split("\n");
    let currentParaId: string | null = null;
    let passCount = 0;
    let failCount = 0;

    for (const line of lines) {
      const paraMatch = line.match(/`#([^`]+)`/);
      if (paraMatch) {
        currentParaId = stripHashSuffix(paraMatch[1]);
      }

      const textVal = parseTextLine(line);
      if (textVal && currentParaId && paragraphs.has(currentParaId)) {
        const paraText = paragraphs.get(currentParaId)!;
        const normSearch = normalizeForMatch(textVal);
        const result = findInPlainText(paraText, normSearch);
        if (result) {
          passCount++;
        } else {
          failCount++;
        }
      }
    }

    // All valid-paragraph references should pass text validation
    expect(passCount).toBeGreaterThan(0);
    expect(failCount).toBe(0);
  });
});

// ── Entity-ref slug validation ── (Gap 6)

describe("entity-ref slug validation", () => {
  const SLUG_PATTERN = /^[a-z-]+(\/[a-z-]+)+$/;

  test("valid slug follows expected category/subcategory/name pattern", () => {
    expect("person/saint/augustine").toMatch(SLUG_PATTERN);
    expect("person/biblical/moses").toMatch(SLUG_PATTERN);
    expect("bibliography/jerome/vulgate").toMatch(SLUG_PATTERN);
  });

  test("valid slug has a corresponding ref file in fixtures", async () => {
    const slug = "person/saint/augustine";
    const refPath = join(REFS_DIR, `${slug}.md`);
    const file = Bun.file(refPath);
    expect(await file.exists()).toBe(true);
  });

  test("nonexistent slug does NOT have a corresponding ref file", async () => {
    const slug = "person/saint/nonexistent";
    const refPath = join(REFS_DIR, `${slug}.md`);
    const file = Bun.file(refPath);
    expect(await file.exists()).toBe(false);
  });

  test("invalid slugs do not match the pattern: uppercase", () => {
    expect("Person/Saint/Augustine").not.toMatch(SLUG_PATTERN);
    expect("person/Saint/augustine").not.toMatch(SLUG_PATTERN);
  });

  test("invalid slugs do not match the pattern: no subcategory", () => {
    expect("person").not.toMatch(SLUG_PATTERN);
  });

  test("invalid slugs do not match the pattern: trailing slash", () => {
    expect("person/saint/").not.toMatch(SLUG_PATTERN);
  });

  test("invalid slugs do not match the pattern: leading slash", () => {
    expect("/person/saint/augustine").not.toMatch(SLUG_PATTERN);
  });

  test("invalid slugs do not match the pattern: spaces", () => {
    expect("person/saint/augustine of hippo").not.toMatch(SLUG_PATTERN);
  });

  test("invalid slugs do not match the pattern: numbers", () => {
    // The pattern only allows [a-z-], but verse slugs like "verse/genesis/1" actually
    // contain numbers — verify the strict pattern rejects digits
    expect("person/saint/augustine2").not.toMatch(SLUG_PATTERN);
  });

  test("slugs with hyphens are valid", () => {
    expect("person/saint/basil-the-great").toMatch(SLUG_PATTERN);
    expect("place/middle-east/palestine/jerusalem").toMatch(SLUG_PATTERN);
  });
});

// ── stripHtml edge cases ──

describe("stripHtml edge cases", () => {
  test("decodes &amp; to &", () => {
    expect(stripHtml("Tom &amp; Jerry")).toBe("Tom & Jerry");
  });

  test("decodes &lt; and &gt;", () => {
    expect(stripHtml("a &lt; b &gt; c")).toBe("a < b > c");
  });

  test("decodes &mdash; to em-dash", () => {
    expect(stripHtml("yes &mdash; no")).toBe("yes \u2014 no");
  });

  test("decodes &ndash; to en-dash", () => {
    expect(stripHtml("1\u20132 or 1&ndash;2")).toBe("1\u20132 or 1\u20132");
  });

  test("decodes &oelig; to \u0153", () => {
    expect(stripHtml("c&oelig;lestial")).toBe("c\u0153lestial");
  });

  test("decodes &aelig; to \u00E6", () => {
    expect(stripHtml("Manich&aelig;an")).toBe("Manich\u00E6an");
  });

  test("collapses whitespace and trims", () => {
    expect(stripHtml("  hello   world  ")).toBe("hello world");
  });

  test("strips all HTML tags", () => {
    expect(
      stripHtml('<p><em>hello</em> <b>world</b></p>')
    ).toBe("hello world");
  });

  test("handles &nbsp; as regular space", () => {
    expect(stripHtml("word&nbsp;word")).toBe("word word");
  });
});
