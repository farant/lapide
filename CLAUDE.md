# Lapide — Project Guide

Catholic theological texts site at lapide.org. Primarily Cornelius a Lapide's biblical commentaries and related patristic/medieval works, with translations.

## Site Structure

- **English** (default): `filename.html` with `lang="en"`
- **Latin**: `filename_lt.html` with `lang="la"`
- **Spanish**: `filename_es.html` with `lang="es"`
- **French**: `filename_fr.html` with `lang="fr"`
- **Portuguese**: `filename_pt.html` with `lang="pt"`
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

### 3. Update existing language versions

Add `<link rel="alternate" hreflang="XX" href="...">` to the `<head>` of every existing language version of that page (English, Latin, and any others).

### 4. Anchor IDs

Keep the same `id` attributes across all language versions (e.g., `id="helmeted-prologue"`, `id="jerome-to-paulinus"`, `id="du-culte"`). These are language-neutral identifiers used for cross-linking and quotes.

### 5. Create the index page

- Create `index_XX.html` modeled on the existing index pages.
- Language switcher: plain text for the current language, `<a>` links for others. Example: `<a href="index.html">English</a> · <a href="index_lt.html">Latina</a> · Español`
- Add the new language to the switcher on all existing index pages.
- Add hreflang links to all existing index pages.
- Link to all translated content pages from the new index.
- **Genesis chapter parentheticals**: When adding a Genesis chapter to an index page, check the English `index.html` (or `index_lt.html`) for the parenthetical description used for that chapter (e.g., "Paradise and the Formation of Eve") and translate it to match, rather than inventing a new description.

### 6. Translate quotes

- Quotes live in `quotes_XX/1.html`, `quotes_XX/2.html`, etc.
- Each quote is a `<blockquote>` with a `<cite>` linking to the relevant `_XX.html` content page and anchor.
- Only translate quotes that reference the file being translated (check `quotes_lt/*.html` for links to the relevant `_lt.html` file). The quote numbering continues sequentially across files.
- Update `QUOTE_COUNT` in `index_XX.html` to match the total number of translated quotes so far.
- The index page JavaScript fetches from `quotes_XX/N.html`.

### 7. Translation register

- Use formal scholarly/theological register appropriate to the target language.
- Use the target language's standard forms for biblical proper names (e.g., Spanish: Moisés, Josué, Isaías, Jeremías; not Moses, Joshua, Isaiah, Jeremiah).
- Use traditional liturgical phrasing for well-known Scripture quotations where such a tradition exists in the target language.
- Preserve all HTML structure exactly: `<p>`, `<em>`, `<b>`, `<hr />`, anchor IDs. The translated file should have the same number of `<p>` tags as the source.
- **Diacritics are critical.** When delegating to agents, explicitly instruct them to use proper diacritics for the target language (e.g., French: é, è, ê, à, â, î, ô, û, ç, ù, ë, ï, œ; Portuguese: ã, õ, á, é, í, ó, ú, â, ê, ô, à, ç). Agents may omit them unless strongly prompted.
- **Quotations must be translated into the target language.** All quoted text (Scripture, Church Fathers, classical authors, etc.) should be translated into the target language, not left in Latin/Greek/Hebrew. The only exception is when the English source itself keeps the quotation in the original language (e.g., Hebrew etymologies, untranslated Latin technical terms). Match the English file's approach: if the English translates a quote into English, translate it into the target language; if the English preserves it in the original language, preserve it likewise.
- **Verse and poetry in `<em>` tags follow the same rule.** Classical verse (Virgil, Ovid, Claudian, Orpheus, etc.) inside `<em>` tags must be translated into the target language using the target language's standard quoting convention (e.g., guillemets «...» for French, Portuguese, Spanish, Italian) when the English version translates the verse. Agents often default to leaving verse in Latin even when surrounding prose is translated — explicitly instruct them to translate all `<em>`-tagged verse that the English translates.

### Language-specific conventions

- **Portuguese**: Use European Portuguese (traditional orthography: facto, exactamente, correctamente — not Brazilian fato, exatamente, corretamente). European Portuguese is appropriate for the formal scholarly/theological register of the source material and its European ecclesiastical context. The text remains fully accessible to Brazilian readers, as differences between the two standards are minimal in formal theological writing.
- **Indonesian**: Use bahasa baku (formal/standard Indonesian). Biblical proper names follow Indonesian convention: Musa (Moses), Yosua (Joshua), Yesaya (Isaiah), Yeremia (Jeremiah), Yakub (Jacob), Ibrahim (Abraham), Ishak (Isaac), Harun (Aaron), Daud (David). Saint names use Santo/Santa (e.g., Santo Hieronimus, Santo Basilius, Santo Agustinus). Use standard double quotation marks "..." for quotations. Indonesian has no diacritics concern (standard Latin alphabet without accents).
- **Arabic**: Use Modern Standard Arabic (الفصحى / al-fuṣḥā). File suffix `_ar`. Arabic pages must include `dir="rtl"` on the `<html>` tag: `<html lang="ar" dir="rtl">`. RTL-specific CSS overrides are in `style.css` using `[dir="rtl"]` selectors. Biblical proper names follow Arabic Christian tradition: موسى (Moses), إبراهيم (Abraham), يعقوب (Jacob), إسحاق (Isaac), هارون (Aaron), داود (David), يشوع (Joshua), إشعياء (Isaiah), إرميا (Jeremiah). Saint names use القديس/القديسة (al-Qiddīs/al-Qiddīsa) — e.g., القديس إيرونيموس (St. Jerome), القديس باسيليوس (St. Basil), القديس أغسطينوس (St. Augustine). Use guillemets «...» for quotations. Proper use of hamza (ء/أ/إ/ؤ/ئ), tā' marbūṭa (ة), and alif maqṣūra (ى) is critical. **Full tashkeel (harakat) is required** — every consonant must carry its vowel diacritical mark (fatḥa, ḍamma, kasra, sukūn, shadda, tanwīn as appropriate). This follows the convention used for Arabic Bibles and religious texts, making the text accessible to non-specialist readers and ensuring unambiguous pronunciation of transliterated proper names. Agents must be explicitly instructed to apply full tashkeel, as they default to unvoweled text.
- **Hindi**: Use शुद्ध हिन्दी (formal/standard Hindi). File suffix `_hi`. Devanagari script, LTR (no `dir` attribute needed). Biblical proper names follow Hindi Bible tradition: मूसा (Moses), इब्राहीम (Abraham), याकूब (Jacob), इसहाक (Isaac), हारून (Aaron), दाऊद (David), यहोशू (Joshua), यशायाह (Isaiah), यिर्मयाह (Jeremiah). Saint names use संत (Sant) — e.g., संत जेरोम (St. Jerome), संत बेसिल (St. Basil), संत ऑगस्टीन (St. Augustine). Use standard double quotation marks "..." for quotations. Devanagari has no diacritics concern in the European sense, but proper use of matras (vowel signs), nukta (़), chandrabindu (ँ), and visarga (ः) is critical. Agents must produce proper Devanagari — watch for missing matras or incorrect conjuncts (संयुक्ताक्षर).
- **Tagalog**: Use pormal na Filipino (formal/standard Filipino). File suffix `_tl`. Latin alphabet, LTR (no `dir` attribute needed). Biblical proper names follow Filipino Catholic tradition (Spanish-influenced): Moises (Moses), Josue (Joshua), Isaias (Isaiah), Jeremias (Jeremiah), Abraham, Isaac, Jacob, Aaron, David, Adan (Adam), Eva (Eve), Noe (Noah). Saint names use San/Santa (e.g., San Jeronimo (St. Jerome), San Basilio (St. Basil), San Agustin (St. Augustine)). Use standard double quotation marks "..." for quotations. Filipino has no diacritics concern (standard Latin alphabet). Religious and ecclesiastical terminology in Filipino draws heavily from Spanish (e.g., Banal na Kasulatan for Holy Scripture, sakramento, biyaya/grasya, kasalanan). Use established Filipino Catholic liturgical phrasing where it exists (e.g., from the Magandang Balita Biblia and Filipino liturgical texts). The register should be formal but accessible — literary Filipino suitable for theological content, avoiding overly colloquial constructions while remaining natural to Filipino readers.

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
