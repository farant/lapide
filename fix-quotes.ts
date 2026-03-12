/**
 * fix-quotes.ts — Fix quotation marks in translated HTML files.
 *
 * Some languages use non-ASCII quotation marks that LLM tokenizers
 * consistently get wrong (e.g., Hungarian „..." where agents produce
 * the correct opening „ but use ASCII " for the close).
 *
 * Usage:
 *   bun fix-quotes.ts <file.html> [file2.html ...]
 *   bun fix-quotes.ts quotes_hu/*.html
 *
 * Fixes are applied only inside text nodes — HTML attributes are untouched.
 */

const LANG_RULES: Record<string, { open: string; close: string; asciiClose: string }[]> = {
  // Hungarian: „..." — opening „ (U+201E), closing " (U+201D)
  hu: [{ open: "\u201E", close: "\u201D", asciiClose: '"' }],
  // Dutch: „..." — same pattern as Hungarian
  nl: [{ open: "\u201E", close: "\u201D", asciiClose: '"' }],
  // German: „..." — same pattern as Hungarian
  de: [{ open: "\u201E", close: "\u201D", asciiClose: '"' }],
  // Polish: „..." — same pattern as Hungarian
  pl: [{ open: "\u201E", close: "\u201D", asciiClose: '"' }],
  // Romanian: „..." — same pattern as Hungarian
  ro: [{ open: "\u201E", close: "\u201D", asciiClose: '"' }],
};

function detectLang(content: string): string | null {
  const match = content.match(/<html[^>]*\slang="([^"]+)"/);
  return match ? match[1] : null;
}

function fixQuotes(content: string, rules: { open: string; close: string; asciiClose: string }[]): string {
  // Split into HTML tags and text nodes
  const parts = content.split(/(<[^>]+>)/);

  // Track quote state across text nodes — a quote opened in one <em> may
  // close in a later text node after </em> or in a different <p>.
  for (const rule of rules) {
    let inQuote = false;

    for (let i = 0; i < parts.length; i++) {
      if (parts[i].startsWith("<")) continue; // skip HTML tags

      let text = parts[i];
      let result = "";

      for (let j = 0; j < text.length; j++) {
        const ch = text[j];
        if (ch === rule.open) {
          inQuote = true;
          result += ch;
        } else if (inQuote && ch === rule.asciiClose) {
          result += rule.close;
          inQuote = false;
        } else {
          result += ch;
        }
      }
      parts[i] = result;
    }
  }

  return parts.join("");
}

// --- main ---
const files = process.argv.slice(2);
if (files.length === 0) {
  console.log("Usage: bun fix-quotes.ts <file.html> [file2.html ...]");
  process.exit(0);
}

let totalFixed = 0;

for (const filepath of files) {
  const content = await Bun.file(filepath).text();
  const lang = detectLang(content);
  const rules = lang && LANG_RULES[lang];

  if (!rules) {
    // For quote partials (no <html> tag), infer from directory name
    const dirMatch = filepath.match(/quotes_(\w+)\//);
    const dirLang = dirMatch ? dirMatch[1] : null;
    const dirRules = dirLang && LANG_RULES[dirLang];

    if (!dirRules) {
      console.log(`  skip: ${filepath} (no rules for lang=${lang || dirLang || "unknown"})`);
      continue;
    }

    const fixed = fixQuotes(content, dirRules);
    if (fixed !== content) {
      await Bun.write(filepath, fixed);
      const count = countDiffs(content, fixed);
      totalFixed += count;
      console.log(`  fixed: ${filepath} (${count} quotes)`);
    } else {
      console.log(`  clean: ${filepath}`);
    }
    continue;
  }

  const fixed = fixQuotes(content, rules);
  if (fixed !== content) {
    await Bun.write(filepath, fixed);
    const count = countDiffs(content, fixed);
    totalFixed += count;
    console.log(`  fixed: ${filepath} (${count} quotes)`);
  } else {
    console.log(`  clean: ${filepath}`);
  }
}

console.log(`\nTotal fixes: ${totalFixed}`);

function countDiffs(a: string, b: string): number {
  let count = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) count++;
  }
  return count;
}
