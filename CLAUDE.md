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
- **Verse headings must be translated into the target language.** Some English chapters use Latin Vulgate incipits in verse headings (e.g., "Verse 1: Cognovit") while others use English translations (e.g., "Verse 1: In the beginning God created heaven and earth"). Regardless of what the English source uses, the target language translation must always translate the verse heading text into the target language (e.g., Spanish: "Versículo 1: Conoció Adán a su mujer Eva"). This ensures consistency across all languages, especially non-Latin-script languages like Arabic, Hindi, and Tagalog. The TOC entries and their corresponding section headings in the body must match exactly.
- **Verse and poetry in `<em>` tags follow the same rule.** Classical verse (Virgil, Ovid, Claudian, Orpheus, etc.) inside `<em>` tags must be translated into the target language using the target language's standard quoting convention (e.g., guillemets «...» for French, Portuguese, Spanish, Italian) when the English version translates the verse. Agents often default to leaving verse in Latin even when surrounding prose is translated — explicitly instruct them to translate all `<em>`-tagged verse that the English translates.

### Language-specific conventions

- **Portuguese**: Use European Portuguese (traditional orthography: facto, exactamente, correctamente — not Brazilian fato, exatamente, corretamente). European Portuguese is appropriate for the formal scholarly/theological register of the source material and its European ecclesiastical context. The text remains fully accessible to Brazilian readers, as differences between the two standards are minimal in formal theological writing.
- **German**: Use gehobene Schriftsprache (formal scholarly German). File suffix `_de`. Latin alphabet, LTR (no `dir` attribute needed). Biblical proper names follow German Bible tradition (Einheitsübersetzung/Lutherbibel): Mose (Moses), Abraham, Isaak (Isaac), Jakob (Jacob), Aaron, David, Josua (Joshua), Jesaja (Isaiah), Jeremia (Jeremiah), Adam, Eva (Eve), Noach (Noah). Saint names use hl. (heilig/heilige) prefix following German Catholic convention: hl. Hieronymus (St. Jerome), hl. Basilius (St. Basil), hl. Augustinus (St. Augustine), hl. Ambrosius (St. Ambrose), hl. Chrysostomus (Chrysostom), hl. Gregor (Gregory), hl. Bernhard (Bernard), hl. Hilarius (Hilary), hl. Cyprian (Cyprian), hl. Justin (Justin), hl. Klemens (Clement), hl. Athanasius (Athanasius), hl. Epiphanius (Epiphanius), hl. Ignatius (Ignatius), Johannes von Damaskus (John of Damascus), hl. Bonaventura (Bonaventure), hl. Franziskus (Francis), hl. Dominikus (Dominic), hl. Thomas (Thomas), hl. Leo (Leo), hl. Paulus (Paul), hl. Ephräm (Ephrem). Use German quotation marks „..." for standard quotations and ‚...' for nested quotes. German Catholic theological terminology: Heilige Schrift (Holy Scripture), Sakrament (sacrament), Gnade (grace), Sünde (sin), Erlösung/Heil (salvation), Kirchenvater (Church Father), Evangelium (Gospel), Genesis/Buch Genesis (Genesis), Exodus/Buch Exodus (Exodus). Gospel references use German Bible convention (e.g., „Johannes 8,12" — note comma for verse separator per German convention). The register should be formal scholarly German suitable for theological commentary — gehobene Schriftsprache, avoiding colloquial constructions. Proper use of Umlaute (ä, ö, ü) and Eszett (ß) is critical. Agents must be explicitly instructed to use German quotation marks „..." (not English "...") as they default to English-style quotes.
- **Indonesian**: Use bahasa baku (formal/standard Indonesian). Biblical proper names follow Indonesian convention: Musa (Moses), Yosua (Joshua), Yesaya (Isaiah), Yeremia (Jeremiah), Yakub (Jacob), Ibrahim (Abraham), Ishak (Isaac), Harun (Aaron), Daud (David). Saint names use Santo/Santa (e.g., Santo Hieronimus, Santo Basilius, Santo Agustinus). Use standard double quotation marks "..." for quotations. Indonesian has no diacritics concern (standard Latin alphabet without accents).
- **Arabic**: Use Modern Standard Arabic (الفصحى / al-fuṣḥā). File suffix `_ar`. Arabic pages must include `dir="rtl"` on the `<html>` tag: `<html lang="ar" dir="rtl">`. RTL-specific CSS overrides are in `style.css` using `[dir="rtl"]` selectors. Biblical proper names follow Arabic Christian tradition: موسى (Moses), إبراهيم (Abraham), يعقوب (Jacob), إسحاق (Isaac), هارون (Aaron), داود (David), يشوع (Joshua), إشعياء (Isaiah), إرميا (Jeremiah). Saint names use القديس/القديسة (al-Qiddīs/al-Qiddīsa) — e.g., القديس إيرونيموس (St. Jerome), القديس باسيليوس (St. Basil), القديس أغسطينوس (St. Augustine). Use guillemets «...» for quotations. Proper use of hamza (ء/أ/إ/ؤ/ئ), tā' marbūṭa (ة), and alif maqṣūra (ى) is critical. **Full tashkeel (harakat) is required** — every consonant must carry its vowel diacritical mark (fatḥa, ḍamma, kasra, sukūn, shadda, tanwīn as appropriate). This follows the convention used for Arabic Bibles and religious texts, making the text accessible to non-specialist readers and ensuring unambiguous pronunciation of transliterated proper names. Agents must be explicitly instructed to apply full tashkeel, as they default to unvoweled text.
- **Hindi**: Use शुद्ध हिन्दी (formal/standard Hindi). File suffix `_hi`. Devanagari script, LTR (no `dir` attribute needed). Biblical proper names follow Hindi Bible tradition: मूसा (Moses), इब्राहीम (Abraham), याकूब (Jacob), इसहाक (Isaac), हारून (Aaron), दाऊद (David), यहोशू (Joshua), यशायाह (Isaiah), यिर्मयाह (Jeremiah). Use standard double quotation marks "..." for quotations. Devanagari has no diacritics concern in the European sense, but proper use of matras (vowel signs), nukta (़), chandrabindu (ँ), and visarga (ः) is critical. Agents must produce proper Devanagari — watch for missing matras or incorrect conjuncts (संयुक्ताक्षर). **Church Father names use Latinized forms** (not anglicized), preserving the Latin scholarly texture of Lapide's original. Saint prefix is संत (Sant). Key mappings: संत अगस्टिनुस (Augustine), संत हिएरोनिमुस (Jerome), संत बासिलियुस (Basil), संत अम्ब्रोसियुस (Ambrose), संत क्रिसोस्तोमुस (Chrysostom), संत ग्रेगोरियुस (Gregory), संत बेर्नार्दुस (Bernard), संत हिलारियुस (Hilary), संत सिप्रियानुस (Cyprian), संत युस्तिनुस (Justin), संत क्लेमेन्स (Clement), संत अथानासियुस (Athanasius), संत एपिफ़ानियुस (Epiphanius), संत इग्नातियुस (Ignatius), दमिश्की योहन्नेस (John of Damascus), संत बोनावेन्तूरा (Bonaventure), संत फ़्रान्सिस्कुस (Francis), संत दोमिनिकुस (Dominic). Names already close to Latin are kept as-is: थॉमस, लियो, पौलुस, एफ़्रेम. Gospel references use standard Hindi Bible name यूहन्ना (e.g., "यूहन्ना 8:12").
- **Korean**: Use 격식체/문어체 (formal written Korean). File suffix `_ko`. Hangul script, LTR (no `dir` attribute needed). Biblical proper names follow Korean Bible tradition (개역개정/천주교 공동번역): 모세 (Moses), 아브라함 (Abraham), 야곱 (Jacob), 이삭 (Isaac), 아론 (Aaron), 다윗 (David), 여호수아 (Joshua), 이사야 (Isaiah), 예레미야 (Jeremiah), 아담 (Adam), 하와 (Eve), 노아 (Noah). Saint names use 성 (聖) prefix following Korean Catholic convention: 성 예로니모 (St. Jerome), 성 바실리오 (St. Basil), 성 아우구스티노 (St. Augustine), 성 암브로시오 (St. Ambrose), 성 요한 크리소스토모 (Chrysostom), 성 그레고리오 (Gregory), 성 베르나르도 (Bernard), 성 힐라리오 (Hilary), 성 치프리아노 (Cyprian), 성 유스티노 (Justin), 성 클레멘스 (Clement), 성 아타나시오 (Athanasius), 성 에피파니오 (Epiphanius), 성 이냐시오 (Ignatius), 다마스쿠스의 성 요한 (John of Damascus), 성 보나벤투라 (Bonaventure), 성 프란치스코 (Francis), 성 도미니코 (Dominic), 성 토마스 (Thomas), 성 레오 (Leo), 성 바오로 (Paul), 성 에프렘 (Ephrem). Use standard double quotation marks "..." for quotations. Korean has no diacritics concern, but proper spacing (띄어쓰기) is critical — agents often merge or split words incorrectly in theological text. Use established Korean Catholic terminology: 성경 (Holy Scripture), 성사 (sacrament), 은총 (grace), 죄 (sin), 구원 (salvation), 교부 (Church Father), 복음 (Gospel), 창세기 (Genesis), 탈출기 (Exodus). Gospel references use Korean Bible convention (e.g., "요한 8:12"). The register should be formal scholarly Korean suitable for theological commentary — 하십시오체 or 하오체 as appropriate, avoiding casual speech levels (해요체, 해체). **The author's name must always be written as 코르넬리우스 아 라피데 (with 아)** — the "a" in "a Lapide" means "of the Stone" and is an integral part of the name. Agents tend to drop the 아 in headings; always verify consistency.
- **Tagalog**: Use pormal na Filipino (formal/standard Filipino). File suffix `_tl`. Latin alphabet, LTR (no `dir` attribute needed). Biblical proper names follow Filipino Catholic tradition (Spanish-influenced): Moises (Moses), Josue (Joshua), Isaias (Isaiah), Jeremias (Jeremiah), Abraham, Isaac, Jacob, Aaron, David, Adan (Adam), Eva (Eve), Noe (Noah). Saint names use San/Santa (e.g., San Jeronimo (St. Jerome), San Basilio (St. Basil), San Agustin (St. Augustine)). Use standard double quotation marks "..." for quotations. Filipino has no diacritics concern (standard Latin alphabet). Religious and ecclesiastical terminology in Filipino draws heavily from Spanish (e.g., Banal na Kasulatan for Holy Scripture, sakramento, biyaya/grasya, kasalanan). Use established Filipino Catholic liturgical phrasing where it exists (e.g., from the Magandang Balita Biblia and Filipino liturgical texts). The register should be formal but accessible — literary Filipino suitable for theological content, avoiding overly colloquial constructions while remaining natural to Filipino readers.
- **Japanese**: Use 文語体/書き言葉 (formal written Japanese). File suffix `_ja`. Standard Japanese script (kanji + hiragana + katakana), LTR (no `dir` attribute needed). Biblical proper names follow Japanese Bible tradition (新共同訳/聖書協会共同訳 convention): モーセ (Moses), アブラハム (Abraham), ヤコブ (Jacob), イサク (Isaac), アロン (Aaron), ダビデ (David), ヨシュア (Joshua), イザヤ (Isaiah), エレミヤ (Jeremiah), アダム (Adam), エバ (Eve), ノア (Noah). Saint names use 聖 (sei) prefix following Japanese Catholic convention: 聖ヒエロニムス (St. Jerome), 聖バシリウス (St. Basil), 聖アウグスティヌス (St. Augustine), 聖アンブロシウス (St. Ambrose), 聖ヨハネ・クリソストモス (Chrysostom), 聖グレゴリウス (Gregory), 聖ベルナルドゥス (Bernard), 聖ヒラリウス (Hilary), 聖キプリアヌス (Cyprian), 聖ユスティヌス (Justin), 聖クレメンス (Clement), 聖アタナシウス (Athanasius), 聖エピファニウス (Epiphanius), 聖イグナティウス (Ignatius), ダマスコの聖ヨハネ (John of Damascus), 聖ボナヴェントゥラ (Bonaventure), 聖フランシスコ (Francis), 聖ドミニコ (Dominic), 聖トマス (Thomas), 聖レオ (Leo), 聖パウロ (Paul), 聖エフレム (Ephrem). Use 「...」for standard quotations and 『...』for nested quotes or Scripture titles. Japanese Catholic theological terminology: 聖書 (Holy Scripture), 秘跡 (sacrament), 恩寵 (grace), 罪 (sin), 救い (salvation), 教父 (Church Father), 福音 (Gospel), 創世記 (Genesis), 出エジプト記 (Exodus). Gospel references use Japanese Bible convention (e.g., 「ヨハネ8:12」). The register should be formal scholarly Japanese suitable for theological commentary — です/ます体 or である体 as appropriate for scholarly prose, avoiding casual speech. Proper kanji usage is critical — agents should use standard jōyō kanji with appropriate furigana only for highly specialized theological terms.

- **Chinese (Mandarin)**: Use 书面语 (formal written Mandarin baihua). File suffix `_zh`. Simplified Chinese (简体字), LTR (no `dir` attribute needed). `lang="zh"` on the `<html>` tag. Biblical proper names follow Chinese Union Version (和合本) tradition: 摩西 (Moses), 亚伯拉罕 (Abraham), 雅各 (Jacob), 以撒 (Isaac), 亚伦 (Aaron), 大卫 (David), 约书亚 (Joshua), 以赛亚 (Isaiah), 耶利米 (Jeremiah), 亚当 (Adam), 夏娃 (Eve), 挪亚 (Noah). Saint names use 圣 (shèng) prefix following Chinese Catholic convention: 圣热罗尼莫 (St. Jerome), 圣巴西略 (St. Basil), 圣奥思定 (St. Augustine), 圣盎博罗削 (St. Ambrose), 圣金口若望 (Chrysostom), 圣额我略 (Gregory), 圣伯尔纳铎 (Bernard), 圣依拉略 (Hilary), 圣西彼廉 (Cyprian), 圣犹斯定 (Justin), 圣克莱孟 (Clement), 圣亚大纳削 (Athanasius), 圣厄丕法尼 (Epiphanius), 圣依纳爵 (Ignatius), 大马士革的圣若望 (John of Damascus), 圣文德 (Bonaventure), 圣方济各 (Francis), 圣多明我 (Dominic), 圣多玛斯 (Thomas), 圣良 (Leo), 圣保禄 (Paul), 圣厄弗冷 (Ephrem). Use 「...」for standard quotations and 『...』for nested quotes or Scripture titles. Chinese Catholic theological terminology: 圣经 (Holy Scripture), 圣事 (sacrament), 恩宠 (grace), 罪 (sin), 救恩 (salvation), 教父 (Church Father), 福音 (Gospel), 创世纪 (Genesis), 出谷纪 (Exodus). Gospel references use Chinese Bible convention (e.g., 「若望福音 8:12」or「约翰福音 8:12」— prefer 和合本 form). The register should be formal scholarly Chinese suitable for theological commentary — 书面语, avoiding colloquial expressions (口语). Proper character usage is critical — agents must use Simplified Chinese characters consistently and avoid Traditional character substitutions. Agents must be explicitly instructed to use 「...」quotation marks (not English "..." or Chinese """), as they default to Western-style quotes.

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
