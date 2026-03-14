/**
 * validate-refs.ts — Validate all ref files in index/refs/
 *
 * Checks:
 * 1. Valid YAML frontmatter (parseable, required fields present)
 * 2. Slug matches file path
 * 3. Cross-references point to ref files that actually exist
 * 4. No duplicate slugs
 * 5. Alias files point to valid canonical entries
 * 6. Source file paragraph IDs exist in the referenced HTML files
 * 7. Quoted text ("text: ...") actually appears in the referenced paragraph
 *
 * Usage: bun validate-refs.ts
 *        bun validate-refs.ts --fix-paths  (rename files to match slugs)
 */

import { Glob } from "bun";
import { stripHtml, normalizeForMatch } from "./pipeline-utils";

const REFS_DIR = "index/refs";

interface RefFile {
  path: string;
  slug: string;
  category: string;
  isAlias: boolean;
  aliasOf?: string;
  related: Record<string, string[]>;
  references: string[]; // paragraph IDs like "01_Preliminares.html#dedicatory-letter-p3"
  textQuotes: Map<string, string[]>; // paragraph ref -> quoted text(s) to verify
}

interface ValidationError {
  file: string;
  level: "error" | "warning";
  message: string;
}

const errors: ValidationError[] = [];
const warnings: ValidationError[] = [];

function addError(file: string, message: string) {
  errors.push({ file, level: "error", message });
}

function addWarning(file: string, message: string) {
  warnings.push({ file, level: "warning", message });
}

// --- Parse YAML frontmatter (minimal parser, no dependencies) ---

function parseFrontmatter(content: string): { meta: Record<string, any>; body: string } | null {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return null;

  const yamlStr = match[1];
  const body = match[2];
  const meta: Record<string, any> = {};

  let currentKey = "";
  let currentList: string[] | null = null;
  let currentNested: Record<string, string[]> | null = null;
  let nestedKey = "";
  let nestedList: string[] | null = null;

  for (const line of yamlStr.split("\n")) {
    // Nested list item (8 spaces or 2 tabs + "- ")
    if (/^(        |\t\t)\s*- /.test(line) && nestedKey) {
      const val = line.replace(/^\s*- /, "").trim();
      if (nestedList) nestedList.push(val);
      continue;
    }

    // Nested key (4 spaces or 1 tab + "key:")
    if (/^(    |\t)\s*\w/.test(line) && currentNested !== null) {
      // Save previous nested list
      if (nestedKey && nestedList) {
        currentNested[nestedKey] = nestedList;
      }
      const nestedMatch = line.match(/^\s+(\w[\w-]*):\s*$/);
      if (nestedMatch) {
        nestedKey = nestedMatch[1];
        nestedList = [];
        continue;
      }
      // Nested key with inline value
      const nestedInline = line.match(/^\s+(\w[\w-]*):\s*(.+)$/);
      if (nestedInline) {
        nestedKey = nestedInline[1];
        nestedList = null;
        currentNested[nestedKey] = [nestedInline[2].trim()];
        continue;
      }
    }

    // Top-level list item (2 spaces + "- ")
    if (/^\s{2}- /.test(line) && currentList !== null) {
      currentList.push(line.replace(/^\s*- /, "").trim());
      continue;
    }

    // Save any pending nested data
    if (nestedKey && nestedList && currentNested) {
      currentNested[nestedKey] = nestedList;
      nestedKey = "";
      nestedList = null;
    }
    if (currentKey && currentNested) {
      meta[currentKey] = currentNested;
      currentNested = null;
    }
    if (currentKey && currentList !== null && currentNested === null) {
      meta[currentKey] = currentList;
      currentList = null;
    }

    // Top-level key: value
    const kvMatch = line.match(/^(\w[\w_-]*):\s*(.*)$/);
    if (kvMatch) {
      currentKey = kvMatch[1];
      const val = kvMatch[2].trim();

      if (val === "") {
        // Could be a list or nested object — wait for next lines
        currentList = [];
        currentNested = null;
        continue;
      }

      // Check if this starts a nested object (related:)
      if (currentKey === "related" || currentKey === "aliases") {
        if (val === "") {
          currentNested = {};
          currentList = null;
        } else {
          meta[currentKey] = val.replace(/^["']|["']$/g, "");
          currentList = null;
        }
        continue;
      }

      meta[currentKey] = val.replace(/^["']|["']$/g, "");
      currentList = null;
      continue;
    }

    // Top-level list or nested start after empty value
    if (line.trim() === "" && currentList !== null && currentList.length === 0) {
      // Empty line after "key:" — might be nested object
      continue;
    }
  }

  // Flush remaining
  if (nestedKey && nestedList && currentNested) {
    currentNested[nestedKey] = nestedList;
  }
  if (currentKey && currentNested) {
    meta[currentKey] = currentNested;
  } else if (currentKey && currentList !== null) {
    meta[currentKey] = currentList;
  }

  return { meta, body };
}

// --- Collect all ref files ---

const glob = new Glob("**/*.md");
const allFiles: Map<string, RefFile> = new Map(); // slug -> RefFile
const allPaths: Set<string> = new Set();
const slugToPath: Map<string, string> = new Map();

for await (const path of glob.scan(REFS_DIR)) {
  const fullPath = `${REFS_DIR}/${path}`;
  allPaths.add(fullPath);

  const content = await Bun.file(fullPath).text();
  const parsed = parseFrontmatter(content);

  if (!parsed) {
    addError(fullPath, "No valid YAML frontmatter found");
    continue;
  }

  const { meta, body } = parsed;

  // Check for alias file
  if (meta.alias_of) {
    const refFile: RefFile = {
      path: fullPath,
      slug: meta.alias_of,
      category: "",
      isAlias: true,
      aliasOf: meta.alias_of,
      related: {},
      references: [],
      textQuotes: new Map(),
    };
    // Store by path since aliases don't have their own slug
    allFiles.set(`alias:${fullPath}`, refFile);
    continue;
  }

  // Required fields
  const requiredFields = ["name", "slug", "category"];
  for (const field of requiredFields) {
    if (!meta[field]) {
      addError(fullPath, `Missing required field: ${field}`);
    }
  }

  const slug = meta.slug || "";
  const category = meta.category || "";

  // Check for duplicate slugs
  if (slugToPath.has(slug)) {
    addError(fullPath, `Duplicate slug "${slug}" — also in ${slugToPath.get(slug)}`);
  } else {
    slugToPath.set(slug, fullPath);
  }

  // Check slug matches file path
  const expectedPath = `${REFS_DIR}/${slug}.md`;
  if (fullPath !== expectedPath) {
    addWarning(fullPath, `Slug "${slug}" doesn't match file path (expected ${expectedPath})`);
  }

  // Collect cross-references
  const related: Record<string, string[]> = {};
  if (meta.related && typeof meta.related === "object") {
    for (const [key, vals] of Object.entries(meta.related)) {
      if (Array.isArray(vals)) {
        related[key] = vals;
      }
    }
  }

  // Collect aliases
  const aliases: string[] = Array.isArray(meta.aliases) ? meta.aliases : [];

  // Collect references and their text quotes from body
  // Format: - `file.html#anchor` — synopsis
  //           text: "quoted text"
  const references: string[] = [];
  const textQuotes: Map<string, string[]> = new Map();
  const bodyLines = body.split("\n");

  let lastRef = "";
  for (const line of bodyLines) {
    const refLineMatch = line.match(/`([^`]+\.html#[^`]+)`/);
    if (refLineMatch) {
      lastRef = refLineMatch[1];
      references.push(lastRef);
      continue;
    }
    const textMatch = line.match(/^\s*text:\s*"(.+)"$/);
    if (textMatch && lastRef) {
      if (!textQuotes.has(lastRef)) textQuotes.set(lastRef, []);
      textQuotes.get(lastRef)!.push(textMatch[1]);
    }
  }

  const refFile: RefFile = {
    path: fullPath,
    slug,
    category,
    isAlias: false,
    related,
    references,
    textQuotes,
  };

  allFiles.set(slug, refFile);
}

// --- Validate cross-references ---

for (const [key, ref] of allFiles) {
  if (ref.isAlias) {
    // Check alias target exists
    const targetSlug = ref.aliasOf!;
    if (!slugToPath.has(targetSlug)) {
      addError(ref.path, `Alias target "${targetSlug}" not found`);
    }
    continue;
  }

  // Check related references
  for (const [relType, slugs] of Object.entries(ref.related)) {
    for (const relSlug of slugs) {
      if (!slugToPath.has(relSlug)) {
        addWarning(ref.path, `Related ${relType} reference "${relSlug}" not found`);
      }
    }
  }
}

// --- Validate paragraph IDs and quoted text in source HTML ---

// Cache: htmlFile -> Map<paragraphId, plain text content>
const htmlParaCache: Map<string, Map<string, string>> = new Map();

async function getHtmlParagraphs(htmlFile: string): Promise<Map<string, string>> {
  if (htmlParaCache.has(htmlFile)) return htmlParaCache.get(htmlFile)!;

  const paragraphs = new Map<string, string>();
  try {
    const content = await Bun.file(htmlFile).text();

    // Extract all id="..." values for the ID existence check
    const idPattern = /\bid="([^"]+)"/g;
    let idMatch;
    while ((idMatch = idPattern.exec(content)) !== null) {
      paragraphs.set(idMatch[1], ""); // placeholder — filled below for <p> tags
    }

    // Extract <p> content by id. Handles multiline <p> tags.
    // Match <p ...id="X"...> through </p>, possibly spanning multiple lines.
    const pPattern = /<p\s[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/p>/gi;
    let pMatch;
    while ((pMatch = pPattern.exec(content)) !== null) {
      const pid = pMatch[1];
      const rawContent = pMatch[2];
      paragraphs.set(pid, stripHtml(rawContent));
    }
  } catch {
    // File not found
  }
  htmlParaCache.set(htmlFile, paragraphs);
  return paragraphs;
}

let textChecked = 0;
let textMatched = 0;

for (const [key, ref] of allFiles) {
  if (ref.isAlias) continue;

  for (const reference of ref.references) {
    const [htmlFile, anchor] = reference.split("#");
    if (!htmlFile || !anchor) continue;

    // Strip any -s-{hash} suffix from the anchor to get the base paragraph ID
    const baseAnchor = anchor.replace(/-s-[a-f0-9]{7}$/, "");

    const paragraphs = await getHtmlParagraphs(htmlFile);
    if (paragraphs.size === 0) {
      addWarning(ref.path, `Source file "${htmlFile}" not found or has no IDs`);
      continue;
    }

    if (!paragraphs.has(baseAnchor)) {
      addError(ref.path, `Paragraph ID "${baseAnchor}" not found in ${htmlFile}`);
      continue;
    }

    // Verify quoted text exists in the paragraph
    const quotes = ref.textQuotes.get(reference);
    if (quotes) {
      const paraText = paragraphs.get(baseAnchor) || "";
      if (!paraText) {
        // ID exists but no paragraph content extracted (might be on a non-<p> tag)
        addWarning(ref.path, `ID "${baseAnchor}" exists but no <p> content found to verify text`);
        continue;
      }
      for (const quote of quotes) {
        textChecked++;
        const normQuote = normalizeForMatch(quote);
        const normPara = normalizeForMatch(paraText);

        if (normPara.includes(normQuote)) {
          textMatched++;
        } else if (normQuote.includes("...")) {
          // Quote uses "..." to abbreviate — check each segment between ellipses
          const segments = normQuote.split(/\.{3,}/).map(s => s.trim()).filter(s => s.length > 10);
          const allFound = segments.length > 0 && segments.every(seg => normPara.includes(seg));
          if (allFound) {
            textMatched++;
          } else {
            // Try first segment only (agent may have heavily abbreviated)
            const firstSeg = segments[0];
            if (firstSeg && normPara.includes(firstSeg)) {
              addWarning(ref.path, `Text partially matches at "${baseAnchor}" (first segment OK, later segments differ)`);
              textMatched++;
            } else {
              addError(ref.path, `Quoted text not found in paragraph "${baseAnchor}": "${normQuote.slice(0, 80)}..."`);
            }
          }
        } else {
          // Try a prefix match (first 50 normalized chars)
          const prefix = normQuote.slice(0, 50);
          if (normPara.includes(prefix)) {
            addWarning(ref.path, `Text partially matches at "${baseAnchor}" (prefix OK, full text differs)`);
            textMatched++;
          } else {
            addError(ref.path, `Quoted text not found in paragraph "${baseAnchor}": "${normQuote.slice(0, 80)}..."`);
          }
        }
      }
    }
  }
}

// --- Summary ---

const totalRefs = [...allFiles.values()].filter((r) => !r.isAlias).length;
const totalAliases = [...allFiles.values()].filter((r) => r.isAlias).length;

console.log(`\nValidated ${totalRefs} ref files + ${totalAliases} aliases`);
console.log(`Text quotes checked: ${textMatched}/${textChecked} matched\n`);

if (errors.length === 0 && warnings.length === 0) {
  console.log("All checks passed.");
} else {
  if (errors.length > 0) {
    console.log(`ERRORS (${errors.length}):`);
    for (const e of errors) {
      console.log(`  ${e.file}: ${e.message}`);
    }
  }
  if (warnings.length > 0) {
    console.log(`\nWARNINGS (${warnings.length}):`);
    for (const w of warnings) {
      console.log(`  ${w.file}: ${w.message}`);
    }
  }
}

process.exit(errors.length > 0 ? 1 : 0);
