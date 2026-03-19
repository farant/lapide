#!/usr/bin/env bun
/**
 * Build EPUBs from lapide.org HTML content.
 * Zero npm dependencies — uses Bun APIs + system `zip`.
 *
 * Usage:
 *   bun run build_epub.ts                  — build Pentateuch EPUB (English)
 *   bun run build_epub.ts --lang es        — build Pentateuch EPUB (Spanish)
 *   bun run build_epub.ts beda_venerabilis — build EPUB for an author
 *   bun run build_epub.ts --all            — build Pentateuch + all author EPUBs
 *
 * Output: lapide_pentateuch.epub or epub/<author>.epub
 */

import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

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

// Roman numerals for chapter titles (max 50 = Genesis)
const ROMAN = [
  "", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
  "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX",
  "XXI", "XXII", "XXIII", "XXIV", "XXV", "XXVI", "XXVII", "XXVIII", "XXIX", "XXX",
  "XXXI", "XXXII", "XXXIII", "XXXIV", "XXXV", "XXXVI", "XXXVII", "XXXVIII", "XXXIX", "XL",
  "XLI", "XLII", "XLIII", "XLIV", "XLV", "XLVI", "XLVII", "XLVIII", "XLIX", "L",
];

// ---------- Pentateuch Book Definitions ----------

type BookDef = {
  key: string;
  filePrefix: string;
  maxChapter: number;
  extras: { file: string; id: string }[];
};

const PENTATEUCH_BOOKS: BookDef[] = [
  {
    key: "genesis",
    filePrefix: "01_genesis",
    maxChapter: 50,
    extras: [
      { file: "01_Genesis_Synopsis_Historiae_Chronologiae_Doxologia", id: "genesis-synopsis" },
    ],
  },
  {
    key: "exodus",
    filePrefix: "02_exodus",
    maxChapter: 40,
    extras: [
      { file: "02_Exodus_Doxologia_Dei_Salvatoris", id: "exodus-doxologia" },
      { file: "02_Dissertatiunculae_Tres", id: "dissertatiunculae" },
    ],
  },
  {
    key: "leviticus",
    filePrefix: "03_leviticus",
    maxChapter: 27,
    extras: [
      { file: "03_Leviticus_Doxologia", id: "leviticus-doxologia" },
    ],
  },
  {
    key: "numbers",
    filePrefix: "04_numeri",
    maxChapter: 36,
    extras: [
      { file: "04_Numeri_Doxologia", id: "numbers-doxologia" },
    ],
  },
  {
    key: "deuteronomy",
    filePrefix: "05_deuteronomium",
    maxChapter: 34,
    extras: [
      { file: "05_Deuteronomium_Doxologia", id: "deuteronomy-doxologia" },
      { file: "05_Synopsis_Omnium_Praeceptorum", id: "synopsis-praeceptorum" },
    ],
  },
];

// Per-language labels for the Pentateuch EPUB
const PENTATEUCH_I18N: Record<string, {
  bookTitle: string;
  frontMatterLabel: string;
  bookNames: Record<string, string>;
}> = {
  en: {
    bookTitle: "Commentary on the Pentateuch — Cornelius a Lapide",
    frontMatterLabel: "Front Matter",
    bookNames: {
      genesis: "Genesis", exodus: "Exodus", leviticus: "Leviticus",
      numbers: "Numbers", deuteronomy: "Deuteronomy",
    },
  },
  la: {
    bookTitle: "Commentaria in Pentateuchum Mosis — Cornelius a Lapide",
    frontMatterLabel: "Prolegomena",
    bookNames: {
      genesis: "Genesis", exodus: "Exodus", leviticus: "Leviticus",
      numbers: "Numeri", deuteronomy: "Deuteronomium",
    },
  },
  es: {
    bookTitle: "Comentario sobre el Pentateuco — Cornelius a Lapide",
    frontMatterLabel: "Preliminares",
    bookNames: {
      genesis: "Génesis", exodus: "Éxodo", leviticus: "Levítico",
      numbers: "Números", deuteronomy: "Deuteronomio",
    },
  },
  fr: {
    bookTitle: "Commentaire sur le Pentateuque — Cornelius a Lapide",
    frontMatterLabel: "Préliminaires",
    bookNames: {
      genesis: "Genèse", exodus: "Exode", leviticus: "Lévitique",
      numbers: "Nombres", deuteronomy: "Deutéronome",
    },
  },
  pt: {
    bookTitle: "Comentário ao Pentateuco — Cornelius a Lapide",
    frontMatterLabel: "Preliminares",
    bookNames: {
      genesis: "Génesis", exodus: "Êxodo", leviticus: "Levítico",
      numbers: "Números", deuteronomy: "Deuteronómio",
    },
  },
  it: {
    bookTitle: "Commentario sul Pentateuco — Cornelius a Lapide",
    frontMatterLabel: "Preliminari",
    bookNames: {
      genesis: "Genesi", exodus: "Esodo", leviticus: "Levitico",
      numbers: "Numeri", deuteronomy: "Deuteronomio",
    },
  },
  ar: {
    bookTitle: "تَفْسِيرُ أَسْفَارِ مُوسَى الْخَمْسَةِ — كُورْنِيلِيُوسْ آ لَابِيدِي",
    frontMatterLabel: "مُقَدِّمَاتٌ",
    bookNames: {
      genesis: "التَّكْوِينُ", exodus: "الخُرُوجُ", leviticus: "اللَّاوِيِّينَ",
      numbers: "العَدَدُ", deuteronomy: "التَّثْنِيَةُ",
    },
  },
  id: {
    bookTitle: "Tafsir Pentateukh — Cornelius a Lapide",
    frontMatterLabel: "Pendahuluan",
    bookNames: {
      genesis: "Kejadian", exodus: "Keluaran", leviticus: "Imamat",
      numbers: "Bilangan", deuteronomy: "Ulangan",
    },
  },
};

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

/** Extract the <title> from an HTML file (text before the em dash), XML-escaped. */
function extractTitle(html: string): string {
  const match = html.match(/<title>([^<]+)<\/title>/i);
  if (!match) return "Untitled";
  // Title format is "Work Title — Author Name", we want just the work title
  const full = match[1].trim();
  const dashIdx = full.indexOf(" — ");
  const title = dashIdx > 0 ? full.substring(0, dashIdx) : full;
  return title.replace(/&(?!amp;|lt;|gt;|quot;|apos;)/g, "&amp;");
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
type Section = { title: string; chapters: Chapter[] };

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

function buildNav(sections: Section[]): string {
  let tocBody: string;

  if (sections.length === 1 && !sections[0].title) {
    // Flat TOC (author EPUBs)
    tocBody = sections[0].chapters
      .map((ch) => `      <li><a href="${ch.file}">${ch.title}</a></li>`)
      .join("\n");
  } else {
    // Nested TOC (Pentateuch)
    tocBody = sections.map((section) => {
      const children = section.chapters
        .map((ch) => `          <li><a href="${ch.file}">${ch.title}</a></li>`)
        .join("\n");
      return `      <li><span>${section.title}</span>\n        <ol>\n${children}\n        </ol>\n      </li>`;
    }).join("\n");
  }

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
${tocBody}
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

async function writeEpub(outputPath: string, chapters: Chapter[], bookId: string, bookTitle: string, bookAuthor: string, sections?: Section[]) {
  const navSections = sections || [{ title: "", chapters }];

  // Write scaffolding
  await Bun.write(join(BUILD_DIR, "mimetype"), "application/epub+zip");
  await Bun.write(join(BUILD_DIR, "META-INF", "container.xml"), buildContainer());
  await Bun.write(join(BUILD_DIR, "OEBPS", "content.opf"), buildOpf(bookId, bookTitle, bookAuthor, chapters));
  await Bun.write(join(BUILD_DIR, "OEBPS", "nav.xhtml"), buildNav(navSections));
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

const FRONT_MATTER_FILES = [
  { file: "01_Preliminares", id: "preliminares", epubFile: "preliminares.xhtml" },
  { file: "02_Clemens_Hieronymi_Du_Culte", id: "hieronymi-du-culte", epubFile: "hieronymi_du_culte.xhtml" },
  { file: "12_Proemium_Et_Encomium_Sacrae_Scripturae", id: "proemium", epubFile: "proemium.xhtml" },
  { file: "14_Commentaria_In_Pentateuchum_Mosis_Canones", id: "canones", epubFile: "canones.xhtml" },
];

async function buildPentateuch(langSuffix = "") {
  const lang = SUFFIX_TO_LANG[langSuffix] || "en";
  const label = langSuffix ? ` [${lang}]` : "";
  console.log(`Building Pentateuch EPUB${label}...`);
  bookLang = lang;
  await resetBuildDir();

  const i18n = PENTATEUCH_I18N[lang] || PENTATEUCH_I18N["en"];
  const sections: Section[] = [];

  // Front matter section
  const frontMatterChapters: Chapter[] = [];
  for (const fm of FRONT_MATTER_FILES) {
    const srcFile = `${fm.file}${langSuffix}.html`;
    const srcPath = join(SRC_DIR, srcFile);
    if (!(await Bun.file(srcPath).exists())) {
      console.warn(`  Warning: missing ${srcFile}, skipping`);
      continue;
    }
    const html = await Bun.file(srcPath).text();
    const title = extractTitle(html);
    const body = extractBody(html);
    await Bun.write(join(BUILD_DIR, "OEBPS", fm.epubFile), buildXhtml(body, title));
    frontMatterChapters.push({ id: fm.id, file: fm.epubFile, title });
  }
  sections.push({ title: i18n.frontMatterLabel, chapters: frontMatterChapters });

  // Each book of the Pentateuch
  for (const book of PENTATEUCH_BOOKS) {
    const bookName = i18n.bookNames[book.key] || book.key;
    const bookChapters: Chapter[] = [];

    // Numbered chapters
    for (let num = 1; num <= book.maxChapter; num++) {
      const paddedNum = String(num).padStart(2, "0");
      const srcFile = `${book.filePrefix}_${paddedNum}${langSuffix}.html`;
      const srcPath = join(SRC_DIR, srcFile);
      if (!(await Bun.file(srcPath).exists())) {
        console.warn(`  Warning: missing ${srcFile}, skipping`);
        continue;
      }

      const chapterId = `${book.key}-${num}`;
      const chapterFile = `${book.key}_${paddedNum}.xhtml`;
      const title = `${bookName} ${ROMAN[num]}`;

      const html = await Bun.file(srcPath).text();
      const body = extractBody(html);
      await Bun.write(join(BUILD_DIR, "OEBPS", chapterFile), buildXhtml(body, title));
      bookChapters.push({ id: chapterId, file: chapterFile, title });
    }

    // Extra files (Doxologia, Synopsis, Dissertatiunculae)
    for (const extra of book.extras) {
      const srcFile = `${extra.file}${langSuffix}.html`;
      const srcPath = join(SRC_DIR, srcFile);
      if (!(await Bun.file(srcPath).exists())) continue; // silently skip missing extras

      const html = await Bun.file(srcPath).text();
      const title = extractTitle(html);
      const body = extractBody(html);
      const epubFile = `${extra.id}.xhtml`;
      await Bun.write(join(BUILD_DIR, "OEBPS", epubFile), buildXhtml(body, title));
      bookChapters.push({ id: extra.id, file: epubFile, title });
    }

    sections.push({ title: bookName, chapters: bookChapters });
  }

  // Summary
  const totalChapters = sections.reduce((sum, s) => sum + s.chapters.length, 0);
  console.log(`  ${sections.length} sections, ${totalChapters} total files`);

  const allChapters = sections.flatMap((s) => s.chapters);
  const epubName = langSuffix ? `lapide_pentateuch${langSuffix}.epub` : "lapide_pentateuch.epub";
  await writeEpub(
    join(SRC_DIR, epubName),
    allChapters,
    `lapide-pentateuch${langSuffix ? `-${lang}` : ""}`,
    i18n.bookTitle,
    "Cornelius a Lapide",
    sections
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
    // Default: build Pentateuch
    await buildPentateuch(langSuffix);
  } else if (arg === "--all") {
    // Build Pentateuch + all authors
    await buildPentateuch(langSuffix);
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
