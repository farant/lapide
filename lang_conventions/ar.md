# Arabic

Use Modern Standard Arabic (الفصحى / al-fuṣḥā). File suffix `_ar`. Arabic pages must include `dir="rtl"` on the `<html>` tag: `<html lang="ar" dir="rtl">`. RTL-specific CSS overrides are in `style.css` using `[dir="rtl"]` selectors.

## Biblical proper names

Follow Arabic Christian tradition: موسى (Moses), إبراهيم (Abraham), يعقوب (Jacob), إسحاق (Isaac), هارون (Aaron), داود (David), يشوع (Joshua), إشعياء (Isaiah), إرميا (Jeremiah).

## Saint names

Use القديس/القديسة (al-Qiddīs/al-Qiddīsa) prefix:

القديس إيرونيموس (St. Jerome), القديس باسيليوس (St. Basil), القديس أغسطينوس (St. Augustine).

## Quotation marks

Use guillemets «...» for quotations.

## Theological terminology

Proper use of hamza (ء/أ/إ/ؤ/ئ), tā' marbūṭa (ة), and alif maqṣūra (ى) is critical.

## Tashkeel (vowel diacritics)

**Full tashkeel (harakat) is required** — every consonant must carry its vowel diacritical mark (fatḥa, ḍamma, kasra, sukūn, shadda, tanwīn as appropriate). This follows the convention used for Arabic Bibles and religious texts, making the text accessible to non-specialist readers and ensuring unambiguous pronunciation of transliterated proper names.

## Agent pitfalls

- **Unvoweled text**: Agents default to unvoweled text. They must be explicitly instructed to apply full tashkeel.
- **Arabic/Hebrew character confusion**: When inline Hebrew words appear in the text (e.g., שרה, לין, יאבק), agents may substitute visually similar Arabic characters for Hebrew ones. Arabic lam (ل, U+0644) looks like Hebrew lamed (ל, U+05DC); Arabic yeh (ي, U+064A) looks like Hebrew yod (י, U+05D9). All characters in inline Hebrew words must be Hebrew Unicode (U+05xx range), not Arabic (U+06xx). Review agents should check for mixed-script Hebrew words.
- **Missing `<em>` on transliteration terms**: When the English source wraps Hebrew/Greek letter names or transliteration terms in `<em>` tags (e.g., `<em>shin</em>`, `<em>vav</em>`, `<em>yod</em>`), agents sometimes translate these inline without preserving the `<em>` markup. The Arabic rendering must keep the `<em>` tags to match the English tag count.
- **False cognate mistranslation**: Arabic has many roots that produce similar-sounding words with very different meanings. Agents may pick the wrong derivative — e.g., translating "breadths" (رِحَاب, from ر-ح-ب "wide") as "أَرْحَاض" (latrines, from ر-ح-ض "wash"). Review agents should watch for semantically wrong word choices that share a similar Arabic root pattern.
- **Definite article sukun inconsistency**: Some agents omit the sukun (ْ) on the lam of the definite article before moon letters, producing `ال` instead of `الْ`. This also affects prefixed forms (`بِال` vs `بِالْ`, `لِل` vs `لِلْ`, `كَال` vs `كَالْ`). When splitting files across agents, check tashkeel consistency at join points — different agents may apply different tashkeel density. Fixing this programmatically requires care: regex must not add sukun to word-internal `ال` sequences (e.g., `جِدَالِ`, `مُخَالِفَة`, `كَمَالِ` are root letters, not the definite article).
- **Transliteration inconsistency across agents**: When multiple agents translate different sections, proper names and place names may be transliterated differently (e.g., صَاغَرَ vs صُوغَرَ for Segor/Zoar). Establish the canonical form in the first section and explicitly instruct all agents to use it. Preferred forms: صُوغَرَ (Segor/Zoar), سَدُوم (Sodom), عَمُورَة (Gomorrah).
- **Section heading style drift**: When the English source uses verse-number-only body headings (e.g., `<b>Verse 27</b>`) but the TOC includes descriptive titles, agents may inconsistently add descriptive text to body headings. Instruct agents to match the English heading style exactly.
