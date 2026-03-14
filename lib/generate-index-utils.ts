/**
 * generate-index-utils.ts — Pure utility functions extracted from generate-index.ts
 *
 * These are stateless, side-effect-free functions used by the index generator.
 * Extracted here so they can be unit-tested independently.
 */

// ── YAML frontmatter parser ──

export function parseFrontmatter(content: string): { frontmatter: Record<string, any>; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: content };

  const yamlStr = match[1];
  const body = match[2].trim();
  const frontmatter = parseYaml(yamlStr);
  return { frontmatter, body };
}

export function parseYaml(str: string): Record<string, any> {
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

    if (value === "[]") {
      result[key] = [];
      i++;
      continue;
    }

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

            if (nValue === "[]") {
              obj[nKey] = [];
              i++;
              continue;
            }

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

export function unquote(s: string): string | number {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  // Try number
  if (/^-?\d+(\.\d+)?$/.test(s)) return parseFloat(s);
  if (s === "true") return true as any;
  if (s === "false") return false as any;
  return s;
}

// ── HTML escaping ──

export function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── Humanize helpers ──

export function humanizeFilename(file: string): string {
  let name = file.replace(/\.html$/, "");
  name = name.replace(/^\d+_/, "");
  const genMatch = name.match(/^genesis_(\d+)(.*)$/i);
  if (genMatch) {
    const ch = parseInt(genMatch[1], 10);
    const suffix = genMatch[2] ? genMatch[2].replace(/_/g, " ") : "";
    return `Genesis ${ch}${suffix}`;
  }
  return name.replace(/_/g, " ");
}

export function humanizeSection(section: string): string {
  return section.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

// ── Date parsing ──

export interface LifeDate {
  year: number;
  bc: boolean;
  circa: boolean;
}

export interface ParsedDates {
  birth?: LifeDate;
  death?: LifeDate;
}

export function parseDates(dates: string): ParsedDates | null {
  if (!dates) return null;
  const s = dates.trim();

  if (/biblical|patriarch|century|fl\.|\/|\bor\b/i.test(s)) return null;

  const clean = s.replace(/\s*\(.*?\)\s*/g, "").trim();

  // Death only: "d. 253", "d. c. 674"
  const deathOnly = clean.match(/^d\.\s*(c\.\s*)?(\d+)\s*(BC)?$/i);
  if (deathOnly) {
    return {
      death: {
        year: parseInt(deathOnly[2]),
        bc: !!deathOnly[3],
        circa: !!deathOnly[1],
      },
    };
  }

  // Range: "354-430", "c. 342-420", "384-322 BC"
  const range = clean.match(/^(c\.\s*)?(\d+)\s*[–\-]\s*(c\.\s*)?(\d+)\s*(BC)?$/i);
  if (range) {
    const bc = !!range[5];
    return {
      birth: {
        year: parseInt(range[2]),
        bc,
        circa: !!range[1],
      },
      death: {
        year: parseInt(range[4]),
        bc,
        circa: !!range[3],
      },
    };
  }

  return null;
}

// ── Year slug generation ──

export function ordinalSuffix(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  if (mod10 === 1) return `${n}st`;
  if (mod10 === 2) return `${n}nd`;
  if (mod10 === 3) return `${n}rd`;
  return `${n}th`;
}

export function yearSlugFromNumber(year: number, bc: boolean): string {
  const era = bc ? "bc" : "ad";
  const century = Math.ceil(year / 100);
  const centuryLabel = `${ordinalSuffix(century)}-century`;
  const decade = Math.floor((year % 100) / 10) * 10;
  const decadeLabel = `${String(decade).padStart(2, "0")}s`;
  return `year/${era}/${centuryLabel}/${decadeLabel}/${year}`;
}

// ── Map tile coordinate calculation ──

export function latLonToTile(lat: number, lon: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const xFloat = (lon + 180) / 360 * n;
  const latRad = lat * Math.PI / 180;
  const yFloat = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n;
  const x = Math.floor(xFloat);
  const y = Math.floor(yFloat);
  return {
    x, y,
    px: Math.floor((xFloat - x) * 256),
    py: Math.floor((yFloat - y) * 256),
  };
}

// ── Category/subcategory labels ──

export const CATEGORY_LABELS: Record<string, string> = {
  person: "Person",
  place: "Place",
  organization: "Organization",
  year: "Year",
  verse: "Verse",
  bibliography: "Bibliography",
  subject: "Subject",
  language: "Language",
};

export const SUBCATEGORY_LABELS: Record<string, string> = {
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
  bc: "BC",
  ad: "AD",
  theology: "Theology",
  exegesis: "Exegesis",
  morals: "Morals",
  spirituality: "Spirituality",
  ecclesiology: "Ecclesiology",
  sacraments: "Sacraments",
  devotion: "Devotion",
  "natural-philosophy": "Natural Philosophy",
  hebrew: "Hebrew",
  greek: "Greek",
  aramaic: "Aramaic",
};

export function labelFor(segment: string): string {
  return SUBCATEGORY_LABELS[segment] || CATEGORY_LABELS[segment] ||
    segment.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

// ── Bible book order (Vulgate) ──

export const BIBLE_BOOK_ORDER: Record<string, number> = {
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
