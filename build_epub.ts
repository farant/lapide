#!/usr/bin/env bun
/**
 * Build an EPUB of Cornelius a Lapide's Commentary on Genesis.
 * Zero npm dependencies — uses Bun APIs + system `zip`.
 *
 * Usage: bun run build_epub.ts
 * Output: lapide_genesis.epub
 */

import { readdir, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

const SRC_DIR = import.meta.dir;
const BUILD_DIR = join(SRC_DIR, ".epub_build");
const OUTPUT = join(SRC_DIR, "lapide_genesis.epub");

const BOOK_TITLE = "Commentary on Genesis — Cornelius a Lapide";
const BOOK_AUTHOR = "Cornelius a Lapide";
const BOOK_LANG = "en";
const BOOK_ID = "lapide-genesis-commentary";

// Roman numerals for chapter titles
const ROMAN = [
  "", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
  "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX",
  "XXI", "XXII", "XXIII", "XXIV", "XXV", "XXVI", "XXVII", "XXVIII", "XXIX", "XXX",
  "XXXI", "XXXII", "XXXIII", "XXXIV", "XXXV", "XXXVI", "XXXVII", "XXXVIII", "XXXIX", "XL",
  "XLI", "XLII", "XLIII", "XLIV", "XLV", "XLVI", "XLVII", "XLVIII", "XLIX", "L",
];

/** Extract body content from an HTML file, stripping nav divs and site chrome. */
function extractBody(html: string): string {
  // Get content between <body> and </body>
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (!bodyMatch) throw new Error("No <body> found");
  let body = bodyMatch[1];

  // Remove nav divs (they contain nested divs for .prev/.next)
  body = body.replace(/<div class="nav">[\s\S]*?<\/div>\s*<\/div>\s*/g, "");

  // Remove the leading "Cornelius a Lapide" byline (it's on every page, we'll put it in metadata)
  body = body.replace(/\s*<p><b>Cornelius a Lapide<\/b><\/p>\s*/, "\n");

  // Self-close void elements for XHTML compliance
  body = body.replace(/<hr\s*\/?>/g, "<hr />");
  body = body.replace(/<br\s*\/?>/g, "<br />");
  body = body.replace(/<img([^>]*?)(?<!\/)>/g, "<img$1 />");

  // Fix & that aren't already entities
  body = body.replace(/&(?!amp;|lt;|gt;|quot;|apos;|#)/g, "&amp;");

  return body.trim();
}

/** Build an XHTML chapter file. */
function buildChapter(body: string, title: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="${BOOK_LANG}">
<head>
<meta charset="UTF-8" />
<title>${title}</title>
<link rel="stylesheet" type="text/css" href="style.css" />
</head>
<body>
${body}
</body>
</html>`;
}

/** Build the EPUB stylesheet (adapted from site style.css). */
function buildStylesheet(): string {
  return `body {
  max-width: 100%;
  margin: 0;
  padding: 0;
  line-height: 160%;
  font-family: serif;
}

h1 {
  line-height: 140%;
  margin-top: 1em;
  margin-bottom: 0.5em;
}

hr {
  margin-top: 2em;
  margin-bottom: 2em;
}

a {
  color: blue;
  text-decoration: none;
}

.note {
  margin-top: 4em;
  font-style: italic;
  opacity: 0.5;
}
`;
}

/** Build the OPF package document. */
function buildOpf(chapters: { id: string; file: string; title: string }[]): string {
  const manifest = chapters
    .map((ch) => `    <item id="${ch.id}" href="${ch.file}" media-type="application/xhtml+xml" />`)
    .join("\n");

  const spine = chapters.map((ch) => `    <itemref idref="${ch.id}" />`).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">${BOOK_ID}</dc:identifier>
    <dc:title>${BOOK_TITLE}</dc:title>
    <dc:creator>${BOOK_AUTHOR}</dc:creator>
    <dc:language>${BOOK_LANG}</dc:language>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z/, "Z")}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav" />
    <item id="style" href="style.css" media-type="text/css" />
${manifest}
  </manifest>
  <spine>
${spine}
  </spine>
</package>`;
}

/** Build the EPUB3 navigation document. */
function buildNav(chapters: { id: string; file: string; title: string }[]): string {
  const items = chapters.map((ch) => `      <li><a href="${ch.file}">${ch.title}</a></li>`).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${BOOK_LANG}">
<head>
<meta charset="UTF-8" />
<title>Table of Contents</title>
</head>
<body>
<nav epub:type="toc" id="toc">
  <h1>Table of Contents</h1>
  <ol>
${items}
  </ol>
</nav>
</body>
</html>`;
}

/** Build container.xml */
function buildContainer(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml" />
  </rootfiles>
</container>`;
}

// ---------- Main ----------

async function main() {
  console.log("Building EPUB...");

  // Clean and create build directory
  await rm(BUILD_DIR, { recursive: true, force: true });
  await mkdir(join(BUILD_DIR, "META-INF"), { recursive: true });
  await mkdir(join(BUILD_DIR, "OEBPS"), { recursive: true });

  // Find all Genesis chapter files and sort numerically
  const files = (await readdir(SRC_DIR))
    .filter((f) => /^01_genesis_\d+\.html$/.test(f))
    .sort((a, b) => {
      const numA = parseInt(a.match(/(\d+)\.html$/)![1]);
      const numB = parseInt(b.match(/(\d+)\.html$/)![1]);
      return numA - numB;
    });

  console.log(`Found ${files.length} chapters`);

  const chapters: { id: string; file: string; title: string }[] = [];

  for (const file of files) {
    const num = parseInt(file.match(/(\d+)\.html$/)![1]);
    const chapterId = `chapter-${num}`;
    const chapterFile = `chapter_${String(num).padStart(2, "0")}.xhtml`;
    const title = `Genesis ${ROMAN[num]}`;

    const html = await Bun.file(join(SRC_DIR, file)).text();
    const body = extractBody(html);
    const xhtml = buildChapter(body, title);

    await Bun.write(join(BUILD_DIR, "OEBPS", chapterFile), xhtml);
    chapters.push({ id: chapterId, file: chapterFile, title });
  }

  // Write mimetype (must be first in ZIP, uncompressed)
  await Bun.write(join(BUILD_DIR, "mimetype"), "application/epub+zip");

  // Write container.xml
  await Bun.write(join(BUILD_DIR, "META-INF", "container.xml"), buildContainer());

  // Write OPF
  await Bun.write(join(BUILD_DIR, "OEBPS", "content.opf"), buildOpf(chapters));

  // Write nav
  await Bun.write(join(BUILD_DIR, "OEBPS", "nav.xhtml"), buildNav(chapters));

  // Write stylesheet
  await Bun.write(join(BUILD_DIR, "OEBPS", "style.css"), buildStylesheet());

  // Build the ZIP using system zip
  // EPUB spec: mimetype must be first entry, stored (not compressed)
  const zipProc = Bun.spawn(
    ["bash", "-c", [
      `cd "${BUILD_DIR}"`,
      `rm -f "${OUTPUT}"`,
      // Add mimetype first, stored (no compression)
      `zip -0 -X "${OUTPUT}" mimetype`,
      // Add everything else, compressed
      `zip -r -X "${OUTPUT}" META-INF OEBPS`,
    ].join(" && ")],
    { stdout: "pipe", stderr: "pipe" }
  );

  const exitCode = await zipProc.exited;
  if (exitCode !== 0) {
    const stderr = await new Response(zipProc.stderr).text();
    throw new Error(`zip failed (exit ${exitCode}): ${stderr}`);
  }

  // Clean up build directory
  await rm(BUILD_DIR, { recursive: true, force: true });

  const stat = Bun.file(OUTPUT);
  console.log(`Done! ${OUTPUT} (${(stat.size / 1024).toFixed(0)} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
