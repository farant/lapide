/**
 * pipeline-integration.test.ts — End-to-end integration test for the Lapide index pipeline
 *
 * Exercises the actual CLI tools (number-paragraphs.ts, validate-refs.ts,
 * annotate-source.ts, tag-entity-refs.ts, lint-annotations.ts) against
 * realistic fixture files in a temporary directory.
 *
 * Each test runs the real tool via Bun.spawnSync with cwd set to the tmp dir,
 * so the tools resolve relative paths (index/refs/) correctly.
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import {
  mkdtempSync,
  cpSync,
  rmSync,
  readFileSync,
  mkdirSync,
  existsSync,
  writeFileSync,
  unlinkSync,
} from "fs";
import path from "path";
import os from "os";

const PROJECT_ROOT = path.join(import.meta.dir, "..");
const FIXTURES_DIR = path.join(import.meta.dir, "fixtures", "pipeline");

// Absolute paths to the pipeline scripts at the project root
const SCRIPTS = {
  numberParagraphs: path.join(PROJECT_ROOT, "number-paragraphs.ts"),
  validateRefs: path.join(PROJECT_ROOT, "validate-refs.ts"),
  validateExtractions: path.join(PROJECT_ROOT, "validate-extractions.ts"),
  annotateSource: path.join(PROJECT_ROOT, "annotate-source.ts"),
  tagEntityRefs: path.join(PROJECT_ROOT, "tag-entity-refs.ts"),
  lintAnnotations: path.join(PROJECT_ROOT, "lint-annotations.ts"),
};

let tmpDir: string;

beforeAll(() => {
  // Create a unique tmp directory
  tmpDir = mkdtempSync(path.join(os.tmpdir(), "lapide-pipeline-test-"));

  // Copy fixture files into the tmp dir with the correct structure
  // source-raw.html and source.html go at the root
  cpSync(
    path.join(FIXTURES_DIR, "source-raw.html"),
    path.join(tmpDir, "source-raw.html")
  );
  cpSync(
    path.join(FIXTURES_DIR, "source.html"),
    path.join(tmpDir, "source.html")
  );

  // Copy extraction.md
  cpSync(
    path.join(FIXTURES_DIR, "extraction.md"),
    path.join(tmpDir, "extraction.md")
  );

  // Copy refs into index/refs/ (the tools expect REFS_DIR = "index/refs")
  cpSync(path.join(FIXTURES_DIR, "refs"), path.join(tmpDir, "index", "refs"), {
    recursive: true,
  });
});

afterAll(() => {
  if (tmpDir && existsSync(tmpDir)) {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Helper: run a script and return result
// ---------------------------------------------------------------------------

function runScript(
  scriptPath: string,
  args: string[] = [],
  cwd?: string
): { exitCode: number; stdout: string; stderr: string } {
  const result = Bun.spawnSync(["bun", scriptPath, ...args], {
    cwd: cwd || tmpDir,
    env: { ...process.env, NO_COLOR: "1" },
  });
  return {
    exitCode: result.exitCode,
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString(),
  };
}

// ---------------------------------------------------------------------------
// Stage 0: Paragraph numbering
// ---------------------------------------------------------------------------

describe("Stage 0 — number-paragraphs.ts", () => {
  test(
    "adds paragraph IDs and data-paragraph-number to unnumbered HTML",
    () => {
      // Copy source-raw.html to a working copy
      const workingFile = path.join(tmpDir, "source-numbering-test.html");
      cpSync(path.join(tmpDir, "source-raw.html"), workingFile);

      const result = runScript(SCRIPTS.numberParagraphs, [
        "source-numbering-test.html",
      ]);
      expect(result.exitCode).toBe(0);

      const output = readFileSync(workingFile, "utf-8");

      // The first <p id="introduction"> is a section anchor — should keep its id
      // and get data-paragraph-number="1"
      expect(output).toContain('id="introduction"');
      expect(output).toMatch(
        /id="introduction"\s+data-paragraph-number="1"/
      );

      // The next two paragraphs should get generated IDs
      expect(output).toContain('id="introduction-p2"');
      expect(output).toContain('id="introduction-p3"');

      // Second section anchor
      expect(output).toContain('id="authority-of-scripture"');
      expect(output).toMatch(
        /id="authority-of-scripture"\s+data-paragraph-number="1"/
      );

      // Paragraphs in second section
      expect(output).toContain('id="authority-of-scripture-p2"');
      expect(output).toContain('id="authority-of-scripture-p3"');
      expect(output).toContain('id="authority-of-scripture-p4"');

      // Third section anchor (edge cases)
      expect(output).toContain('id="edge-cases"');
      expect(output).toMatch(
        /id="edge-cases"\s+data-paragraph-number="1"/
      );

      // Edge case paragraphs
      expect(output).toContain('id="edge-cases-p2"');
      expect(output).toContain('id="edge-cases-p3"');
      expect(output).toContain('id="edge-cases-p4"');
      expect(output).toContain('id="edge-cases-p5"');
      expect(output).toContain('id="edge-cases-p6"');

      // Every <p> should have data-paragraph-number (7 original + 6 edge cases = 13)
      const pTags = output.match(/<p\s[^>]*>/gi) || [];
      expect(pTags.length).toBe(13);
      for (const p of pTags) {
        expect(p).toContain("data-paragraph-number=");
      }
    },
    { timeout: 30_000 }
  );

  test(
    "is idempotent — running twice produces the same output",
    () => {
      const workingFile = path.join(tmpDir, "source-idempotent-test.html");
      cpSync(path.join(tmpDir, "source-raw.html"), workingFile);

      runScript(SCRIPTS.numberParagraphs, ["source-idempotent-test.html"]);
      const firstRun = readFileSync(workingFile, "utf-8");

      runScript(SCRIPTS.numberParagraphs, ["source-idempotent-test.html"]);
      const secondRun = readFileSync(workingFile, "utf-8");

      expect(secondRun).toBe(firstRun);
    },
    { timeout: 30_000 }
  );

  test(
    "numbered output matches the manually prepared source.html structure",
    () => {
      const workingFile = path.join(tmpDir, "source-compare-test.html");
      cpSync(path.join(tmpDir, "source-raw.html"), workingFile);

      runScript(SCRIPTS.numberParagraphs, ["source-compare-test.html"]);
      const numbered = readFileSync(workingFile, "utf-8");

      // The manually prepared source.html should have the same IDs
      const manual = readFileSync(path.join(tmpDir, "source.html"), "utf-8");

      // Extract all id="..." values from both
      const extractIds = (html: string) => {
        const ids: string[] = [];
        const re = /<p\s[^>]*\bid="([^"]+)"/gi;
        let m;
        while ((m = re.exec(html)) !== null) ids.push(m[1]);
        return ids;
      };

      expect(extractIds(numbered)).toEqual(extractIds(manual));
    },
    { timeout: 30_000 }
  );
});

// ---------------------------------------------------------------------------
// Stage 2: Validate refs
// ---------------------------------------------------------------------------

describe("Stage 2 — validate-refs.ts", () => {
  test(
    "all ref files pass validation (exit code 0)",
    () => {
      const result = runScript(SCRIPTS.validateRefs);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("All checks passed");
    },
    { timeout: 30_000 }
  );

  test(
    "reports correct number of ref files",
    () => {
      const result = runScript(SCRIPTS.validateRefs);

      // 9 ref files: augustine, jerome, aristotle, de-doctrina-christiana, inspiration,
      // gregory-the-great, basil-the-great, gregory-nazianzus, rufinus
      expect(result.stdout).toContain("Validated 9 ref files");
    },
    { timeout: 30_000 }
  );

  test(
    "all text quotes are verified",
    () => {
      const result = runScript(SCRIPTS.validateRefs);

      // Check that text quote matching reports success
      expect(result.stdout).toMatch(/Text quotes checked: \d+\/\d+ matched/);
      // The numerator and denominator should be equal (all matched)
      const match = result.stdout.match(
        /Text quotes checked: (\d+)\/(\d+) matched/
      );
      expect(match).not.toBeNull();
      expect(match![1]).toBe(match![2]);
    },
    { timeout: 30_000 }
  );
});

// ---------------------------------------------------------------------------
// Stage 2b: Negative validation — bad-reference.md
// ---------------------------------------------------------------------------

describe("Stage 2b — validate-refs.ts (negative testing)", () => {
  test(
    "rejects a ref file with wrong text and nonexistent paragraph IDs",
    () => {
      // Copy bad-reference.md into the ref directory
      const badRefDir = path.join(tmpDir, "index/refs/person/other");
      mkdirSync(badRefDir, { recursive: true });
      cpSync(
        path.join(FIXTURES_DIR, "bad-reference.md"),
        path.join(badRefDir, "bad-reference.md")
      );

      const result = runScript(SCRIPTS.validateRefs);

      // Should fail (exit code 1)
      expect(result.exitCode).toBe(1);

      // Should report the wrong text error
      expect(result.stdout).toContain("Quoted text not found");

      // Should report the nonexistent paragraph ID
      expect(result.stdout).toContain("nonexistent-paragraph-id");

      // Clean up — remove bad-reference.md so subsequent tests pass
      unlinkSync(path.join(badRefDir, "bad-reference.md"));

      // Verify validation passes again after removal
      const cleanResult = runScript(SCRIPTS.validateRefs);
      expect(cleanResult.exitCode).toBe(0);
      expect(cleanResult.stdout).toContain("All checks passed");
    },
    { timeout: 30_000 }
  );
});

// ---------------------------------------------------------------------------
// Stage 2c: validate-refs.ts — additional negative tests
// ---------------------------------------------------------------------------

describe("Stage 2c — validate-refs.ts (additional negative tests)", () => {
  test(
    "rejects a ref file with wrong quoted text pointing to a real paragraph",
    () => {
      const badRefDir = path.join(tmpDir, "index/refs/person/other");
      mkdirSync(badRefDir, { recursive: true });
      const badRefPath = path.join(badRefDir, "wrong-text-test.md");
      writeFileSync(
        badRefPath,
        `---
name: Wrong Text Entity
slug: person/other/wrong-text-test
category: person
subcategory: other
dates: "unknown"
role: Test entity with wrong quoted text
related:
  people: []
  works: []
  subjects: []
---

Test entity for wrong-text negative test.

## References in Commentary

- \`source.html#introduction\` — Wrong text that does not match
  text: "This text is completely wrong and does not appear anywhere in the introduction paragraph."
`
      );

      const result = runScript(SCRIPTS.validateRefs);

      expect(result.exitCode).toBe(1);
      expect(result.stdout).toContain("Quoted text not found");
      expect(result.stdout).toContain("introduction");

      // Clean up
      unlinkSync(badRefPath);

      const cleanResult = runScript(SCRIPTS.validateRefs);
      expect(cleanResult.exitCode).toBe(0);
    },
    { timeout: 30_000 }
  );

  test(
    "rejects a ref file pointing to a nonexistent paragraph ID",
    () => {
      const badRefDir = path.join(tmpDir, "index/refs/person/other");
      mkdirSync(badRefDir, { recursive: true });
      const badRefPath = path.join(badRefDir, "missing-para-test.md");
      writeFileSync(
        badRefPath,
        `---
name: Missing Para Entity
slug: person/other/missing-para-test
category: person
subcategory: other
dates: "unknown"
role: Test entity with missing paragraph
related:
  people: []
  works: []
  subjects: []
---

Test entity for missing paragraph negative test.

## References in Commentary

- \`source.html#does-not-exist\` — Paragraph ID that does not exist
  text: "Some text."
`
      );

      const result = runScript(SCRIPTS.validateRefs);

      expect(result.exitCode).toBe(1);
      expect(result.stdout).toContain("does-not-exist");
      expect(result.stdout).toContain("not found in");

      // Clean up
      unlinkSync(badRefPath);

      const cleanResult = runScript(SCRIPTS.validateRefs);
      expect(cleanResult.exitCode).toBe(0);
    },
    { timeout: 30_000 }
  );

  test(
    "warns when slug does not match file path",
    () => {
      const badRefDir = path.join(tmpDir, "index/refs/person/other");
      mkdirSync(badRefDir, { recursive: true });
      const badRefPath = path.join(badRefDir, "slug-mismatch-test.md");
      writeFileSync(
        badRefPath,
        `---
name: Slug Mismatch Entity
slug: person/classical/slug-mismatch-test
category: person
subcategory: other
dates: "unknown"
role: Test entity with mismatched slug
related:
  people: []
  works: []
  subjects: []
---

Test entity where slug path doesn't match file path.
`
      );

      const result = runScript(SCRIPTS.validateRefs);

      // Slug mismatch is a warning, not an error — exit code should still be 0
      // (unless other errors exist) but the warning should appear
      expect(result.stdout).toContain("doesn't match file path");
      expect(result.stdout).toContain("slug-mismatch-test");

      // Clean up
      unlinkSync(badRefPath);
    },
    { timeout: 30_000 }
  );

});

// ---------------------------------------------------------------------------
// Stage 2d: validate-extractions.ts — negative tests
// ---------------------------------------------------------------------------

describe("Stage 2d — validate-extractions.ts (negative tests)", () => {
  test(
    "rejects an extraction file with a nonexistent paragraph ID",
    () => {
      const badExtractionPath = path.join(tmpDir, "bad-extraction-para.md");
      writeFileSync(
        badExtractionPath,
        `# Bad Extraction — Nonexistent Paragraph

## Saints

### Test Entity
- **Occurrences**:
  - \`#nonexistent-p99\` — Does not exist
    text: "Some text."
`
      );

      const result = runScript(SCRIPTS.validateExtractions, [
        "source.html",
        "bad-extraction-para.md",
      ]);

      expect(result.exitCode).toBe(1);
      expect(result.stdout).toContain("nonexistent-p99");
      expect(result.stdout).toContain("not found");

      // Clean up
      unlinkSync(badExtractionPath);
    },
    { timeout: 30_000 }
  );

  test(
    "rejects an extraction file with misquoted text",
    () => {
      const badExtractionPath = path.join(tmpDir, "bad-extraction-text.md");
      writeFileSync(
        badExtractionPath,
        `# Bad Extraction — Wrong Text

## Saints

### Test Entity
- **Occurrences**:
  - \`#introduction\` — Wrong text
    text: "This text absolutely does not appear anywhere in the introduction paragraph of the source document."
`
      );

      const result = runScript(SCRIPTS.validateExtractions, [
        "source.html",
        "bad-extraction-text.md",
      ]);

      expect(result.exitCode).toBe(1);
      expect(result.stdout).toContain("text not found");

      // Clean up
      unlinkSync(badExtractionPath);
    },
    { timeout: 30_000 }
  );

  test(
    "passes with a correct extraction file",
    () => {
      const goodExtractionPath = path.join(tmpDir, "good-extraction.md");
      writeFileSync(
        goodExtractionPath,
        `# Good Extraction

## Saints

### St. Augustine
- **Occurrences**:
  - \`#introduction\` — Teaches about Sacred Scripture
    text: "St. Augustine teaches in On Christian Doctrine that the study of Sacred Scripture is the highest pursuit of the Christian mind."
`
      );

      const result = runScript(SCRIPTS.validateExtractions, [
        "source.html",
        "good-extraction.md",
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("All quotes verified");

      // Clean up
      unlinkSync(goodExtractionPath);
    },
    { timeout: 30_000 }
  );

  test(
    "passes with backslash-escaped quotes in text: fields",
    () => {
      // The source has: "If," he says, "you perceive that a difficult..."
      // Agents may write this with \" escapes in the text: field
      const escapedExtractionPath = path.join(tmpDir, "escaped-extraction.md");
      writeFileSync(
        escapedExtractionPath,
        `# Escaped Quotes Extraction

## Other

### Anonymous Speaker
- **Occurrences**:
  - \`#edge-cases\` — Speaks about difficult judgments
    text: "\\"If,\\" he says, \\"you perceive that a difficult and ambiguous judgment has arisen among you, you shall do whatever those who preside shall say.\\""
`
      );

      const result = runScript(SCRIPTS.validateExtractions, [
        "source.html",
        "escaped-extraction.md",
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Matched: 1/1");

      // Clean up
      unlinkSync(escapedExtractionPath);
    },
    { timeout: 30_000 }
  );
});

// ---------------------------------------------------------------------------
// Stage 2e: annotate-source.ts — MISS reporting negative tests
// ---------------------------------------------------------------------------

describe("Stage 2e — annotate-source.ts (MISS reporting)", () => {
  test(
    "reports MISS when ref file text cannot be found in paragraph",
    () => {
      // Inject a bad ref file with unfindable text
      const badRefDir = path.join(tmpDir, "index/refs/person/other");
      mkdirSync(badRefDir, { recursive: true });
      const badRefPath = path.join(badRefDir, "miss-test.md");
      writeFileSync(
        badRefPath,
        `---
name: Miss Test Entity
slug: person/other/miss-test
category: person
subcategory: other
related:
  people: []
  works: []
  subjects: []
---

Test entity for MISS reporting.

## References in Commentary

- \`source.html#introduction\` — Text that cannot be found
  text: "Absolutely nowhere to be found in any paragraph of the source HTML document whatsoever."
`
      );

      // Save a backup of source.html before annotating (the tool writes to it)
      const sourceBackup = readFileSync(
        path.join(tmpDir, "source.html"),
        "utf-8"
      );

      const result = runScript(SCRIPTS.annotateSource, ["source.html"]);

      // Should still succeed (MISSes are not fatal) but should report the miss
      expect(result.stderr).toContain("MISS");
      expect(result.stdout).toContain("1 missed");

      // Restore source.html and clean up
      writeFileSync(path.join(tmpDir, "source.html"), sourceBackup);
      unlinkSync(badRefPath);
    },
    { timeout: 30_000 }
  );

  test(
    "reports multiple MISSes when multiple quotes cannot be found",
    () => {
      const badRefDir = path.join(tmpDir, "index/refs/person/other");
      mkdirSync(badRefDir, { recursive: true });
      const badRefPath = path.join(badRefDir, "multi-miss-test.md");
      writeFileSync(
        badRefPath,
        `---
name: Multi Miss Entity
slug: person/other/multi-miss-test
category: person
subcategory: other
related:
  people: []
  works: []
  subjects: []
---

Test entity for multiple MISS reporting.

## References in Commentary

- \`source.html#introduction\` — First unfindable text
  text: "First completely invented sentence that exists nowhere in the HTML."
- \`source.html#introduction-p2\` — Second unfindable text
  text: "Second completely invented sentence that also exists nowhere."
`
      );

      const sourceBackup = readFileSync(
        path.join(tmpDir, "source.html"),
        "utf-8"
      );

      const result = runScript(SCRIPTS.annotateSource, ["source.html"]);

      expect(result.stderr).toContain("MISS");
      expect(result.stdout).toContain("2 missed");

      // Restore and clean up
      writeFileSync(path.join(tmpDir, "source.html"), sourceBackup);
      unlinkSync(badRefPath);
    },
    { timeout: 30_000 }
  );
});

describe("Stage 2f — annotate-source.ts (prefix fallback)", () => {
  test(
    "does not silently accept prefix-only matches with padded end offsets",
    () => {
      // Create a ref file with text that starts correctly but ends differently
      // from what's in the paragraph. The annotator should report a MISS,
      // NOT silently use a prefix match with +30 char padding.
      const badRefDir = path.join(tmpDir, "index/refs/person/other");
      mkdirSync(badRefDir, { recursive: true });
      const badRefPath = path.join(badRefDir, "prefix-test.md");
      writeFileSync(
        badRefPath,
        `---
name: Prefix Test Entity
slug: person/other/prefix-test
category: person
subcategory: other
related:
  people: []
  works: []
  subjects: []
---

Test entity for prefix fallback.

## References in Commentary

- \`source.html#introduction\` — Text starts right but ends wrong
  text: "St. Augustine teaches in On Christian Doctrine COMPLETELY WRONG ENDING that diverges from the actual paragraph text."
`
      );

      const sourceBackup = readFileSync(
        path.join(tmpDir, "source.html"),
        "utf-8"
      );

      const result = runScript(SCRIPTS.annotateSource, ["source.html"]);

      // The annotator should report a MISS for this text, not silently match
      expect(result.stderr).toContain("MISS");
      expect(result.stdout).toContain("1 missed");

      // Restore and clean up
      writeFileSync(path.join(tmpDir, "source.html"), sourceBackup);
      unlinkSync(badRefPath);
    },
    { timeout: 30_000 }
  );

  test(
    "annotator uses parseTextLine to handle backslash-escaped quotes",
    () => {
      // Create ref file with \" escaped quotes
      const refDir = path.join(tmpDir, "index/refs/person/other");
      mkdirSync(refDir, { recursive: true });
      const refPath = path.join(refDir, "escape-ann-test.md");
      writeFileSync(
        refPath,
        `---
name: Escape Annotate Test
slug: person/other/escape-ann-test
category: person
subcategory: other
related:
  people: []
---

Test entity.

## References in Commentary

- \`source.html#edge-cases\` — Quoted text with escaped inner quotes
  text: "\\"If,\\" he says, \\"you perceive that a difficult and ambiguous judgment has arisen among you, you shall do whatever those who preside shall say.\\""
`
      );

      const sourceBackup = readFileSync(
        path.join(tmpDir, "source.html"),
        "utf-8"
      );

      const result = runScript(SCRIPTS.annotateSource, ["source.html"]);

      // Should successfully match (0 missed), not MISS due to backslash escapes
      expect(result.stdout).toContain("0 missed");

      // Restore and clean up
      writeFileSync(path.join(tmpDir, "source.html"), sourceBackup);
      unlinkSync(refPath);
    },
    { timeout: 30_000 }
  );
});

// ---------------------------------------------------------------------------
// Stage 3: Annotate source
// ---------------------------------------------------------------------------

describe("Stage 3 — annotate-source.ts", () => {
  test(
    "embeds sidecar annotations into source HTML",
    () => {
      const result = runScript(SCRIPTS.annotateSource, ["source.html"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("text references to source.html");
      expect(result.stdout).toContain("Generated");
      expect(result.stdout).toContain("Embedded");

      // Read the annotated HTML
      const html = readFileSync(path.join(tmpDir, "source.html"), "utf-8");

      // Verify sidecar JSON block is present
      expect(html).toContain(
        '<script type="application/json" id="passage-annotations">'
      );

      // Parse and verify the annotations
      const sidecarMatch = html.match(
        /<script type="application\/json" id="passage-annotations">([\s\S]*?)<\/script>/
      );
      expect(sidecarMatch).not.toBeNull();

      const annotations = JSON.parse(sidecarMatch![1]);
      expect(Array.isArray(annotations)).toBe(true);
      expect(annotations.length).toBeGreaterThan(0);

      // Each annotation should have required fields
      for (const a of annotations) {
        expect(a).toHaveProperty("id");
        expect(a).toHaveProperty("paragraph");
        expect(a).toHaveProperty("start");
        expect(a).toHaveProperty("end");
        expect(a).toHaveProperty("entities");
        expect(typeof a.start).toBe("number");
        expect(typeof a.end).toBe("number");
        expect(a.start).toBeLessThan(a.end);
        expect(Array.isArray(a.entities)).toBe(true);
        expect(a.entities.length).toBeGreaterThan(0);
      }

      // Verify specific paragraphs have annotations
      const annotatedParagraphs = new Set(annotations.map((a: any) => a.paragraph));
      expect(annotatedParagraphs.has("introduction")).toBe(true);
      expect(annotatedParagraphs.has("introduction-p2")).toBe(true);
    },
    { timeout: 30_000 }
  );

  test(
    "interrupted quote in edge-cases is annotated with correct offsets",
    () => {
      const html = readFileSync(path.join(tmpDir, "source.html"), "utf-8");
      const sidecarMatch = html.match(
        /<script type="application\/json" id="passage-annotations">([\s\S]*?)<\/script>/
      );
      expect(sidecarMatch).not.toBeNull();

      const annotations = JSON.parse(sidecarMatch![1]);

      // The edge-cases paragraph (interrupted quote) should have an annotation
      const edgeCasesAnnotations = annotations.filter(
        (a: any) => a.paragraph === "edge-cases"
      );
      expect(edgeCasesAnnotations.length).toBeGreaterThan(0);

      // The annotation should cover the interrupted quote text
      // Gregory the Great ref has text spanning "If," he says, "you perceive..."
      const gregoryAnnotation = edgeCasesAnnotations.find((a: any) =>
        a.entities.includes("person/saint/gregory-the-great")
      );
      expect(gregoryAnnotation).toBeDefined();
      expect(gregoryAnnotation.start).toBeGreaterThanOrEqual(0);
      expect(gregoryAnnotation.end).toBeGreaterThan(gregoryAnnotation.start);
    },
    { timeout: 30_000 }
  );

  test(
    "cross-em-tag text in edge-cases-p2 is annotated",
    () => {
      const html = readFileSync(path.join(tmpDir, "source.html"), "utf-8");
      const sidecarMatch = html.match(
        /<script type="application\/json" id="passage-annotations">([\s\S]*?)<\/script>/
      );
      const annotations = JSON.parse(sidecarMatch![1]);

      // edge-cases-p2 has "divine Scripture is" which spans across plain text
      // into an <em> tag — after stripHtml, it's all plain text
      const p2Annotations = annotations.filter(
        (a: any) => a.paragraph === "edge-cases-p2"
      );
      expect(p2Annotations.length).toBeGreaterThan(0);

      // Should be annotated by Gregory the Great
      const gregAnnotation = p2Annotations.find((a: any) =>
        a.entities.includes("person/saint/gregory-the-great")
      );
      expect(gregAnnotation).toBeDefined();
    },
    { timeout: 30_000 }
  );

  test(
    "ligature text in edge-cases-p3 is annotated",
    () => {
      const html = readFileSync(path.join(tmpDir, "source.html"), "utf-8");
      const sidecarMatch = html.match(
        /<script type="application\/json" id="passage-annotations">([\s\S]*?)<\/script>/
      );
      const annotations = JSON.parse(sidecarMatch![1]);

      // edge-cases-p3 has cœlestial (from &oelig;) which normalizeForMatch converts to "coelestial"
      const p3Annotations = annotations.filter(
        (a: any) => a.paragraph === "edge-cases-p3"
      );
      expect(p3Annotations.length).toBeGreaterThan(0);

      // Should be annotated by the inspiration subject
      const inspirationAnnotation = p3Annotations.find((a: any) =>
        a.entities.includes("subject/theology/scripture/inspiration")
      );
      expect(inspirationAnnotation).toBeDefined();
    },
    { timeout: 30_000 }
  );

  test(
    "em-dash-no-spaces in edge-cases-p6 is handled (paragraph is parseable)",
    () => {
      const html = readFileSync(path.join(tmpDir, "source.html"), "utf-8");

      // Verify the paragraph with em-dash-no-spaces is in the HTML
      expect(html).toContain('id="edge-cases-p6"');

      // The paragraph content should be intact after pipeline processing
      expect(html).toContain("The Apostle speaks plainly");
      expect(html).toContain("All Scripture is divinely inspired");
    },
    { timeout: 30_000 }
  );

  test(
    "updates ref file links with -s-XXXXXXX hash suffixes",
    () => {
      // Read the ref files after annotation
      const augustineRef = readFileSync(
        path.join(tmpDir, "index/refs/person/saint/augustine.md"),
        "utf-8"
      );
      const jeromeRef = readFileSync(
        path.join(tmpDir, "index/refs/person/saint/jerome.md"),
        "utf-8"
      );

      // Links should now have -s-XXXXXXX suffixes (7 hex chars)
      expect(augustineRef).toMatch(/source\.html#introduction-s-[a-f0-9]{7}/);
      expect(augustineRef).toMatch(
        /source\.html#authority-of-scripture-p2-s-[a-f0-9]{7}/
      );
      expect(jeromeRef).toMatch(
        /source\.html#introduction-p2-s-[a-f0-9]{7}/
      );
      expect(jeromeRef).toMatch(
        /source\.html#authority-of-scripture-p3-s-[a-f0-9]{7}/
      );

      // Edge case ref files should also be updated
      const gregoryRef = readFileSync(
        path.join(tmpDir, "index/refs/person/saint/gregory-the-great.md"),
        "utf-8"
      );
      expect(gregoryRef).toMatch(/source\.html#edge-cases-s-[a-f0-9]{7}/);
      expect(gregoryRef).toMatch(/source\.html#edge-cases-p2-s-[a-f0-9]{7}/);

      const basilRef = readFileSync(
        path.join(tmpDir, "index/refs/person/saint/basil-the-great.md"),
        "utf-8"
      );
      expect(basilRef).toMatch(/source\.html#edge-cases-p5-s-[a-f0-9]{7}/);
    },
    { timeout: 30_000 }
  );

  test(
    "--check mode reports everything in sync after annotation",
    () => {
      const result = runScript(SCRIPTS.annotateSource, [
        "--check",
        "source.html",
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Everything in sync");
    },
    { timeout: 30_000 }
  );

  test(
    "annotation is idempotent — running again produces same annotations",
    () => {
      const before = readFileSync(path.join(tmpDir, "source.html"), "utf-8");
      const beforeMatch = before.match(
        /<script type="application\/json" id="passage-annotations">([\s\S]*?)<\/script>/
      );
      expect(beforeMatch).not.toBeNull();
      const beforeAnnotations = JSON.parse(beforeMatch![1]);

      runScript(SCRIPTS.annotateSource, ["source.html"]);

      const after = readFileSync(path.join(tmpDir, "source.html"), "utf-8");
      const afterMatch = after.match(
        /<script type="application\/json" id="passage-annotations">([\s\S]*?)<\/script>/
      );
      expect(afterMatch).not.toBeNull();
      const afterAnnotations = JSON.parse(afterMatch![1]);

      // Same number and content of annotations
      expect(afterAnnotations).toEqual(beforeAnnotations);
    },
    { timeout: 30_000 }
  );
});

// ---------------------------------------------------------------------------
// Stage 3b: Multi-document annotation — refs to multiple source files
// ---------------------------------------------------------------------------

describe("Stage 3b — multi-document annotation correctness", () => {
  test(
    "annotator only picks up refs for the file being annotated, not other source files",
    () => {
      // Copy source-b.html into the tmp dir
      cpSync(
        path.join(FIXTURES_DIR, "source-b.html"),
        path.join(tmpDir, "source-b.html")
      );

      // Create a ref file that references BOTH source.html and source-b.html
      const multiRefDir = path.join(tmpDir, "index/refs/person/saint");
      const multiRefPath = path.join(multiRefDir, "multi-doc-test.md");
      writeFileSync(
        multiRefPath,
        `---
name: Multi-Doc Test Entity
slug: person/saint/multi-doc-test
category: person
subcategory: saint
dates: "100-200"
role: Test entity referencing multiple documents
---

Test entity for multi-document annotation testing.

## References in Commentary

- \`source.html#introduction\` — First mention in source A
  text: "St. Augustine teaches in On Christian Doctrine"
- \`source-b.html#chapter-one\` — Mention in source B
  text: "also mentions St. Augustine and his great works"
- \`source.html#authority-of-scripture-p2\` — Second mention in source A
  text: "St. Augustine confirms this"
- \`source-b.html#chapter-one-p2\` — Second mention in source B
  text: "St. Jerome translated the Bible into Latin"
`
      );

      // Annotate source.html — should only pick up the 2 source.html refs
      const resultA = runScript(SCRIPTS.annotateSource, ["source.html"]);
      expect(resultA.exitCode).toBe(0);

      // Check: should find refs for source.html only
      const htmlA = readFileSync(path.join(tmpDir, "source.html"), "utf-8");
      const sidecarA = htmlA.match(
        /<script type="application\/json" id="passage-annotations">([\s\S]*?)<\/script>/
      );
      expect(sidecarA).not.toBeNull();
      const annotationsA = JSON.parse(sidecarA![1]);

      // Should have annotations for introduction and authority-of-scripture-p2
      // but NOT for chapter-one or chapter-one-p2 (those are in source-b.html)
      const multiDocAnnotations = annotationsA.filter(
        (a: any) => a.entities.includes("person/saint/multi-doc-test")
      );
      expect(multiDocAnnotations.length).toBe(2);
      const annotatedParas = multiDocAnnotations.map((a: any) => a.paragraph).sort();
      expect(annotatedParas).toContain("introduction");
      expect(annotatedParas).toContain("authority-of-scripture-p2");
      expect(annotatedParas).not.toContain("chapter-one");
      expect(annotatedParas).not.toContain("chapter-one-p2");

      // Now annotate source-b.html — should only pick up the 2 source-b.html refs
      const resultB = runScript(SCRIPTS.annotateSource, ["source-b.html"]);
      expect(resultB.exitCode).toBe(0);

      const htmlB = readFileSync(path.join(tmpDir, "source-b.html"), "utf-8");
      const sidecarB = htmlB.match(
        /<script type="application\/json" id="passage-annotations">([\s\S]*?)<\/script>/
      );
      expect(sidecarB).not.toBeNull();
      const annotationsB = JSON.parse(sidecarB![1]);

      const multiDocAnnotationsB = annotationsB.filter(
        (a: any) => a.entities.includes("person/saint/multi-doc-test")
      );
      expect(multiDocAnnotationsB.length).toBe(2);
      const annotatedParasB = multiDocAnnotationsB.map((a: any) => a.paragraph).sort();
      expect(annotatedParasB).toContain("chapter-one");
      expect(annotatedParasB).toContain("chapter-one-p2");
      expect(annotatedParasB).not.toContain("introduction");

      // Clean up
      unlinkSync(multiRefPath);
      unlinkSync(path.join(tmpDir, "source-b.html"));
      // Re-annotate source.html to restore clean state
      runScript(SCRIPTS.annotateSource, ["source.html"]);
    },
    { timeout: 30_000 }
  );

  test(
    "interleaved refs to different source files do not cross-contaminate annotations",
    () => {
      // Create a ref file where refs to different files are interleaved
      // This is the exact pattern that caused the parser bug
      const multiRefDir = path.join(tmpDir, "index/refs/person/saint");
      const interleavedPath = path.join(multiRefDir, "interleaved-test.md");

      // Copy source-b.html again
      cpSync(
        path.join(FIXTURES_DIR, "source-b.html"),
        path.join(tmpDir, "source-b.html")
      );

      writeFileSync(
        interleavedPath,
        `---
name: Interleaved Test Entity
slug: person/saint/interleaved-test
category: person
subcategory: saint
dates: "100-200"
role: Test entity with interleaved multi-doc references
---

Test entity for interleaved reference testing.

## References in Commentary

- \`source.html#introduction\` — Ref A1
  text: "St. Augustine teaches in On Christian Doctrine"
- \`source-b.html#chapter-one\` — Ref B1 (interleaved between A1 and A2)
  text: "also mentions St. Augustine and his great works"
- \`source.html#authority-of-scripture-p3\` — Ref A2
  text: "St. Jerome likewise affirms"
- \`source-b.html#chapter-one-p2\` — Ref B2 (comes after A2)
  text: "St. Jerome translated the Bible into Latin"
`
      );

      // Annotate source.html
      const result = runScript(SCRIPTS.annotateSource, ["source.html"]);
      expect(result.exitCode).toBe(0);
      // Should NOT report any MISSes — the parser should correctly skip source-b refs
      expect(result.stdout).toContain("0 missed");

      const html = readFileSync(path.join(tmpDir, "source.html"), "utf-8");
      const sidecar = html.match(
        /<script type="application\/json" id="passage-annotations">([\s\S]*?)<\/script>/
      );
      const annotations = JSON.parse(sidecar![1]);

      // Should have exactly 2 annotations for this entity (introduction + authority-p3)
      const testAnnotations = annotations.filter(
        (a: any) => a.entities.includes("person/saint/interleaved-test")
      );
      expect(testAnnotations.length).toBe(2);

      // The source-b texts should NOT appear as annotations in source.html
      for (const ann of annotations) {
        expect(ann.paragraph).not.toBe("chapter-one");
        expect(ann.paragraph).not.toBe("chapter-one-p2");
      }

      // Clean up
      unlinkSync(interleavedPath);
      unlinkSync(path.join(tmpDir, "source-b.html"));
      runScript(SCRIPTS.annotateSource, ["source.html"]);
    },
    { timeout: 30_000 }
  );
});

// ---------------------------------------------------------------------------
// Stage 3c: Highlighting verification — every annotation offset matches expected text
// ---------------------------------------------------------------------------

describe("Stage 3c — highlighting offset verification", () => {
  test(
    "every sidecar annotation's offsets point to text that matches the ref file quote",
    () => {
      const html = readFileSync(path.join(tmpDir, "source.html"), "utf-8");

      // Parse sidecar
      const sidecarMatch = html.match(
        /<script type="application\/json" id="passage-annotations">([\s\S]*?)<\/script>/
      );
      expect(sidecarMatch).not.toBeNull();
      const annotations = JSON.parse(sidecarMatch![1]);
      expect(annotations.length).toBeGreaterThan(0);

      // Extract paragraph plain text (same as what components.js would see)
      const paraPattern = /<p\s[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/p>/gi;
      const paragraphs = new Map<string, string>();
      let m;
      while ((m = paraPattern.exec(html)) !== null) {
        // Strip HTML tags and decode entities — same as pipeline-utils stripHtml
        const plain = m[2]
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
          .replace(/&OElig;/g, "\u0152")
          .replace(/&aelig;/g, "\u00E6")
          .replace(/&AElig;/g, "\u00C6")
          .replace(/&nbsp;/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        paragraphs.set(m[1], plain);
      }

      // For each annotation, verify the text at [start, end) is non-empty and reasonable
      for (const ann of annotations) {
        const plainText = paragraphs.get(ann.paragraph);
        expect(plainText).toBeDefined();

        // Offsets must be within bounds
        expect(ann.start).toBeGreaterThanOrEqual(0);
        expect(ann.end).toBeLessThanOrEqual(plainText!.length);
        expect(ann.start).toBeLessThan(ann.end);

        // Extract the highlighted text
        const highlighted = plainText!.slice(ann.start, ann.end);
        expect(highlighted.length).toBeGreaterThan(0);

        // The highlighted text should not be just whitespace
        expect(highlighted.trim().length).toBeGreaterThan(0);
      }
    },
    { timeout: 30_000 }
  );

  test(
    "specific annotations highlight the exact expected text",
    () => {
      const html = readFileSync(path.join(tmpDir, "source.html"), "utf-8");
      const sidecarMatch = html.match(
        /<script type="application\/json" id="passage-annotations">([\s\S]*?)<\/script>/
      );
      const annotations = JSON.parse(sidecarMatch![1]);

      // Build paragraph plain text map
      const paraPattern = /<p\s[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/p>/gi;
      const paragraphs = new Map<string, string>();
      let m;
      while ((m = paraPattern.exec(html)) !== null) {
        const plain = m[2]
          .replace(/<[^>]+>/g, "")
          .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"').replace(/&#039;/g, "'")
          .replace(/&rsquo;/g, "\u2019").replace(/&lsquo;/g, "\u2018")
          .replace(/&rdquo;/g, "\u201D").replace(/&ldquo;/g, "\u201C")
          .replace(/&mdash;/g, "\u2014").replace(/&ndash;/g, "\u2013")
          .replace(/&oelig;/g, "\u0153").replace(/&OElig;/g, "\u0152")
          .replace(/&aelig;/g, "\u00E6").replace(/&AElig;/g, "\u00C6")
          .replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
        paragraphs.set(m[1], plain);
      }

      // Helper: find annotation for a given paragraph + entity
      function findAnnotation(paraId: string, entity: string) {
        return annotations.find(
          (a: any) => a.paragraph === paraId && a.entities.includes(entity)
        );
      }

      // 1. Augustine in introduction — full paragraph text
      const augIntro = findAnnotation("introduction", "person/saint/augustine");
      expect(augIntro).toBeDefined();
      const augText = paragraphs.get("introduction")!.slice(augIntro.start, augIntro.end);
      expect(augText).toContain("St. Augustine teaches in On Christian Doctrine");

      // 2. Jerome in introduction-p2 — text with em-dash
      const jerIntro = findAnnotation("introduction-p2", "person/saint/jerome");
      expect(jerIntro).toBeDefined();
      const jerText = paragraphs.get("introduction-p2")!.slice(jerIntro.start, jerIntro.end);
      expect(jerText).toContain("St. Jerome, that most learned of the Fathers");

      // 3. Interrupted quote — "If," he says, "you perceive..."
      const gregEdge = findAnnotation("edge-cases", "person/saint/gregory-the-great");
      expect(gregEdge).toBeDefined();
      const gregText = paragraphs.get("edge-cases")!.slice(gregEdge.start, gregEdge.end);
      // The highlighted text should contain the interrupted quote pattern
      expect(gregText).toContain("you perceive");

      // 4. Cross-em-tag text — "divine Scripture is"
      const gregP2 = findAnnotation("edge-cases-p2", "person/saint/gregory-the-great");
      expect(gregP2).toBeDefined();
      const gregP2Text = paragraphs.get("edge-cases-p2")!.slice(gregP2.start, gregP2.end);
      expect(gregP2Text).toContain("divine Scripture is");

      // 5. Ligature text — "cœlestial wisdom"
      const ligature = findAnnotation("edge-cases-p3", "subject/theology/scripture/inspiration");
      expect(ligature).toBeDefined();
      const ligText = paragraphs.get("edge-cases-p3")!.slice(ligature.start, ligature.end);
      // After entity decoding, the œ ligature is the actual character
      expect(ligText).toContain("c\u0153lestial wisdom");

      // 6. Basil in multi-entity paragraph
      const basil = findAnnotation("edge-cases-p5", "person/saint/basil-the-great");
      expect(basil).toBeDefined();
      const basilText = paragraphs.get("edge-cases-p5")!.slice(basil.start, basil.end);
      expect(basilText).toContain("St. Basil and Gregory the Theologian");

      // 7. Rufinus in same paragraph (may be merged or separate annotation)
      const rufinus = findAnnotation("edge-cases-p5", "person/scholar/rufinus");
      expect(rufinus).toBeDefined();
      const rufText = paragraphs.get("edge-cases-p5")!.slice(rufinus.start, rufinus.end);
      expect(rufText).toContain("Rufinus");
    },
    { timeout: 30_000 }
  );

  test(
    "annotation hash matches recomputed hash from highlighted text",
    () => {
      const html = readFileSync(path.join(tmpDir, "source.html"), "utf-8");
      const sidecarMatch = html.match(
        /<script type="application\/json" id="passage-annotations">([\s\S]*?)<\/script>/
      );
      const annotations = JSON.parse(sidecarMatch![1]);

      const paraPattern = /<p\s[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/p>/gi;
      const paragraphs = new Map<string, string>();
      let m;
      while ((m = paraPattern.exec(html)) !== null) {
        const plain = m[2]
          .replace(/<[^>]+>/g, "")
          .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"').replace(/&#039;/g, "'")
          .replace(/&rsquo;/g, "\u2019").replace(/&lsquo;/g, "\u2018")
          .replace(/&rdquo;/g, "\u201D").replace(/&ldquo;/g, "\u201C")
          .replace(/&mdash;/g, "\u2014").replace(/&ndash;/g, "\u2013")
          .replace(/&oelig;/g, "\u0153").replace(/&OElig;/g, "\u0152")
          .replace(/&aelig;/g, "\u00E6").replace(/&AElig;/g, "\u00C6")
          .replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
        paragraphs.set(m[1], plain);
      }

      // For every annotation, recompute the hash from the highlighted text
      // and verify it matches the hash in the annotation ID
      for (const ann of annotations) {
        const plainText = paragraphs.get(ann.paragraph)!;
        const highlighted = plainText.slice(ann.start, ann.end);

        // Recompute hash
        const normalized = highlighted.replace(/\s+/g, " ").trim();
        const data = new TextEncoder().encode(normalized);
        const hash = new Bun.CryptoHasher("sha256").update(data).digest("hex").slice(0, 7);

        // The annotation ID should end with -s-{hash}
        expect(ann.id).toEndWith(`-s-${hash}`);
      }
    },
    { timeout: 30_000 }
  );
});

// ---------------------------------------------------------------------------
// Stage 4: Validate refs again (after annotation)
// ---------------------------------------------------------------------------

describe("Stage 4 — validate-refs.ts (post-annotation)", () => {
  test(
    "ref files still pass validation after annotation updated links",
    () => {
      const result = runScript(SCRIPTS.validateRefs);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("All checks passed");
    },
    { timeout: 30_000 }
  );
});

// ---------------------------------------------------------------------------
// Stage 5: Tag entity refs
// ---------------------------------------------------------------------------

describe("Stage 5 — tag-entity-refs.ts", () => {
  test(
    "adds <entity-ref> tags to source HTML",
    () => {
      const result = runScript(SCRIPTS.tagEntityRefs, ["source.html"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Loaded");
      expect(result.stdout).toContain("entities from ref files");
      expect(result.stdout).toContain("Tagged");

      const html = readFileSync(path.join(tmpDir, "source.html"), "utf-8");

      // Verify entity-ref tags are present
      expect(html).toContain("<entity-ref");
      expect(html).toContain("</entity-ref>");

      // Verify specific entity slugs appear in entity-ref tags
      expect(html).toMatch(
        /entity-ref slug="person\/saint\/augustine"/
      );
      expect(html).toMatch(
        /entity-ref slug="person\/saint\/jerome"/
      );

      // Verify components.js script tag was inserted
      expect(html).toContain(
        '<script src="/index/components.js" type="module"></script>'
      );
    },
    { timeout: 30_000 }
  );

  test(
    "tags entity names in edge case paragraphs",
    () => {
      const html = readFileSync(path.join(tmpDir, "source.html"), "utf-8");

      // Extract the edge-cases-p5 paragraph content
      const p5Match = html.match(
        /<p\s[^>]*id="edge-cases-p5"[^>]*>([\s\S]*?)<\/p>/
      );
      expect(p5Match).not.toBeNull();
      const p5Content = p5Match![1];

      // St. Basil should be tagged
      expect(p5Content).toMatch(
        /entity-ref slug="person\/saint\/basil-the-great"/
      );

      // Gregory the Theologian should be tagged
      expect(p5Content).toMatch(
        /entity-ref slug="person\/saint\/gregory-nazianzus"/
      );

      // Rufinus should be tagged
      expect(p5Content).toMatch(
        /entity-ref slug="person\/scholar\/rufinus"/
      );
    },
    { timeout: 30_000 }
  );

  test(
    "sidecar annotations survive entity-ref tagging",
    () => {
      const html = readFileSync(path.join(tmpDir, "source.html"), "utf-8");

      // The sidecar block should still be present
      expect(html).toContain(
        '<script type="application/json" id="passage-annotations">'
      );

      // Parse it to verify it's still valid JSON
      const sidecarMatch = html.match(
        /<script type="application\/json" id="passage-annotations">([\s\S]*?)<\/script>/
      );
      expect(sidecarMatch).not.toBeNull();
      const annotations = JSON.parse(sidecarMatch![1]);
      expect(Array.isArray(annotations)).toBe(true);
      expect(annotations.length).toBeGreaterThan(0);
    },
    { timeout: 30_000 }
  );

  test(
    "is idempotent — running again produces same entity-ref tags",
    () => {
      const before = readFileSync(path.join(tmpDir, "source.html"), "utf-8");
      const beforeEntityRefs = (before.match(/<entity-ref[^>]*>/g) || []).sort();

      runScript(SCRIPTS.tagEntityRefs, ["source.html"]);

      const after = readFileSync(path.join(tmpDir, "source.html"), "utf-8");
      const afterEntityRefs = (after.match(/<entity-ref[^>]*>/g) || []).sort();

      expect(afterEntityRefs).toEqual(beforeEntityRefs);
    },
    { timeout: 30_000 }
  );
});

// ---------------------------------------------------------------------------
// Stage 5b: Entity-ref overrides
// ---------------------------------------------------------------------------

describe("Stage 5b — entity-ref-overrides.json", () => {
  test(
    "global_exclude_words prevents specific name forms from tagging (case-insensitive)",
    () => {
      // First, tag without overrides and confirm "Rufinus" is tagged
      runScript(SCRIPTS.tagEntityRefs, ["source.html"]);
      const beforeHtml = readFileSync(path.join(tmpDir, "source.html"), "utf-8");
      expect(beforeHtml).toMatch(/entity-ref slug="person\/scholar\/rufinus"/);

      // Now create overrides that exclude the word "Rufinus"
      const extractionsDir = path.join(tmpDir, "index/extractions/source");
      mkdirSync(extractionsDir, { recursive: true });
      writeFileSync(
        path.join(extractionsDir, "entity-ref-overrides.json"),
        JSON.stringify({
          global_exclude_words: ["rufinus"],
          exclude: [],
          force: [],
        })
      );

      // Re-run tagger
      const result = runScript(SCRIPTS.tagEntityRefs, ["source.html"]);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Global exclude words: rufinus");

      // "Rufinus" should NOT be tagged (the name form is excluded, and it has no aliases)
      const html = readFileSync(path.join(tmpDir, "source.html"), "utf-8");
      expect(html).not.toMatch(/entity-ref slug="person\/scholar\/rufinus"/);

      // Other entities should still be tagged
      expect(html).toMatch(/entity-ref slug="person\/saint\/augustine"/);

      // Clean up — remove overrides and re-tag
      unlinkSync(path.join(extractionsDir, "entity-ref-overrides.json"));
      runScript(SCRIPTS.tagEntityRefs, ["source.html"]);
    },
    { timeout: 30_000 }
  );

  test(
    "exclude rule prevents specific text/slug/paragraph combination",
    () => {
      const extractionsDir = path.join(tmpDir, "index/extractions/source");
      mkdirSync(extractionsDir, { recursive: true });
      writeFileSync(
        path.join(extractionsDir, "entity-ref-overrides.json"),
        JSON.stringify({
          global_exclude_words: [],
          exclude: [
            {
              text: "St. Augustine",
              slug: "person/saint/augustine",
              paragraph: "introduction",
              reason: "test exclusion",
            },
          ],
          force: [],
        })
      );

      const result = runScript(SCRIPTS.tagEntityRefs, ["source.html"]);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Exclusions: 1");

      const html = readFileSync(path.join(tmpDir, "source.html"), "utf-8");

      // Augustine should NOT be tagged in the introduction paragraph
      const introMatch = html.match(
        /<p\s[^>]*id="introduction"[^>]*>([\s\S]*?)<\/p>/
      );
      expect(introMatch).not.toBeNull();
      expect(introMatch![1]).not.toMatch(
        /entity-ref slug="person\/saint\/augustine"/
      );

      // But Augustine SHOULD still be tagged in other paragraphs (e.g., authority-of-scripture-p2)
      const authMatch = html.match(
        /<p\s[^>]*id="authority-of-scripture-p2"[^>]*>([\s\S]*?)<\/p>/
      );
      expect(authMatch).not.toBeNull();
      expect(authMatch![1]).toMatch(
        /entity-ref slug="person\/saint\/augustine"/
      );

      // Clean up
      unlinkSync(path.join(extractionsDir, "entity-ref-overrides.json"));
      runScript(SCRIPTS.tagEntityRefs, ["source.html"]);
    },
    { timeout: 30_000 }
  );

  test(
    "tagger works normally without overrides file",
    () => {
      // Ensure no overrides file exists
      const extractionsDir = path.join(tmpDir, "index/extractions/source");
      const overridesPath = path.join(extractionsDir, "entity-ref-overrides.json");
      if (existsSync(overridesPath)) unlinkSync(overridesPath);

      const result = runScript(SCRIPTS.tagEntityRefs, ["source.html"]);
      expect(result.exitCode).toBe(0);

      // Should NOT mention overrides
      expect(result.stdout).not.toContain("Loaded overrides");

      // Should still tag normally
      const html = readFileSync(path.join(tmpDir, "source.html"), "utf-8");
      expect(html).toMatch(/entity-ref slug="person\/saint\/augustine"/);
      expect(html).toMatch(/entity-ref slug="person\/classical\/aristotle"/);
    },
    { timeout: 30_000 }
  );
});

// ---------------------------------------------------------------------------
// Stage 6: Generate index pages
// ---------------------------------------------------------------------------

describe("Stage 6 — generate-index.ts", () => {
  // generate-index.ts resolves paths via import.meta.dir, so we must copy
  // the script (and its lib/ dependency) into tmpDir and run from there.
  function runGenerateIndex(): { exitCode: number; stdout: string; stderr: string } {
    // Copy generate-index.ts and lib/generate-index-utils.ts into tmpDir
    mkdirSync(path.join(tmpDir, "lib"), { recursive: true });
    cpSync(
      path.join(PROJECT_ROOT, "generate-index.ts"),
      path.join(tmpDir, "generate-index.ts")
    );
    cpSync(
      path.join(PROJECT_ROOT, "lib", "generate-index-utils.ts"),
      path.join(tmpDir, "lib", "generate-index-utils.ts")
    );
    return runScript(path.join(tmpDir, "generate-index.ts"), [], tmpDir);
  }

  test(
    "runs successfully (exit code 0)",
    () => {
      const result = runGenerateIndex();

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Reading ref files...");
      expect(result.stdout).toContain("Done.");
    },
    { timeout: 30_000 }
  );

  test(
    "generates entry HTML pages for each ref file entity",
    () => {
      // The fixture has 9 ref files; verify key entry pages exist
      const expectedPages = [
        "index/person/saint/augustine.html",
        "index/person/saint/jerome.html",
        "index/person/saint/basil-the-great.html",
        "index/person/saint/gregory-the-great.html",
        "index/person/saint/gregory-nazianzus.html",
        "index/person/classical/aristotle.html",
        "index/person/scholar/rufinus.html",
        "index/bibliography/augustine/de-doctrina-christiana.html",
        "index/subject/theology/scripture/inspiration.html",
      ];

      for (const page of expectedPages) {
        const fullPath = path.join(tmpDir, page);
        expect(existsSync(fullPath)).toBe(true);
      }
    },
    { timeout: 30_000 }
  );

  test(
    "entry page has correct HTML structure",
    () => {
      const augustinePath = path.join(
        tmpDir,
        "index/person/saint/augustine.html"
      );
      const html = readFileSync(augustinePath, "utf-8");

      // Basic HTML structure
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain('<html lang="en">');
      expect(html).toContain("</html>");

      // Article with correct data attributes
      expect(html).toContain('<article id="entry"');
      expect(html).toContain('data-slug="person/saint/augustine"');
      expect(html).toContain('data-category="person"');

      // h1 with the entity name
      expect(html).toContain("<h1>St. Augustine of Hippo</h1>");

      // References section (grouped by source page)
      expect(html).toContain('<section id="references">');
      expect(html).toContain('ref-source-heading');

      // Meta description
      expect(html).toContain('<meta name="description"');

      // Canonical URL
      expect(html).toContain(
        'href="https://lapide.org/index/person/saint/augustine.html"'
      );

      // CSS and JS links
      expect(html).toContain('href="/style.css"');
      expect(html).toContain('href="/index/index.css"');
      expect(html).toContain('src="/index/components.js"');
    },
    { timeout: 30_000 }
  );

  test(
    "entry page has breadcrumb navigation",
    () => {
      const augustinePath = path.join(
        tmpDir,
        "index/person/saint/augustine.html"
      );
      const html = readFileSync(augustinePath, "utf-8");

      expect(html).toContain('<nav class="index-breadcrumb">');
      expect(html).toContain('<a href="/index/">Index</a>');
      expect(html).toContain('<a href="/index/person/">Person</a>');
      expect(html).toContain('<a href="/index/person/saint/">Saints</a>');
      expect(html).toContain("St. Augustine of Hippo");
    },
    { timeout: 30_000 }
  );

  test(
    "entry page has metadata (dates, role, also_known_as)",
    () => {
      const augustinePath = path.join(
        tmpDir,
        "index/person/saint/augustine.html"
      );
      const html = readFileSync(augustinePath, "utf-8");

      expect(html).toContain('<dl class="entry-meta">');
      expect(html).toContain("Also known as");
      expect(html).toContain("Aurelius Augustinus");
      expect(html).toContain("354-430");
      expect(html).toContain("Doctor of the Church, Bishop of Hippo");
    },
    { timeout: 30_000 }
  );

  test(
    "entry page references link back to source documents",
    () => {
      const augustinePath = path.join(
        tmpDir,
        "index/person/saint/augustine.html"
      );
      const html = readFileSync(augustinePath, "utf-8");

      // References should link to source.html with entity param and anchor
      expect(html).toContain('href="/source.html');
      expect(html).toContain("entity=person%2Fsaint%2Faugustine");
      expect(html).toContain('class="source-ref"');
    },
    { timeout: 30_000 }
  );

  test(
    "directory index pages are created",
    () => {
      const expectedDirIndices = [
        "index/index.html",
        "index/person/index.html",
        "index/person/saint/index.html",
        "index/person/classical/index.html",
        "index/person/scholar/index.html",
        "index/bibliography/index.html",
        "index/subject/index.html",
      ];

      for (const page of expectedDirIndices) {
        const fullPath = path.join(tmpDir, page);
        expect(existsSync(fullPath)).toBe(true);
      }
    },
    { timeout: 30_000 }
  );

  test(
    "directory index lists child entries",
    () => {
      const saintIndexPath = path.join(
        tmpDir,
        "index/person/saint/index.html"
      );
      const html = readFileSync(saintIndexPath, "utf-8");

      // Should list all saints from fixture ref files
      expect(html).toContain("St. Augustine of Hippo");
      expect(html).toContain("St. Jerome");
      expect(html).toContain("St. Basil the Great");
      expect(html).toContain("St. Gregory the Great");
      expect(html).toContain("St. Gregory the Theologian");

      // Should have breadcrumb
      expect(html).toContain('<a href="/index/">Index</a>');
      expect(html).toContain('<a href="/index/person/">Person</a>');
    },
    { timeout: 30_000 }
  );

  test(
    "root index page lists top-level categories",
    () => {
      const rootIndexPath = path.join(tmpDir, "index/index.html");
      const html = readFileSync(rootIndexPath, "utf-8");

      expect(html).toContain('<h1>Index</h1>');
      expect(html).toContain('<ul class="index-listing">');
      // Should list the categories that have entries
      expect(html).toContain("Person");
      expect(html).toContain("Bibliography");
      expect(html).toContain("Subject");
    },
    { timeout: 30_000 }
  );

  test(
    "manifest.json is generated with correct structure",
    () => {
      const manifestPath = path.join(tmpDir, "index/manifest.json");
      expect(existsSync(manifestPath)).toBe(true);

      const raw = readFileSync(manifestPath, "utf-8");
      const manifest = JSON.parse(raw);

      expect(Array.isArray(manifest)).toBe(true);
      expect(manifest.length).toBeGreaterThanOrEqual(9); // at least 9 canonical entries

      // Each entry has the required fields
      for (const entry of manifest) {
        expect(entry).toHaveProperty("name");
        expect(entry).toHaveProperty("slug");
        expect(entry).toHaveProperty("category");
        expect(entry).toHaveProperty("path");
        expect(typeof entry.name).toBe("string");
        expect(typeof entry.slug).toBe("string");
      }

      // Verify specific entries exist
      const slugs = manifest.map((e: any) => e.slug);
      expect(slugs).toContain("person/saint/augustine");
      expect(slugs).toContain("person/saint/jerome");
      expect(slugs).toContain("bibliography/augustine/de-doctrina-christiana");
      expect(slugs).toContain("subject/theology/scripture/inspiration");
    },
    { timeout: 30_000 }
  );

  test(
    "manifest entries are sorted by path",
    () => {
      const manifestPath = path.join(tmpDir, "index/manifest.json");
      const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));

      const paths = manifest.map((e: any) => e.path);
      const sorted = [...paths].sort();
      expect(paths).toEqual(sorted);
    },
    { timeout: 30_000 }
  );

  test(
    "is idempotent — running again produces same output",
    () => {
      // Read a sample page and manifest before second run
      const augustineBefore = readFileSync(
        path.join(tmpDir, "index/person/saint/augustine.html"),
        "utf-8"
      );
      const manifestBefore = readFileSync(
        path.join(tmpDir, "index/manifest.json"),
        "utf-8"
      );

      const result = runGenerateIndex();
      expect(result.exitCode).toBe(0);

      const augustineAfter = readFileSync(
        path.join(tmpDir, "index/person/saint/augustine.html"),
        "utf-8"
      );
      const manifestAfter = readFileSync(
        path.join(tmpDir, "index/manifest.json"),
        "utf-8"
      );

      expect(augustineAfter).toBe(augustineBefore);
      expect(manifestAfter).toBe(manifestBefore);
    },
    { timeout: 30_000 }
  );

  test(
    "bibliography entry page has author link",
    () => {
      const ddcPath = path.join(
        tmpDir,
        "index/bibliography/augustine/de-doctrina-christiana.html"
      );
      const html = readFileSync(ddcPath, "utf-8");

      // Should have the title
      expect(html).toContain("<h1>De Doctrina Christiana</h1>");

      // Should have author metadata linking to Augustine
      expect(html).toContain("<dt>Author</dt>");
    },
    { timeout: 30_000 }
  );

  test(
    "entry page has related links section",
    () => {
      const augustinePath = path.join(
        tmpDir,
        "index/person/saint/augustine.html"
      );
      const html = readFileSync(augustinePath, "utf-8");

      // Augustine has related people and works in the fixture
      expect(html).toContain('<section id="related">');
      expect(html).toContain("Related");
      // Should link to Jerome (related person)
      expect(html).toContain("person/saint/jerome.html");
    },
    { timeout: 30_000 }
  );

  test(
    "person dates generate virtual year entry pages",
    () => {
      // Augustine: 354-430 — these years should generate virtual year entries
      // Check that the year pages are in the manifest
      const manifestPath = path.join(tmpDir, "index/manifest.json");
      const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
      const slugs = manifest.map((e: any) => e.slug);

      // Augustine death year 430 → year/ad/5th-century/30s/430
      expect(slugs).toContain("year/ad/5th-century/30s/430");
      // Augustine birth year 354 → year/ad/4th-century/50s/354
      expect(slugs).toContain("year/ad/4th-century/50s/354");

      // Verify the year page exists on disk
      expect(
        existsSync(
          path.join(tmpDir, "index/year/ad/5th-century/30s/430.html")
        )
      ).toBe(true);
    },
    { timeout: 30_000 }
  );

  test(
    "subject entry page has correct structure",
    () => {
      const inspPath = path.join(
        tmpDir,
        "index/subject/theology/scripture/inspiration.html"
      );
      const html = readFileSync(inspPath, "utf-8");

      expect(html).toContain(
        "<h1>Divine Inspiration of Scripture</h1>"
      );
      expect(html).toContain('data-slug="subject/theology/scripture/inspiration"');
      expect(html).toContain('data-category="subject"');
      expect(html).toContain('<section id="references">');
    },
    { timeout: 30_000 }
  );
});

// ---------------------------------------------------------------------------
// Stage 6b: generate-index.ts negative test — missing refs directory
// ---------------------------------------------------------------------------

describe("Stage 6b — generate-index.ts (negative test)", () => {
  test(
    "fails or reports error when index/refs/ directory is missing",
    () => {
      // Create a fresh tmpDir with no refs
      const emptyTmpDir = mkdtempSync(
        path.join(os.tmpdir(), "lapide-genidx-empty-")
      );
      try {
        // Copy the script and lib into the empty dir
        mkdirSync(path.join(emptyTmpDir, "lib"), { recursive: true });
        cpSync(
          path.join(PROJECT_ROOT, "generate-index.ts"),
          path.join(emptyTmpDir, "generate-index.ts")
        );
        cpSync(
          path.join(PROJECT_ROOT, "lib", "generate-index-utils.ts"),
          path.join(emptyTmpDir, "lib", "generate-index-utils.ts")
        );

        const result = runScript(
          path.join(emptyTmpDir, "generate-index.ts"),
          [],
          emptyTmpDir
        );

        // Script should either exit with error or report 0 ref files
        if (result.exitCode !== 0) {
          // Failed with error — that's acceptable
          expect(result.exitCode).not.toBe(0);
        } else {
          // Succeeded but found 0 ref files — also acceptable
          expect(result.stdout).toContain("Found 0 ref files");
        }
      } finally {
        rmSync(emptyTmpDir, { recursive: true, force: true });
      }
    },
    { timeout: 30_000 }
  );
});

// ---------------------------------------------------------------------------
// Lint annotations
// ---------------------------------------------------------------------------

describe("lint-annotations.ts", () => {
  test(
    "runs without crashing on the annotated and tagged file",
    () => {
      const result = runScript(SCRIPTS.lintAnnotations, ["source.html"]);

      // The lint tool should run successfully
      // It may find issues (e.g., entity-ref slugs without matching ref files
      // because the test fixture has a limited set), but it should not crash
      expect(result.stdout).toContain("Linting annotations");
      expect(result.stdout).toContain("Scanned:");
      expect(result.stdout).toMatch(/\d+ paragraphs/);
      expect(result.stdout).toMatch(/\d+ sidecar annotations/);
    },
    { timeout: 30_000 }
  );

  test(
    "reports correct counts of paragraphs and annotations",
    () => {
      const result = runScript(SCRIPTS.lintAnnotations, ["source.html"]);

      // We have 13 paragraphs (7 original + 6 edge cases)
      expect(result.stdout).toContain("13 paragraphs");
    },
    { timeout: 30_000 }
  );
});

// ---------------------------------------------------------------------------
// Post-pipeline negative tests: lint-annotations.ts failure modes
// ---------------------------------------------------------------------------

describe("lint-annotations.ts (negative tests)", () => {
  test(
    "reports orphaned sidecar annotation",
    () => {
      // Save backup
      const htmlPath = path.join(tmpDir, "source.html");
      const backup = readFileSync(htmlPath, "utf-8");

      // Parse existing sidecar and add a fake orphan annotation
      const sidecarMatch = backup.match(
        /<script type="application\/json" id="passage-annotations">([\s\S]*?)<\/script>/
      );
      expect(sidecarMatch).not.toBeNull();
      const annotations = JSON.parse(sidecarMatch![1]);

      // Add a fake annotation that no ref file references
      annotations.push({
        id: "introduction-s-deadbee",
        paragraph: "introduction",
        start: 0,
        end: 5,
        entities: ["person/other/fake-entity"],
      });

      const modifiedHtml = backup.replace(
        /<script type="application\/json" id="passage-annotations">[\s\S]*?<\/script>/,
        `<script type="application/json" id="passage-annotations">\n${JSON.stringify(annotations, null, 2)}\n</script>`
      );
      writeFileSync(htmlPath, modifiedHtml);

      const result = runScript(SCRIPTS.lintAnnotations, ["source.html"]);

      // Should report the orphan annotation
      expect(result.stdout).toContain("not referenced by any ref file");
      expect(result.stdout).toContain("introduction-s-deadbee");
      expect(result.exitCode).toBe(1);

      // Restore
      writeFileSync(htmlPath, backup);
    },
    { timeout: 30_000 }
  );

  test(
    "reports broken entity-ref slug",
    () => {
      const htmlPath = path.join(tmpDir, "source.html");
      const backup = readFileSync(htmlPath, "utf-8");

      // Insert a broken entity-ref tag into a paragraph
      const modifiedHtml = backup.replace(
        'id="introduction-p3"',
        'id="introduction-p3"'
      ).replace(
        /(<p\s[^>]*id="introduction-p3"[^>]*>)([\s\S]*?)(<\/p>)/,
        '$1<entity-ref slug="person/saint/nonexistent-saint">Nonexistent</entity-ref> $2$3'
      );
      writeFileSync(htmlPath, modifiedHtml);

      const result = runScript(SCRIPTS.lintAnnotations, ["source.html"]);

      // Should report the broken entity-ref slug
      expect(result.stdout).toContain("non-existent ref files");
      expect(result.stdout).toContain("person/saint/nonexistent-saint");
      expect(result.exitCode).toBe(1);

      // Restore
      writeFileSync(htmlPath, backup);
    },
    { timeout: 30_000 }
  );

  test(
    "reports invalid sidecar offsets (beyond paragraph length)",
    () => {
      const htmlPath = path.join(tmpDir, "source.html");
      const backup = readFileSync(htmlPath, "utf-8");

      // Parse existing sidecar and add an annotation with offsets way beyond paragraph text length
      const sidecarMatch = backup.match(
        /<script type="application\/json" id="passage-annotations">([\s\S]*?)<\/script>/
      );
      expect(sidecarMatch).not.toBeNull();
      const annotations = JSON.parse(sidecarMatch![1]);

      annotations.push({
        id: "introduction-p3-s-9999999",
        paragraph: "introduction-p3",
        start: 9999,
        end: 10000,
        entities: ["person/classical/aristotle"],
      });

      const modifiedHtml = backup.replace(
        /<script type="application\/json" id="passage-annotations">[\s\S]*?<\/script>/,
        `<script type="application/json" id="passage-annotations">\n${JSON.stringify(annotations, null, 2)}\n</script>`
      );
      writeFileSync(htmlPath, modifiedHtml);

      const result = runScript(SCRIPTS.lintAnnotations, ["source.html"]);

      // Should report invalid offsets
      expect(result.stdout).toContain("invalid data");
      expect(result.stdout).toContain("exceeds paragraph text length");
      expect(result.exitCode).toBe(1);

      // Restore
      writeFileSync(htmlPath, backup);
    },
    { timeout: 30_000 }
  );

  test(
    "reports missing components.js script tag",
    () => {
      const htmlPath = path.join(tmpDir, "source.html");
      const backup = readFileSync(htmlPath, "utf-8");

      // Remove the components.js script tag
      const modifiedHtml = backup.replace(
        '<script src="/index/components.js" type="module"></script>\n',
        ""
      );
      writeFileSync(htmlPath, modifiedHtml);

      const result = runScript(SCRIPTS.lintAnnotations, ["source.html"]);

      // Should report missing components.js
      expect(result.stdout).toContain("Missing");
      expect(result.stdout).toContain("components.js");

      // Restore
      writeFileSync(htmlPath, backup);
    },
    { timeout: 30_000 }
  );

  test(
    "diagnoses 'span extends beyond ref text' when annotation is longer than text: field",
    () => {
      const htmlPath = path.join(tmpDir, "source.html");
      const backup = readFileSync(htmlPath, "utf-8");

      // Parse existing sidecar
      const sidecarMatch = backup.match(
        /<script type="application\/json" id="passage-annotations">([\s\S]*?)<\/script>/
      );
      expect(sidecarMatch).not.toBeNull();
      const annotations = JSON.parse(sidecarMatch![1]);

      // Add an annotation whose span is deliberately longer than the ref file text
      // The paragraph "introduction" has text starting with "St. Augustine teaches..."
      // We'll make the annotation span 200 chars (whole paragraph) but the ref text is only ~120 chars
      annotations.push({
        id: "introduction-s-1111111",
        paragraph: "introduction",
        start: 0,
        end: 200,
        entities: ["person/other/span-test"],
      });

      const modifiedHtml = backup.replace(
        /<script type="application\/json" id="passage-annotations">[\s\S]*?<\/script>/,
        `<script type="application/json" id="passage-annotations">\n${JSON.stringify(annotations, null, 2)}\n</script>`
      );
      writeFileSync(htmlPath, modifiedHtml);

      // Create a ref file with a shorter text: field
      const refDir = path.join(tmpDir, "index/refs/person/other");
      mkdirSync(refDir, { recursive: true });
      const refPath = path.join(refDir, "span-test.md");
      writeFileSync(
        refPath,
        `---
name: Span Test
slug: person/other/span-test
category: person
subcategory: other
related:
  people: []
---

Test entity.

## References in Commentary

- \`source.html#introduction-s-1111111\` — Test
  text: "St. Augustine teaches in On Christian Doctrine"
`
      );

      const result = runScript(SCRIPTS.lintAnnotations, ["source.html"]);

      expect(result.stdout).toContain("annotation span is longer than text: field");
      expect(result.exitCode).toBe(1);

      // Clean up
      writeFileSync(htmlPath, backup);
      unlinkSync(refPath);
    },
    { timeout: 30_000 }
  );

  test(
    "diagnoses 'texts diverge at char N' when annotation text differs from ref text",
    () => {
      const htmlPath = path.join(tmpDir, "source.html");
      const backup = readFileSync(htmlPath, "utf-8");

      const sidecarMatch = backup.match(
        /<script type="application\/json" id="passage-annotations">([\s\S]*?)<\/script>/
      );
      expect(sidecarMatch).not.toBeNull();
      const annotations = JSON.parse(sidecarMatch![1]);

      // Add annotation pointing to "introduction" paragraph
      annotations.push({
        id: "introduction-s-2222222",
        paragraph: "introduction",
        start: 0,
        end: 50,
        entities: ["person/other/diverge-test"],
      });

      const modifiedHtml = backup.replace(
        /<script type="application\/json" id="passage-annotations">[\s\S]*?<\/script>/,
        `<script type="application/json" id="passage-annotations">\n${JSON.stringify(annotations, null, 2)}\n</script>`
      );
      writeFileSync(htmlPath, modifiedHtml);

      // Create ref file with text that starts the same but diverges
      const refDir = path.join(tmpDir, "index/refs/person/other");
      mkdirSync(refDir, { recursive: true });
      const refPath = path.join(refDir, "diverge-test.md");
      writeFileSync(
        refPath,
        `---
name: Diverge Test
slug: person/other/diverge-test
category: person
subcategory: other
related:
  people: []
---

Test entity.

## References in Commentary

- \`source.html#introduction-s-2222222\` — Test
  text: "St. Augustine teaches in WRONG TEXT that does not match the paragraph"
`
      );

      const result = runScript(SCRIPTS.lintAnnotations, ["source.html"]);

      expect(result.stdout).toContain("texts diverge at char");
      expect(result.exitCode).toBe(1);

      // Clean up
      writeFileSync(htmlPath, backup);
      unlinkSync(refPath);
    },
    { timeout: 30_000 }
  );

  test(
    "reports ref not synced to sidecar (missing -s-XXXXXXX hash suffix)",
    () => {
      // Add a new ref file that references a paragraph but has no hash suffix
      const unsyncedRefDir = path.join(tmpDir, "index/refs/person/other");
      mkdirSync(unsyncedRefDir, { recursive: true });
      const unsyncedRefPath = path.join(
        unsyncedRefDir,
        "unsynced-ref-test.md"
      );
      writeFileSync(
        unsyncedRefPath,
        `---
name: Unsynced Ref Entity
slug: person/other/unsynced-ref-test
category: person
subcategory: other
related:
  people: []
  works: []
  subjects: []
---

Test entity with a ref not synced to sidecar.

## References in Commentary

- \`source.html#introduction\` — No hash suffix
  text: "St. Augustine teaches in On Christian Doctrine"
`
      );

      const result = runScript(SCRIPTS.lintAnnotations, ["source.html"]);

      // Should report unsynced refs (missing -s-XXXXXXX)
      expect(result.stdout).toContain("not synced to sidecar hashes");
      expect(result.exitCode).toBe(1);

      // Clean up
      unlinkSync(unsyncedRefPath);
    },
    { timeout: 30_000 }
  );
});

// ---------------------------------------------------------------------------
// Validate refs still passes at the end of the full pipeline
// ---------------------------------------------------------------------------

describe("Final validation — full pipeline integrity", () => {
  test(
    "validate-refs still passes after all pipeline stages",
    () => {
      const result = runScript(SCRIPTS.validateRefs);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("All checks passed");
    },
    { timeout: 30_000 }
  );

  test(
    "the annotated source HTML is well-formed",
    () => {
      const html = readFileSync(path.join(tmpDir, "source.html"), "utf-8");

      // Basic well-formedness checks
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("<html");
      expect(html).toContain("</html>");
      expect(html).toContain("<head>");
      expect(html).toContain("</head>");
      expect(html).toContain("<body>");
      expect(html).toContain("</body>");

      // All 13 paragraphs should still have their IDs
      expect(html).toContain('id="introduction"');
      expect(html).toContain('id="introduction-p2"');
      expect(html).toContain('id="introduction-p3"');
      expect(html).toContain('id="authority-of-scripture"');
      expect(html).toContain('id="authority-of-scripture-p2"');
      expect(html).toContain('id="authority-of-scripture-p3"');
      expect(html).toContain('id="authority-of-scripture-p4"');
      expect(html).toContain('id="edge-cases"');
      expect(html).toContain('id="edge-cases-p2"');
      expect(html).toContain('id="edge-cases-p3"');
      expect(html).toContain('id="edge-cases-p4"');
      expect(html).toContain('id="edge-cases-p5"');
      expect(html).toContain('id="edge-cases-p6"');

      // Has the three pipeline additions:
      // 1. Sidecar JSON
      expect(html).toContain('id="passage-annotations"');
      // 2. Entity-ref tags
      expect(html).toContain("<entity-ref");
      // 3. Components script
      expect(html).toContain("components.js");
    },
    { timeout: 30_000 }
  );
});
