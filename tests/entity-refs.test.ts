import { describe, test, expect } from "bun:test";
import {
  splitSegments,
  generateNameVariants,
  getSection,
  stripHashSuffix,
} from "../pipeline-utils";

// ─────────────────────────────────────────────────────────────────────────────
// splitSegments
// ─────────────────────────────────────────────────────────────────────────────

describe("splitSegments", () => {
  test("splits simple HTML into text and tag segments", () => {
    const result = splitSegments("Hello <em>world</em> end");
    expect(result).toEqual([
      { type: "text", content: "Hello " },
      { type: "tag", content: "<em>" },
      { type: "text", content: "world" },
      { type: "tag", content: "</em>" },
      { type: "text", content: " end" },
    ]);
  });

  test("handles nested tags: <b><em>word</em></b>", () => {
    const result = splitSegments("<b><em>word</em></b>");
    expect(result).toEqual([
      { type: "tag", content: "<b>" },
      { type: "tag", content: "<em>" },
      { type: "text", content: "word" },
      { type: "tag", content: "</em>" },
      { type: "tag", content: "</b>" },
    ]);
  });

  test("handles self-closing tags: <br />", () => {
    const result = splitSegments("before<br />after");
    expect(result).toEqual([
      { type: "text", content: "before" },
      { type: "tag", content: "<br />" },
      { type: "text", content: "after" },
    ]);
  });

  test("handles text-only input (no tags)", () => {
    const result = splitSegments("just plain text");
    expect(result).toEqual([{ type: "text", content: "just plain text" }]);
  });

  test("handles tag-only input (no text)", () => {
    const result = splitSegments("<div><span></span></div>");
    expect(result).toEqual([
      { type: "tag", content: "<div>" },
      { type: "tag", content: "<span>" },
      { type: "tag", content: "</span>" },
      { type: "tag", content: "</div>" },
    ]);
  });

  test("handles empty string", () => {
    const result = splitSegments("");
    expect(result).toEqual([]);
  });

  test("handles malformed HTML (unclosed tag)", () => {
    // When there's a '<' with no closing '>', the remainder is treated as text
    const result = splitSegments("hello <unclosed");
    expect(result).toEqual([
      { type: "text", content: "hello " },
      { type: "text", content: "<unclosed" },
    ]);
  });

  test("handles entity-ref span tags with attributes", () => {
    const result = splitSegments(
      '<span class="entity-ref" data-slug="person/saint/jerome">St. Jerome</span>'
    );
    expect(result).toEqual([
      { type: "tag", content: '<span class="entity-ref" data-slug="person/saint/jerome">' },
      { type: "text", content: "St. Jerome" },
      { type: "tag", content: "</span>" },
    ]);
  });

  test("handles <a> tags with attributes", () => {
    const result = splitSegments(
      '<a href="https://example.com" class="link">click here</a>'
    );
    expect(result).toEqual([
      {
        type: "tag",
        content: '<a href="https://example.com" class="link">',
      },
      { type: "text", content: "click here" },
      { type: "tag", content: "</a>" },
    ]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// generateNameVariants
// ─────────────────────────────────────────────────────────────────────────────

describe("generateNameVariants", () => {
  test('"St. Augustine of Hippo" generates expected variants', () => {
    const variants = generateNameVariants("St. Augustine of Hippo");
    expect(variants).toContain("St. Augustine of Hippo");
    expect(variants).toContain("Augustine of Hippo");
    expect(variants).toContain("Saint Augustine of Hippo");
    expect(variants).toContain("St. Augustine");
    expect(variants).toContain("Saint Augustine");
    expect(variants).toContain("Augustine");
  });

  test('"St. Jerome" generates Saint and bare forms', () => {
    const variants = generateNameVariants("St. Jerome");
    expect(variants).toContain("St. Jerome");
    expect(variants).toContain("Saint Jerome");
    expect(variants).toContain("Jerome");
  });

  test('"Bl. John of Avila" generates Blessed and short forms', () => {
    const variants = generateNameVariants("Bl. John of Avila");
    expect(variants).toContain("Bl. John of Avila");
    expect(variants).toContain("Blessed John of Avila");
    expect(variants).toContain("John of Avila");
    // "Bl. John" and "John" come from qualifier-stripping on prefixed names
    expect(variants).toContain("John");
  });

  test('"Pope Gregory I" strips Pope prefix', () => {
    const variants = generateNameVariants("Pope Gregory I");
    expect(variants).toContain("Pope Gregory I");
    expect(variants).toContain("Gregory I");
  });

  test("short names (< 3 chars) are filtered out", () => {
    // "St. Jo" → stripping "St. " gives "Jo" (2 chars) — should be filtered
    const variants = generateNameVariants("St. Jo");
    for (const v of variants) {
      expect(v.length).toBeGreaterThanOrEqual(3);
    }
  });

  test("no duplicates in output", () => {
    const variants = generateNameVariants("St. Augustine of Hippo");
    const unique = [...new Set(variants)];
    expect(variants.length).toBe(unique.length);
  });

  test("name without any prefix returns just the name", () => {
    const variants = generateNameVariants("Aristotle");
    expect(variants).toEqual(["Aristotle"]);
  });

  test('"Aristotle" with no prefix or qualifier produces single-element array', () => {
    const variants = generateNameVariants("Aristotle");
    expect(variants).toHaveLength(1);
    expect(variants[0]).toBe("Aristotle");
  });

  // --- Gap 4: Prefix-only names ---

  test('"St." alone returns only ["St."] — stripping prefix leaves empty string, filtered by length >= 3', () => {
    const variants = generateNameVariants("St.");
    // "St." is 3 chars, so it passes the filter. Stripping "St. " prefix doesn't match
    // because "St." doesn't start with "St. " (no trailing space). So only the original.
    expect(variants).toEqual(["St."]);
  });

  test('"Pope" alone returns only ["Pope"] — no prefix match since "Pope " with space not found', () => {
    const variants = generateNameVariants("Pope");
    // "Pope" does not start with "Pope " (with trailing space), so no prefix stripping
    expect(variants).toEqual(["Pope"]);
  });

  test('"St. Jo" — prefix stripping gives "Jo" which is < 3 chars, filtered out', () => {
    const variants = generateNameVariants("St. Jo");
    // "St. Jo" (6 chars) passes the >= 3 filter
    // Stripping "St. " gives "Jo" (2 chars) — filtered out
    // "Saint Jo" is an interchange variant
    expect(variants).toContain("St. Jo");
    expect(variants).toContain("Saint Jo");
    // "Jo" should NOT be present (< 3 chars)
    expect(variants).not.toContain("Jo");
  });

  test('"Bl." alone returns only ["Bl."] — no prefix match without trailing space', () => {
    const variants = generateNameVariants("Bl.");
    // "Bl." does not start with "Bl. " (with trailing space)
    expect(variants).toEqual(["Bl."]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getSection
// ─────────────────────────────────────────────────────────────────────────────

describe("getSection", () => {
  test('"section-one-p3" → "section-one"', () => {
    expect(getSection("section-one-p3")).toBe("section-one");
  });

  test('"chapter-iv-p27" → "chapter-iv"', () => {
    expect(getSection("chapter-iv-p27")).toBe("chapter-iv");
  });

  test('"verse-1" → "verse-1" (no -pN suffix to strip)', () => {
    expect(getSection("verse-1")).toBe("verse-1");
  });

  test('"dedicatory-letter-p42" → "dedicatory-letter"', () => {
    expect(getSection("dedicatory-letter-p42")).toBe("dedicatory-letter");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// stripHashSuffix
// ─────────────────────────────────────────────────────────────────────────────

describe("stripHashSuffix", () => {
  test('"section-one-p3-s-a3f2b1c" → "section-one-p3"', () => {
    expect(stripHashSuffix("section-one-p3-s-a3f2b1c")).toBe("section-one-p3");
  });

  test('"section-one-p3" → "section-one-p3" (no suffix, unchanged)', () => {
    expect(stripHashSuffix("section-one-p3")).toBe("section-one-p3");
  });

  test('"verse-1-s-abc1234" → "verse-1"', () => {
    expect(stripHashSuffix("verse-1-s-abc1234")).toBe("verse-1");
  });

  test("only strips valid 7-char hex suffixes after -s-", () => {
    // Too short (6 chars) — should NOT be stripped
    expect(stripHashSuffix("para-p1-s-abc123")).toBe("para-p1-s-abc123");
    // Too long (8 chars) — should NOT be stripped
    expect(stripHashSuffix("para-p1-s-abc12345")).toBe("para-p1-s-abc12345");
    // Non-hex chars — should NOT be stripped
    expect(stripHashSuffix("para-p1-s-ghijklm")).toBe("para-p1-s-ghijklm");
    // Valid 7-char hex — SHOULD be stripped
    expect(stripHashSuffix("para-p1-s-0a1b2c3")).toBe("para-p1");
  });

  // --- Gap 3: Paragraph IDs containing -s- in the base ID ---

  test("strips hash suffix from ID that contains -s- in the base: analysis-semiotics-p1-s-abc1234", () => {
    expect(stripHashSuffix("analysis-semiotics-p1-s-abc1234")).toBe("analysis-semiotics-p1");
  });

  test("does NOT strip when -s- is in middle but no valid 7-char hex at end: some-s-text-p1", () => {
    // "some-s-text-p1" ends with "-p1", not "-s-XXXXXXX"
    expect(stripHashSuffix("some-s-text-p1")).toBe("some-s-text-p1");
  });

  test("strips only the LAST -s-XXXXXXX when multiple -s- segments exist", () => {
    // "pre-s-1234567-p1-s-abcdef0" — the regex anchors to $ so it strips the last one
    expect(stripHashSuffix("pre-s-1234567-p1-s-abcdef0")).toBe("pre-s-1234567-p1");
  });

  test("does NOT strip -s- followed by non-hex characters (g is not hex)", () => {
    // 'g' is outside [a-f0-9], so this should NOT match
    expect(stripHashSuffix("test-s-ghijklm")).toBe("test-s-ghijklm");
  });
});
