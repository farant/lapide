# Lapide — Project Guide

Catholic theological texts site at lapide.org. Primarily Cornelius a Lapide's biblical commentaries and related patristic/medieval works, with translations.

## Site Structure

- **English** (default): `filename.html` with `lang="en"`
- **Latin**: `filename_lt.html` with `lang="la"`
- **Spanish**: `filename_es.html` with `lang="es"`
- **French**: `filename_fr.html` with `lang="fr"`
- **Portuguese**: `filename_pt.html` with `lang="pt"`
- **German**: `filename_de.html` with `lang="de"`
- **Chinese**: `filename_zh.html` with `lang="zh"`
- **Romanian**: `filename_ro.html` with `lang="ro"`
- **Greek**: `filename_el.html` with `lang="el"`
- **Hebrew**: `filename_he.html` with `lang="he"`
- **Dutch**: `filename_nl.html` with `lang="nl"`
- **Turkish**: `filename_tr.html` with `lang="tr"`
- **Swedish**: `filename_sv.html` with `lang="sv"`
- **Vietnamese**: `filename_vi.html` with `lang="vi"`
- Future languages follow the same pattern: `filename_XX.html` with the appropriate ISO 639-1 code.

Index pages: `index.html`, `index_lt.html`, `index_es.html`, `index_fr.html`, `index_pt.html`

Quotes directories: `quotes/` (English), `quotes_lt/` (Latin), `quotes_es/` (Spanish), `quotes_fr/` (French), `quotes_pt/` (Portuguese)

All pages use `style.css`. No build system — plain static HTML.

## Adding a New Language Translation

### 1. Translate the content page

- Read both the English (`filename.html`) and Latin (`filename_lt.html`) versions as sources.
- The Latin is the original source text for patristic works (Jerome, etc.). The English is itself a translation. For later authors like Lacordaire, the original may be French (preserved in the `_lt` file), with the English as the primary translation reference.
- Use both sources: English for clear meaning, Latin to check against the original.
- For large files, split into sections (by anchor ID) and translate in parallel using multiple agents, then stitch together. The first agent handles lines from the start through the end of its section (including the HTML head); subsequent agents output only body content (no doctype/head); the final agent includes `</body></html>`.
- **Temporary files**: When agents need to write intermediate/partial output, use `tmp_` prefixed files in the project directory (e.g., `tmp_proemium_it_part1.html`) rather than `/tmp/`. Background agents often lack permission to write to `/tmp/`. Clean up `tmp_*` files after stitching.
- When the `_lt` file contains text already in the target language (e.g., Lacordaire's French in `02_Clemens`), copy that section verbatim rather than translating it.

### 2. HTML head conventions for the new file

```html
<html lang="XX">  <!-- ISO 639-1 code -->
```

Required meta/link tags in `<head>`:
```html
<meta name="description" content="...translated description...">
<link rel="canonical" href="https://lapide.org/filename_XX.html">
<link rel="alternate" hreflang="en" href="https://lapide.org/filename.html">
<link rel="alternate" hreflang="la" href="https://lapide.org/filename_lt.html">
<link rel="alternate" hreflang="XX" href="https://lapide.org/filename_XX.html">
<!-- add hreflang for any other existing language versions -->
<meta property="og:title" content="...">
<meta property="og:description" content="...">
<meta property="og:type" content="article">
<meta property="og:url" content="https://lapide.org/filename_XX.html">
```

### 3. Update hreflang and sitemap

Run `bun update-site.ts` after adding any new translated page or index file. This script:
- Scans all HTML files (excluding `quotes_*`, `tmp_*`)
- Groups multilingual files by base filename and updates `<link rel="alternate" hreflang="...">` tags in each file's `<head>` to include all siblings
- Regenerates `sitemap.xml` from all non-quote HTML files

The script is idempotent — safe to run repeatedly. It replaces all manual hreflang and sitemap maintenance. To add a new language code, add an entry to the `SUFFIX_TO_LANG` map in the script.

### 3b. Fix quotation marks (hard-tier languages)

Run `bun fix-quotes.ts <files>` after stitching any translated file for a language that uses non-ASCII quotation marks. This is a **tokenizer-level limitation**: Claude literally cannot emit the Hungarian closing quote U+201D — the tokenizer always produces ASCII U+0022 instead. This cannot be fixed by prompting or manual editing (the Edit tool has the same limitation). The script is the only reliable fix.

Currently supports: Hungarian (`„..."` → ensures closing `"` is U+201D, not ASCII U+0022). Handles quotes that span across HTML tags (e.g., opening „ inside one `<em>`, closing in another).

Run on all translated content, quotes, and index files: `bun fix-quotes.ts 01_Preliminares_hu.html index_hu.html quotes_hu/*.html`

The script is idempotent — safe to run on already-fixed files. To add support for additional languages, add entries to the `LANG_RULES` map in the script.

### 4. Anchor IDs

Keep the same `id` attributes across all language versions (e.g., `id="helmeted-prologue"`, `id="jerome-to-paulinus"`, `id="du-culte"`). These are language-neutral identifiers used for cross-linking and quotes.

### 5. Create the index page

- Create `index_XX.html` modeled on the existing index pages.
- **Title format**: `Cornelius a Lapide — [Bible Commentary in Multiple Languages]` translated to the target language (e.g., English: "Bible Commentary in Multiple Languages", French: "Commentaire Biblique en Plusieurs Langues", German: "Bibelkommentar in mehreren Sprachen"). The `og:title` must match.
- Language switcher: plain text for the current language, `<a>` links for others. Example: `<a href="index.html">English</a> · <a href="index_lt.html">Latina</a> · Español`
- Add the new language to the switcher on all existing index pages. (Note: hreflang links are handled automatically by `bun update-site.ts` — see step 3.)
- Link to all translated content pages from the new index.
- **Genesis chapter parentheticals**: When adding a Genesis chapter to an index page, check the English `index.html` (or `index_lt.html`) for the parenthetical description used for that chapter (e.g., "Paradise and the Formation of Eve") and translate it to match, rather than inventing a new description.
- **Genesis index formatting**: Genesis chapters use a nested bulleted list structure. The parent `<li>` contains the word "Genesis" (translated), followed by a child `<ul>` with each chapter as a `<li>`. See `index_lt.html` or other existing index pages for the exact nesting format. Do not add the epub download link (`index.html` has one) — that is only for when all Genesis chapters are translated for a language.

### 6. Translate quotes

- Quotes live in `quotes_XX/1.html`, `quotes_XX/2.html`, etc.
- Each quote is a `<blockquote>` with a `<cite>` linking to the relevant `_XX.html` content page and anchor.
- Only translate quotes that reference the file being translated. Use `./find-quotes.sh <filename>` to find which English (`quotes/`) and Latin (`quotes_lt/`) quote files link to a given document. The script accepts a base name, a language-suffixed name, or a `.html` filename — it strips the suffix/extension automatically. Example: `./find-quotes.sh 01_genesis_01` or `./find-quotes.sh 02_Clemens_Hieronymi_Du_Culte_fr`. The quote numbering continues sequentially across files.
- Update `QUOTE_COUNT` in `index_XX.html` to match the total number of translated quotes so far.
- The index page JavaScript fetches from `quotes_XX/N.html`.
- **Parallel agent coordination**: Multiple agents may translate different files to the same language simultaneously. Quote numbering follows `quotes_lt/` — each file maps to specific quote numbers (e.g., Clemens is always 9–18, Proemium is always 19–41), so different files naturally produce non-overlapping quote ranges. Before writing quotes, always `ls quotes_XX/` to verify no conflicts. When updating `QUOTE_COUNT`, always read the current value immediately before writing and set it to the correct total (not just incrementing), since another agent may have updated it since you last checked.

### 7. Translation register

- Use formal scholarly/theological register appropriate to the target language.
- Use the target language's standard forms for biblical proper names (e.g., Spanish: Moisés, Josué, Isaías, Jeremías; not Moses, Joshua, Isaiah, Jeremiah).
- Use traditional liturgical phrasing for well-known Scripture quotations where such a tradition exists in the target language.
- Preserve all HTML structure exactly: `<p>`, `<em>`, `<b>`, `<hr />`, anchor IDs. The translated file should have the same number of `<p>` tags as the source.
- **Diacritics are critical.** When delegating to agents, explicitly instruct them to use proper diacritics for the target language (e.g., French: é, è, ê, à, â, î, ô, û, ç, ù, ë, ï, œ; Portuguese: ã, õ, á, é, í, ó, ú, â, ê, ô, à, ç). Agents may omit them unless strongly prompted.
- **Quotations must be translated into the target language.** All quoted text (Scripture, Church Fathers, classical authors, etc.) should be translated into the target language, not left in Latin/Greek/Hebrew. The only exception is when the English source itself keeps the quotation in the original language (e.g., Hebrew etymologies, untranslated Latin technical terms). Match the English file's approach: if the English translates a quote into English, translate it into the target language; if the English preserves it in the original language, preserve it likewise.
- **Verse headings must be translated into the target language.** Some English chapters use Latin Vulgate incipits in verse headings (e.g., "Verse 1: Cognovit") while others use English translations (e.g., "Verse 1: In the beginning God created heaven and earth"). Regardless of what the English source uses, the target language translation must always translate the verse heading text into the target language (e.g., Spanish: "Versículo 1: Conoció Adán a su mujer Eva"). This ensures consistency across all languages, especially non-Latin-script languages like Arabic, Hindi, and Tagalog. The TOC entries and their corresponding section headings in the body must match exactly.
- **Psalm numbering must follow the target language's Bible convention.** The English and Latin sources use Vulgate psalm numbering (which differs from modern/Hebrew numbering by one for Psalms 10–146). Translations must convert to the numbering system used in the target language's standard Bible: e.g., Polish (Biblia Tysiąclecia) and most modern translations use Hebrew/modern numbering, so Vulgate Psalm 89 becomes Psalm 90. Agents default to copying numbers verbatim from the English source — explicitly instruct them to convert. When in doubt, check which numbering the target language's Bible convention entry in CLAUDE.md specifies.
- **Verse and poetry in `<em>` tags follow the same rule.** Classical verse (Virgil, Ovid, Claudian, Orpheus, etc.) inside `<em>` tags must be translated into the target language using the target language's standard quoting convention (e.g., guillemets «...» for French, Portuguese, Spanish, Italian) when the English version translates the verse. Agents often default to leaving verse in Latin even when surrounding prose is translated — explicitly instruct them to translate all `<em>`-tagged verse that the English translates.

### Language-specific conventions

Each language has its own conventions file covering proper names, saint names, quotation marks, theological terminology, script/diacritics requirements, and agent pitfalls. **You MUST read the relevant file before translating.**

- **Arabic** — See `lang_conventions/ar.md`
- **German** — See `lang_conventions/de.md`
- **Greek (Modern)** — See `lang_conventions/el.md`
- **Spanish** — See `lang_conventions/es.md`
- **French** — See `lang_conventions/fr.md`
- **Hebrew (Modern)** — See `lang_conventions/he.md`
- **Hindi** — See `lang_conventions/hi.md`
- **Hungarian** — See `lang_conventions/hu.md`
- **Indonesian** — See `lang_conventions/id.md`
- **Italian** — See `lang_conventions/it.md`
- **Japanese** — See `lang_conventions/ja.md`
- **Korean** — See `lang_conventions/ko.md`
- **Dutch** — See `lang_conventions/nl.md`
- **Polish** — See `lang_conventions/pl.md`
- **Portuguese** — See `lang_conventions/pt.md`
- **Romanian** — See `lang_conventions/ro.md`
- **Russian** — See `lang_conventions/ru.md`
- **Swedish** — See `lang_conventions/sv.md`
- **Tagalog** — See `lang_conventions/tl.md`
- **Thai** — See `lang_conventions/th.md`
- **Turkish** — See `lang_conventions/tr.md`
- **Vietnamese** — See `lang_conventions/vi.md`
- **Chinese (Mandarin)** — See `lang_conventions/zh.md`

### 8. Review pass

After stitching the translated file together, run review agents. For small/medium files (~60KB or less), a single reviewer agent may suffice. For large files (~100KB+), split the review into parallel agents to ensure thorough coverage rather than spot-checking.

#### Structural review (one agent, whole file)

Mechanical checks that can be verified programmatically across the entire file:
- `<p>` tag count parity with the English source
- Anchor ID presence (all IDs from the English file must exist in the translation)
- hreflang completeness in `<head>`
- HTML tag matching (`<b>`, `<em>`, `<hr />` counts match English)
- Canonical URL, `og:url`, `lang` attribute correctness
- Numerical data integrity (dates, years, verse references)
- Stitching issues at join points (duplicate lines, missing content, broken tags)

#### Translation quality review (multiple agents for large files, split by section)

Deep comparison against English and Latin sources that requires actually reading the text:
- Translation accuracy and completeness (no omitted sentences or paragraphs)
- Diacritics correctness in context
- Register consistency (formal scholarly/theological throughout)
- Quotation handling (translated into target language where English translates them)
- Biblical proper name forms (target language standard forms)
- Section heading consistency (TOC entries must match their corresponding section headings)

For large files, assign each quality reviewer a section of the file (by anchor ID ranges or line ranges), ensuring **full coverage** — every paragraph should be reviewed by at least one agent. The goal is a genuine review of the entire translation, not a spot check of selected passages.

#### Hard-tier language review (multiple passes)

Some languages have stacking difficulties that cause significantly higher LLM error rates — not just one hard feature but several interacting simultaneously. These languages require a multi-pass review process instead of a single review pass.

**Hard-tier languages**: Hungarian, Thai, Burmese, Amharic.

Why each qualifies:
- **Hungarian** — Definite/indefinite verb conjugation (every verb+object pair), 3-way vowel harmony in suffixes, double acute diacritics (ő/ű vs ö/ü), topic-focus word order. Errors compound: fixing a conjugation can break vowel harmony.
- **Thai** — No spaces between words (word segmentation), tonal, vowels written above/below/before/after consonants. Reviewing is harder because errors aren't visually obvious.
- **Burmese** — Same word segmentation problem as Thai, plus significantly less LLM training data.
- **Amharic** — Unique Ge'ez script, complex Semitic verb morphology with subject and object agreement markers, limited LLM training data.

**Multi-pass process:**

**Pass 1** (same as standard): Structural review + translation quality review, split by section for large files. Fix all identified issues.

**Pass 2** (focused lint pass on the fixed file): A targeted mechanical review checking only the known pitfalls for that specific language. This pass is narrower and checklist-driven — it catches errors introduced by Pass 1 fixes and errors that slipped through the first review due to error density.

For Hungarian, Pass 2 checks:
- Every verb with a definite object → correct (tárgyas) conjugation?
- Every case suffix → correct vowel harmony variant (-ban/-ben, -hoz/-hez/-höz, etc.)?
- Every ö/ü → should it be ő/ű (or vice versa)?
- Every quotation mark → „..." not "..."?
- Relative pronouns → amely/amelyet (formal), not ami/amit (colloquial)?

If Pass 2 finds very few issues, the file is done. If it finds many, run a Pass 3 (same focused lint), though diminishing returns are expected after 2 passes.

**Quotes and index pages**: For hard-tier languages, quotes (`quotes_XX/`) and index pages (`index_XX.html`) also get one review pass after creation. These are short texts, so a single pass checking the language-specific pitfalls (conjugation, diacritics, quotation marks, proper names) is sufficient — no need for multi-pass review.

#### Updating language conventions

If a review uncovers a new recurring issue or pitfall for a language (e.g., agents consistently misusing a term, wrong quotation mark style, incorrect proper name form), update that language's conventions file (`lang_conventions/XX.md`) with the fix. This ensures future translations and agents for that language avoid the same mistake. Don't wait for the issue to recur — if it's worth fixing in review, it's worth documenting.

## Extracting English Quotes from Genesis Commentary

### Workflow

1. Read the full chapter file (`01_genesis_XX.html`) in sections if needed.
2. Identify standout quotable passages — from Church Fathers, saints, and Lapide himself. Look for spiritual, moral, and historically interesting passages with universal appeal.
3. Present candidates to the user for approval before creating files.
4. Create sequentially numbered HTML files in `quotes/`.

### Quote file format

```html
<blockquote>
<p>QUOTE TEXT</p>
<cite>— ATTRIBUTION, in Cornelius a Lapide, <a href="01_genesis_XX.html#anchor-id">Commentary on Genesis, Chapter XX — "Section Title"</a></cite>
</blockquote>
```

### Attribution conventions

- **Canonized saint**: `— St. Author, in Cornelius a Lapide, ...`
- **Lapide's own words**: `— Cornelius a Lapide, ...` (no "in" prefix)
- **Blessed (not canonized)**: `— Bl. Author, in Cornelius a Lapide, ...`
- **Religious brother**: `— Brother Author, in Cornelius a Lapide, ...`
- **Non-saint / secular author**: `— Author, in Cornelius a Lapide, ...`
- **Saint speaking (e.g. deathbed speech)**: `— St. Author, in Cornelius a Lapide, ...`

### Notes

- Quote density varies by chapter richness: theological chapters yield 5–8 quotes; genealogical or legal chapters may yield 1–2.
- Anchor IDs vary per chapter — some use `#verse-X`, others use descriptive names like `#verse-12-ladder-moral` or `#moral-conclusion`. Check the chapter's table of contents.
- Section titles in the cite tag should reflect the section heading or a short descriptive phrase from the chapter.
- Genesis commentary files are named `01_genesis_XX.html` (XX = chapter number, no leading zero).

## Crampon Footnotes

Augustin Crampon (1826–1894), a French biblical scholar, edited and annotated Cornelius a Lapide's commentaries. He added editorial footnotes throughout the text that are not part of Lapide's original commentary. These have been identified and removed from the Genesis commentary (chapters 1–50) in both the English and Latin files. Future books (Exodus, etc.) will likely contain the same kind of additions and should be cleaned in the same way.

### How to identify Crampon footnotes

Crampon footnotes appear in several formats:

- **Numbered italic blocks**: `<p><em>(1) ...text...</em></p>` — the most common format. Numbered sequentially within a section or as endnotes at the end of a chapter.
- **Reversed tag order**: `<em><p>...text...</p></em>` — same content, just with `<em>` and `<p>` swapped. Seen in some chapters (e.g., ch. 27).
- **Unnumbered italic blocks**: `<p><em>...text...</em></p>` — standalone italic paragraphs that are editorial glosses rather than Lapide's commentary.
- **Plain (non-italic) paragraphs**: `<p>(1) ...text...</p>` — numbered but not italic. Less common.
- **Endnote clusters**: A group of numbered footnotes gathered under a `<p id="footnotes"><b>Footnotes</b></p>` heading at the end of a chapter.
- **Spliced text**: Crampon material inserted mid-paragraph into Lapide's own text, typically introduced with "Yet Rosenmüller says..." or similar. These require trimming the paragraph rather than deleting it entirely.

### Key markers that distinguish Crampon additions from Lapide's text

- **Post-Lapide scholars** (died after Lapide's 1637 death): Rosenmüller, Gesenius, Meignan, Schultens, Allioli, Cappel, Wiseman, Michaelis, Schroeder, Clericus, Bochart, Chardin, Thevenot, Drusius, Houbigant, Lowth, de Saulcy, Vater, Tuch, Oppert, Lenormant, Anquetil-Duperron, Molitor, Breecher, Pareau, Ranke, Havernick, de Wette, De Laborde, Patrizzi, Drach.
- **Out-of-sequence verse references**: A note labeled "Verse 18" appearing in a section commenting on verse 12, for example.
- **Alternative Hebrew/Syriac/Arabic translations** presented as standalone italic notes rather than integrated into Lapide's exegesis.
- **Bibliographic additions**: References to works published after 1637.

### Removal workflow

1. Document all identified footnotes with line numbers and opening text (stored in a reference file like `crampon.txt`).
2. Show the full text of each footnote to the user for approval before removal.
3. Remove using the Edit tool, matching the footnote paragraph plus surrounding context (typically the following `<hr />` or next `<p>`) to avoid orphaned blank lines.
4. Verify removal with Grep after each chapter.
5. For chapters with Latin versions (`_lt.html`), remove the matching footnotes from both files. Genesis chapters 1–9 have Latin versions; chapter 10 onward is English only.

## Content Notes

- All site content is CC0 1.0 / public domain.
- The site is an experiment using AI (Claude) for translation. Errors from OCR or translation are possible.
- Issues are tracked at https://github.com/farant/lapide
