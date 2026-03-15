#!/usr/bin/env bun
/**
 * Build EPUBs from lapide.org HTML content.
 * Zero npm dependencies — uses Bun APIs + system `zip`.
 *
 * Usage:
 *   bun run build_epub.ts                  — build Genesis EPUB
 *   bun run build_epub.ts beda_venerabilis — build EPUB for an author
 *   bun run build_epub.ts --all            — build all author EPUBs
 *
 * Output: lapide_genesis.epub or epub/<author>.epub
 */

import { readdir, mkdir, rm } from "node:fs/promises";
import { join, basename } from "node:path";

const SRC_DIR = import.meta.dir;
const BUILD_DIR = join(SRC_DIR, ".epub_build");
const EPUB_DIR = join(SRC_DIR, "epub");

// Language suffix map (same as update-site.ts)
const SUFFIX_TO_LANG: Record<string, string> = {
  "": "en", "_lt": "la", "_es": "es", "_fr": "fr", "_pt": "pt",
  "_de": "de", "_zh": "zh", "_ro": "ro", "_el": "el", "_he": "he",
  "_nl": "nl", "_tr": "tr", "_sv": "sv", "_vi": "vi", "_ar": "ar",
  "_hi": "hi", "_hu": "hu", "_id": "id", "_it": "it", "_ko": "ko",
  "_ja": "ja", "_ru": "ru", "_pl": "pl", "_tl": "tl", "_fa": "fa",
  "_th": "th", "_ceb": "ceb", "_ig": "ig", "_sw": "sw", "_yo": "yo",
  "_bn": "bn", "_ta": "ta", "_ml": "ml", "_rw": "rw",
};

let bookLang = "en";

const RTL_LANGS = new Set(["ar", "he", "fa"]);

// Roman numerals for Genesis chapter titles
const ROMAN = [
  "", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
  "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX",
  "XXI", "XXII", "XXIII", "XXIV", "XXV", "XXVI", "XXVII", "XXVIII", "XXIX", "XXX",
  "XXXI", "XXXII", "XXXIII", "XXXIV", "XXXV", "XXXVI", "XXXVII", "XXXVIII", "XXXIX", "XL",
  "XLI", "XLII", "XLIII", "XLIV", "XLV", "XLVI", "XLVII", "XLVIII", "XLIX", "L",
];

// ---------- HTML Processing ----------

/** Extract body content from an HTML file, stripping nav divs and site chrome. */
function extractBody(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (!bodyMatch) throw new Error("No <body> found");
  let body = bodyMatch[1];

  // Remove nav divs (they contain nested divs for .prev/.next)
  body = body.replace(/<div class="nav">[\s\S]*?<\/div>\s*<\/div>\s*/g, "");

  // Remove leading bylines — match any <p><b>...</b></p> that appears before the <h1>
  body = body.replace(/^\s*<p><b>[^<]+<\/b><\/p>\s*/m, "\n");

  // Remove HTML comments
  body = body.replace(/<!--[\s\S]*?-->/g, "");

  // Self-close void elements for XHTML compliance
  body = body.replace(/<hr\s*\/?>/g, "<hr />");
  body = body.replace(/<br\s*\/?>/g, "<br />");
  body = body.replace(/<img([^>]*?)(?<!\/)>/g, "<img$1 />");

  // Fix & that aren't already entities
  body = body.replace(/&(?!amp;|lt;|gt;|quot;|apos;|#)/g, "&amp;");

  return body.trim();
}

/** Extract the <title> from an HTML file (text before the em dash). */
function extractTitle(html: string): string {
  const match = html.match(/<title>([^<]+)<\/title>/i);
  if (!match) return "Untitled";
  // Title format is "Work Title — Author Name", we want just the work title
  const full = match[1].trim();
  const dashIdx = full.indexOf(" — ");
  return dashIdx > 0 ? full.substring(0, dashIdx) : full;
}

/** Build an XHTML content file. */
function buildXhtml(body: string, title: string): string {
  const dir = RTL_LANGS.has(bookLang) ? ' dir="rtl"' : '';
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="${bookLang}"${dir}>
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

// ---------- EPUB Scaffolding ----------

type Chapter = { id: string; file: string; title: string };

function buildOpf(bookId: string, bookTitle: string, bookAuthor: string, chapters: Chapter[]): string {
  const manifest = chapters
    .map((ch) => `    <item id="${ch.id}" href="${ch.file}" media-type="application/xhtml+xml" />`)
    .join("\n");
  const spine = chapters.map((ch) => `    <itemref idref="${ch.id}" />`).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">${bookId}</dc:identifier>
    <dc:title>${bookTitle}</dc:title>
    <dc:creator>${bookAuthor}</dc:creator>
    <dc:language>${bookLang}</dc:language>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z/, "Z")}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav" />
    <item id="style" href="style.css" media-type="text/css" />
${manifest}
  </manifest>
  <spine${RTL_LANGS.has(bookLang) ? ' page-progression-direction="rtl"' : ''}>
${spine}
  </spine>
</package>`;
}

function buildNav(chapters: Chapter[]): string {
  const items = chapters.map((ch) => `      <li><a href="${ch.file}">${ch.title}</a></li>`).join("\n");

  const dir = RTL_LANGS.has(bookLang) ? ' dir="rtl"' : '';
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${bookLang}"${dir}>
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

function buildContainer(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml" />
  </rootfiles>
</container>`;
}

// ---------- ZIP and Write ----------

async function writeEpub(outputPath: string, chapters: Chapter[], bookId: string, bookTitle: string, bookAuthor: string) {
  // Write scaffolding
  await Bun.write(join(BUILD_DIR, "mimetype"), "application/epub+zip");
  await Bun.write(join(BUILD_DIR, "META-INF", "container.xml"), buildContainer());
  await Bun.write(join(BUILD_DIR, "OEBPS", "content.opf"), buildOpf(bookId, bookTitle, bookAuthor, chapters));
  await Bun.write(join(BUILD_DIR, "OEBPS", "nav.xhtml"), buildNav(chapters));
  await Bun.write(join(BUILD_DIR, "OEBPS", "style.css"), buildStylesheet());

  // Build ZIP
  const zipProc = Bun.spawn(
    ["bash", "-c", [
      `cd "${BUILD_DIR}"`,
      `rm -f "${outputPath}"`,
      `zip -0 -X "${outputPath}" mimetype`,
      `zip -r -X "${outputPath}" META-INF OEBPS`,
    ].join(" && ")],
    { stdout: "pipe", stderr: "pipe" }
  );

  const exitCode = await zipProc.exited;
  if (exitCode !== 0) {
    const stderr = await new Response(zipProc.stderr).text();
    throw new Error(`zip failed (exit ${exitCode}): ${stderr}`);
  }

  const stat = Bun.file(outputPath);
  console.log(`  -> ${outputPath} (${(stat.size / 1024).toFixed(0)} KB)`);
}

async function resetBuildDir() {
  await rm(BUILD_DIR, { recursive: true, force: true });
  await mkdir(join(BUILD_DIR, "META-INF"), { recursive: true });
  await mkdir(join(BUILD_DIR, "OEBPS"), { recursive: true });
}

// ---------- Language Helpers ----------

/** Convert an English href like "guigo_i/Meditationes.html" to its translated version. */
function langHref(href: string, langSuffix: string): string {
  return href.replace(/\.html$/, `${langSuffix}.html`);
}

/** Find all language suffixes that have translations for a given author. */
async function findAuthorLangs(author: AuthorInfo): Promise<string[]> {
  const found: string[] = [];
  for (const [suffix, lang] of Object.entries(SUFFIX_TO_LANG)) {
    if (suffix === "" || lang === "la") continue; // skip English and Latin
    // Check if all works have a translated version
    let allExist = true;
    for (const work of author.works) {
      const translatedPath = join(SRC_DIR, langHref(work.href, suffix));
      const file = Bun.file(translatedPath);
      if (!(await file.exists())) {
        allExist = false;
        break;
      }
    }
    if (allExist) found.push(suffix);
  }
  return found;
}

// ---------- Parse index.html for author info ----------

interface AuthorInfo {
  dir: string;
  displayName: string;
  works: { href: string; title: string }[];
}

async function parseAuthors(): Promise<AuthorInfo[]> {
  const indexHtml = await Bun.file(join(SRC_DIR, "index.html")).text();
  const authors: AuthorInfo[] = [];

  // Split by <hr> sections after the Genesis block
  // Each author section starts with <h1>Display Name (Latin Name)</h1>
  // and contains <a href="dir/File.html">Title</a> links
  const sections = indexHtml.split(/<hr\s*\/?>/);

  for (const section of sections) {
    const h1Match = section.match(/<h1>([^<]+)<\/h1>/);
    if (!h1Match) continue;
    const displayName = h1Match[1].trim();

    // Find all links to subdirectory HTML files
    const linkRegex = /<a\s+href="([^"]+\/[^"]+\.html)">\s*\n?\s*([^<]+)/g;
    const works: { href: string; title: string }[] = [];
    let m;
    while ((m = linkRegex.exec(section)) !== null) {
      works.push({ href: m[1].trim(), title: m[2].trim() });
    }

    if (works.length === 0) continue;

    // Extract directory name from first work's href
    const dir = works[0].href.split("/")[0];

    // Skip Lapide (handled separately)
    if (dir.startsWith("01_") || dir.startsWith("02_") || dir.startsWith("12_") || dir.startsWith("14_")) continue;

    authors.push({ dir, displayName, works });
  }

  return authors;
}

// ---------- Build Functions ----------

// Front matter titles per language
const GENESIS_FRONT_MATTER_TITLES: Record<string, { preliminares: string; hieronymi: string; proemium: string; canones: string; bookTitle: string }> = {
  "": {
    preliminares: "Preliminares",
    hieronymi: "Jerome's Prefaces / On the Worship of Christ in Scripture",
    proemium: "Preface and Praise of Sacred Scripture",
    canones: "Commentary on the Pentateuch of Moses",
    bookTitle: "Commentary on Genesis — Cornelius a Lapide",
  },
  "_es": {
    preliminares: "Preliminares",
    hieronymi: "Prefacios de Jerónimo / Sobre el culto de Cristo en la Escritura",
    proemium: "Prefacio y Elogio de la Sagrada Escritura",
    canones: "Comentario al Pentateuco de Moisés",
    bookTitle: "Comentario sobre el Génesis — Cornelius a Lapide",
  },
  "_fr": {
    preliminares: "Préliminaires",
    hieronymi: "Préfaces de Jérôme / Du culte du Christ dans l'Écriture",
    proemium: "Préface et Éloge de la Sainte Écriture",
    canones: "Commentaire sur le Pentateuque de Moïse",
    bookTitle: "Commentaire sur la Genèse — Cornelius a Lapide",
  },
};

async function buildGenesis(langSuffix = "") {
  const lang = SUFFIX_TO_LANG[langSuffix] || "en";
  const label = langSuffix ? ` [${lang}]` : "";
  console.log(`Building Genesis EPUB${label}...`);
  bookLang = lang;
  await resetBuildDir();

  const chapters: Chapter[] = [];

  const titles = GENESIS_FRONT_MATTER_TITLES[langSuffix] || GENESIS_FRONT_MATTER_TITLES[""];

  // Front matter
  const FRONT_MATTER = [
    { file: `01_Preliminares${langSuffix}.html`, id: "preliminares", epubFile: "preliminares.xhtml", title: titles.preliminares },
    { file: `02_Clemens_Hieronymi_Du_Culte${langSuffix}.html`, id: "hieronymi-du-culte", epubFile: "hieronymi_du_culte.xhtml", title: titles.hieronymi },
    { file: `12_Proemium_Et_Encomium_Sacrae_Scripturae${langSuffix}.html`, id: "proemium", epubFile: "proemium.xhtml", title: titles.proemium },
    { file: `14_Commentaria_In_Pentateuchum_Mosis_Canones${langSuffix}.html`, id: "canones", epubFile: "canones.xhtml", title: titles.canones },
  ];

  for (const fm of FRONT_MATTER) {
    const html = await Bun.file(join(SRC_DIR, fm.file)).text();
    const body = extractBody(html);
    await Bun.write(join(BUILD_DIR, "OEBPS", fm.epubFile), buildXhtml(body, fm.title));
    chapters.push({ id: fm.id, file: fm.epubFile, title: fm.title });
  }

  // Genesis chapters
  const pattern = langSuffix
    ? new RegExp(`^01_genesis_\\d+${langSuffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.html$`)
    : /^01_genesis_\d+\.html$/;

  const genesisFiles = (await readdir(SRC_DIR))
    .filter((f) => pattern.test(f))
    .sort((a, b) => {
      const numA = parseInt(a.match(/genesis_(\d+)/)?.[1] || "0");
      const numB = parseInt(b.match(/genesis_(\d+)/)?.[1] || "0");
      return numA - numB;
    });

  console.log(`  ${FRONT_MATTER.length} front matter + ${genesisFiles.length} chapters`);

  for (const file of genesisFiles) {
    const num = parseInt(file.match(/genesis_(\d+)/)?.[1] || "0");
    const chapterId = `chapter-${num}`;
    const chapterFile = `chapter_${String(num).padStart(2, "0")}.xhtml`;
    const genesisWord = langSuffix === "_es" ? "Génesis" : langSuffix === "_fr" ? "Genèse" : "Genesis";
    const title = `${genesisWord} ${ROMAN[num]}`;

    const html = await Bun.file(join(SRC_DIR, file)).text();
    const body = extractBody(html);
    await Bun.write(join(BUILD_DIR, "OEBPS", chapterFile), buildXhtml(body, title));
    chapters.push({ id: chapterId, file: chapterFile, title });
  }

  const epubName = langSuffix ? `lapide_genesis${langSuffix}.epub` : "lapide_genesis.epub";
  await writeEpub(
    join(SRC_DIR, epubName),
    chapters,
    `lapide-genesis-commentary${langSuffix ? `-${lang}` : ""}`,
    titles.bookTitle,
    "Cornelius a Lapide"
  );
  bookLang = "en"; // reset
}

async function buildAuthor(author: AuthorInfo, langSuffix = "") {
  const lang = SUFFIX_TO_LANG[langSuffix] || "en";
  const label = langSuffix ? ` [${lang}]` : "";
  console.log(`Building ${author.displayName}${label}...`);
  bookLang = lang;
  await resetBuildDir();

  const chapters: Chapter[] = [];

  for (let i = 0; i < author.works.length; i++) {
    const work = author.works[i];
    const href = langSuffix ? langHref(work.href, langSuffix) : work.href;
    const srcPath = join(SRC_DIR, href);
    const html = await Bun.file(srcPath).text();
    const title = extractTitle(html);
    const body = extractBody(html);
    const epubFile = `work_${String(i + 1).padStart(2, "0")}.xhtml`;
    const id = `work-${i + 1}`;

    await Bun.write(join(BUILD_DIR, "OEBPS", epubFile), buildXhtml(body, title));
    chapters.push({ id, file: epubFile, title });
  }

  const epubName = langSuffix ? `${author.dir}${langSuffix}` : author.dir;
  await mkdir(EPUB_DIR, { recursive: true });
  await writeEpub(
    join(EPUB_DIR, `${epubName}.epub`),
    chapters,
    `lapide-${epubName}`,
    author.displayName,
    author.displayName
  );
  bookLang = "en"; // reset
}

// ---------- Main ----------

async function main() {
  const args = process.argv.slice(2);
  const langIdx = args.indexOf("--lang");
  let langSuffix = "";
  if (langIdx >= 0 && args[langIdx + 1]) {
    const langCode = args[langIdx + 1];
    // Find the suffix for this language code
    const entry = Object.entries(SUFFIX_TO_LANG).find(([, l]) => l === langCode);
    if (!entry || entry[0] === "") {
      console.error(`Language "${langCode}" not supported or is the default (en).`);
      console.error("Available:", Object.values(SUFFIX_TO_LANG).filter(l => l !== "en").join(", "));
      process.exit(1);
    }
    langSuffix = entry[0];
    args.splice(langIdx, 2);
  }

  const arg = args[0];

  if (!arg) {
    // Default: build Genesis (with optional --lang)
    await buildGenesis(langSuffix);
  } else if (arg === "--all") {
    // Build Genesis + all authors (English only, or specified lang)
    if (!langSuffix) await buildGenesis();
    else await buildGenesis(langSuffix);
    const authors = await parseAuthors();
    console.log(`\nFound ${authors.length} authors`);
    for (const author of authors) {
      if (langSuffix) {
        // Check if translations exist for this author
        const href = langHref(author.works[0].href, langSuffix);
        const exists = await Bun.file(join(SRC_DIR, href)).exists();
        if (exists) await buildAuthor(author, langSuffix);
      } else {
        await buildAuthor(author);
      }
    }
  } else if (arg === "--all-langs") {
    // Build all translations for a specific author or all authors
    const authors = await parseAuthors();
    const targetDir = args[1];
    const targetAuthors = targetDir
      ? authors.filter(a => a.dir === targetDir)
      : authors;
    if (targetDir && targetAuthors.length === 0) {
      console.error(`Author "${targetDir}" not found.`);
      process.exit(1);
    }
    for (const author of targetAuthors) {
      const langs = await findAuthorLangs(author);
      for (const suffix of langs) {
        await buildAuthor(author, suffix);
      }
    }
  } else {
    // Build a specific author
    const authors = await parseAuthors();
    const author = authors.find((a) => a.dir === arg);
    if (!author) {
      console.error(`Author "${arg}" not found. Available:`);
      for (const a of authors) console.error(`  ${a.dir} — ${a.displayName}`);
      process.exit(1);
    }
    await buildAuthor(author, langSuffix);
  }

  // Clean up
  await rm(BUILD_DIR, { recursive: true, force: true });
  console.log("\nDone!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
