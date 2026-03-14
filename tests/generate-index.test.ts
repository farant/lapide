/**
 * generate-index.test.ts — Unit tests for the pure utility functions used
 * by generate-index.ts (Stage 6 of the Lapide index pipeline).
 *
 * Tests the functions exported from lib/generate-index-utils.ts.
 */

import { describe, test, expect } from "bun:test";
import {
  parseFrontmatter,
  parseYaml,
  unquote,
  escHtml,
  humanizeFilename,
  humanizeSection,
  parseDates,
  ordinalSuffix,
  yearSlugFromNumber,
  latLonToTile,
  labelFor,
  CATEGORY_LABELS,
  SUBCATEGORY_LABELS,
  BIBLE_BOOK_ORDER,
} from "../lib/generate-index-utils";

// ---------------------------------------------------------------------------
// unquote
// ---------------------------------------------------------------------------

describe("unquote", () => {
  test("strips double quotes", () => {
    expect(unquote('"hello"')).toBe("hello");
  });

  test("strips single quotes", () => {
    expect(unquote("'hello'")).toBe("hello");
  });

  test("returns unquoted string as-is", () => {
    expect(unquote("hello")).toBe("hello");
  });

  test("parses integer", () => {
    expect(unquote("42")).toBe(42);
  });

  test("parses negative integer", () => {
    expect(unquote("-7")).toBe(-7);
  });

  test("parses float", () => {
    expect(unquote("3.14")).toBe(3.14);
  });

  test("parses boolean true", () => {
    expect(unquote("true")).toBe(true);
  });

  test("parses boolean false", () => {
    expect(unquote("false")).toBe(false);
  });

  test("does not parse number inside quotes", () => {
    expect(unquote('"354"')).toBe("354");
  });
});

// ---------------------------------------------------------------------------
// parseYaml
// ---------------------------------------------------------------------------

describe("parseYaml", () => {
  test("parses simple key-value pairs", () => {
    const result = parseYaml("name: Jerome\ncategory: person");
    expect(result.name).toBe("Jerome");
    expect(result.category).toBe("person");
  });

  test("parses quoted string values", () => {
    const result = parseYaml('dates: "354-430"');
    expect(result.dates).toBe("354-430");
  });

  test("parses a list", () => {
    const result = parseYaml(
      "also_known_as:\n  - Hieronymus\n  - Eusebius Sophronius Hieronymus"
    );
    expect(result.also_known_as).toEqual([
      "Hieronymus",
      "Eusebius Sophronius Hieronymus",
    ]);
  });

  test("parses a nested object with lists", () => {
    const result = parseYaml(
      "related:\n  people:\n    - person/saint/jerome\n  works:\n    - bibliography/augustine/de-doctrina-christiana\n  subjects: []"
    );
    expect(result.related.people).toEqual(["person/saint/jerome"]);
    expect(result.related.works).toEqual([
      "bibliography/augustine/de-doctrina-christiana",
    ]);
    expect(result.related.subjects).toEqual([]);
  });

  test("parses nested object with scalar values", () => {
    const result = parseYaml("meta:\n  title: My Title\n  count: 5");
    expect(result.meta.title).toBe("My Title");
    expect(result.meta.count).toBe(5);
  });

  test("handles empty lines between keys", () => {
    const result = parseYaml("name: Test\n\ncategory: person");
    expect(result.name).toBe("Test");
    expect(result.category).toBe("person");
  });

  test("returns empty object for empty string", () => {
    expect(parseYaml("")).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// parseFrontmatter
// ---------------------------------------------------------------------------

describe("parseFrontmatter", () => {
  test("parses full frontmatter block", () => {
    const content = `---
name: St. Augustine
slug: person/saint/augustine
category: person
---

One of the four great Latin Doctors.

## References in Commentary

- \`source.html#introduction\` - Teaches that Sacred Scripture is the highest pursuit`;

    const { frontmatter, body } = parseFrontmatter(content);
    expect(frontmatter.name).toBe("St. Augustine");
    expect(frontmatter.slug).toBe("person/saint/augustine");
    expect(frontmatter.category).toBe("person");
    expect(body).toContain("One of the four great Latin Doctors.");
    expect(body).toContain("## References in Commentary");
  });

  test("returns empty frontmatter when no delimiters", () => {
    const content = "Just plain text with no frontmatter.";
    const { frontmatter, body } = parseFrontmatter(content);
    expect(frontmatter).toEqual({});
    expect(body).toBe(content);
  });

  test("parses frontmatter with lists and nested objects", () => {
    const content = `---
name: Test
also_known_as:
  - Alias One
  - Alias Two
related:
  people:
    - person/saint/jerome
---

Body text here.`;

    const { frontmatter, body } = parseFrontmatter(content);
    expect(frontmatter.also_known_as).toEqual(["Alias One", "Alias Two"]);
    expect(frontmatter.related.people).toEqual(["person/saint/jerome"]);
    expect(body).toBe("Body text here.");
  });
});

// ---------------------------------------------------------------------------
// escHtml
// ---------------------------------------------------------------------------

describe("escHtml", () => {
  test("escapes ampersand", () => {
    expect(escHtml("A & B")).toBe("A &amp; B");
  });

  test("escapes less-than", () => {
    expect(escHtml("a < b")).toBe("a &lt; b");
  });

  test("escapes greater-than", () => {
    expect(escHtml("a > b")).toBe("a &gt; b");
  });

  test("escapes all three together", () => {
    expect(escHtml("<div class=\"a&b\">")).toBe("&lt;div class=\"a&amp;b\"&gt;");
  });

  test("leaves plain text unchanged", () => {
    expect(escHtml("hello world")).toBe("hello world");
  });
});

// ---------------------------------------------------------------------------
// humanizeFilename
// ---------------------------------------------------------------------------

describe("humanizeFilename", () => {
  test("strips number prefix and .html extension", () => {
    expect(humanizeFilename("01_Preliminares.html")).toBe("Preliminares");
  });

  test("converts genesis chapter format", () => {
    expect(humanizeFilename("01_genesis_01.html")).toBe("Genesis 1");
  });

  test("converts multi-digit genesis chapter", () => {
    expect(humanizeFilename("01_genesis_50.html")).toBe("Genesis 50");
  });

  test("converts multi-word filename with underscores", () => {
    expect(humanizeFilename("02_Clemens_Hieronymi_Du_Culte.html")).toBe(
      "Clemens Hieronymi Du Culte"
    );
  });

  test("handles filename without number prefix", () => {
    expect(humanizeFilename("some_file.html")).toBe("some file");
  });
});

// ---------------------------------------------------------------------------
// humanizeSection
// ---------------------------------------------------------------------------

describe("humanizeSection", () => {
  test("converts hyphenated section to title case", () => {
    expect(humanizeSection("preface-reader")).toBe("Preface Reader");
  });

  test("handles single word", () => {
    expect(humanizeSection("introduction")).toBe("Introduction");
  });

  test("handles multi-word with numbers", () => {
    expect(humanizeSection("authority-of-scripture")).toBe(
      "Authority Of Scripture"
    );
  });

  test("strips -s-hash suffix in context of display", () => {
    // humanizeSection itself doesn't strip hashes, but it's often called after stripping
    const anchor = "preface-reader-p3-s-70edd26";
    const stripped = anchor.replace(/-s-[a-f0-9]{7}$/, "");
    expect(humanizeSection(stripped)).toBe("Preface Reader P3");
  });
});

// ---------------------------------------------------------------------------
// parseDates
// ---------------------------------------------------------------------------

describe("parseDates", () => {
  test("parses simple range", () => {
    const result = parseDates("354-430");
    expect(result).not.toBeNull();
    expect(result!.birth).toEqual({ year: 354, bc: false, circa: false });
    expect(result!.death).toEqual({ year: 430, bc: false, circa: false });
  });

  test("parses range with circa", () => {
    const result = parseDates("c. 342-420");
    expect(result).not.toBeNull();
    expect(result!.birth).toEqual({ year: 342, bc: false, circa: true });
    expect(result!.death).toEqual({ year: 420, bc: false, circa: false });
  });

  test("parses range with both circa", () => {
    const result = parseDates("c. 625-c. 686");
    expect(result).not.toBeNull();
    expect(result!.birth!.circa).toBe(true);
    expect(result!.death!.circa).toBe(true);
  });

  test("parses BC range", () => {
    const result = parseDates("384-322 BC");
    expect(result).not.toBeNull();
    expect(result!.birth).toEqual({ year: 384, bc: true, circa: false });
    expect(result!.death).toEqual({ year: 322, bc: true, circa: false });
  });

  test("parses death only", () => {
    const result = parseDates("d. 253");
    expect(result).not.toBeNull();
    expect(result!.birth).toBeUndefined();
    expect(result!.death).toEqual({ year: 253, bc: false, circa: false });
  });

  test("parses death only with circa", () => {
    const result = parseDates("d. c. 674");
    expect(result).not.toBeNull();
    expect(result!.death!.circa).toBe(true);
    expect(result!.death!.year).toBe(674);
  });

  test("returns null for biblical dates", () => {
    expect(parseDates("biblical patriarch")).toBeNull();
  });

  test("returns null for century dates", () => {
    expect(parseDates("6th century")).toBeNull();
  });

  test("returns null for fl. dates", () => {
    expect(parseDates("fl. 400")).toBeNull();
  });

  test("returns null for empty string", () => {
    expect(parseDates("")).toBeNull();
  });

  test("strips parenthetical before parsing", () => {
    const result = parseDates("354-430 (traditional)");
    expect(result).not.toBeNull();
    expect(result!.birth!.year).toBe(354);
    expect(result!.death!.year).toBe(430);
  });

  test("parses en-dash range", () => {
    const result = parseDates("354\u2013430");
    expect(result).not.toBeNull();
    expect(result!.birth!.year).toBe(354);
    expect(result!.death!.year).toBe(430);
  });
});

// ---------------------------------------------------------------------------
// ordinalSuffix
// ---------------------------------------------------------------------------

describe("ordinalSuffix", () => {
  test("1st", () => expect(ordinalSuffix(1)).toBe("1st"));
  test("2nd", () => expect(ordinalSuffix(2)).toBe("2nd"));
  test("3rd", () => expect(ordinalSuffix(3)).toBe("3rd"));
  test("4th", () => expect(ordinalSuffix(4)).toBe("4th"));
  test("11th (special case)", () => expect(ordinalSuffix(11)).toBe("11th"));
  test("12th (special case)", () => expect(ordinalSuffix(12)).toBe("12th"));
  test("13th (special case)", () => expect(ordinalSuffix(13)).toBe("13th"));
  test("21st", () => expect(ordinalSuffix(21)).toBe("21st"));
  test("22nd", () => expect(ordinalSuffix(22)).toBe("22nd"));
  test("23rd", () => expect(ordinalSuffix(23)).toBe("23rd"));
  test("100th", () => expect(ordinalSuffix(100)).toBe("100th"));
  test("111th (special case)", () => expect(ordinalSuffix(111)).toBe("111th"));
});

// ---------------------------------------------------------------------------
// yearSlugFromNumber
// ---------------------------------------------------------------------------

describe("yearSlugFromNumber", () => {
  test("generates AD year slug", () => {
    expect(yearSlugFromNumber(430, false)).toBe(
      "year/ad/5th-century/30s/430"
    );
  });

  test("generates BC year slug", () => {
    expect(yearSlugFromNumber(322, true)).toBe(
      "year/bc/4th-century/20s/322"
    );
  });

  test("handles century boundary (year 100)", () => {
    expect(yearSlugFromNumber(100, false)).toBe(
      "year/ad/1st-century/00s/100"
    );
  });

  test("handles year 1", () => {
    expect(yearSlugFromNumber(1, false)).toBe("year/ad/1st-century/00s/1");
  });

  test("handles year 1500", () => {
    expect(yearSlugFromNumber(1500, false)).toBe(
      "year/ad/15th-century/00s/1500"
    );
  });

  test("handles year 354 (Augustine's birth)", () => {
    expect(yearSlugFromNumber(354, false)).toBe(
      "year/ad/4th-century/50s/354"
    );
  });
});

// ---------------------------------------------------------------------------
// latLonToTile
// ---------------------------------------------------------------------------

describe("latLonToTile", () => {
  test("returns correct tile for Rome (41.9, 12.5) at zoom 4", () => {
    const tile = latLonToTile(41.9, 12.5, 4);
    expect(tile.x).toBe(8);
    expect(tile.y).toBe(5);
    expect(tile.px).toBeGreaterThanOrEqual(0);
    expect(tile.px).toBeLessThan(256);
    expect(tile.py).toBeGreaterThanOrEqual(0);
    expect(tile.py).toBeLessThan(256);
  });

  test("returns correct tile for equator/prime meridian at zoom 0", () => {
    const tile = latLonToTile(0, 0, 0);
    expect(tile.x).toBe(0);
    expect(tile.y).toBe(0);
  });

  test("pixel offsets are within tile bounds", () => {
    const tile = latLonToTile(31.7, 35.2, 4); // Jerusalem
    expect(tile.px).toBeGreaterThanOrEqual(0);
    expect(tile.px).toBeLessThan(256);
    expect(tile.py).toBeGreaterThanOrEqual(0);
    expect(tile.py).toBeLessThan(256);
  });
});

// ---------------------------------------------------------------------------
// labelFor
// ---------------------------------------------------------------------------

describe("labelFor", () => {
  test("returns category label", () => {
    expect(labelFor("person")).toBe("Person");
    expect(labelFor("bibliography")).toBe("Bibliography");
  });

  test("returns subcategory label", () => {
    expect(labelFor("saint")).toBe("Saints");
    expect(labelFor("classical")).toBe("Classical Authors");
    expect(labelFor("scholar")).toBe("Scholars");
  });

  test("falls back to humanized segment for unknown labels", () => {
    expect(labelFor("some-new-category")).toBe("Some New Category");
  });

  test("handles single-word unknown segment", () => {
    expect(labelFor("unknown")).toBe("Unknown");
  });
});

// ---------------------------------------------------------------------------
// BIBLE_BOOK_ORDER
// ---------------------------------------------------------------------------

describe("BIBLE_BOOK_ORDER", () => {
  test("Genesis is first", () => {
    expect(BIBLE_BOOK_ORDER["genesis"]).toBe(1);
  });

  test("Revelation is last", () => {
    expect(BIBLE_BOOK_ORDER["revelation"]).toBe(73);
  });

  test("OT books come before NT books", () => {
    expect(BIBLE_BOOK_ORDER["malachi"]).toBeLessThan(
      BIBLE_BOOK_ORDER["matthew"]
    );
  });

  test("Gospels are in canonical order", () => {
    expect(BIBLE_BOOK_ORDER["matthew"]).toBeLessThan(
      BIBLE_BOOK_ORDER["mark"]
    );
    expect(BIBLE_BOOK_ORDER["mark"]).toBeLessThan(
      BIBLE_BOOK_ORDER["luke"]
    );
    expect(BIBLE_BOOK_ORDER["luke"]).toBeLessThan(
      BIBLE_BOOK_ORDER["john"]
    );
  });

  test("all 73 books of the Vulgate are present", () => {
    expect(Object.keys(BIBLE_BOOK_ORDER).length).toBe(73);
  });
});
