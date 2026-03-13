# Lapide Index — Design Document

A browsable, cross-referenced index/encyclopedia for the Lapide commentary and related patristic texts. Each entry is a standalone HTML page that can also be transcluded as a fragment into other pages via custom web components.

## Goals

1. **Browsable hierarchy** — every directory level has an `index.html` listing its children, so the entire index can be navigated top-down
2. **Deep backlinks** — every entry links back to the specific paragraphs in the commentary where it appears
3. **Inline references** — custom web components in the commentary text link to index entries and can optionally display them as popovers
4. **Transcludable fragments** — entry pages contain an `<article>` element that can be fetched and embedded elsewhere
5. **Multilingual** — entries follow the same `_XX` suffix convention as the rest of the site
6. **Extensible** — designed to scale beyond Lapide to other Migne Patrologia texts

## Categories

Eight top-level categories, each a subdirectory of `index/`:

| Category | Path | Description |
|---|---|---|
| Person | `index/person/` | Church Fathers, biblical figures, popes, classical authors, etc. |
| Place | `index/place/` | Geographic locations — cities, regions, bodies of water, sacred sites |
| Organization | `index/organization/` | Institutions, religious orders, councils, governments, publishers |
| Language | `index/language/` | Hebrew, Greek, and other words discussed in the commentary |
| Year | `index/year/` | Chronological entries aggregating events/references per year |
| Verse | `index/verse/` | Bible verse index — every verse referenced in the commentaries |
| Bibliography | `index/bibliography/` | Works cited in the commentaries |
| Subject | `index/subject/` | Theological, moral, exegetical, and ecclesiological topics |

## Excluded Entities

**Jesus Christ** is not indexed as an entity. He is the subject of the entire commentary — reducing Him to an entity card alongside other entries would feel reductive. References to Christ pervade every page; an entity entry would either be trivially incomplete or duplicate the commentary itself.

## Directory Structure

### Person

Subcategorized by primary role. A person appears under the role most relevant to how they appear in the texts. Aliases can place them under additional subcategories where appropriate.

```
index/person/
  index.html                          → lists subcategories
  saint/
    index.html                        → canonized saints
    augustine.html
    jerome.html
    basil-the-great.html
    gregory-of-nyssa.html
    john-damascene.html
  blessed/
    index.html                        → beatified (not yet canonized)
  venerable/
    index.html                        → declared venerable
  servant-of-god/
    index.html                        → cause for canonization opened
  biblical/
    index.html                        → figures from Scripture
    moses.html
    abraham.html
    adam.html
  pope/
    index.html                        → popes (whether or not also saints)
    clement-viii.html
    gregory-i.html
  ruler/
    index.html                        → monarchs, emperors, secular rulers
    philip-ii.html
    charles-v.html
    henry-viii.html
    julian-the-apostate.html
    valens.html
  classical/
    index.html                        → pagan/classical authors and philosophers
    aristotle.html
    virgil.html
    homer.html
  rabbi/
    index.html                        → rabbinical scholars
    rashi.html
    maimonides.html
  cleric/
    index.html                        → non-saint clergy, religious superiors
    cornelius-a-lapide.html
    crampon.html
    vitelleschi.html
    van-der-burch.html
  scholar/
    index.html                        → medieval/modern non-saint scholars
    peter-lombard.html
    alexander-of-hales.html
    hugh-of-saint-victor.html
  heresiarch/
    index.html                        → founders of heresies
    arius.html
    pelagius.html
  other/
    index.html                        → figures that don't fit above
    modestus.html
    demosthenes-cook.html
```

**Categorization notes**:
- **Popes** go under `pope/` regardless of whether they are also canonized saints. An alias under `saint/` is appropriate for sainted popes.
- **Rulers** includes emperors, kings, and secular rulers — both friendly (Philip II, Charles V, Dagobert) and hostile (Julian, Valens, Henry VIII). The hostility is captured in the entry's description and subjects, not in the subcategory.
- **Heresiarch** is reserved for people who actually founded or led a heresy (Arius, Pelagius, Luther). Rulers who supported heresy (Valens) or apostasized (Julian) go under `ruler/`.
- **Cleric** covers non-saint clergy of any rank — bishops, religious superiors, priests, editors. Lapide himself goes here.
- **Scholar** covers medieval and modern non-saint academics, theologians, and exegetes who appear primarily as authorities cited in the text.
- **Unnamed figures** (e.g., "Van der Burch's father") do not get standalone entries. They are noted within the entry of the named person they relate to.
- **Canonical-list-only figures** — biblical names that appear only in an enumeration (e.g., the 12 minor prophets listed in the Trent canon) do not get entries from that reference alone. They will get entries when the commentaries that discuss them are scanned.

**Slug convention**: lowercase, hyphenated, Latin/anglicized form. `augustine` not `aurelius-augustinus-hipponensis`. The full name and variants go in the entry itself.

**Dates convention**: The `dates` field in person ref files feeds the automatic generation of year pages (birth/death events with links). Use these formats to ensure the generator can parse them:

| Format | Example | What it generates |
|---|---|---|
| `"birth–death"` | `"354–430"` | Birth event at 354, death event at 430 |
| `"c. birth–death"` | `"c. 342–420"` | Both events marked "(approximate date)" |
| `"c. birth–c. death"` | `"c. 625–c. 686"` | Both events marked "(approximate date)" |
| `"d. year"` | `"d. 253"` | Death event only |
| `"d. c. year"` | `"d. c. 674"` | Death event only, marked approximate |
| `"birth–death BC"` | `"65–8 BC"` | Both events under BC year pages |
| `"c. birth–death BC"` | `"c. 1040–970 BC"` | Both under BC, birth marked approximate |

Parentheticals are stripped before parsing (e.g., `"c. 1040–970 BC (traditional)"` works fine).

Formats the generator **cannot** parse (and will skip):
- Floruit: `"fl. 4th century"`, `"fl. 370s"`, `"fl. 1852"`
- Century-only: `"1st century"`, `"19th century"`
- Vague: `"biblical figure"`, `"biblical patriarch"`
- Ambiguous: `"d. 853 (Halberstadt) or fl. 9th century (Auxerre)"`
- Slash dates: `"c. 5–c. 64/67 AD"`

These are all valid values for the `dates` field — they just won't generate year page events. Use them when precise years aren't known.

During normalization, prefer the parseable range format when a reasonable birth–death estimate exists. Use `c.` liberally — approximate dates are better than no dates for timeline browsing. Reserve `fl.` and century-only for figures where even approximate birth/death years would be speculation.

### Place

Geographic hierarchy using coarse, stable regional groupings that avoid the worst historical-vs-modern-border problems. Subcontinental/cultural regions rather than nation-states.

```
index/place/
  index.html
  europe/
    index.html
    low-countries/
      index.html
      mechlin.html
      ghent.html
      louvain.html
      antwerp.html
      bocholt.html
      cambrai.html                    → canonical (historically Low Countries)
    france/
      index.html
      paris.html
      amiens.html
      cambrai.html                    → alias of low-countries/cambrai
    italy/
      index.html
      rome.html
      trent.html
      anchin.html
    england/
      index.html
      rochester.html
    greece/
      index.html
      athens.html
  asia-minor/
    index.html
    cappadocia/
      index.html
      caesarea.html
      neocaesarea.html
    pontus.html
  middle-east/
    index.html
    palestine/
      index.html
      jerusalem.html
      bethlehem.html
    egypt.html
    mesopotamia.html
  biblical/
    index.html
    eden.html
    canaan.html
    babel.html
    sinai.html
    plains-of-moab.html
  sacred-site/
    index.html
    our-lady-of-aspromont.html
  body-of-water/
    index.html
    jordan-river.html
    red-sea.html
```

**Historical vs. modern borders**: When a place belongs to a different political entity in different eras (e.g., Cambrai — Spanish Netherlands in 1616, France today), the canonical entry goes under the grouping most relevant to the commentary context. An alias file at the other location ensures both paths are browsable. See [Aliases](#aliases).

**Modern country aliases**: Every place should be browsable under its modern country in addition to its historical/cultural region. The canonical entry uses the historical grouping (since that's the commentary context); a lightweight alias file under the modern country ensures discoverability. For example, Mechlin is canonical at `low-countries/mechlin` with an alias at `belgium/mechlin`. Modern country directories include `europe/belgium/`, `asia/turkey/`, `middle-east/israel/`, `middle-east/jordan/`, `middle-east/iraq/`, etc. Places already under their modern country (e.g., `europe/france/paris`) need no alias.

**Coordinates**: Every place ref file includes `lat` and `lon` fields in the YAML frontmatter (decimal degrees, WGS84). For cities, use the city center. For regions, use an approximate centroid. For biblical places, use best scholarly estimates of the traditional location. The generator downloads OpenStreetMap satellite tiles and renders a 3×1 tile grid with a red pin at the coordinates on each place entry page. The entity panel also displays the map when showing a place card.

```yaml
# Example place frontmatter with coordinates and alias
name: Mechlin
slug: place/europe/low-countries/mechlin
category: place
subcategory: city
also_known_as:
  - Mechelen
  - Malines
description: City in the Duchy of Brabant; seat of the metropolitan archbishopric
lat: 51.0259
lon: 4.4776
aliases:
  - place/europe/belgium/mechlin
```

### Organization

Institutions, orders, governments, and other non-geographic entities that were previously mixed in with places.

```
index/organization/
  index.html
  religious-order/
    index.html
    society-of-jesus.html
    benedictines.html
    franciscans.html
    dominicans.html
  council/
    index.html
    trent.html
    lateran-v.html
    nicaea.html
  government/
    index.html
    holy-roman-empire.html
    spanish-netherlands.html
    kingdom-of-france.html
  diocese/
    index.html
    archdiocese-of-mechlin.html
    diocese-of-ghent.html
    diocese-of-amiens.html
    archdiocese-of-cambrai.html
  publisher/
    index.html
    cramoisy.html
    ludwig-vives.html
    nutius-moretus.html
  university/
    index.html
    louvain.html
  church/
    index.html
    apostolic-see.html
    metropolitan-church-mechlin.html
    st-peters-basilica.html
    vatican-press.html
```

### Year

Century → decade → year. Separate trees for BC and AD.

```
index/year/
  index.html                          → links to bc/ and ad/
  bc/
    index.html                        → lists centuries
    20th-century/
      index.html
      00s/
        2000.html
  ad/
    index.html
    1st-century/
      index.html
      30s/
        index.html
        33.html                       → Crucifixion, etc.
    4th-century/
      index.html
      50s/
        index.html
        354.html                      → Birth of Augustine, etc.
      80s/
        386.html                      → Conversion of Augustine
    5th-century/
      30s/
        430.html                      → Death of Augustine
    17th-century/
      30s/
        1637.html                     → Death of Lapide
```

Each year page aggregates all events/references for that year. Most years will be sparse (a few references); some will be rich.

**Auto-generated year pages**: The generator automatically creates year pages from person `dates` fields — if a person has parseable birth/death dates, the corresponding year pages are generated with "Birth of [Person]" / "Death of [Person]" events (with links to the person entry). These virtual year pages require no ref file. When a year has both a ref file (with manually written events/references) and auto-derived life events, the manual events appear first and auto-events are appended, with deduplication by person name.

**Directory sorting**: The top-level year directory lists BC centuries in descending order (earlier centuries first), then AD centuries in ascending order. Century, decade, and year directories all sort chronologically.

### Verse

Book → chapter → verse. Follows the Vulgate book ordering and naming.

```
index/verse/
  index.html                          → lists all books
  genesis/
    index.html                        → lists all chapters
    1/
      index.html                      → lists all verses in Gen 1
      1.html                          → Gen 1:1
      2.html                          → Gen 1:2
      26.html                         → Gen 1:26
    2/
      index.html
      7.html
    3/
      15.html                         → protoevangelium
  psalms/
    index.html
    51/
      index.html
      1.html
```

**Numbering**: Vulgate numbering (matching the Latin source text). Entries note modern/Hebrew numbering where it differs.

### Bibliography

Organized by author. Each work includes a `year` field in the frontmatter — the approximate year of composition or publication. For works with uncertain dates, use `c.` prefix (e.g., `c. 426`) or a range (e.g., `413–426`). For works composed over many years, use the completion or publication date. This enables chronological browsing, cross-linking to Year entries, and timeline visualization.

Each work also includes an `author_slug` field linking to the author's person entry. This enables cross-referencing:
- **On bibliography entry pages**: the Author field links to the person page
- **On person entry pages**: a "Works" section lists all bibliography entries with matching `author_slug`
- **On bibliography directory pages** (e.g., `/index/bibliography/jerome/`): a "Works by [Author]" link to the person page

```yaml
# Example bibliography frontmatter
---
name: De Civitate Dei
slug: bibliography/augustine/de-civitate-dei
category: bibliography
author: St. Augustine
author_slug: person/saint/augustine
year: "413–426"
related:
  people:
    - person/saint/augustine
  subjects:
    - subject/theology/providence
---
```

```
index/bibliography/
  index.html                          → lists all authors
  augustine/
    index.html
    de-civitate-dei.html
    de-genesi-ad-litteram.html
    confessions.html
  jerome/
    index.html
    vulgate.html
    epistles.html
    hebrew-questions-on-genesis.html
  aquinas/
    index.html
    summa-theologiae.html
  index-by-title.html                → alphabetical list of all works
```

### Subject

Subcategorized by domain, with up to three levels of nesting. The taxonomy is not fixed upfront — it evolves during normalization as more texts are scanned and the natural groupings emerge.

```
index/subject/
  index.html
  theology/
    index.html
    scripture/
      index.html
      canon.html
      inspiration.html
      tradition.html
      interpretation.html
      vulgate.html
    god/
      index.html
      trinity.html
      providence.html
    christology/
      index.html
    mariology/
      index.html
    soteriology/
      index.html
      grace.html
      original-sin.html
      predestination.html
    eschatology/
      index.html
      eternal-life.html
      judgment.html
    creation/
      index.html
  exegesis/
    index.html
    methods/
      index.html
      four-senses.html
      typology.html
      allegory.html
      literal-sense.html
    textual-criticism/
      index.html
      vulgate-editions.html
      old-latin.html
      jerome-translation.html
  morals/
    index.html
    virtues/
      index.html
      meekness.html
      humility.html
      charity.html
      constancy.html
      obedience.html
      temperance.html
      patience.html
      chastity.html
      poverty.html
    vices/
      index.html
      avarice.html
      pride.html
    practices/
      index.html
      hospitality.html
      almsgiving.html
      fasting.html
  spirituality/
    index.html
    contemplative-life.html
    active-life.html
    contemptus-mundi.html
    desire-for-martyrdom.html
    prayer.html
  ecclesiology/
    index.html
    papacy/
      index.html
    councils/
      index.html
      trent.html
    religious-life/
      index.html
      monasticism.html
      nazirites.html
      female-religious.html
      jesuits.html
    clergy/
      index.html
      episcopal-duties.html
      ordination.html
      pastoral-visitation.html
      ecclesiastical-discipline.html
      bishop-as-shepherd.html
    authority/
      index.html
      imprimatur.html
      censorship.html
      excommunication.html
  sacraments/
    index.html
    baptism.html
    eucharist.html
    confession.html
    holy-orders.html
  devotion/
    index.html
    marian.html
    relics.html
    pilgrimage.html
    sacred-images.html
  natural-philosophy/
    index.html
    astronomy.html
    animals.html
    plants.html
```

**Taxonomy management during normalization**: The subject hierarchy is the category that requires the most judgment at Stage 2. The normalizer decides for each extracted subject:

### Language

Words and etymologies discussed in the commentary, organized by source language. Only words that Lapide explicitly discusses — etymological analyses, translation comparisons, semantic arguments — get entries. Do not extract words simply because they appear in a quoted verse; extract them when the commentary *comments on the word itself*.

```
index/language/
  index.html                          → lists languages
  hebrew/
    index.html                        → lists all Hebrew word entries
    adamah.html                       → אֲדָמָה (earth, ground)
    adam.html                         → אָדָם (man, humanity)
    bara.html                         → בָּרָא (to create)
    tohu.html                         → תֹּהוּ (formless, void)
    ruach.html                        → רוּחַ (spirit, wind, breath)
    nephesh.html                      → נֶפֶשׁ (soul, living being)
    yom.html                          → יוֹם (day)
    shamayim.html                     → שָׁמַיִם (heavens)
    eretz.html                        → אֶרֶץ (earth, land)
    nachash.html                      → נָחָשׁ (serpent)
  greek/                              → (future, for NT commentary)
    index.html
    logos.html
    agape.html
  aramaic/                            → (if needed)
    index.html
```

**Three renderings**: Every Hebrew (and future Greek/Aramaic) word entry includes three representations of the word:

1. **Modern script** — with full vowel pointing (nikkud for Hebrew, diacritics for Greek): אֲדָמָה
2. **Transliteration** — scholarly romanization: *adamah*
3. **Old Hebrew script** — Phoenician Unicode characters (U+10900–U+1091F): 𐤀𐤃𐤌𐤄

All three appear in the entry page heading, the entity panel card, and the directory listing. The Old Hebrew rendering gives a visual connection to the ancient text; Apple platforms (iOS/macOS) render Phoenician Unicode natively.

**Ref file format**:

```yaml
---
name: אֲדָמָה
slug: language/hebrew/adamah
category: language
subcategory: hebrew
transliteration: adamah
old_hebrew: 𐤀𐤃𐤌𐤄
meaning: "earth, ground, soil"
root: אדם
related:
  words:
    - language/hebrew/adam
  people:
    - person/biblical/adam
  subjects:
    - subject/theology/creation
---

The Hebrew word for "earth" or "ground" — the substance from which God formed man (Adam). Lapide discusses the etymological connection between אָדָם (adam, "man") and אֲדָמָה (adamah, "earth"), noting that man's name encodes his origin.

## References in Commentary

- `01_genesis_02.html#verse-7-p3-s-a1b2c3d` — Lapide on the wordplay between adam and adamah
  text: "Adam, that is, man, because he was formed from the adamah, that is, from the red earth"
```

**Slug convention**: Use the transliterated form, lowercase, no diacritics. `adamah` not `ădāmāh`. Keep it simple and URL-friendly.

**Extraction conventions**:

- **Extract when Lapide comments on a word** — e.g., "The Hebrew *bara* signifies creation from nothing, unlike *asah* which means to fashion from existing material." This is an etymology/word study and gets a Language entry.
- **Do not extract bare verse quotations** — if Lapide quotes Genesis 1:1 in Hebrew but doesn't discuss the individual words, those words don't get entries.
- **Proper name etymologies** — when Lapide explains the meaning of a name (e.g., "Eve, that is, *ḥawwāh*, meaning *living*"), create a Language entry for the word and cross-link to the Person entry. The etymology lives in the Language entry; the Person entry references it.
- **Translation comparisons** — when Lapide compares the Hebrew, LXX, and Vulgate renderings of a word, the Hebrew word gets the primary entry with notes on the Greek and Latin alternatives.
- **Root connections** — use the `root` field to link words that share a Hebrew root (e.g., אָדָם and אֲדָמָה both from root אדם). The `related.words` list links to other Language entries with the same root.

**Old Hebrew (Phoenician) character mapping**:

| Hebrew | Old Hebrew | Name |
|---|---|---|
| א | 𐤀 | Aleph |
| ב | 𐤁 | Beth |
| ג | 𐤂 | Gimel |
| ד | 𐤃 | Daleth |
| ה | 𐤄 | He |
| ו | 𐤅 | Waw |
| ז | 𐤆 | Zayin |
| ח | 𐤇 | Heth |
| ט | 𐤈 | Teth |
| י | 𐤉 | Yodh |
| כ/ך | 𐤊 | Kaph |
| ל | 𐤋 | Lamedh |
| מ/ם | 𐤌 | Mem |
| נ/ן | 𐤍 | Nun |
| ס | 𐤎 | Samekh |
| ע | 𐤏 | Ayin |
| פ/ף | 𐤐 | Pe |
| צ/ץ | 𐤑 | Tsade |
| ק | 𐤒 | Qoph |
| ר | 𐤓 | Resh |
| ש | 𐤔 | Shin |
| ת | 𐤕 | Taw |

When converting to Old Hebrew, strip nikkud (vowel points) from the modern Hebrew — Old Hebrew is consonantal only. Final forms (ך, ם, ן, ף, ץ) map to the same Phoenician character as their medial counterparts.

- **Placement**: Where in the hierarchy does it belong? A narrow topic like "Love of Money as Spiritual Poison" may become an occurrence within `morals/vices/avarice` rather than a standalone entry.
- **Merging**: Is this the same topic as an existing entry under a different name? "Nolo Episcopari" and "Reluctance to Accept Office" are the same subject.
- **Splitting**: If a category accumulates many entries, add a subcategory level. If `theology/` has 50 direct children, split into `theology/scripture/`, `theology/god/`, etc.
- **Depth**: Aim for 2–3 levels. One level is too flat for browsing; four is too deep to navigate. The right depth emerges from the content.
- **No "Other"**: Every subject should have a real home. If something doesn't fit the existing taxonomy, that's a signal to create a new subcategory, not to dump it in a catch-all.

## Aliases

Any entity can have one or more alias paths in addition to its canonical path. Aliases make the hierarchy browsable from multiple angles — a place under both its historical and modern region, a person under both their Latin and vernacular name.

### How aliases work

The canonical entry is a full ref file (see [Ref Files](#ref-files)) at one path. Each alias is a lightweight file at another path that points to the canonical entry:

```markdown
---
alias_of: low-countries/cambrai
---
```

During code gen, alias files produce HTML pages that either redirect to or transclude the canonical entry. Both the canonical entry and its aliases appear in their parent directory's `index.html`, so the tree is browsable from either path.

### Examples

| Canonical | Alias(es) | Reason |
|---|---|---|
| `place/low-countries/cambrai` | `place/france/cambrai` | Historical vs. modern geography |
| `person/saint/jerome` | `person/saint/hieronymus` | Latin vs. English name |
| `subject/morals/virtues/poverty` | `subject/spirituality/poverty` | Topic belongs in two branches |
| `organization/council/trent` | `place/italy/trent` | Entity is both an institution and a place |

### Alias conventions

- The canonical path is where the ref file with the full data lives
- Aliases carry no data of their own — just the `alias_of` pointer
- An entity should have at most 2–3 aliases; more suggests the taxonomy needs rethinking
- Cross-category aliases (e.g., organization ↔ place) are acceptable when an entity genuinely spans categories

## Ref Files and Code Generation

The index separates structured reference data (ref files) from generated HTML pages. Ref files are the source of truth; HTML pages are generated output.

### Architecture

```
index/refs/                          ← source of truth (checked in)
  person/saint/jerome.md
  person/saint/hieronymus.md         ← alias file
  place/low-countries/cambrai.md
  organization/council/trent.md
  ...

index/person/saint/jerome.html       ← generated (gitignored or checked in)
index/place/low-countries/cambrai.html
...
```

### Ref file format

Markdown with YAML frontmatter. Structured fields in the frontmatter, prose description in the body.

```markdown
---
name: St. Jerome
slug: person/saint/jerome
category: person
subcategory: saint
also_known_as:
  - Hieronymus
  - Eusebius Sophronius Hieronymus
  - Hieronymus Stridonensis
dates: c. 342–420
role: Church Father, translator of the Vulgate
aliases:
  - person/saint/hieronymus
related:
  people:
    - person/saint/augustine
    - person/pope/damasus-i
  places:
    - place/middle-east/palestine/bethlehem
    - place/europe/italy/rome
  organizations:
    - organization/religious-order/...
  works:
    - bibliography/jerome/vulgate
    - bibliography/jerome/epistles
  subjects:
    - subject/exegesis/textual-criticism/jerome-translation
    - subject/theology/scripture/vulgate
  years:
    - year/ad/4th-century/40s/342
    - year/ad/5th-century/20s/420
---

One of the four great Latin Doctors of the Church. Best known for his translation of the Bible into Latin (the Vulgate), commissioned by Pope Damasus I. Spent his later years in a monastic cell in Bethlehem.

## References in Commentary

- `01_Preliminares.html#preface-reader-p3-s-fab5457` — his translation praised by Augustine, Gregory, Isidore
  text: "Saint Augustine bears the same testimony, calling Jerome a most learned man and most skilled in three languages, whose translation he judges 'renders everything more truly from the Hebrew speech.'"
- `01_Preliminares.html#preface-reader-p8-s-acb6948` — "greatest Doctor" for Scripture interpretation
  text: "the Catholic Church not undeservedly celebrates St. Jerome as the greatest Doctor and as one divinely raised up for the interpretation of the sacred Scriptures"
```

Each reference has three parts:
1. **Link**: `` `file.html#paragraph-s-{hash}` `` — the sidecar annotation ID (hash derived from text content via SHA-256)
2. **Synopsis** (after `—`): a human-readable summary of what the passage says about this entity
3. **`text:`** (indented on next line): the exact quoted text of the passage, used for verification

**Note**: Slugs in `related:` fields include the category prefix (e.g., `person/saint/augustine`, not just `saint/augustine`). The slug in the frontmatter also includes the category prefix, matching the file path under `index/refs/`.

### Alias ref file

```markdown
---
alias_of: saint/jerome
---
```

### Code generation

`bun generate-index.ts` reads all ref files and produces:

1. **Entry HTML pages** — full `<html>` documents with the `<article id="entry">` pattern, styled with `index.css`, including breadcrumb nav, metadata, description, references, cross-links, and satellite maps for places with coordinates
2. **Alias HTML pages** — lightweight redirect pages (`<meta http-equiv="refresh">`) pointing to the canonical entry
3. **Directory index pages** — `index.html` at every directory level listing children (both canonical entries and aliases). Verse directory uses canonical Bible book ordering (Vulgate, 73 books). Root index includes an introductory note.
4. **Manifest** — `index/manifest.json` regenerated from the ref file tree
5. **Map tiles** — downloads and caches OpenStreetMap satellite tiles for place entries with `lat`/`lon` fields (3×1 grid at zoom 10)

The generator is idempotent — safe to run repeatedly. It replaces all manual HTML maintenance for the index, similar to how `bun update-site.ts` handles hreflang and sitemap.

### Pipeline

```
Source document
      │
      ▼
┌─────────────┐
│  Stage 0:   │  → paragraph IDs added to source HTML
│  Prep       │
└─────┬───────┘
      │
      ▼
┌─────────────┐
│  Stage 1:   │  → index/extractions/<source>/*.md
│  Extract    │     (entities with exact paragraph IDs and quoted text)
└─────┬───────┘
      │ review
      ▼
┌─────────────┐
│  Stage 2:   │  → index/refs/**/*.md (created or updated)
│  Normalize  │  → index/manifest.json (updated)
└─────┬───────┘
      │ review
      ▼
┌─────────────┐
│  Stage 3:   │  → passage spans added to source HTML
│  Annotate   │  → ref file links updated with content hashes
└─────┬───────┘
      │ verify (--check + lint)
      ▼
┌─────────────┐
│  Stage 4:   │  → audit report (all refs verified against passage text)
│  Verify     │
└─────┬───────┘
      │ fix
      ▼
┌─────────────┐
│  Stage 5:   │  → entity-ref web component tags added to source HTML
│  Entity-ref │  → components.js script tag auto-inserted
└─────┬───────┘
      │ verify (lint) + review (agents, fanned out)
      ▼
┌─────────────┐
│  Stage 6:   │  → index/**/*.html (generated from refs)
│  Generate   │  → directory index.html files
└─────────────┘
```

Stage 6 (Generate) can be re-run at any time to regenerate all HTML from the current ref files — e.g., after changing the page template or adding a new feature to the web components.

## Entry Page Format

Each generated entry is a full HTML page with the main content in an `<article id="entry">` for transclusion. All generated pages include a viewport meta tag for mobile rendering.

### Person entry example

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>St. Jerome — Lapide Index</title>
<meta name="description" content="St. Jerome (c. 342–420), Doctor of the Church, translator of the Vulgate Bible. References in Cornelius a Lapide's biblical commentary.">
<link rel="canonical" href="https://lapide.org/index/person/saint/jerome.html">
<link rel="stylesheet" href="/style.css">
<link rel="stylesheet" href="/index/index.css">
<script src="/index/components.js" type="module"></script>
</head>
<body>

<nav class="index-breadcrumb">
  <a href="/index/">Index</a> ›
  <a href="/index/person/">Person</a> ›
  <a href="/index/person/saint/">Saints</a> ›
  St. Jerome
</nav>

<article id="entry" data-category="person" data-slug="person/saint/jerome">

  <h1>St. Jerome</h1>

  <dl class="entry-meta">
    <dt>Also known as</dt>
    <dd>Hieronymus, Eusebius Sophronius Hieronymus</dd>
    <dt>Dates</dt>
    <dd>c. 342–420</dd>
    <dt>Role</dt>
    <dd>Doctor of the Church, translator of the Vulgate Bible</dd>
  </dl>

  <section id="description">
    <p>One of the four great Latin Doctors of the Church. Best known for his translation of the Bible into Latin (the Vulgate).</p>
  </section>

  <section id="works">
    <h2>Works</h2>
    <ul>
      <li><a href="/index/bibliography/jerome/vulgate.html">Vulgate</a></li>
    </ul>
  </section>

  <section id="references">
    <h2>References in Commentary</h2>
    <ul>
      <li>
        <a href="/01_Preliminares.html?entity=person%2Fsaint%2Fjerome#preface-reader-p3-s-fab5457" class="source-ref">Preliminares — Preface Reader P3</a>
        <span class="ref-context">— Testified that in his time there were as many copies as manuscripts</span>
        <blockquote class="ref-quote">"St. Jerome testified occurred in his time: namely, there were as many copies as there were manuscripts"</blockquote>
      </li>
    </ul>
  </section>

  <section id="related">
    <h2>Related</h2>
    <ul>
      <li><a href="/index/person/saint/augustine.html">St. Augustine of Hippo</a></li>
      <li><a href="/index/place/middle-east/palestine/bethlehem.html">Bethlehem</a></li>
      <li><a href="/index/bibliography/jerome/vulgate.html">Vulgate</a></li>
    </ul>
  </section>

</article>

</body>
</html>
```

**Key details**:
- `data-slug` includes the full category prefix (e.g., `person/saint/jerome`)
- Reference links include `?entity=slug` query param so the entity panel auto-opens when navigating from the index
- Reference links use `#paragraph-s-{hash}` fragment IDs (sidecar annotation IDs) for passage-level highlighting
- `<blockquote class="ref-quote">` shows the exact quoted text from the passage
- The `<section id="works">` appears on person pages when the person has entries in the bibliography (via `author_slug` cross-referencing)
- All cross-references in the generated HTML use plain `<a>` links, not custom web component tags

### Year entry example

```html
<article id="entry" data-category="year" data-slug="year/ad/17th-century/30s/1637">

  <h1>1637</h1>

  <section id="events">
    <h2>Events</h2>
    <ul>
      <li>Death of <a href="/index/person/cleric/cornelius-a-lapide.html">Cornelius a Lapide</a> in <a href="/index/place/europe/italy/rome.html">Rome</a></li>
    </ul>
  </section>

  <section id="references">
    <h2>References in Commentary</h2>
    <ul>
      <li>
        <a href="/01_Preliminares.html?entity=year%2Fad%2F17th-century%2F30s%2F1637#life-p5-s-abc1234" class="source-ref">Preliminares — Life P5</a>
        <span class="ref-context">— Death of Lapide in Rome</span>
        <blockquote class="ref-quote">"quoted passage text"</blockquote>
      </li>
    </ul>
  </section>

</article>
```

**Note**: Year entries have no description prose — only events and references. The entity panel extracts events as bullet points for display in the floating card.

### Verse entry example

```html
<article id="entry" data-category="verse" data-slug="verse/genesis/3/15">

  <h1>Genesis 3:15</h1>

  <section id="description">
    <p>The protoevangelium — first promise of redemption after the Fall.</p>
  </section>

  <section id="references">
    <h2>References in Commentary</h2>
    <ul>
      <li>
        <a href="/01_genesis_03.html?entity=verse%2Fgenesis%2F3%2F15#verse-15-p1-s-abc1234" class="source-ref">Commentary on Genesis, Chapter 3 — Verse 15</a>
        <span class="ref-context">— extensive discussion of the protoevangelium</span>
        <blockquote class="ref-quote">"quoted passage text"</blockquote>
      </li>
    </ul>
  </section>

  <section id="related">
    <h2>Related</h2>
    <ul>
      <li><a href="/index/person/saint/augustine.html">St. Augustine of Hippo</a></li>
      <li><a href="/index/subject/theology/mariology.html">Mariology</a></li>
    </ul>
  </section>

</article>
```

### Verse directory

The top-level verse directory (`/index/verse/`) displays book names in canonical Vulgate Bible order (73 books from Genesis through Revelation), not alphabetically. Books link to their chapter listing; the directory does not nest chapters inline.

## Web Components

Defined in `index/components.js`. A single `<entity-ref>` custom element handles forward linking from commentary text to index entries. An `EntityPanel` singleton manages a floating card/side panel that fetches and displays entity summaries.

### `<entity-ref>` element

Used in source HTML (added during Stage 5) to create clickable forward links from commentary text to index entry pages:

```html
<entity-ref slug="person/saint/jerome">St. Jerome</entity-ref>
```

The element renders as inline text with a dotted underline. Clicking/tapping it opens the entity panel.

### Entity panel (`EntityPanel`)

A singleton floating card that fetches entity entry pages and displays a summary. Behavior differs by viewport width:

- **Desktop (>860px)**: Fixed side panel in the right margin, sticky to viewport
- **Mobile (≤860px)**: Inserted inline in the DOM directly after the source paragraph

Features:
- **Card stack**: Multiple entity cards can be open simultaneously, navigable with prev/next buttons
- **Auto-open**: When navigating to a source page with `?entity=slug` query param (from an index entry's reference link), the panel opens automatically
- **Fetches and caches**: Loads the entry's `<article>` HTML, extracts name, metadata, description, map, and events
- **Mobile scroll hint**: When the panel is inserted below the viewport on mobile, a bouncing down-arrow indicator appears at the bottom of the screen. Tapping it scrolls to the panel; it auto-dismisses after 3 seconds.

### Passage highlighting

When a URL fragment matches the `#...-s-{hash}` pattern (a sidecar annotation ID), JavaScript:

1. Reads the JSON sidecar (`<script type="application/json" id="passage-annotations">`)
2. Finds the annotation by ID
3. Uses DOM TreeWalker to locate the text node positions for the character offsets
4. Wraps the text range in a `<mark class="passage-highlight">` element using the Range API
5. Scrolls to the highlighted text
6. Fades the highlight out after 5 seconds (background-color transition to transparent)

Falls back to highlighting the entire paragraph if the Range spans multiple elements.

### Future enhancements

- **Language awareness**: components detect `document.documentElement.lang` and append the appropriate suffix to the URL
- **Transclusion**: a `<index-embed>` component that inlines the full entry article

## Deep Linking

### Paragraph-level anchors (Stage 0: Prep)

The commentary text uses section-level anchors (e.g., `id="verse-1"`, `id="helmeted-prologue"`). Before extraction begins, paragraph-level IDs are added to every `<p>` tag:

```html
<h3 id="verse-1">Verse 1</h3>
<p id="verse-1-p1">In the beginning God created...</p>
<p id="verse-1-p2">St. Augustine says...</p>
<p id="verse-1-p3">Lapide further notes...</p>
```

**Convention**: `{section-id}-p{n}` where `n` is the paragraph number within that section (1-indexed).

These IDs are added during Stage 0 (Prep), *before* extraction agents read the file. This ensures agents reference actual paragraph IDs rather than approximate counts. Existing section-level IDs are preserved.

### Passage annotations (Stage 3: Annotate)

After extraction and normalization, passage annotations are recorded in a JSON sidecar embedded in the source HTML (not as inline `<span>` markup — see Stage 3 below for why). The sidecar uses character offsets to identify text ranges within paragraphs.

**ID convention**: `{paragraph-id}-s-{hash}` where `hash` is the first 7 characters of a hex-encoded SHA-256 hash of the plain text content of the passage (HTML tags stripped, whitespace normalized). The `-s-` prefix distinguishes sidecar annotation IDs from paragraph IDs. This makes every reference self-verifying — if the passage text is edited, the hash no longer matches.

**Hash computation**: Strip HTML tags from the passage text, normalize whitespace to single spaces, trim, then take the first 7 hex characters of a SHA-256 hash of the resulting string.

### Entity-ref tags (Stage 5)

After passage annotations are verified, inline entity references are added using the `<entity-ref>` web component tag:

```html
<p id="verse-1-p3"><entity-ref slug="person/saint/augustine">St. Augustine</entity-ref>, in his <entity-ref slug="bibliography/augustine/de-civitate-dei"><em>De Civitate Dei</em></entity-ref> (lib. XV, cap. 8), argues that...</p>
```

Entity-ref tags create forward links from the commentary text to index entry pages. They are distinct from sidecar passage annotations (which create backlinks from index entries to the commentary). Both can coexist on the same text — the entity-ref is inline in the HTML while the passage annotation is recorded in the JSON sidecar with character offsets.

Entity-ref annotation is conservative — only tag references that can be confidently identified. Ambiguous references are left untagged and can be resolved in later passes.

**Tool**: `bun tag-entity-refs.ts <source.html>` — reads all ref files, builds a name-to-slug index, and wraps matching entity names in the source HTML with `<entity-ref>` tags. The tagger normalizes Unicode apostrophes for matching (U+2018/U+2019/U+02BC → ASCII U+0027).

## Pipeline

The index is built incrementally, one source document at a time. Each document passes through seven stages:

### Stage 0: Prep

Add paragraph-level IDs and `data-paragraph-number` attributes to every `<p>` tag in the source HTML. Run:

```
bun number-paragraphs.ts <source.html>
```

The script identifies sections by `<p id="...">` anchor tags. Within each section, every `<p>` gets:
- `data-paragraph-number="N"` (1-indexed within the section)
- `id="{section-id}-pN"` if it doesn't already have an id (the section anchor keeps its original id and gets `data-paragraph-number="1"`)

The script is idempotent — safe to run repeatedly. It must run *before* extraction so that agents can reference actual paragraph IDs rather than counting paragraphs.

Output: source HTML with stable paragraph IDs on every `<p>` tag.

### Stage 1: Extract

Read the pre-numbered source document and produce raw extraction files — one markdown file per category (people, places, organizations, years, verses, bibliography, subjects) in `index/extractions/<source-name>/`.

This stage is purely additive. Agents read the text and identify every entity they can find, capturing:
- Name and identifying details
- Proposed slug and subcategory
- Every occurrence, keyed to the **actual paragraph ID** from the HTML
- The **exact quoted text** of the sentence or phrase being referenced
- A synopsis describing what the passage says about the entity
- Cross-references to other entities (related people, places, works, etc.)

Multiple agents can work in parallel, each covering one category or one section of the document.

After extraction, validate every extraction file against the source HTML:

```
bun validate-extractions.ts <source.html> [extraction-dir-or-file]
```

This checks that every referenced paragraph ID exists and every `text: "..."` quote actually appears in the referenced paragraph. Fix any errors before proceeding to Stage 2 — catching misquotes and wrong paragraph IDs here prevents them from propagating into ref files.

### Stage 2: Normalize

Compare each extracted entity against the existing ref files and either update an existing ref file or create a new one.

This is where:
- **Deduplication** happens — the same entity extracted from different documents is merged into one entry
- **Disambiguation** is resolved — "Anselm" is identified as Anselm of Canterbury or Anselm of Laon
- **Categorization is corrected** — entities are assigned their canonical subcategory using external knowledge, not just what the source text says (e.g., Gregory of Nyssa goes under `saint/` even if a particular text doesn't use the title "Saint")
- **Collective mentions are expanded** — a single passage listing 15 scholars becomes 15 individual person entries
- **Phantom entries are collapsed** — "Augustine's testimony on Jerome" isn't a standalone work; it becomes an occurrence within Augustine's De Doctrina Christiana
- **Name variants are recorded** — Latin, vernacular, and alternate forms are captured in the `also_known_as` field
- **Aliases are created** — when an entity should be browsable from multiple paths
- **Occurrence lists are merged** — new backlinks are added to existing entries alongside those from previously scanned documents
- **Subject taxonomy is managed** — placement, merging, splitting decisions for the subject hierarchy

At this stage, ref file references use paragraph-level links (e.g., `#preface-reader-p3`) and include both a synopsis and exact text. The hash-based passage span IDs are added in Stage 3.

Output: ref files in `index/refs/` (created or updated), plus `index/manifest.json`.

After normalization, validate all ref files:

```
bun validate-refs.ts
```

This checks:
- Valid YAML frontmatter with required fields (name, slug, category)
- Slug matches file path (`person/saint/jerome` → `index/refs/person/saint/jerome.md`)
- No duplicate slugs across files
- Cross-references in `related:` point to existing ref files
- Alias files point to valid canonical entries
- Every paragraph ID exists in the source HTML
- Every `text: "..."` quote appears in the referenced paragraph (with normalization for ligatures, dashes, and quotation marks)

Fix any errors, then run a reconciliation pass if needed to resolve cross-reference mismatches between agents.

### Stage 3: Annotate

Embed a JSON sidecar in the source HTML that maps each referenced text passage to its location within a paragraph. No inline markup (`<span>`, etc.) is added to the text itself — all annotation data lives in a `<script type="application/json" id="passage-annotations">` block inserted before `</body>`.

**Tool**: `bun annotate-source.ts <source.html>` (or `--check` for dry-run verification)

The annotator:

1. Scans all ref files in `index/refs/` for links to the source document
2. For each `text:` field, finds the quoted text within its referenced paragraph using normalized fuzzy matching (ligature expansion, quote unification, em dash normalization)
3. Computes a content hash (first 7 hex chars of SHA-256) from the matched plain text
4. Records the passage as an annotation with character offsets (`start`, `end`) within the paragraph's plain text
5. Groups annotations that point to the same text span, merging their entity slugs
6. Embeds the full annotation array as a JSON sidecar in the HTML
7. Updates each ref file's link to include the hash suffix: `#paragraph-p3` → `#paragraph-p3-s-a3f2b1c`

**Why a sidecar instead of inline spans?** Many passages overlap — the same text may be referenced by multiple entities with different span boundaries. Overlapping `<span>` tags produce invalid HTML. The JSON sidecar avoids this entirely: each annotation is an independent record with character offsets, and JavaScript handles highlighting and scrolling at runtime.

**Sidecar format** (embedded in the HTML file):

```html
<script type="application/json" id="passage-annotations">
[
  {
    "id": "dedicatory-letter-p3-s-a8ad3c1",
    "paragraph": "dedicatory-letter-p3",
    "start": 0,
    "end": 142,
    "entities": ["place/europe/low-countries/mechlin", "person/cleric/hovius"]
  },
  ...
]
</script>
```

- `id`: `{paragraph-id}-s-{hash}` — the `-s-` prefix distinguishes sentence/span hashes from paragraph IDs
- `paragraph`: the `id` attribute of the `<p>` tag containing this passage
- `start`, `end`: character offsets within the paragraph's plain text (tags stripped)
- `entities`: sorted array of ref file slugs that reference this passage

**Link format in ref files** (after annotation):

```
- `01_Preliminares.html#dedicatory-letter-p3-s-a8ad3c1` — synopsis
  text: "quoted text"
```

The hash makes each reference self-verifying — if the source text changes, the hash changes, and `validate-refs.ts` will flag the stale link.

**Idempotent** — removes any existing sidecar and strips existing `-s-{hash}` suffixes from ref file links before re-deriving everything from current text. Ref file link updates are line-targeted (not global regex), so multiple annotations within the same paragraph each get their own correct hash.

**Dry-run mode** (`--check`): compares the current state against what a fresh annotate run would produce, without modifying any files. Reports new/removed/changed annotations and stale ref file links. Exits 0 if everything is in sync, 1 if changes are needed. Use after editing source HTML to quickly verify nothing drifted.

**Client-side behavior**: When a URL fragment matches `#...-s-{hash}`, JavaScript reads the sidecar, finds the annotation by ID, locates the paragraph, and highlights the referenced character range. The `components.js` script handles this.

**Ref file format**: Each `text:` entry must appear on its own link line. If two passages in the same paragraph are referenced, use two separate link entries (each with its own `text:` field), not two `text:` fields under one link. This ensures each link gets a unique hash.

Output: source HTML with embedded JSON sidecar + ref files updated with hash-based links.

**Post-annotate verification**:

```
bun annotate-source.ts --check <source.html>   # confirm 0 changes needed
bun lint-annotations.ts <source.html>           # confirm 0 issues
```

### Stage 4: Verify

Run `bun validate-refs.ts` to confirm:
- Every ref file link resolves to a real paragraph ID in the HTML (stripping the `-s-{hash}` suffix)
- The `text:` field in each ref matches actual text at the referenced paragraph
- No broken cross-references between ref files

This is a mechanical check — no judgment calls. Any failures are either extraction errors (wrong paragraph) or annotation errors (wrong text matched). Fix and re-run until clean.

Output: audit report. Zero failures required before proceeding.

### Stage 5: Entity-ref

Add `<entity-ref>` web component tags to the source HTML, wrapping entity names with links to their index pages. This stage creates the forward links from commentary text to index entries.

**Tool**: `bun tag-entity-refs.ts <source.html>`

```html
<entity-ref slug="person/classical/libanius">Libanius</entity-ref> the Sophist
```

Entity-ref tags appear independently in the HTML text. They do not interact with the JSON sidecar annotations — entity-refs are forward links (text → index entry), while sidecar annotations are backlinks (index entry → text).

The tagger:

1. Reads all ref files to build a name → slug index (including `also_known_as` aliases)
2. Strips any existing `<entity-ref>` tags (idempotent)
3. For each paragraph, searches for entity name mentions as whole words (longest match first)
4. Tags the first mention of each entity per section (not every occurrence)
5. Resolves ambiguous names (multiple entities share a name) using ref file context — only tags in paragraphs where the ref file explicitly references that entity
6. Skips text inside `<a>` tags (already linked)
7. Auto-inserts `<script src="/index/components.js" type="module"></script>` in `<head>` if missing

**Annotation strategy**: conservative — only tag references that can be confidently identified. Ambiguous references are left untagged and can be resolved in later passes.

**Post-tagging verification**:

```
bun lint-annotations.ts <source.html>   # confirm entity-ref slugs all resolve, components.js present
```

**Manual review** (fanned out for large documents): After automated tagging, run review agents to check for:

- **Missing tags**: entity names mentioned in the text but not tagged — especially names that differ from the canonical form (e.g., "the Doctor of Grace" for Augustine, "the Apostle" for Paul in context)
- **Mislabeled tags**: entity-ref tags pointing to the wrong slug — especially ambiguous names that the tagger resolved incorrectly (e.g., "Gregory" tagged as Gregory of Nyssa when context indicates Gregory the Great)
- **Over-tagging**: names tagged as entities that are actually common words in context (e.g., "Grace" as a person name vs. the theological concept)

For large documents, split the review by section range and run multiple agents in parallel. Each agent reads its assigned section of the tagged HTML alongside the ref files, checking that every entity-ref tag is correct and that no obvious entity mentions were missed. Agents should report findings as a list of specific corrections (add/remove/change tag at paragraph ID).

Apply corrections, then re-run `bun tag-entity-refs.ts` (idempotent — strips and re-tags) if structural changes are needed, or apply targeted fixes with the Edit tool for individual corrections.

**Language entity-ref pass**: The automated tagger does not tag `language/` category refs (Hebrew words, Greek terms, etc.), because these terms are often short, transliterated, or overlap with person names (e.g., "Samuel", "Haman", "Nun"). After the main entity-ref pass and review, run a focused manual pass for language refs:

1. List all `language/` ref files and their transliterated names / `also_known_as` values
2. Search the source HTML for each term, noting line numbers and surrounding context
3. Apply tagging decisions:
   - **Tag**: Hebrew/Greek book names, technical terms, and letter names when used in their linguistic sense (e.g., "Bereshith", "Torah", "Logos", "Caph")
   - **Skip**: Terms that overlap with person refs already tagged in the same location (e.g., "Samuel" as person, "Haman" as person, "Obadiah" as person — when the person tag is more primary)
   - **Skip**: Letter names used as part of a person's name rather than as a Hebrew letter (e.g., "Nun" in "Josue ben Nun")
4. Follow the same first-mention-per-section convention as the automated tagger
5. Add tags manually using the Edit tool (these are typically 15–30 tags per document)

Output: fully annotated source HTML with entity-ref tags, JSON sidecar, and components.js script tag.

### Stage 6: Generate

Run the code generator (`bun generate-index.ts`) to produce HTML pages from the current ref files. See [Ref Files and Code Generation](#ref-files-and-code-generation) for details.

This stage is fully automated and idempotent. It can be re-run at any time — after normalizing a new document, after changing the HTML template, or after updating the web components.

Output: `index/**/*.html` entry pages, alias pages, directory index pages, and `index/manifest.json`.

### Pipeline tools summary

| Stage | Tool | Command |
|---|---|---|
| 0 | Prep | `bun number-paragraphs.ts <source.html>` |
| 1 | Extract | Manual (agents) |
| 2 | Normalize | Manual (agents) + `bun validate-refs.ts` |
| 3 | Annotate | `bun annotate-source.ts <source.html>` |
| 3✓ | Verify | `bun annotate-source.ts --check <source.html>` + `bun lint-annotations.ts <source.html>` |
| 4 | Verify | `bun validate-refs.ts` |
| 5 | Entity-ref | `bun tag-entity-refs.ts <source.html>` |
| 5✓ | Verify | `bun lint-annotations.ts <source.html>` |
| 6 | Generate | `bun generate-index.ts` |

Additional utility tools:
- `bun validate-extractions.ts <source.html> [extraction-dir]` — validates extraction files against source HTML
- `bun audit-refs.ts` — detailed audit of ref file references
- `bun lint-annotations.ts <source.html>` — checks sidecar annotation integrity (orphans, broken slugs, missing script tags, invalid offsets)
- `bun annotate-source.ts --check <source.html>` — dry-run annotation comparison (exits 1 if out of sync)
- `bun fix-ref-links.ts` — repairs broken ref file links
- `bun sync-passage-refs.ts` — syncs passage references across ref files
- `bun check-index-links.ts` / `bun fix-index-links.ts` — check and repair index page links

### Pipeline notes

Each stage has a review/verify checkpoint. Documents can be at different stages — e.g., Preliminares may be fully annotated while Genesis 1 is still at the extraction stage.

**Full verification chain** (run after completing Stages 3–5 for a document):

```
bun validate-refs.ts                              # text: fields match HTML
bun annotate-source.ts <source.html>              # re-derive sidecar + update ref hashes
bun annotate-source.ts --check <source.html>      # confirm 0 changes needed
bun lint-annotations.ts <source.html>             # confirm 0 issues (orphans, broken slugs, offsets)
```

All four should pass clean before considering a document fully indexed.

Stage 6 (Generate) can also be run independently at any time, since it only reads ref files and produces HTML.

## Extraction Conventions

### Standardized cross-reference fields

Every extraction entry, regardless of category, includes these fields where applicable:

```markdown
### Entry Name
- **Slug**: `subcategory/slug-name`
- **Also known as**: alternate names, Latin forms, vernacular variants
- **Dates**: birth–death or date range (for people, years)
- **Description**: brief identifying description
- **Occurrences**:
  - `#section-p3` — synopsis of what the passage says about this entity
    text: "exact quoted text from the paragraph"
- **Related people**: (slugs or names)
- **Related places**: (slugs or names)
- **Related organizations**: (slugs or names)
- **Related years**: (slugs or names)
- **Related verses**: (slugs or names)
- **Related bibliography**: (slugs or names)
- **Related subjects**: (slugs or names)
```

Not all fields apply to every entry — omit those that don't. But the field names are consistent across all six categories.

### Entity identity

- **Categorize by canonical status**, not by how the source text refers to the person. Gregory of Nyssa is a saint regardless of whether a particular passage calls him "Saint."
- **Record all name variants** in the `Also known as` field. Different source texts will use different forms (Jerome / Hieronymus / Eusebius Sophronius Hieronymus).
- **Disambiguation**: when a name is ambiguous (e.g., "Anselm"), resolve it based on context and note the reasoning. If genuinely uncertain, flag it for review.

### Collective mentions

When a passage lists multiple entities in a group (e.g., "Remigius, Bede, Rabanus, Haymo..."), create a single extraction entry noting all members and flag it for expansion into individual entries during Stage 2 normalization.

### Bibliography scope

Only extract entries for works that are identifiable as distinct texts. Do not create entries for:
- Isolated quotations or testimonies that are passages within a larger work (these are occurrences within the parent work's entry)
- Generic references like "his writings" or "the ancient Fathers"

When a specific passage within a larger work is cited (e.g., "Book IV, chapter 17 of Theodoret's Ecclesiastical History"), the entry is for the parent work; the specific passage is noted in the occurrence.

### Handling overlap

Multiple category agents may capture the same reference (e.g., the bibliography agent notes a Scripture verse, the verses agent notes an author). This is expected and acceptable during Stage 1 extraction. Deduplication happens at Stage 2 normalization — each reference ends up in exactly one canonical entry with cross-links from the others.

## Multilingual

Entry files follow the site convention:

```
index/person/saint/augustine.html       → English
index/person/saint/augustine_fr.html    → French
index/person/saint/augustine_es.html    → Spanish
```

The web components detect `document.documentElement.lang` and resolve to the appropriate file:

```javascript
connectedCallback() {
  const target = this.getAttribute('target');
  const lang = document.documentElement.lang;
  const suffix = lang === 'en' ? '' : `_${lang}`;
  const link = document.createElement('a');
  link.href = `/index/${this.constructor.category}/${target}${suffix}.html`;
  // ...
}
```

Multilingual entries are generated alongside multilingual translations of the commentary, not separately.

## CSS

Two CSS sources:

**`index/index.css`** — styles for generated index pages:

- `.index-breadcrumb` — breadcrumb navigation
- `article#entry h1` — entry page heading
- `.entry-meta` — definition list styling for metadata (dt/dd pairs)
- `#description` — description section spacing
- `#references`, `.ref-context`, `.ref-quote`, `.source-ref` — reference list styling with muted context text and indented blockquotes
- `#events`, `#works`, `#related` — additional entry sections
- `.index-note` — introductory note on the root index page
- `.author-link` — "Works by [Author]" link on bibliography directory pages
- `.index-listing` — directory listing pages with nested sublists
- `.osm-map`, `.osm-map-grid`, `.osm-map-pin`, `.osm-map-attr` — satellite map tiles for place entries

**`index/components.js`** (injected styles) — styles for the entity-ref web component and entity panel:

- `entity-ref` — inline styling (dotted underline, pointer cursor)
- `#entity-panel` — floating card container (fixed sidebar on desktop, inline on mobile)
- `.ep-header`, `.ep-nav`, `.ep-dismiss`, `.ep-count` — panel chrome
- `.ep-body`, `.ep-card-*` — card content styling
- `mark.passage-highlight` — text highlighting with yellow background and gold underline
- `.passage-highlight-para` — fallback paragraph-level highlight
- `.ep-scroll-hint` — mobile bouncing down-arrow indicator for off-screen panels

Both import `style.css` as a base.

## Phased Rollout

### Phase 1: Entity extraction

Raw identification pass. For each source file, create a directory (e.g., `index/extractions/01_Preliminares/`) containing one markdown file per category:

```
index/extractions/01_Preliminares/
  people.md
  places.md
  years.md
  verses.md
  bibliography.md
  subjects.md
```

Each file lists every entity found in the source text with:
- Name and identifying details (alternate names, dates, roles)
- Proposed slug for the index hierarchy
- Every occurrence: **actual paragraph ID** from the pre-numbered HTML + exact quoted text + synopsis
- Suggested subcategory (e.g., saint, biblical, classical for people)

#### Extraction format

```markdown
# People — 01_Preliminares

## Saints

### St. Jerome (Hieronymus Stridonensis)
- **Slug**: `saint/jerome`
- **Dates**: c. 342–420
- **Role**: Church Father, translator of the Vulgate
- **Occurrences**:
  - `#preface-reader-p3` — his translation praised by Augustine, Gregory, Isidore
    text: "Saint Augustine bears the same testimony, calling Jerome a most learned man and most skilled in three languages, whose translation he judges 'renders everything more truly from the Hebrew speech.'"
  - `#preface-reader-p5` — "greatest Doctor" for Scripture interpretation
    text: "He is celebrated, in the judgement of all, as the greatest Doctor whom God has given to His Church for the interpretation of the Holy Scriptures."
  - `#jerome-to-paulinus` — throughout (author of the epistle)
- **Related works**: Vulgate, Epistles, Hebrew Questions on Genesis
- **Related subjects**: Scripture translation, biblical languages

### St. Augustine (Aurelius Augustinus Hipponensis)
- **Slug**: `saint/augustine`
- **Dates**: 354–430
- ...
```

**Key difference from prior format**: Occurrences reference actual paragraph IDs (e.g., `#preface-reader-p3`) that exist in the pre-numbered HTML, not approximate counts (`~p3`). Each occurrence includes both a synopsis (after `—`) and the exact text of the sentence being referenced (on the `text:` line). The exact text is the ground truth for verification — the synopsis is for human readability.

This phase is purely extractive — no HTML generation, no source annotation. The markdown files are reviewed and corrected before proceeding.

**Scan order**: Start with the pre-Genesis texts (Preliminares, Clemens/Jerome, Proemium, Canones) since these are dense with references to persons, works, and theological subjects. Then proceed through Genesis chapter by chapter.

**Prerequisite**: The source HTML must have paragraph IDs (Stage 0: Prep) before extraction begins.

### Phase 2: Normalize + annotate + verify

- Normalize extractions into ref files (Stage 2)
- Annotate source HTML with passage spans using content hashes (Stage 3)
- Verify all references match their passage text (Stage 4)
- Add entity-ref web component tags to source HTML (Stage 5)
- Generate index HTML pages (Stage 6)

### Phase 3: Expand (remaining Genesis + future texts)

- Continue the full pipeline (Stages 0–6) for remaining chapters
- Entries grow richer as more texts reference them
- Each new document is independent — it goes through all stages on its own

### Phase 4: Multilingual entries

- Generate translated entry pages alongside translated commentaries
- Add language-aware resolution to web components

### Phase 5: Beyond Lapide

- Extended to additional Migne Patrologia texts
- Subject and person entries become richer as more texts reference them
- The index becomes a standalone navigable encyclopedia of patristic theology
