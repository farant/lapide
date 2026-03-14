import { describe, test, expect, afterEach } from "bun:test";
import { join } from "path";
import { unlinkSync, existsSync } from "fs";

const ROOT = join(import.meta.dir, "..");
const SCRIPT = join(ROOT, "number-paragraphs.ts");
const FIXTURE = join(ROOT, "tests/fixtures/source-unnumbered.html");

/**
 * Helper: copy the fixture to a temp file, run number-paragraphs.ts on it,
 * and return the resulting HTML.
 */
async function runNumbering(inputHtml?: string): Promise<string> {
  const tmpFile = join(ROOT, `tmp_test_numbering_${Date.now()}.html`);
  if (inputHtml !== undefined) {
    await Bun.write(tmpFile, inputHtml);
  } else {
    const original = await Bun.file(FIXTURE).text();
    await Bun.write(tmpFile, original);
  }
  tempFiles.push(tmpFile);

  const proc = Bun.spawnSync(["bun", SCRIPT, tmpFile], { cwd: ROOT });
  if (proc.exitCode !== 0) {
    throw new Error(
      `number-paragraphs.ts failed (exit ${proc.exitCode}): ${proc.stderr.toString()}`
    );
  }
  return Bun.file(tmpFile).text();
}

// Track temp files for cleanup
const tempFiles: string[] = [];

afterEach(() => {
  for (const f of tempFiles) {
    if (existsSync(f)) {
      try { unlinkSync(f); } catch {}
    }
  }
  tempFiles.length = 0;
});

describe("number-paragraphs.ts (Stage 0)", () => {
  /*
   * The fixture source-unnumbered.html has this structure:
   *
   *   <h2 id="chapter-one">        ← NOT a <p>, ignored by script
   *   <p>first</p>                 ← no id → preamble
   *   <p>second</p>                ← no id → preamble
   *   <p id="chapter-one-custom">  ← section anchor (non-generated id)
   *   <p>fourth</p>                ← in "chapter-one-custom" section
   *   <h2 id="chapter-two">        ← NOT a <p>, ignored
   *   <p>first of ch2</p>          ← still in "chapter-one-custom" section
   *   <p>second of ch2</p>         ← still in "chapter-one-custom" section
   *   <h3 id="subsection-a">       ← NOT a <p>, ignored
   *   <p>first of sub-a</p>        ← still in "chapter-one-custom" section
   *   <p>second of sub-a</p>       ← still in "chapter-one-custom" section
   *
   * Sections are defined ONLY by <p id="..."> tags, not by <h2>/<h3>.
   * So we get:
   *   preamble: 2 paragraphs (p1, p2)
   *   chapter-one-custom: 6 paragraphs (p1 = anchor, p2..p6)
   */

  test("IDs are added to paragraphs without IDs", async () => {
    const html = await runNumbering();
    // Preamble paragraphs should get preamble-pN ids
    expect(html).toContain('id="preamble-p1"');
    expect(html).toContain('id="preamble-p2"');
    // Paragraphs after the section anchor should get chapter-one-custom-pN ids
    expect(html).toContain('id="chapter-one-custom-p2"');
    expect(html).toContain('id="chapter-one-custom-p3"');
  });

  test("existing IDs are preserved", async () => {
    const html = await runNumbering();
    // The paragraph with id="chapter-one-custom" should keep its original ID
    expect(html).toContain('id="chapter-one-custom"');
    // It should NOT be renamed to something like "preamble-p3"
    expect(html).not.toContain('id="preamble-p3"');
  });

  test("data-paragraph-number is added to each <p>", async () => {
    const html = await runNumbering();
    // Every <p> tag in the output should have data-paragraph-number
    const pTags = html.match(/<p[\s>][^]*?<\/p>/gi) || [];
    expect(pTags.length).toBeGreaterThan(0);
    for (const p of pTags) {
      expect(p).toContain("data-paragraph-number=");
    }
  });

  test("numbering is sequential within each section", async () => {
    const html = await runNumbering();
    // Preamble: p1, p2
    expect(html).toContain('id="preamble-p1" data-paragraph-number="1"');
    expect(html).toContain('id="preamble-p2" data-paragraph-number="2"');
    // chapter-one-custom section: anchor is p1
    expect(html).toContain('id="chapter-one-custom" data-paragraph-number="1"');
  });

  test("section anchor <p> gets data-paragraph-number='1'", async () => {
    const html = await runNumbering();
    // The <p id="chapter-one-custom"> is the section anchor → numbered 1
    const match = html.match(/<p[^>]*id="chapter-one-custom"[^>]*>/);
    expect(match).not.toBeNull();
    expect(match![0]).toContain('data-paragraph-number="1"');
  });

  test("idempotent — running twice produces the same output", async () => {
    // Run once
    const tmpFile = join(ROOT, `tmp_test_idempotent_${Date.now()}.html`);
    const original = await Bun.file(FIXTURE).text();
    await Bun.write(tmpFile, original);
    tempFiles.push(tmpFile);

    Bun.spawnSync(["bun", SCRIPT, tmpFile], { cwd: ROOT });
    const firstRun = await Bun.file(tmpFile).text();

    // Run again on the already-numbered output
    Bun.spawnSync(["bun", SCRIPT, tmpFile], { cwd: ROOT });
    const secondRun = await Bun.file(tmpFile).text();

    expect(secondRun).toBe(firstRun);
  });

  test("original content is preserved", async () => {
    const html = await runNumbering();
    // Check that text content inside paragraphs is unchanged
    expect(html).toContain("This is the first paragraph with no ID.");
    expect(html).toContain("This paragraph already has a custom ID.");
    expect(html).toContain("First paragraph of chapter two.");
    expect(html).toContain("Second paragraph of subsection A.");
  });

  test("h2 and h3 tags are not modified", async () => {
    const html = await runNumbering();
    // Heading tags should remain untouched
    expect(html).toContain('<h2 id="chapter-one">Chapter One</h2>');
    expect(html).toContain('<h2 id="chapter-two">Chapter Two</h2>');
    expect(html).toContain('<h3 id="subsection-a">Subsection A</h3>');
  });

  test("multiple section anchors create separate sections", async () => {
    const input = `<!DOCTYPE html>
<html lang="en">
<head><title>Test</title></head>
<body>
<p id="alpha">Alpha section anchor.</p>
<p>Alpha paragraph two.</p>
<p id="beta">Beta section anchor.</p>
<p>Beta paragraph two.</p>
</body>
</html>`;

    const html = await runNumbering(input);
    // alpha section: anchor (p1) + one paragraph (p2)
    expect(html).toContain('id="alpha" data-paragraph-number="1"');
    expect(html).toContain('id="alpha-p2" data-paragraph-number="2"');
    // beta section: anchor (p1) + one paragraph (p2)
    expect(html).toContain('id="beta" data-paragraph-number="1"');
    expect(html).toContain('id="beta-p2" data-paragraph-number="2"');
  });

  // --- Gap 5: Empty paragraphs ---

  test("empty <p></p> gets an ID and data-paragraph-number without crashing", async () => {
    const input = `<!DOCTYPE html>
<html lang="en">
<head><title>Test</title></head>
<body>
<p id="sec">Section anchor.</p>
<p></p>
<p>Normal text.</p>
</body>
</html>`;

    const html = await runNumbering(input);
    // The empty paragraph should get id="sec-p2" and data-paragraph-number="2"
    expect(html).toContain('id="sec-p2" data-paragraph-number="2"');
    // The next paragraph should be p3
    expect(html).toContain('id="sec-p3" data-paragraph-number="3"');
    // The empty paragraph should still be present
    expect(html).toMatch(/<p[^>]*><\/p>/);
  });

  test("whitespace-only <p>   </p> gets an ID and data-paragraph-number", async () => {
    const input = `<!DOCTYPE html>
<html lang="en">
<head><title>Test</title></head>
<body>
<p id="sec">Section anchor.</p>
<p>   </p>
<p>After whitespace.</p>
</body>
</html>`;

    const html = await runNumbering(input);
    // The whitespace-only paragraph should get numbered
    expect(html).toContain('id="sec-p2" data-paragraph-number="2"');
    expect(html).toContain('id="sec-p3" data-paragraph-number="3"');
  });

  test("<p><br/></p> (paragraph with only a self-closing tag) gets numbered", async () => {
    const input = `<!DOCTYPE html>
<html lang="en">
<head><title>Test</title></head>
<body>
<p id="sec">Section anchor.</p>
<p><br/></p>
<p>After br.</p>
</body>
</html>`;

    const html = await runNumbering(input);
    // The br-only paragraph should get numbered
    expect(html).toContain('id="sec-p2" data-paragraph-number="2"');
    expect(html).toContain('id="sec-p3" data-paragraph-number="3"');
  });
});
