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

Seven top-level categories, each a subdirectory of `index/`:

| Category | Path | Description |
|---|---|---|
| Person | `index/person/` | Church Fathers, biblical figures, popes, classical authors, etc. |
| Place | `index/place/` | Geographic locations — cities, regions, bodies of water, sacred sites |
| Organization | `index/organization/` | Institutions, religious orders, councils, governments, publishers |
| Year | `index/year/` | Chronological entries aggregating events/references per year |
| Verse | `index/verse/` | Bible verse index — every verse referenced in the commentaries |
| Bibliography | `index/bibliography/` | Works cited in the commentaries |
| Subject | `index/subject/` | Theological, moral, exegetical, and ecclesiological topics |

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

**Coordinates**: Every place ref file includes `lat` and `lon` fields in the YAML frontmatter (decimal degrees, WGS84). For cities, use the city center. For regions, use an approximate centroid. For biblical places, use best scholarly estimates of the traditional location. Coordinates enable map-based browsing and visualization in future phases.

```yaml
# Example place frontmatter with coordinates and alias
name: Mechlin
slug: europe/low-countries/mechlin
category: place
subcategory: city
also_known_as:
  - Mechelen
  - Malines
description: City in the Duchy of Brabant; seat of the metropolitan archbishopric
lat: 51.0259
lon: 4.4776
aliases:
  - europe/belgium/mechlin
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

Organized by author.

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
slug: saint/jerome
category: person
subcategory: saint
also_known_as:
  - Hieronymus
  - Eusebius Sophronius Hieronymus
  - Hieronymus Stridonensis
dates: c. 342–420
role: Church Father, translator of the Vulgate
aliases:
  - saint/hieronymus
related:
  people:
    - saint/augustine
    - pope/damasus-i
  places:
    - low-countries/bethlehem
    - italy/rome
  organizations:
    - religious-order/...
  works:
    - jerome/vulgate
    - jerome/epistles
  subjects:
    - exegesis/textual-criticism/jerome-translation
    - theology/scripture/vulgate
  years:
    - ad/4th-century/40s/342
    - ad/5th-century/20s/420
---

One of the four great Latin Doctors of the Church. Best known for his translation of the Bible into Latin (the Vulgate), commissioned by Pope Damasus I. Spent his later years in a monastic cell in Bethlehem.

## References in Commentary

- `01_Preliminares.html#preface-reader` ~p3 — his translation praised by Augustine, Gregory, Isidore
- `01_Preliminares.html#preface-reader` ~p5 — "greatest Doctor" for Scripture interpretation
- `02_Clemens_Hieronymi_Du_Culte.html#jerome-to-paulinus` — throughout
```

### Alias ref file

```markdown
---
alias_of: saint/jerome
---
```

### Code generation

A generator script (`bun generate-index.ts` or similar) reads all ref files and produces:

1. **Entry HTML pages** — full `<html>` documents with the `<article id="entry">` pattern, styled with `index.css`, including breadcrumb nav, metadata, description, references, cross-links
2. **Alias HTML pages** — lightweight pages that redirect to or transclude the canonical entry
3. **Directory index pages** — `index.html` at every directory level listing children (both canonical entries and aliases)
4. **Manifest** — `index/manifest.json` regenerated from the ref file tree

The generator is idempotent — safe to run repeatedly. It replaces all manual HTML maintenance for the index, similar to how `bun update-site.ts` handles hreflang and sitemap.

### Pipeline (updated)

```
Source document
      │
      ▼
┌─────────────┐
│  Stage 1:   │  → index/extractions/<source>/*.md
│  Extract    │
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
│  Stage 3:   │  → index/**/*.html (generated from refs)
│  Generate   │  → directory index.html files
└─────┬───────┘
      │
      ▼
┌─────────────┐
│  Stage 4:   │  → source document annotated with web component tags
│  Annotate   │  → paragraph IDs added
└─────────────┘
```

Stage 3 (Generate) is now a distinct step between normalization and annotation. It can be re-run at any time to regenerate all HTML from the current ref files — e.g., after changing the page template or adding a new feature to the web components.

## Entry Page Format

Each generated entry is a full HTML page with the main content in an `<article id="entry">` for transclusion.

### Person entry example

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>St. Augustine of Hippo — Lapide Index</title>
  <meta name="description" content="St. Augustine of Hippo (354–430), Bishop and Doctor of the Church. References in Cornelius a Lapide's biblical commentary.">
  <link rel="canonical" href="https://lapide.org/index/person/saint/augustine.html">
  <link rel="stylesheet" href="/style.css">
  <link rel="stylesheet" href="/index/index.css">
  <script src="/index/components.js" type="module"></script>
</head>
<body>

<nav class="index-breadcrumb">
  <a href="/index/">Index</a> ›
  <a href="/index/person/">Person</a> ›
  <a href="/index/person/saint/">Saints</a> ›
  Augustine
</nav>

<article id="entry" data-category="person" data-slug="saint/augustine">

  <h1>St. Augustine of Hippo</h1>

  <dl class="entry-meta">
    <dt>Full name</dt>
    <dd>Aurelius Augustinus Hipponensis</dd>
    <dt>Born</dt>
    <dd><year-ref target="ad/4th-century/50s/354">354</year-ref>, <place-ref target="city/thagaste">Thagaste</place-ref></dd>
    <dt>Died</dt>
    <dd><year-ref target="ad/5th-century/30s/430">430</year-ref>, <place-ref target="city/hippo">Hippo Regius</place-ref></dd>
    <dt>Role</dt>
    <dd>Bishop of Hippo, Church Father, Doctor of the Church</dd>
  </dl>

  <section id="description">
    <p>One of the most influential theologians in the history of Christianity. His writings on grace, original sin, and the Trinity shaped Western theological tradition for over a millennium. Lapide cites him more frequently than almost any other Church Father.</p>
  </section>

  <section id="references">
    <h2>References in Commentary</h2>
    <ul>
      <li>
        <a href="/01_genesis_01.html#verse-1-p3">Commentary on Genesis, Chapter 1 — Verse 1</a>
        <span class="ref-context">— on creation <em>ex nihilo</em>, citing <bib-ref target="augustine/confessions">Confessions</bib-ref> XI</span>
      </li>
      <li>
        <a href="/01_genesis_03.html#verse-15-p2">Commentary on Genesis, Chapter 3 — Verse 15</a>
        <span class="ref-context">— on the protoevangelium and enmity between the serpent and the woman</span>
      </li>
    </ul>
  </section>

  <section id="works-cited">
    <h2>Works Cited</h2>
    <ul>
      <li><bib-ref target="augustine/de-civitate-dei">De Civitate Dei</bib-ref></li>
      <li><bib-ref target="augustine/de-genesi-ad-litteram">De Genesi ad Litteram</bib-ref></li>
      <li><bib-ref target="augustine/confessions">Confessiones</bib-ref></li>
    </ul>
  </section>

  <section id="related">
    <h2>Related</h2>
    <ul>
      <li><subject-ref target="theology/grace">Grace</subject-ref></li>
      <li><subject-ref target="theology/original-sin">Original Sin</subject-ref></li>
      <li><person-ref target="heresiarch/pelagius">Pelagius</person-ref></li>
      <li><place-ref target="city/hippo">Hippo Regius</place-ref></li>
    </ul>
  </section>

</article>

</body>
</html>
```

### Year entry example

```html
<article id="entry" data-category="year" data-slug="ad/4th-century/50s/354">

  <h1>354 AD</h1>

  <section id="events">
    <h2>Events</h2>
    <ul>
      <li>Birth of <person-ref target="saint/augustine">St. Augustine</person-ref> in <place-ref target="city/thagaste">Thagaste</place-ref>, North Africa</li>
    </ul>
  </section>

  <section id="references">
    <h2>References in Commentary</h2>
    <ul>
      <li>
        <a href="/01_Preliminares.html#augustine-bio">Preliminares — Augustine biography</a>
      </li>
    </ul>
  </section>

</article>
```

### Verse entry example

```html
<article id="entry" data-category="verse" data-slug="genesis/3/15">

  <h1>Genesis 3:15</h1>

  <section id="text">
    <h2>Vulgate</h2>
    <p class="verse-text" lang="la"><em>Inimicitias ponam inter te et mulierem, et semen tuum et semen illius: ipsa conteret caput tuum, et tu insidiaberis calcaneo eius.</em></p>
    <h2>English</h2>
    <p class="verse-text">I will put enmities between thee and the woman, and thy seed and her seed: she shall crush thy head, and thou shalt lie in wait for her heel.</p>
  </section>

  <section id="references">
    <h2>Commentary References</h2>
    <ul>
      <li>
        <a href="/01_genesis_03.html#verse-15">Commentary on Genesis, Chapter 3 — Verse 15</a>
        <span class="ref-context">— extensive discussion of the protoevangelium; Mariological and Christological interpretations</span>
      </li>
    </ul>
  </section>

  <section id="commentators">
    <h2>Commentators Cited</h2>
    <ul>
      <li><person-ref target="saint/augustine">St. Augustine</person-ref></li>
      <li><person-ref target="saint/irenaeus">St. Irenaeus</person-ref></li>
    </ul>
  </section>

  <section id="subjects">
    <h2>Subjects</h2>
    <ul>
      <li><subject-ref target="theology/protoevangelium">Protoevangelium</subject-ref></li>
      <li><subject-ref target="theology/mariology">Mariology</subject-ref></li>
    </ul>
  </section>

</article>
```

## Web Components

A single base class with subclasses per category. Defined in `index/components.js`.

```javascript
class IndexRef extends HTMLElement {
  static category = '';

  connectedCallback() {
    const target = this.getAttribute('target');
    const link = document.createElement('a');
    link.href = `/index/${this.constructor.category}/${target}.html`;
    link.className = `index-ref ${this.constructor.category}-ref`;
    link.innerHTML = this.innerHTML;
    this.replaceChildren(link);
  }
}

class PersonRef extends IndexRef { static category = 'person'; }
class PlaceRef extends IndexRef { static category = 'place'; }
class OrgRef extends IndexRef { static category = 'organization'; }
class YearRef extends IndexRef { static category = 'year'; }
class VerseRef extends IndexRef { static category = 'verse'; }
class BibRef extends IndexRef { static category = 'bibliography'; }
class SubjectRef extends IndexRef { static category = 'subject'; }

customElements.define('person-ref', PersonRef);
customElements.define('place-ref', PlaceRef);
customElements.define('org-ref', OrgRef);
customElements.define('year-ref', YearRef);
customElements.define('verse-ref', VerseRef);
customElements.define('bib-ref', BibRef);
customElements.define('subject-ref', SubjectRef);
```

### Future enhancements

- **Popover on hover**: fetch the entry's `<article>` and display as a tooltip/popover
- **Transclusion**: a `<index-embed target="person/saint/augustine">` component that inlines the full entry
- **Language awareness**: components detect `document.documentElement.lang` and append the appropriate suffix to the URL

## Deep Linking

### Paragraph-level anchors

The commentary text currently uses section-level anchors (e.g., `id="verse-1"`, `id="helmeted-prologue"`). For paragraph-level backlinks, we add finer-grained IDs:

```html
<h3 id="verse-1">Verse 1</h3>
<p id="verse-1-p1">In the beginning God created...</p>
<p id="verse-1-p2">St. Augustine says...</p>
<p id="verse-1-p3">Lapide further notes...</p>
```

**Convention**: `{section-id}-p{n}` where `n` is the paragraph number within that section (1-indexed).

These IDs are added during the annotation pass when a chapter is scanned for index entries. Existing section-level IDs are preserved.

## Annotation Pass

When a chapter is scanned, the source HTML is annotated with:

1. **Paragraph IDs** for deep linking
2. **Web component tags** wrapping references

Before annotation:
```html
<p>St. Augustine, in his <em>De Civitate Dei</em> (lib. XV, cap. 8), argues that...</p>
```

After annotation:
```html
<p id="verse-1-p3"><person-ref target="saint/augustine">St. Augustine</person-ref>, in his <bib-ref target="augustine/de-civitate-dei"><em>De Civitate Dei</em></bib-ref> (lib. XV, cap. 8), argues that...</p>
```

The annotation should be conservative — only tag references that can be confidently identified. Ambiguous references are left untagged and can be resolved in later passes.

## Pipeline

The index is built incrementally, one source document at a time. Each document passes through four stages:

### Stage 1: Extract

Read the source document and produce raw extraction files — one markdown file per category (people, places, organizations, years, verses, bibliography, subjects) in `index/extractions/<source-name>/`.

This stage is purely additive. Agents read the text and identify every entity they can find, capturing:
- Name and identifying details
- Proposed slug and subcategory
- Every occurrence (section anchor + approximate paragraph + context)
- Cross-references to other entities (related people, places, works, etc.)

Multiple agents can work in parallel, each covering one category. The extraction files are reviewed before proceeding to Stage 2.

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

Output: ref files in `index/refs/` (created or updated), plus `index/manifest.json`.

### Stage 3: Generate

Run the code generator (`bun generate-index.ts`) to produce HTML pages from the current ref files. See [Ref Files and Code Generation](#ref-files-and-code-generation) for details.

This stage is fully automated and idempotent. It can be re-run at any time — after normalizing a new document, after changing the HTML template, or after updating the web components.

### Stage 4: Annotate

Add paragraph-level IDs and web component tags to the source HTML.

This stage modifies the source document:
1. Add `id` attributes to paragraphs for deep linking (`{section-id}-p{n}`)
2. Wrap entity references with the appropriate web component tag (`<person-ref>`, `<place-ref>`, `<org-ref>`, etc.)
3. Annotation is conservative — only tag references that were confidently identified in Stages 1–2

Before:
```html
<p>St. Augustine, in his <em>De Civitate Dei</em> (lib. XV, cap. 8), argues that...</p>
```

After:
```html
<p id="verse-1-p3"><person-ref target="saint/augustine">St. Augustine</person-ref>, in his <bib-ref target="augustine/de-civitate-dei"><em>De Civitate Dei</em></bib-ref> (lib. XV, cap. 8), argues that...</p>
```

### Pipeline flow

See the [updated diagram](#pipeline-updated) in the Ref Files section above.

Each stage has a review checkpoint. Documents can be at different stages — e.g., Preliminares may be fully annotated while Genesis 1 is still at the extraction stage.

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
  - `#section-anchor` ~pN — "quoted context from the text"
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

`index/index.css` provides styles for:

- `.index-breadcrumb` — breadcrumb navigation
- `.entry-meta` — definition list styling for metadata
- `.ref-context` — muted text for reference context snippets
- `.index-ref` — base styling for web component links (subtle underline, category-specific color)
- Directory index pages — card/list layouts for browsing

Imports `style.css` as a base; adds only index-specific rules.

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
- Every occurrence: section anchor + approximate paragraph + brief context
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
  - `#helmeted-prologue` p1 — author of the Helmeted Prologue to Genesis
  - `#helmeted-prologue` p3 — on the necessity of armored prefaces
  - `#jerome-to-paulinus` throughout — author of the epistle
- **Related works**: Vulgate, Epistles, Hebrew Questions on Genesis
- **Related subjects**: Scripture translation, biblical languages

### St. Augustine (Aurelius Augustinus Hipponensis)
- **Slug**: `saint/augustine`
- **Dates**: 354–430
- ...
```

This phase is purely extractive — no HTML generation, no source annotation. The markdown files are reviewed and corrected before proceeding.

**Scan order**: Start with the pre-Genesis texts (Preliminares, Clemens/Jerome, Proemium, Canones) since these are dense with references to persons, works, and theological subjects. Then proceed through Genesis chapter by chapter.

### Phase 2: HTML entry generation

- Aggregate extraction data across all scanned files
- Generate entry HTML pages in the index hierarchy
- Create `index/components.js` with the base web components
- Create `index/index.css` with basic styles
- Build directory indexes for all populated paths
- Create `index/manifest.json`

### Phase 3: Source annotation

- Add paragraph-level IDs to commentary HTML
- Annotate source text with web component tags (`<person-ref>`, etc.)
- Conservative pass — only tag confident identifications

### Phase 4: Expand (remaining Genesis + future texts)

- Continue extraction → entry generation → annotation for remaining chapters
- Entries grow richer as more texts reference them

### Phase 5: Multilingual entries

- Generate translated entry pages alongside translated commentaries
- Add language-aware resolution to web components

### Phase 6: Beyond Lapide

- Extended to additional Migne Patrologia texts
- Subject and person entries become richer as more texts reference them
- The index becomes a standalone navigable encyclopedia of patristic theology
