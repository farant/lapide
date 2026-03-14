/**
 * tag-entity-refs.ts — Stage 5: Add <entity-ref> tags to source HTML
 *
 * Reads all ref files to identify entities and their names/aliases.
 * Scans the source HTML for entity name mentions and wraps them with
 * <entity-ref slug="...">Name</entity-ref> web component tags.
 *
 * - Tags first mention of each entity per section (not every occurrence)
 * - Unambiguous names (mapping to a single entity) are tagged in all paragraphs
 * - Ambiguous names (mapping to multiple entities) are only tagged in paragraphs
 *   where the ref file explicitly references that entity
 * - Text inside <a> tags is skipped (already linked)
 * - Names are matched as whole words, longest match first
 * - Reads entity-ref-overrides.json from the extractions folder (if present)
 *   to apply human-reviewed exclusions and forced slug resolutions
 *
 * Idempotent — strips existing <entity-ref> tags before re-tagging.
 *
 * Usage: bun tag-entity-refs.ts <source.html>
 */

import { Glob } from "bun";
import { splitSegments, getSection } from "./pipeline-utils";

const sourceFile = Bun.argv[2];
if (!sourceFile) {
  console.error("Usage: bun tag-entity-refs.ts <source.html>");
  process.exit(1);
}

const REFS_DIR = "index/refs";

// --- Step 1: Parse ref files ---

interface EntityData {
  slug: string;
  name: string;
  alsoKnownAs: string[];
  referencedParagraphs: Set<string>;
}

const entities = new Map<string, EntityData>();
const sourceBasename = sourceFile.replace(/^.*\//, "");

const glob = new Glob("**/*.md");
for await (const path of glob.scan(REFS_DIR)) {
  const fullPath = `${REFS_DIR}/${path}`;
  const content = await Bun.file(fullPath).text();

  if (/^alias_of:/m.test(content)) continue;

  const slugMatch = content.match(/^slug:\s*(.+)$/m);
  const nameMatch = content.match(/^name:\s*(.+)$/m);
  if (!slugMatch || !nameMatch) continue;

  const slug = slugMatch[1].trim();
  const name = nameMatch[1].trim().replace(/^["']|["']$/g, "");

  // Parse also_known_as
  const alsoKnownAs: string[] = [];
  const lines = content.split("\n");
  let inAka = false;
  for (const line of lines) {
    if (/^also_known_as:/.test(line)) {
      inAka = true;
      continue;
    }
    if (inAka) {
      const m = line.match(/^\s+-\s+(.+)/);
      if (m) {
        alsoKnownAs.push(m[1].trim().replace(/^["']|["']$/g, ""));
      } else if (/^\w/.test(line)) {
        inAka = false;
      }
    }
  }

  // Find paragraph references to this source
  const referencedParagraphs = new Set<string>();
  const refPattern = new RegExp(
    "`" + sourceBasename.replace(/\./g, "\\.") + "#([^`]+)`", "g"
  );
  let refMatch;
  while ((refMatch = refPattern.exec(content)) !== null) {
    const paraId = refMatch[1].replace(/-s-[a-f0-9]{7}$/, "");
    referencedParagraphs.add(paraId);
  }

  entities.set(slug, { slug, name, alsoKnownAs, referencedParagraphs });
}

console.log(`Loaded ${entities.size} entities from ref files`);

// --- Step 2: Build name index ---

const nameToSlugs = new Map<string, Set<string>>();

function addName(name: string, slug: string) {
  if (name.length < 3) return;
  if (!nameToSlugs.has(name)) nameToSlugs.set(name, new Set());
  nameToSlugs.get(name)!.add(slug);
}

const PREFIXES = ["St. ", "Saint ", "Pope ", "Bl. ", "Blessed ", "Brother "];

// Qualifier patterns that can be dropped to make shorter name forms
// e.g., "Augustine of Hippo" → "Augustine", "Basil the Great" → "Basil"
const QUALIFIER_RE = /\s+(the |of |von |de |du )\S+.*$/i;

for (const [slug, entity] of entities) {
  const allNames = [entity.name, ...entity.alsoKnownAs];
  for (const name of allNames) {
    addName(name, slug);

    // Strip prefixes to get short forms
    for (const prefix of PREFIXES) {
      if (name.startsWith(prefix)) {
        addName(name.slice(prefix.length), slug);
      }
    }

    // Interchange St. ↔ Saint, Bl. ↔ Blessed
    if (name.startsWith("St. ")) {
      addName("Saint " + name.slice(4), slug);
    }
    if (name.startsWith("Saint ")) {
      addName("St. " + name.slice(6), slug);
    }
    if (name.startsWith("Bl. ")) {
      addName("Blessed " + name.slice(4), slug);
    }
    if (name.startsWith("Blessed ")) {
      addName("Bl. " + name.slice(8), slug);
    }

    // Generate shorter forms by dropping qualifiers ("of Hippo", "the Great", etc.)
    // Only for names that start with a title prefix (person names with qualifiers).
    // Avoids generating overly generic short forms from bibliography titles like
    // "Epistles of St. Cyprian" → "Epistles".
    const formsToShorten: string[] = [];
    for (const prefix of PREFIXES) {
      if (name.startsWith(prefix)) {
        formsToShorten.push(name);
        formsToShorten.push(name.slice(prefix.length));
      }
    }
    for (const form of formsToShorten) {
      if (QUALIFIER_RE.test(form)) {
        const shortened = form.replace(QUALIFIER_RE, "");
        if (shortened.length >= 4) {
          addName(shortened, slug);
          // Also add with St./Saint prefix if the original had one
          if (name.startsWith("St. ")) {
            addName("St. " + shortened, slug);
            addName("Saint " + shortened, slug);
          } else if (name.startsWith("Saint ")) {
            addName("Saint " + shortened, slug);
            addName("St. " + shortened, slug);
          }
        }
      }
    }
  }
}

const unambiguousNames = new Map<string, string>();
const ambiguousNameMap = new Map<string, Set<string>>();

for (const [name, slugs] of nameToSlugs) {
  if (slugs.size === 1) {
    unambiguousNames.set(name, [...slugs][0]);
  } else {
    ambiguousNameMap.set(name, slugs);
  }
}

console.log(`Name index: ${unambiguousNames.size} unambiguous, ${ambiguousNameMap.size} ambiguous`);
if (ambiguousNameMap.size > 0) {
  for (const [name, slugs] of ambiguousNameMap) {
    console.log(`  ambiguous: "${name}" → ${[...slugs].join(", ")}`);
  }
}

// --- Step 2b: Load entity-ref overrides ---

interface OverrideExclude {
  text: string;
  slug: string;
  paragraph?: string;
  reason?: string;
}

interface OverrideForce {
  text: string;
  slug: string;
  paragraph: string;
  reason?: string;
}

interface Overrides {
  exclude?: OverrideExclude[];
  force?: OverrideForce[];
  global_exclude_words?: string[];
}

const sourceName = sourceBasename.replace(/\.html$/, "");
const overridesPath = `index/extractions/${sourceName}/entity-ref-overrides.json`;
let overrides: Overrides = {};

try {
  const overridesFile = Bun.file(overridesPath);
  if (await overridesFile.exists()) {
    overrides = await overridesFile.json();
    console.log(`Loaded overrides from ${overridesPath}`);
    if (overrides.global_exclude_words?.length) {
      console.log(`  Global exclude words: ${overrides.global_exclude_words.join(", ")}`);
    }
    if (overrides.exclude?.length) {
      console.log(`  Exclusions: ${overrides.exclude.length}`);
    }
    if (overrides.force?.length) {
      console.log(`  Forced resolutions: ${overrides.force.length}`);
    }
  }
} catch (e) {
  // No overrides file — that's fine
}

// Apply global_exclude_words: remove these names from the name index entirely
// Uses case-insensitive matching since ref file aliases may use different casing
if (overrides.global_exclude_words) {
  const excludeLower = new Set(overrides.global_exclude_words.map(w => w.toLowerCase()));
  for (const name of [...unambiguousNames.keys()]) {
    if (excludeLower.has(name.toLowerCase())) {
      unambiguousNames.delete(name);
    }
  }
  for (const name of [...ambiguousNameMap.keys()]) {
    if (excludeLower.has(name.toLowerCase())) {
      ambiguousNameMap.delete(name);
    }
  }
}

// Build exclude lookup: Set of "text|slug" or "text|slug|paragraph" keys
const excludeSet = new Set<string>();
if (overrides.exclude) {
  for (const ex of overrides.exclude) {
    if (ex.paragraph) {
      excludeSet.add(`${ex.text}|${ex.slug}|${ex.paragraph}`);
    } else {
      excludeSet.add(`${ex.text}|${ex.slug}`);
    }
  }
}

// Build force lookup: Map of "text|paragraph" → slug
const forceMap = new Map<string, string>();
if (overrides.force) {
  for (const f of overrides.force) {
    forceMap.set(`${f.text}|${f.paragraph}`, f.slug);
  }
}

function isExcluded(matchedText: string, slug: string, paraId: string): boolean {
  // Check paragraph-specific exclusion
  if (excludeSet.has(`${matchedText}|${slug}|${paraId}`)) return true;
  // Check global exclusion (any paragraph)
  if (excludeSet.has(`${matchedText}|${slug}`)) return true;
  return false;
}

function getForcedSlug(matchedText: string, paraId: string): string | null {
  return forceMap.get(`${matchedText}|${paraId}`) || null;
}

// --- Step 3: Read and prepare HTML ---

let html = await Bun.file(sourceFile).text();

// Strip existing entity-ref tags (idempotent)
html = html.replace(/<entity-ref[^>]*>/g, "");
html = html.replace(/<\/entity-ref>/g, "");

// --- Step 4: Tag entities ---

// Build paragraph → known entities map
const paragraphKnownEntities = new Map<string, Set<string>>();
for (const [slug, entity] of entities) {
  for (const paraId of entity.referencedParagraphs) {
    if (!paragraphKnownEntities.has(paraId)) paragraphKnownEntities.set(paraId, new Set());
    paragraphKnownEntities.get(paraId)!.add(slug);
  }
}

// Track first-per-section
const taggedPerSection = new Map<string, Set<string>>();
let totalTagged = 0;
const tagReport: { paraId: string; name: string; slug: string }[] = [];

const pPattern = /(<p\s[^>]*\bid="([^"]+)"[^>]*>)([\s\S]*?)(<\/p>)/gi;

html = html.replace(pPattern, (_, openTag, paraId, innerHtml, closeTag) => {
  const section = getSection(paraId);
  if (!taggedPerSection.has(section)) taggedPerSection.set(section, new Set());
  const sectionTagged = taggedPerSection.get(section)!;

  const knownEntities = paragraphKnownEntities.get(paraId) || new Set<string>();

  // Build search pairs for this paragraph.
  // Include ALL names (even for already-tagged entities) so that longer name
  // patterns consume text spans and prevent shorter false-positive matches.
  // E.g., "Thomas More" (already tagged) must consume "Thomas" to prevent
  // bare "Thomas" from matching as Thomas Aquinas.
  const searchPairs: { name: string; slug: string; consumeOnly: boolean }[] = [];

  // Unambiguous names — tag anywhere (consume-only if already tagged in section)
  for (const [name, slug] of unambiguousNames) {
    searchPairs.push({ name, slug, consumeOnly: sectionTagged.has(slug) });
  }

  // Ambiguous names — only if entity is known in this paragraph
  for (const [name, slugs] of ambiguousNameMap) {
    for (const slug of slugs) {
      if (knownEntities.has(slug)) {
        searchPairs.push({ name, slug, consumeOnly: sectionTagged.has(slug) });
      }
    }
  }

  // Sort by name length (longest first) to prevent partial matches
  searchPairs.sort((a, b) => b.name.length - a.name.length);

  // Process text segments
  const segments = splitSegments(innerHtml);
  let insideSkip = 0; // depth inside <a> tags

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (seg.type === "tag") {
      if (/^<a[\s>]/i.test(seg.content)) insideSkip++;
      if (/^<\/a>/i.test(seg.content)) insideSkip--;
      continue;
    }
    if (insideSkip > 0) continue;

    const text = seg.content;
    // Normalize Unicode apostrophes/quotes to ASCII for matching
    // (HTML often uses U+2019 right single quote for apostrophes like "Peter's")
    const normalizedText = text.replace(/[\u2018\u2019\u02BC]/g, "'");
    // consumed: spans blocked by longer matches (both tagged and consume-only)
    const consumed: { start: number; end: number }[] = [];
    // tagged: spans that actually get entity-ref tags
    const tagged: { start: number; end: number; matchedText: string; slug: string }[] = [];

    for (const { name, slug, consumeOnly } of searchPairs) {
      // Skip if this specific entity is already tagged AND we already have
      // a consume-only entry for it (no need to search again)
      if (consumeOnly && sectionTagged.has(slug)) {
        // Still search to consume the span
      }

      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`\\b${escaped}\\b`, "i");
      const match = regex.exec(normalizedText);

      if (!match) continue;

      const matchStart = match.index;
      const matchEnd = match.index + match[0].length;

      // Check overlap with already-consumed spans
      if (consumed.some((c) => matchStart < c.end && matchEnd > c.start)) continue;

      // Always consume the span (prevents shorter matches here)
      consumed.push({ start: matchStart, end: matchEnd });

      // Check for forced slug override (human-reviewed disambiguation)
      let effectiveSlug = slug;
      const forced = getForcedSlug(match[0], paraId);
      if (forced) {
        effectiveSlug = forced;
      }

      // Check exclusion rules (human-reviewed false positives)
      if (isExcluded(match[0], effectiveSlug, paraId)) continue;

      // Only tag if not consume-only AND not yet tagged in this section
      // (sectionTagged may have been updated by an earlier segment in this paragraph)
      if (!consumeOnly && !sectionTagged.has(effectiveSlug)) {
        tagged.push({ start: matchStart, end: matchEnd, matchedText: match[0], slug: effectiveSlug });
        sectionTagged.add(effectiveSlug);
        totalTagged++;
        tagReport.push({ paraId, name: match[0], slug: effectiveSlug });
      }
    }

    // Apply tags right-to-left to preserve character positions
    tagged.sort((a, b) => b.start - a.start);
    let newText = text;
    for (const m of tagged) {
      const original = newText.slice(m.start, m.end);
      newText =
        newText.slice(0, m.start) +
        `<entity-ref slug="${m.slug}">${original}</entity-ref>` +
        newText.slice(m.end);
    }
    segments[i] = { type: "text", content: newText };
  }

  return `${openTag}${segments.map((s) => s.content).join("")}${closeTag}`;
});

// --- Step 5: Ensure components.js script tag is present ---

const COMPONENTS_TAG = '<script src="/index/components.js" type="module"></script>';

if (!html.includes('/index/components.js')) {
  html = html.replace('</head>', `${COMPONENTS_TAG}\n</head>`);
  console.log(`\nInserted ${COMPONENTS_TAG} into <head>`);
}

// --- Step 6: Write output ---

await Bun.write(sourceFile, html);

console.log(`\nTagged ${totalTagged} entity references:`);
for (const { paraId, name, slug } of tagReport) {
  console.log(`  #${paraId}: "${name}" → ${slug}`);
}
console.log(`\nDone. Review the output in ${sourceFile}`);
