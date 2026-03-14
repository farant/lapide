/**
 * pipeline-utils.ts — Shared utilities for the Lapide index pipeline
 *
 * Canonical implementations imported by annotate-source.ts, validate-refs.ts,
 * tag-entity-refs.ts, lint-annotations.ts, and validate-extractions.ts.
 * Unit tests in tests/ validate these functions directly.
 */

// --- HTML stripping and entity decoding ---

export function stripHtml(html: string): string {
  return html
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
    .replace(/&OElig;/g, "\u0152")
    .replace(/&oelig;/g, "\u0153")
    .replace(/&AElig;/g, "\u00C6")
    .replace(/&aelig;/g, "\u00E6")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// --- Text normalization for fuzzy matching ---

export function normalizeForMatch(s: string): string {
  return s
    .replace(/\u0152/g, "Oe")
    .replace(/\u0153/g, "oe")
    .replace(/\u00C6/g, "Ae")
    .replace(/\u00E6/g, "ae")
    .replace(/[\u2018\u2019\u0060\u00B4']/g, "'")
    .replace(/[\u201C\u201D\u00AB\u00BB"]/g, "'")
    .replace(/\s*[\u2014]\s*/g, " -- ")
    .replace(/\s*--\s*/g, " -- ")
    .replace(/[\u2013]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

// Same as normalizeForMatch but without .trim() — preserves monotonic length
// for prefix-based offset mapping in findInPlainText
export function normalizeForPosition(s: string): string {
  return s
    .replace(/\u0152/g, "Oe")
    .replace(/\u0153/g, "oe")
    .replace(/\u00C6/g, "Ae")
    .replace(/\u00E6/g, "ae")
    .replace(/[\u2018\u2019\u0060\u00B4']/g, "'")
    .replace(/[\u201C\u201D\u00AB\u00BB"]/g, "'")
    .replace(/\s*[\u2014]\s*/g, " -- ")
    .replace(/\s*--\s*/g, " -- ")
    .replace(/[\u2013]/g, "-")
    .replace(/\s+/g, " ");
}

// --- Content hashing ---

export function computeHash(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  const data = new TextEncoder().encode(normalized);
  const hash = new Bun.CryptoHasher("sha256").update(data).digest("hex");
  return hash.slice(0, 7);
}

// --- Text location within paragraphs ---

export function findInPlainText(
  plainText: string,
  normTarget: string,
  searchFrom: number = 0
): { start: number; end: number } | null {
  const normPlain = normalizeForPosition(plainText);

  // Find position in normalized space
  const normIdx = normPlain.indexOf(
    normTarget,
    searchFrom > 0 ? normalizeForPosition(plainText.slice(0, searchFrom)).length : 0
  );
  if (normIdx < 0) return null;

  // Map normalized offset back to original offset
  let origStart = -1;
  let origEnd = -1;

  for (let i = 0, normLen = 0; i <= plainText.length; i++) {
    const normSoFar = normalizeForPosition(plainText.slice(0, i));
    if (origStart < 0 && normSoFar.length >= normIdx) {
      origStart = i;
    }
    if (origStart >= 0 && normSoFar.length >= normIdx + normTarget.length) {
      origEnd = i;
      break;
    }
  }

  if (origStart < 0 || origEnd < 0) return null;
  return { start: origStart, end: origEnd };
}

// --- HTML segment splitting (for entity-ref tagging) ---

export interface Segment {
  type: "text" | "tag";
  content: string;
}

export function splitSegments(html: string): Segment[] {
  const segments: Segment[] = [];
  let pos = 0;
  while (pos < html.length) {
    const tagStart = html.indexOf("<", pos);
    if (tagStart < 0) {
      if (pos < html.length) segments.push({ type: "text", content: html.slice(pos) });
      break;
    }
    if (tagStart > pos) {
      segments.push({ type: "text", content: html.slice(pos, tagStart) });
    }
    const tagEnd = html.indexOf(">", tagStart);
    if (tagEnd < 0) {
      segments.push({ type: "text", content: html.slice(tagStart) });
      break;
    }
    segments.push({ type: "tag", content: html.slice(tagStart, tagEnd + 1) });
    pos = tagEnd + 1;
  }
  return segments;
}

// --- Section ID extraction ---

export function getSection(paraId: string): string {
  return paraId.replace(/-p\d+$/, "");
}

// --- Paragraph ID parsing ---

export function stripHashSuffix(link: string): string {
  return link.replace(/-s-[a-f0-9]{7}$/, "");
}

// --- Ref file text line parsing ---

export function parseTextLine(line: string): string | null {
  // Accept straight " or curly \u201C / \u201D as outer delimiters
  const m = line.match(/^\s*text:\s*["\u201C](.+)["\u201D]$/);
  if (!m) return null;
  return m[1]
    .replace(/\\"/g, '"')           // unescape backslash-escaped quotes
    .replace(/^[\u201C\u201D]+/, '') // strip leading curly quotes (part of quoted text, not content)
    .replace(/[\u201C\u201D]+$/, ''); // strip trailing curly quotes
}

// --- Paragraph extraction from HTML ---

export function extractParagraphs(html: string): Map<string, string> {
  const paragraphs = new Map<string, string>();
  const pPattern = /<p\s[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/p>/gi;
  let match;
  while ((match = pPattern.exec(html)) !== null) {
    paragraphs.set(match[1], stripHtml(match[2]));
  }
  return paragraphs;
}

// --- Sidecar annotation types ---

export interface Annotation {
  id: string;
  paragraph: string;
  start: number;
  end: number;
  entities: string[];
}

export function parseSidecar(html: string): Annotation[] | null {
  const match = html.match(
    /<script type="application\/json" id="passage-annotations">([\s\S]*?)<\/script>/
  );
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

// --- Name variant generation (for entity-ref tagging) ---

const PREFIXES = ["St. ", "Saint ", "Pope ", "Bl. ", "Blessed ", "Brother "];
const QUALIFIER_RE = /\s+(the |of |von |de |du )\S+.*$/i;

export function generateNameVariants(name: string): string[] {
  const variants: string[] = [name];

  // Strip prefixes to get short forms
  for (const prefix of PREFIXES) {
    if (name.startsWith(prefix)) {
      variants.push(name.slice(prefix.length));
    }
  }

  // Interchange St. ↔ Saint, Bl. ↔ Blessed
  if (name.startsWith("St. ")) {
    variants.push("Saint " + name.slice(4));
  }
  if (name.startsWith("Saint ")) {
    variants.push("St. " + name.slice(6));
  }
  if (name.startsWith("Bl. ")) {
    variants.push("Blessed " + name.slice(4));
  }
  if (name.startsWith("Blessed ")) {
    variants.push("Bl. " + name.slice(8));
  }

  // Drop qualifiers for titled names
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
        variants.push(shortened);
        if (name.startsWith("St. ")) {
          variants.push("St. " + shortened);
          variants.push("Saint " + shortened);
        } else if (name.startsWith("Saint ")) {
          variants.push("Saint " + shortened);
          variants.push("St. " + shortened);
        }
      }
    }
  }

  // Deduplicate and filter too-short names
  return [...new Set(variants)].filter(v => v.length >= 3);
}
