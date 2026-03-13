#!/usr/bin/env bun
/**
 * generate-index.ts — Generates HTML pages from index ref files
 *
 * Usage: bun generate-index.ts
 *
 * Reads all .md ref files from index/refs/ and generates:
 * 1. Entry HTML pages in index/<category>/<slug>.html
 * 2. Alias HTML pages that redirect to canonical entries
 * 3. Directory index.html pages at every level
 * 4. index/manifest.json
 *
 * Idempotent — safe to run repeatedly.
 */

import { readdir, readFile, writeFile, mkdir, stat } from "fs/promises";
import { join, dirname, relative, basename } from "path";

const ROOT = import.meta.dir;
const REFS_DIR = join(ROOT, "index/refs");
const INDEX_DIR = join(ROOT, "index");
const BASE_URL = "https://lapide.org";

// ── OSM map tiles ──

const TILE_SIZE = 256;
const MAP_ZOOM = 5;
const TILES_DIR = join(INDEX_DIR, "tiles");

function latLonToTile(lat: number, lon: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const xFloat = (lon + 180) / 360 * n;
  const latRad = lat * Math.PI / 180;
  const yFloat = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n;
  const x = Math.floor(xFloat);
  const y = Math.floor(yFloat);
  return {
    x, y,
    px: Math.floor((xFloat - x) * TILE_SIZE),
    py: Math.floor((yFloat - y) * TILE_SIZE),
  };
}

async function downloadTile(zoom: number, x: number, y: number): Promise<void> {
  const dir = join(TILES_DIR, String(zoom), String(x));
  const filePath = join(dir, `${y}.jpg`);
  try {
    await stat(filePath);
    return; // cached
  } catch {}
  await mkdir(dir, { recursive: true });
  const url = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${y}/${x}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`  ⚠ tile ${zoom}/${x}/${y}: HTTP ${res.status}`);
    return;
  }
  await writeFile(filePath, new Uint8Array(await res.arrayBuffer()));
}

function generateMapHtml(lat: number, lon: number): string {
  const { x, y, px, py } = latLonToTile(lat, lon, MAP_ZOOM);
  const markerX = TILE_SIZE + px;
  const markerY = TILE_SIZE + py;
  const tiles: string[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      tiles.push(`      <img src="/index/tiles/${MAP_ZOOM}/${x + dx}/${y + dy}.jpg" alt="">`);
    }
  }
  return `  <div class="osm-map">
    <div class="osm-map-grid" style="left: calc(50% - ${markerX}px); top: calc(50% - ${markerY}px);">
${tiles.join("\n")}
    </div>
    <div class="osm-map-pin"></div>
    <div class="osm-map-attr">&copy; Esri, Maxar, Earthstar Geographics</div>
  </div>`;
}

// ── YAML frontmatter parser (handles our subset) ──

interface RefData {
  frontmatter: Record<string, any>;
  body: string;
  filePath: string;
}

function parseFrontmatter(content: string): { frontmatter: Record<string, any>; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: content };

  const yamlStr = match[1];
  const body = match[2].trim();
  const frontmatter = parseYaml(yamlStr);
  return { frontmatter, body };
}

function parseYaml(str: string): Record<string, any> {
  const result: Record<string, any> = {};
  const lines = str.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip empty lines
    if (line.trim() === "") { i++; continue; }

    // Match top-level key
    const keyMatch = line.match(/^(\w[\w_]*)\s*:\s*(.*)$/);
    if (!keyMatch) { i++; continue; }

    const key = keyMatch[1];
    let value = keyMatch[2].trim();

    if (value === "") {
      // Could be a nested object or list
      const nextLine = lines[i + 1] || "";
      const nextIndent = nextLine.match(/^(\s*)/)?.[1].length || 0;

      if (nextIndent > 0 && nextLine.trim().startsWith("-")) {
        // It's a list
        const items: any[] = [];
        i++;
        while (i < lines.length) {
          const l = lines[i];
          if (l.trim() === "") { i++; continue; }
          const indent = l.match(/^(\s*)/)?.[1].length || 0;
          if (indent === 0) break;

          if (l.trim().startsWith("- ")) {
            items.push(unquote(l.trim().slice(2).trim()));
            i++;
          } else {
            break;
          }
        }
        result[key] = items;
      } else if (nextIndent > 0) {
        // Nested object
        const obj: Record<string, any> = {};
        i++;
        while (i < lines.length) {
          const l = lines[i];
          if (l.trim() === "") { i++; continue; }
          const indent = l.match(/^(\s*)/)?.[1].length || 0;
          if (indent === 0) break;

          const nestedKeyMatch = l.trim().match(/^(\w[\w_]*)\s*:\s*(.*)$/);
          if (nestedKeyMatch) {
            const nKey = nestedKeyMatch[1];
            let nValue = nestedKeyMatch[2].trim();

            if (nValue === "") {
              // Nested list
              const items: string[] = [];
              i++;
              while (i < lines.length) {
                const nl = lines[i];
                if (nl.trim() === "") { i++; continue; }
                const nIndent = nl.match(/^(\s*)/)?.[1].length || 0;
                if (nIndent <= indent) break;
                if (nl.trim().startsWith("- ")) {
                  items.push(unquote(nl.trim().slice(2).trim()));
                  i++;
                } else {
                  break;
                }
              }
              obj[nKey] = items;
            } else {
              obj[nKey] = unquote(nValue);
              i++;
            }
          } else {
            i++;
          }
        }
        result[key] = obj;
      } else {
        result[key] = "";
        i++;
      }
    } else {
      result[key] = unquote(value);
      i++;
    }
  }

  return result;
}

function unquote(s: string): string | number {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  // Try number
  if (/^-?\d+(\.\d+)?$/.test(s)) return parseFloat(s);
  if (s === "true") return true as any;
  if (s === "false") return false as any;
  return s;
}

// ── Collect ref files ──

async function collectRefFiles(): Promise<RefData[]> {
  const refs: RefData[] = [];

  async function walk(dir: string) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.name.endsWith(".md")) {
        const content = await readFile(full, "utf-8");
        const { frontmatter, body } = parseFrontmatter(content);
        refs.push({ frontmatter, body, filePath: full });
      }
    }
  }

  await walk(REFS_DIR);
  return refs;
}

// ── Markdown to HTML (minimal) ──

function mdToHtml(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let inList = false;

  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (inList) { out.push("</ul>"); inList = false; }
      out.push(`<h2>${escHtml(line.slice(3))}</h2>`);
    } else if (line.startsWith("### ")) {
      if (inList) { out.push("</ul>"); inList = false; }
      out.push(`<h3>${escHtml(line.slice(4))}</h3>`);
    } else if (line.startsWith("- ")) {
      if (!inList) { out.push("<ul>"); inList = true; }
      out.push(`<li>${formatInline(line.slice(2))}</li>`);
    } else if (line.trim() === "") {
      if (inList) { out.push("</ul>"); inList = false; }
    } else {
      if (inList) { out.push("</ul>"); inList = false; }
      out.push(`<p>${formatInline(line)}</p>`);
    }
  }
  if (inList) out.push("</ul>");

  return out.join("\n");
}

function formatInline(s: string): string {
  // Bold
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // Italic
  s = s.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Source references with passage ref: `file.html#section-pN-rM` → deep link to exact passage
  s = s.replace(/`([^`]+\.html)#([^`]+)-p(\d+)-r(\d+)`/g, (_, file, section, pNum, rNum) => {
    const fragment = `${section}-p${pNum}-r${rNum}`;
    const href = `/${file}#${fragment}`;
    const label = humanizeFilename(file);
    const sectionLabel = humanizeSection(section);
    return `<a href="${href}" class="source-ref">${escHtml(label)}, ${escHtml(sectionLabel)} ¶${pNum}</a>`;
  });

  // Source references with paragraph: `file.html#section` ~pN → paragraph link
  s = s.replace(/`([^`]+\.html)#([^`]+)`\s*~p(\d+)/g, (_, file, section, pNum) => {
    const href = `/${file}#${section}-p${pNum}`;
    const label = humanizeFilename(file);
    const sectionLabel = humanizeSection(section);
    return `<a href="${href}" class="source-ref">${escHtml(label)}, ${escHtml(sectionLabel)} ¶${pNum}</a>`;
  });

  // Source references without paragraph: `file.html#section` → section link
  s = s.replace(/`([^`]+\.html)#([^`]+)`/g, (_, file, section) => {
    const href = `/${file}#${section}`;
    const label = humanizeFilename(file);
    const sectionLabel = humanizeSection(section);
    return `<a href="${href}" class="source-ref">${escHtml(label)}, ${escHtml(sectionLabel)}</a>`;
  });

  // Source references (file only, no section): `file.html`
  s = s.replace(/`([^`]+\.html)`/g, (_, file) => {
    const href = `/${file}`;
    const label = humanizeFilename(file);
    return `<a href="${href}" class="source-ref">${escHtml(label)}</a>`;
  });

  // Remaining inline code
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  // Links
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return s;
}

function humanizeFilename(file: string): string {
  // "01_Preliminares.html" → "Preliminares"
  // "01_genesis_01.html" → "Genesis 1"
  // "02_Clemens_Hieronymi_Du_Culte.html" → "Clemens Hieronymi Du Culte"
  let name = file.replace(/\.html$/, "");
  // Strip leading number prefix
  name = name.replace(/^\d+_/, "");
  // Handle genesis chapters: "genesis_01" → "Genesis 1"
  const genMatch = name.match(/^genesis_(\d+)(.*)$/i);
  if (genMatch) {
    const ch = parseInt(genMatch[1], 10);
    const suffix = genMatch[2] ? genMatch[2].replace(/_/g, " ") : "";
    return `Genesis ${ch}${suffix}`;
  }
  // Replace underscores with spaces
  return name.replace(/_/g, " ");
}

function humanizeSection(section: string): string {
  // "preface-reader" → "Preface Reader"
  // "dedicatory-letter" → "Dedicatory Letter"
  return section.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── Ref lookup for resolving names from slugs ──

const refsBySlug = new Map<string, Record<string, any>>();
const authorWorks = new Map<string, { slug: string; name: string }[]>();
// bibliography directory name → author person slug (e.g. "sophronius" → "person/scholar/sophronius")
const bibDirToAuthor = new Map<string, { slug: string; name: string }>();

function lookupName(category: string, slug: string): string {
  const key = `${category}/${slug}`;
  const ref = refsBySlug.get(key);
  if (ref) return ref.name as string;
  // Try without category prefix (for cross-category related links)
  const ref2 = refsBySlug.get(slug);
  if (ref2) return ref2.name as string;
  // Fallback: humanize the slug
  const last = slug.split("/").pop() || slug;
  return last.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

// ── Canonical Bible book order (Vulgate) ──

const BIBLE_BOOK_ORDER: Record<string, number> = {
  "genesis": 1, "exodus": 2, "leviticus": 3, "numbers": 4, "deuteronomy": 5,
  "joshua": 6, "judges": 7, "ruth": 8,
  "1-kings": 9, "2-kings": 10, "3-kings": 11, "4-kings": 12,
  "1-chronicles": 13, "2-chronicles": 14,
  "ezra": 15, "nehemiah": 16, "tobit": 17, "judith": 18, "esther": 19,
  "1-maccabees": 20, "2-maccabees": 21,
  "job": 22, "psalms": 23, "proverbs": 24, "ecclesiastes": 25,
  "song-of-songs": 26, "wisdom": 27, "sirach": 28,
  "isaiah": 29, "jeremiah": 30, "lamentations": 31, "baruch": 32,
  "ezekiel": 33, "daniel": 34,
  "hosea": 35, "joel": 36, "amos": 37, "obadiah": 38, "jonah": 39,
  "micah": 40, "nahum": 41, "habakkuk": 42, "zephaniah": 43,
  "haggai": 44, "zechariah": 45, "malachi": 46,
  "matthew": 47, "mark": 48, "luke": 49, "john": 50, "acts": 51,
  "romans": 52, "1-corinthians": 53, "2-corinthians": 54,
  "galatians": 55, "ephesians": 56, "philippians": 57, "colossians": 58,
  "1-thessalonians": 59, "2-thessalonians": 60,
  "1-timothy": 61, "2-timothy": 62, "titus": 63, "philemon": 64, "hebrews": 65,
  "james": 66, "1-peter": 67, "2-peter": 68,
  "1-john": 69, "2-john": 70, "3-john": 71, "jude": 72, "revelation": 73,
};

// ── Category display names ──

const CATEGORY_LABELS: Record<string, string> = {
  person: "Person",
  place: "Place",
  organization: "Organization",
  year: "Year",
  verse: "Verse",
  bibliography: "Bibliography",
  subject: "Subject",
};

const SUBCATEGORY_LABELS: Record<string, string> = {
  saint: "Saints",
  blessed: "Blessed",
  biblical: "Biblical Figures",
  pope: "Popes",
  ruler: "Rulers",
  classical: "Classical Authors",
  cleric: "Clergy",
  scholar: "Scholars",
  other: "Other",
  city: "Cities",
  region: "Regions",
  "sacred-site": "Sacred Sites",
  "body-of-water": "Bodies of Water",
  "religious-order": "Religious Orders",
  council: "Councils",
  government: "Governments",
  diocese: "Dioceses",
  publisher: "Publishers",
  university: "Universities",
  church: "Church Institutions",
  theology: "Theology",
  exegesis: "Exegesis",
  morals: "Morals",
  spirituality: "Spirituality",
  ecclesiology: "Ecclesiology",
  sacraments: "Sacraments",
  devotion: "Devotion",
  "natural-philosophy": "Natural Philosophy",
};

function labelFor(segment: string): string {
  return SUBCATEGORY_LABELS[segment] || CATEGORY_LABELS[segment] ||
    segment.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

// ── Related link helper ──

function refTag(slug: string, label: string): string {
  return `<a href="/index/${escHtml(slug)}.html">${escHtml(label)}</a>`;
}

// ── Generate entry HTML ──

function generateEntryHtml(ref: RefData): string {
  const fm = ref.frontmatter;
  const category = fm.category as string;
  const slug = fm.slug as string;
  const name = fm.name as string;
  const fullSlug = slug; // slug already includes category prefix (e.g., "person/saint/jerome")

  // Breadcrumb — skip "ad" in year paths (it's an internal grouping, not a navigable level)
  const segments = fullSlug.split("/");
  const breadcrumbParts: string[] = ['<a href="/index/">Index</a>'];
  let href = "/index";
  for (let i = 0; i < segments.length - 1; i++) {
    href += `/${segments[i]}`;
    if (segments[0] === "year" && segments[i] === "ad") continue;
    breadcrumbParts.push(`<a href="${href}/">${labelFor(segments[i])}</a>`);
  }
  breadcrumbParts.push(escHtml(name));
  const breadcrumb = breadcrumbParts.join(" › ");

  // Meta description
  let description = `${name}`;
  if (fm.dates) description += ` (${fm.dates})`;
  if (fm.role) description += `, ${fm.role}`;
  else if (fm.description) description += ` — ${fm.description}`;
  description += ". References in Cornelius a Lapide's biblical commentary.";
  if (description.length > 300) description = description.slice(0, 297) + "...";

  // Entry metadata (dl)
  const metaParts: string[] = [];

  if (fm.also_known_as && Array.isArray(fm.also_known_as) && fm.also_known_as.length > 0) {
    metaParts.push(`    <dt>Also known as</dt>\n    <dd>${fm.also_known_as.map(escHtml).join(", ")}</dd>`);
  }
  if (fm.dates) {
    metaParts.push(`    <dt>Dates</dt>\n    <dd>${escHtml(String(fm.dates))}</dd>`);
  }
  if (fm.role) {
    metaParts.push(`    <dt>Role</dt>\n    <dd>${escHtml(fm.role)}</dd>`);
  }
  if (fm.description && category !== "person") {
    metaParts.push(`    <dt>Description</dt>\n    <dd>${escHtml(fm.description)}</dd>`);
  }
  if (fm.author) {
    const authorLabel = escHtml(fm.author);
    const authorHtml = fm.author_slug
      ? `<a href="/index/${fm.author_slug}.html">${authorLabel}</a>`
      : authorLabel;
    metaParts.push(`    <dt>Author</dt>\n    <dd>${authorHtml}</dd>`);
  }
  if (fm.lat != null && fm.lon != null) {
    metaParts.push(`    <dt>Coordinates</dt>\n    <dd>${fm.lat}, ${fm.lon}</dd>`);
  }

  // Verse-specific fields
  if (fm.vulgate_text) {
    metaParts.push(`    <dt>Vulgate</dt>\n    <dd lang="la"><em>${escHtml(String(fm.vulgate_text))}</em></dd>`);
  }
  if (fm.english_text) {
    metaParts.push(`    <dt>English</dt>\n    <dd>${escHtml(String(fm.english_text))}</dd>`);
  }

  const metaDl = metaParts.length > 0
    ? `\n  <dl class="entry-meta">\n${metaParts.join("\n")}\n  </dl>\n`
    : "";

  // Map for places with coordinates
  let mapHtml = "";
  if (fm.lat != null && fm.lon != null) {
    mapHtml = generateMapHtml(Number(fm.lat), Number(fm.lon)) + "\n";
  }

  // Split body into description (prose before ## headings) and structured sections
  const descriptionProse = ref.body.split(/\n## /)[0].trim();
  // Skip if the body starts with a heading (no prose description)
  const descriptionHtml = (descriptionProse && !descriptionProse.startsWith("## "))
    ? `<p>${escHtml(descriptionProse)}</p>`
    : "";

  // Events section (for year entries)
  const eventsSection = ref.body.match(/## Events\n([\s\S]*?)(?=\n## |\n*$)/);
  let eventsHtml = "";
  if (eventsSection) {
    const eventLines = eventsSection[1].split("\n").filter(l => l.startsWith("- "));
    if (eventLines.length > 0) {
      const items = eventLines.map(l => `      <li>${escHtml(l.slice(2))}</li>`);
      eventsHtml = `
  <section id="events">
    <h2>Events</h2>
    <ul>
${items.join("\n")}
    </ul>
  </section>
`;
    }
  }

  // References section — parse structurally from body markdown
  const refSection = ref.body.match(/## References in Commentary\n([\s\S]*?)(?=\n## |\n*$)/);
  let refsHtml = "";
  if (refSection) {
    const refLines = refSection[1].split("\n");
    const refItems: string[] = [];
    for (let ri = 0; ri < refLines.length; ri++) {
      const line = refLines[ri];
      const refMatch = line.match(/^- `([^#]+)#([^`]+)` — (.+)$/);
      if (!refMatch) continue;

      const [, refFile, refAnchor, synopsis] = refMatch;
      const displayName = humanizeFilename(refFile);
      // Strip -s-{hash} from anchor for display
      const displayAnchor = humanizeSection(refAnchor.replace(/-s-[a-f0-9]{7}$/, ""));

      // Peek at next line for text: "..."
      let textQuote = "";
      if (ri + 1 < refLines.length) {
        const textMatch = refLines[ri + 1].match(/^\s+text:\s*"(.+)"$/);
        if (textMatch) {
          textQuote = textMatch[1];
          ri++; // skip the text line
        }
      }

      const entityParam = encodeURIComponent(fullSlug);
      let item = `      <li>
        <a href="/${refFile}?entity=${entityParam}#${refAnchor}" class="source-ref">${escHtml(displayName)} — ${escHtml(displayAnchor)}</a>
        <span class="ref-context">— ${escHtml(synopsis)}</span>`;
      if (textQuote) {
        item += `\n        <blockquote class="ref-quote">"${escHtml(textQuote)}"</blockquote>`;
      }
      item += `\n      </li>`;
      refItems.push(item);
    }
    if (refItems.length > 0) {
      refsHtml = `
  <section id="references">
    <h2>References in Commentary</h2>
    <ul>
${refItems.join("\n")}
    </ul>
  </section>
`;
    }
  }

  // Works section (for person/org entries that authored bibliography items)
  let worksHtml = "";
  const works = authorWorks.get(fullSlug);
  if (works && works.length > 0) {
    const workItems = works
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(w => `      <li><a href="/index/${w.slug}.html">${escHtml(w.name)}</a></li>`);
    worksHtml = `
  <section id="works">
    <h2>Works</h2>
    <ul>
${workItems.join("\n")}
    </ul>
  </section>
`;
  }

  // Related section
  const related = fm.related as Record<string, string[]> | undefined;
  let relatedHtml = "";
  if (related && Object.keys(related).length > 0) {
    const items: string[] = [];
    for (const [relCategory, slugs] of Object.entries(related)) {
      if (!Array.isArray(slugs)) continue;
      // Map relation key to the right category for web component tags
      const tagCategory = relCategory === "works" ? "bibliography"
        : relCategory === "verses" ? "verse"
        : relCategory === "organizations" ? "organization"
        : relCategory === "people" ? "person"
        : relCategory === "places" ? "place"
        : relCategory === "subjects" ? "subject"
        : relCategory === "years" ? "year"
        : relCategory;

      for (const s of slugs) {
        // Only emit links that resolve to actual entries
        const fullKey = `${tagCategory}/${s}`;
        if (!refsBySlug.has(fullKey) && !refsBySlug.has(s)) continue;
        const label = lookupName(tagCategory, s);
        items.push(`      <li>${refTag(s, label)}</li>`);
      }
    }
    if (items.length > 0) {
      relatedHtml = `
  <section id="related">
    <h2>Related</h2>
    <ul>
${items.join("\n")}
    </ul>
  </section>
`;
    }
  }

  const canonicalUrl = `${BASE_URL}/index/${fullSlug}.html`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escHtml(name)} — Lapide Index</title>
<meta name="description" content="${escHtml(description)}">
<link rel="canonical" href="${canonicalUrl}">
<link rel="stylesheet" href="/style.css">
<link rel="stylesheet" href="/index/index.css">
<script src="/index/components.js" type="module"></script>
</head>
<body>

<nav class="index-breadcrumb">
  ${breadcrumb}
</nav>

<article id="entry" data-category="${escHtml(category)}" data-slug="${escHtml(slug)}">

  <h1>${escHtml(name)}</h1>
${metaDl}${mapHtml}
  <section id="description">
    ${descriptionHtml}
  </section>
${eventsHtml}${worksHtml}${refsHtml}${relatedHtml}
</article>

</body>
</html>
`;
}

// ── Generate alias HTML ──

function generateAliasHtml(aliasOf: string, category: string): string {
  const canonicalUrl = `${BASE_URL}/index/${aliasOf}.html`;
  const name = lookupName(category, aliasOf);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escHtml(name)} — Lapide Index</title>
<link rel="canonical" href="${canonicalUrl}">
<meta http-equiv="refresh" content="0; url=/index/${aliasOf}.html">
<link rel="stylesheet" href="/style.css">
<link rel="stylesheet" href="/index/index.css">
</head>
<body>
<p>Redirecting to <a href="/index/${aliasOf}.html">${escHtml(name)}</a>...</p>
</body>
</html>
`;
}

// ── Generate directory index HTML ──

interface DirEntry {
  name: string;
  slug: string;
  href: string;
  isDir: boolean;
  description?: string;
  dates?: string;
  children?: DirEntry[];
}

function generateDirIndexHtml(dirPath: string, entries: DirEntry[]): string {
  const relToIndex = relative(INDEX_DIR, dirPath);
  const segments = relToIndex ? relToIndex.split("/") : [];
  const title = segments.length === 0 ? "Index" : labelFor(segments[segments.length - 1]);

  // Breadcrumb — skip "ad" in year paths
  const breadcrumbParts: string[] = [];
  if (segments.length === 0) {
    breadcrumbParts.push("Index");
  } else {
    breadcrumbParts.push('<a href="/index/">Index</a>');
    let href = "/index";
    for (let i = 0; i < segments.length - 1; i++) {
      href += `/${segments[i]}`;
      if (segments[0] === "year" && segments[i] === "ad") continue;
      breadcrumbParts.push(`<a href="${href}/">${labelFor(segments[i])}</a>`);
    }
    breadcrumbParts.push(escHtml(title));
  }

  // Sort: directories first, then by context-appropriate order
  const isVerseDir = segments[0] === "verse";
  const sorted = [...entries].sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    // Bible books: canonical order; chapters: numeric
    if (isVerseDir) {
      const aOrd = BIBLE_BOOK_ORDER[a.slug] ?? 999;
      const bOrd = BIBLE_BOOK_ORDER[b.slug] ?? 999;
      if (aOrd !== bOrd) return aOrd - bOrd;
      // Numeric fallback for chapter numbers
      const aNum = parseInt(a.slug, 10);
      const bNum = parseInt(b.slug, 10);
      if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
    }
    return a.name.localeCompare(b.name);
  });

  function renderEntry(e: DirEntry, indent: number): string {
    let label = escHtml(e.name);
    if (e.dates) label += ` <span class="entry-dates">(${escHtml(e.dates)})</span>`;
    if (e.description && !e.isDir) label += ` <span class="entry-desc">— ${escHtml(e.description)}</span>`;
    const pad = " ".repeat(indent);
    // Only show folder icon for dirs that are NOT expanded (no children)
    const icon = (e.isDir && (!e.children || e.children.length === 0)) ? "📁 " : "";
    let html = `${pad}<li>${icon}<a href="${e.href}">${label}</a>`;
    if (e.children && e.children.length > 0) {
      const childSorted = [...e.children].sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      html += `\n${pad}  <ul>`;
      for (const child of childSorted) {
        html += `\n${renderEntry(child, indent + 4)}`;
      }
      html += `\n${pad}  </ul>`;
    }
    html += `</li>`;
    return html;
  }

  const listItems = sorted.map(e => renderEntry(e, 4));

  const canonicalUrl = segments.length === 0
    ? `${BASE_URL}/index/`
    : `${BASE_URL}/index/${relToIndex}/`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escHtml(title)} — Lapide Index</title>
<link rel="canonical" href="${canonicalUrl}">
<link rel="stylesheet" href="/style.css">
<link rel="stylesheet" href="/index/index.css">
<script src="/index/components.js" type="module"></script>
</head>
<body>

<nav class="index-breadcrumb">
  ${breadcrumbParts.join(" › ")}
</nav>

<h1>${escHtml(title)}</h1>
${(() => {
    // Root index page note
    if (segments.length === 0) {
      return `
<div class="index-note">
<p>Hello!</p>
<p>This index is an even bigger experiment than the translations.</p>
<p>It is all being generated with the assistance of "Claude" AI so it is very possible you might find mistakes. If you find any mistakes please do let me know by making an <a href="https://github.com/farant/lapide/issues">Issue</a> at <a href="https://github.com/farant/lapide">github.com/farant/lapide</a>.</p>
<p>I'm not sure if this index will be practical or useful to build out across all of the chapters and languages, but I had the idea and wanted to see how well it worked.</p>
</div>
`;
    }
    // For bibliography author directories, link to the person page
    if (segments.length === 2 && segments[0] === "bibliography") {
      const author = bibDirToAuthor.get(segments[1]);
      if (author) {
        return `\n<p class="author-link">Works by <a href="/index/${author.slug}.html">${escHtml(author.name)}</a></p>\n`;
      }
    }
    return "";
  })()}
<ul class="index-listing">
${listItems.join("\n")}
</ul>

</body>
</html>
`;
}

// ── Main ──

async function main() {
  console.log("Reading ref files...");
  const refs = await collectRefFiles();
  console.log(`Found ${refs.length} ref files`);

  // Build slug lookup
  for (const ref of refs) {
    const fm = ref.frontmatter;
    if (fm.alias_of) continue; // skip alias files for lookup
    if (fm.category && fm.slug) {
      refsBySlug.set(`${fm.category}/${fm.slug}`, fm);
      refsBySlug.set(fm.slug, fm);
    }
  }

  // Build author → works reverse index and bibliography dir → author mapping
  for (const ref of refs) {
    const fm = ref.frontmatter;
    if (fm.alias_of || !fm.author_slug || !fm.slug) continue;
    const authorSlug = fm.author_slug as string;
    if (!authorWorks.has(authorSlug)) authorWorks.set(authorSlug, []);
    authorWorks.get(authorSlug)!.push({ slug: fm.slug, name: fm.name as string });

    // Map bibliography subdirectory to author (e.g. "sophronius" → person slug)
    const bibSlug = fm.slug as string;
    if (bibSlug.startsWith("bibliography/")) {
      const parts = bibSlug.split("/");
      if (parts.length >= 3) {
        const dirName = parts[1]; // e.g. "sophronius"
        if (!bibDirToAuthor.has(dirName)) {
          const authorEntry = refsBySlug.get(authorSlug);
          const authorName = authorEntry ? (authorEntry.name as string) : labelFor(dirName);
          bibDirToAuthor.set(dirName, { slug: authorSlug, name: authorName });
        }
      }
    }
  }

  // Separate canonical entries from aliases
  const canonical: RefData[] = [];
  const aliases: RefData[] = [];
  for (const ref of refs) {
    if (ref.frontmatter.alias_of) {
      aliases.push(ref);
    } else {
      canonical.push(ref);
    }
  }

  console.log(`${canonical.length} canonical entries, ${aliases.length} aliases`);

  // Download map tiles for place entries with coordinates
  const tilesToDownload = new Set<string>();
  for (const ref of canonical) {
    const fm = ref.frontmatter;
    if (fm.lat != null && fm.lon != null) {
      const { x, y } = latLonToTile(Number(fm.lat), Number(fm.lon), MAP_ZOOM);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          tilesToDownload.add(`${MAP_ZOOM}/${x + dx}/${y + dy}`);
        }
      }
    }
  }
  if (tilesToDownload.size > 0) {
    console.log(`Downloading ${tilesToDownload.size} map tiles...`);
    await Promise.all([...tilesToDownload].map(key => {
      const [z, x, y] = key.split("/").map(Number);
      return downloadTile(z, x, y);
    }));
    console.log("Map tiles ready.");
  }

  // Track all generated HTML paths for directory indexes
  const generatedPaths = new Map<string, { name: string; slug: string; description?: string; dates?: string }>();

  // Generate canonical entry pages
  let entryCount = 0;
  for (const ref of canonical) {
    const fm = ref.frontmatter;
    if (!fm.category || !fm.slug) {
      console.warn(`Skipping ref with missing category/slug: ${ref.filePath}`);
      continue;
    }

    const outPath = join(INDEX_DIR, `${fm.slug}.html`);
    await mkdir(dirname(outPath), { recursive: true });

    const html = generateEntryHtml(ref);
    await writeFile(outPath, html, "utf-8");
    entryCount++;

    // Track for directory listing
    generatedPaths.set(outPath, {
      name: fm.name,
      slug: fm.slug,
      description: fm.description || fm.role,
      dates: fm.dates ? String(fm.dates) : undefined,
    });
  }
  console.log(`Generated ${entryCount} entry pages`);

  // Generate alias pages
  let aliasCount = 0;
  for (const ref of aliases) {
    const fm = ref.frontmatter;
    const aliasOf = fm.alias_of as string;

    // Determine category from the ref file path
    const relPath = relative(REFS_DIR, ref.filePath);
    const category = relPath.split("/")[0];

    // The alias file's own slug is its path relative to the category dir
    const aliasSlug = relPath.slice(category.length + 1).replace(/\.md$/, "");
    const outPath = join(INDEX_DIR, category, `${aliasSlug}.html`);
    await mkdir(dirname(outPath), { recursive: true });

    const html = generateAliasHtml(aliasOf, category);
    await writeFile(outPath, html, "utf-8");
    aliasCount++;

    const canonicalName = lookupName(category, aliasOf);
    generatedPaths.set(outPath, {
      name: `${canonicalName} (alias)`,
      slug: aliasSlug,
    });
  }
  console.log(`Generated ${aliasCount} alias pages`);

  // Generate directory index pages
  // Collect all directories that contain generated HTML
  const dirs = new Set<string>();
  dirs.add(INDEX_DIR); // root index

  for (const [htmlPath] of generatedPaths) {
    let dir = dirname(htmlPath);
    while (dir !== INDEX_DIR && dir.startsWith(INDEX_DIR)) {
      dirs.add(dir);
      dir = dirname(dir);
    }
  }

  // Helper: read directory entries (one level)
  async function readDirEntries(dir: string, hrefPrefix: string): Promise<DirEntry[]> {
    const result: DirEntry[] = [];
    let fsEntries: Awaited<ReturnType<typeof readdir>>;
    try {
      fsEntries = await readdir(dir, { withFileTypes: true });
    } catch {
      return result;
    }
    for (const entry of fsEntries) {
      if (entry.name.startsWith(".")) continue;
      if (entry.name === "refs" || entry.name === "extractions" || entry.name === "tiles") continue;
      if (entry.name === "index.html") continue;
      if (entry.name === "DESIGN.md" || entry.name === "normalization-decisions.md") continue;
      if (entry.name === "components.js" || entry.name === "index.css" || entry.name === "manifest.json") continue;
      if (entry.name === "run-two-improvements.html") continue;

      const full = join(dir, entry.name);

      if (entry.isDirectory()) {
        result.push({
          name: labelFor(entry.name),
          slug: entry.name,
          href: `${hrefPrefix}${entry.name}/`,
          isDir: true,
        });
      } else if (entry.name.endsWith(".html")) {
        const info = generatedPaths.get(full);
        result.push({
          name: info?.name || entry.name.replace(".html", ""),
          slug: entry.name.replace(".html", ""),
          href: `${hrefPrefix}${entry.name}`,
          isDir: false,
          description: info?.description,
          dates: info?.dates,
        });
      }
    }
    return result;
  }

  let indexCount = 0;
  for (const dir of dirs) {
    // Skip non-category dirs (refs/, extractions/, etc.)
    const relDir = relative(INDEX_DIR, dir);
    if (relDir.startsWith("refs") || relDir.startsWith("extractions")) continue;

    let dirEntries: DirEntry[];

    // Special case: year/ flattens through ad/ to show centuries directly
    if (relDir === "year") {
      dirEntries = await readDirEntries(join(dir, "ad"), "ad/");
      // Label centuries as "Nth Century AD"
      for (const entry of dirEntries) {
        if (entry.isDir) entry.name += " AD";
      }
    } else {
      dirEntries = await readDirEntries(dir, "");
    }

    // Expand subdirectories one level — but NOT at the root index or year/ level
    const skipExpand = relDir === "" || relDir === "year" || relDir === "verse";
    if (!skipExpand) {
      for (const entry of dirEntries) {
        if (!entry.isDir) continue;
        const subDirPath = join(dir, entry.href.replace(/\/$/, ""));
        const children = await readDirEntries(subDirPath, "");
        if (children.length > 0) {
          for (const child of children) {
            child.href = `${entry.href}${child.href}`;
          }
          entry.children = children;
        }
      }
    }

    if (dirEntries.length === 0 && dir !== INDEX_DIR) continue;

    const indexPath = join(dir, "index.html");
    const html = generateDirIndexHtml(dir, dirEntries);
    await writeFile(indexPath, html, "utf-8");
    indexCount++;
  }
  console.log(`Generated ${indexCount} directory index pages`);

  // Generate manifest
  const manifest: Record<string, any>[] = [];
  for (const ref of canonical) {
    const fm = ref.frontmatter;
    if (!fm.category || !fm.slug) continue;
    manifest.push({
      name: fm.name,
      slug: fm.slug,
      category: fm.category,
      subcategory: fm.subcategory,
      path: `${fm.category}/${fm.slug}.html`,
    });
  }
  manifest.sort((a, b) => a.path.localeCompare(b.path));

  await writeFile(
    join(INDEX_DIR, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
    "utf-8"
  );
  console.log(`Manifest: ${manifest.length} entries written to index/manifest.json`);

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
