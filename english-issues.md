# English Translation Quality Review

Tracking issues found during quality review of published HTML files.
Status: OPEN = not yet fixed, FIXED = corrected, VERIFIED = checked against source

---
---

# Genesis

---

## Genesis 6

No significant issues found. Clean.

---

## Genesis 7

### G1. Truncated ending (line ~260) — FIXED
Final paragraph ended mid-sentence: "and if such was the flood of water upon the earth," — the closing clause "what will the flood of fire in hell be like?" was lost at the bottom of a physical page. This is a rhetorical inclusio (ring composition) matching the section's opening question. Fixed in both EN and LT.

---

## Genesis 8-11

No significant issues found. Clean.

---

## Genesis 12

### G2. Vulgate verse numbering (line ~66) — FIXED
Vulgate text block had verse 15's content merged into verse 14, and verse 16 labeled as "15". Fixed: inserted "15." before "And the princes told Pharaoh" and renumbered "15." to "16."

---

## Genesis 13-18, 20

No significant issues found. Clean.

---

## Genesis 19

### G3. Heading mismatch between TOC and body — FIXED
Updated all 32 body headings to include descriptive subtitles matching their TOC entries.
TOC entries have descriptive subtitles (e.g. "Verse 1: The Two Angels Arrive at Sodom") but body headings are just "Verse 1" without descriptions. Systematic across nearly all verses. Cosmetic consistency issue, not a content problem.

---

## Genesis 21-25, 28

No significant issues found. Clean.

---

## Genesis 26

### G4. Truncated Chrysostom quote (line ~203) — FIXED
Verse 22 ("Breadth"): Chrysostom quote ended "but His great" — missing "benevolentiam monstrat" (shows His great benevolence toward him), lost at bottom of page due to binding shadow/crop. Fixed in both EN and LT. Source: 1616 edition of Lapide's Commentaria on archive.org.

---

## Genesis 27

### G5. Multiple formatting inconsistencies — FIXED
Added `<em>` to Vulgate text, added "Table of Contents" header, fixed `<hr>` to `<hr />`, and added descriptive subtitles to all 23 TOC entries and body headings.

---

## Genesis 29-30

Minor heading format differences (`<h1>` says "Commentary on Genesis, Chapter N" instead of "Genesis N"). Cosmetic only.

---

## Genesis 31-32, 34-36

No significant issues found. Clean.

---

## Genesis 33

### G6. Wrong verse number prefix (line ~96) — FIXED
"28. THAT I MIGHT FIND GRACE" under Verse 8 heading. Changed "28." to "8."

### G7. Missing `<em>` on Vulgate text (line ~68) — FIXED
Vulgate text block not wrapped in `<em>` tags.

---

## Genesis 37-40

### G8. Missing `<em>` on Vulgate text — FIXED (all 4 chapters)
Added `<em>` wrapping to Vulgate text and "Table of Contents" headers in Genesis 37, 38, 39, 40.
Chapters 37, 38, 39, 40 all have Vulgate text not wrapped in `<em>`. Also missing "Table of Contents" header label. Systematic — these chapters were produced from sections 34-35 with different formatting conventions.

---

## Genesis 41-42, 44, 46, 48-50

No significant issues found. Clean.

---

## Genesis 43

### G9. Vulgate text partially unwrapped (line ~66) — FIXED
Removed inner per-dialogue `<em>` tags and wrapped entire Vulgate block in single `<em>`.
Only dialogue portions are in `<em>`, narrative verses are plain text. Should wrap the entire Vulgate block.

---

## Genesis 45

### G10. Dead TOC link (line ~54) — FIXED
`<a href="#footnotes">Footnotes</a>` in TOC but no matching `id="footnotes"` anchor in the file. Removed the dead link.

---

## Genesis 47

### G11. Per-verse `<em>` wrapping inconsistency — FIXED
Removed per-verse `<em>"..."</em>` wrapping and quotation marks, normalized to single `<em>` block.
Vulgate uses per-verse `<em>"..."</em>` wrapping with quotation marks instead of the standard single-block `<em>`. Cosmetic inconsistency.

---
---

# Leviticus

---

## Leviticus 1-11, 13-18

No significant issues found. Clean.

---

## Leviticus 12

### L1. Empty section heading (line ~255) — FIXED
"The Blessed Virgin's Poverty" had a heading but no content (topic already covered in preceding paragraph). Merged with the following "Moral Lesson: Generosity of the Poor" section and updated TOC.

---

## Leviticus 19, 21, 24, 27

No significant issues found. Clean.

---

## Leviticus 20

### L2. Truncated Plutarch passage + spliced fragment (line ~115) — FIXED
Verse 14: Cyanippus/Cyane story was cut at "by the hair" due to column interleaving. Completed the story ("dragged her father forth, and slew both him and herself") and added three more Plutarch examples (Valerius, Papirius, Macareus) that were in the left column. The spliced "permisceri" fragment belonged to verse 18's discussion of natural vs. positive precepts — moved it there.

---

## Leviticus 22

### L3. Three-way story mix-up from column interleaving (lines ~86, ~90, ~92, ~96) — FIXED
Three stories had their endings crossed due to two-column page interleaving:
(1) Epiphanius/deacon story (line 86): ended with "who" + wrong ending → fixed to "who preaches in the Church..."
(2) Angel/sponge story (line 90): ended with Udo story fragment → fixed to "he conferred with the priest secretly..."
(3) Udo story (line 96): missing its ending → restored "with the Christian host; seeing the Bishop lying dead..."
Also removed orphaned line 92 (content merged into line 86).

---

## Leviticus 23

### L4. Missing "fifth" sage in Plutarch's Seven Sages (line ~97) — NOT AN ERROR
Lapide's own numbering skips 4th→6th because Plutarch only had six direct answers. Anacharsis speaks philosophically before the question and Periander is the host. Confirmed against the original Migne printing.

---

## Leviticus 25

### L5. Duplicate jobel/jobelus etymology (lines ~127/~154) — FIXED
"For It Is the Jubilee" section heading and two paragraphs duplicated content already present in the verse 10 commentary above. Removed the duplicate section and its TOC entry.

---

## Leviticus 26

### L6. Missing "fifth" sage (same passage as ch 23) — NOT AN ERROR
Same Lapide numbering artifact. See L4.

---
---

# Numbers

---

## Numbers 25-28, 30, 32-36

No significant issues found. Clean.

---

## Numbers 29

### N1. Wrong verse number prefix (line ~89) — FIXED
"43." under Verse 13 heading. Changed to "13."

---

## Numbers 31

### N2. Wrong verse number prefixes (lines ~135, ~147) — FIXED
"49." under Verse 19 heading → "19." and "31." under Verse 21 heading → "21."

---

## Numbers 1-9, 11-13, 14-20, 22-24

No significant issues found. Clean.

---

## Numbers 10

### N3. Truncated Vulgate text (line ~61) — FIXED
Vulgate text was truncated at "7. When" — restored all 30 missing verses (7-36) from Douay-Rheims, harmonized with existing wording.

---

## Numbers 21

### N4. Placeholder stub section (line ~152) — FIXED
"St. Augustine on the Bronze and the Cross" section contained only a placeholder comment. Removed the stub and its TOC entry.

---
---

# Deuteronomy

---

## Deuteronomy 1-17

No significant issues found. Clean.

---

## Deuteronomy 18-29

No significant issues found. Clean.

---

## Deuteronomy 30

### D1. Mid-sentence paragraph break (lines ~49-51) — FIXED
"Finally, the Jews" / "cannot repent and return to God..." — merged into one paragraph.

### D2. Vulgate text split across two `<p>` tags — FIXED
Merged two split `<p><em>` blocks into one continuous Vulgate paragraph.
Vulgate text at lines 36-38 split mid-sentence into two `<em>` paragraphs.

---

## Deuteronomy 31

### D3. Missing attribution before Philip II reference (line ~95) — FIXED
Added "Philip II, King of Spain, about to die in the year 1600, commended..." — introductory clause was at bottom of page image and missed by translator. Fixed in EN, LT, and source JSON.
"in 1600, he commended these things to his son Philip III:" lacks context identifying Philip II of Spain.

### D4. Vulgate text split mid-sentence — FIXED
Merged two split Vulgate paragraphs into one continuous block.
Lines 36-38 split Vulgate across two `<p>` tags.

---

## Deuteronomy 32

### D5. Three mid-sentence paragraph breaks — FIXED
Lines 63/65 ("rock," / "or cliff"), 101/103 ("The eagle" / "does not tread"), 144/146 ("in He-" / "brew"). All merged.

### D6. Crampon material in Vulgate section — FIXED
Removed scholarly apparatus (citing de Wette, Rosenmuller, Vitringa, Lowth) from Vulgate text block. Added `<em>` wrapping to remaining Vulgate text.
Line 38-40: Scholarly apparatus discussing the canticle (citing de Wette, Rosenmuller, etc.) included in Vulgate text block. Should be excluded.

---

## Deuteronomy 33-34

### D7. Inline footnotes disrupting text flow — FIXED
Fixed the main disruptive footnote in ch 33 (lines 55-59) that split a sentence. Wrapped all 9 remaining standalone Hebrew variant footnotes in `<em>` across both chapters (8 in ch 33, 1 in ch 34).

---
---

# Joshua

## Joshua 1-10, 14
No significant issues found. Clean.

## Joshua 11-13
### J1. Missing meta tags — NOT AN ERROR
Review agent reported missing tags but verification shows all meta tags (description, canonical, og:title, og:description, og:type, og:url) are present in chapters 11-13.

## Joshua 15
### J2. Truncated Vulgate text — FIXED
Restored complete Vulgate text for Joshua 15:22-63 (city lists for Judah's territory) in both EN and LT. Translation agent had omitted the long enumeration.

## Joshua 16-24
### J3. Missing bottom navigation — FIXED
Added `<div class="nav">` with prev/next links to all 9 files (ch 16-24).
Nine files lack the closing `<div class="nav">` block with prev/next links.

---

# Judges

## Judges 1-5, 12-21
No significant issues found. Clean.

## Judges 6
### JG1a. Mid-sentence paragraph breaks — FIXED
4 breaks fixed including split word "fl-"/"flee" and bonus Ambrose quote split.

## Judges 7
### JG1b. Mid-sentence paragraph breaks — FIXED
6 breaks fixed plus recovered truncated Homily On Virginity quote from source.

## Judges 8
### JG1c. Scrambled text + mid-sentence breaks — FIXED
9 fixes: unscrambled verse 2 reading order, removed Crampon footnote + "to be deleted" editorial note, restored displaced verse 18 content, fixed Vulgate `<em>`, merged 5 split paragraphs.

## Judges 9
### JG1d. Mid-sentence paragraph breaks + Vulgate `<em>` — FIXED
7 merges + Vulgate `<em>` wrapping for all 57 verses.

## Judges 10
### JG1e. Vulgate `<em>` + mid-sentence breaks — FIXED
Vulgate `<em>` extended to all 18 verses, Crampon footnote removed, 2 merges.

## Judges 11
### JG1f. Vulgate `<em>` + mid-sentence breaks — FIXED
Vulgate `<em>` for all 40 verses, duplicate stutter fixed, split words "Apo-stle" and "gra-" fixed. 6 merges total.

---

# Ruth

## Ruth 1, 4
No significant issues found. Clean.

## Ruth 2
### R1. Garbled/duplicate text at verse 22 — FIXED
Merged duplicate "so that by this service" passage and cleaned garbled fragment.

## Ruth 3
### R2. Premature `</em>` in Jerome quote — FIXED
Removed premature `</em>` closure in St. Jerome quote about Ruth.

---

# 1 Samuel (I Regum)

## 1 Samuel 1
### S1. Split word across paragraphs — FIXED
"esti-" / "mated" merged into "estimated".

## 1 Samuel 3
### S2. Entire commentary duplicated — FIXED
Merged two overlapping versions into one clean commentary. 13 verse sections with unique content from both preserved. No duplicate anchor IDs.
Two overlapping versions of the verse-by-verse commentary (from adjacent source sections). Being merged.

## 1 Samuel 2, 4-31
No significant issues found. Clean.

---

# 2 Samuel (II Regum)

## 2 Samuel 1-8
### S3a. 2 Samuel 1-4 severe issues — FIXED
Ch 1: Orphaned Gilboa block moved under verse 21, "le-gions" merged, 3 mid-sentence breaks fixed.
Ch 2: Displaced military quotations moved from verse 18 to verse 26.
Ch 3: Vulgate verses 35-39 moved from commentary to Vulgate block, "Joab feared" break and spindle passage fixed.
Ch 4: Duplicate verses 4-6 commentary removed (kept first fuller version).

### S3b. 2 Samuel 5-8 severe issues — FIXED
Ch 5: Removed all chapter 4 contamination, rebuilt clean Vulgate, fixed 6 mid-sentence breaks.
Ch 6: Removed full chapter duplication, fixed 9 mid-sentence breaks.
Ch 7: Removed misplaced ch 6 content + full chapter duplication, fixed 3 breaks.
Ch 8: Removed full chapter duplication, added Vulgate `<em>`, added verse section headers.

## 2 Samuel 9-24
No significant issues found. Clean.

---

# 1-2 Kings (III-IV Regum)

## 1 Kings (III Regum) 1-2, 16, 21-22
No significant issues found. Clean.

## 1 Kings 3-20
### K1a. 1 Kings 3-7 mid-sentence breaks — FIXED
29 fixes across 5 files: 10 split-word merges, 15 mid-sentence merges, 2 displaced paragraphs repositioned, 2 deduplicates.

### K1b. 1 Kings 8-20 mid-sentence breaks — FIXED
42 fixes across 10 files: split words, mid-sentence merges, displaced paragraphs repositioned, truncated quotes completed, Crampon footnotes relocated.

## 2 Kings (IV Regum)
### K2. Scattered mid-sentence breaks — FIXED
15 paragraph merges across 10 files (ch 1-5, 10, 13-14, 21, 23). Split words fixed ("Pag-ninus", "doc-trine", "Jero-boam", etc.).

### K3. Stray "t" in heading — FIXED
2 Kings 6, line 57: removed stray "t" from "Alas, Alas, Alas, my Lord. t"

---
---

# Exodus

---

## Exodus 1

### 13. Redundant "Verse 10." prefix in body text (line ~167) — FIXED
Body paragraph started with "Verse 10. COME, LET US WISELY OPPRESS HIM." but the heading already has the verse number. Removed the redundant prefix.

### 14. Missing opening quote mark in multi-paragraph quote (line ~305) — FIXED
Origen/Augustine quote split across two paragraphs. Second paragraph's `<em>` was missing opening quotation mark. Added `"` before "This Pharaoh therefore compels you..."

---

## Exodus 2

No significant issues found. Clean.

---

## Exodus 3

### 1. Missing answer to "why three times" question (line ~214) — FIXED
Entire right column of page-005-left was missed during translation. Recovered three-part answer from OCR Latin: (1) God's individual care, (2) intimate friendship with each patriarch (Origen), (3) mystery of the Trinity (Basil/Severianus). Inserted answer between the question and the promised land paragraph.

### 2. Orphaned sentence + missing Verse 9 section (line ~232) — FIXED
"Let us perish here for God..." was the conclusion of verse 9 commentary (Themistocles quote about affliction), not verse 10. Created proper Verse 9 section with heading, TOC entry, and full commentary reconstructed from source OCR. Removed orphaned sentence from under Verse 10.

---

## Exodus 4

### 3. Duplicate phrase (line ~247) — FIXED
PDF overlap artifact: "from the other nations and chosen, and regarded as the firstborn" appeared twice. Removed the duplicate, keeping the text flowing into "in addition, the first among..."

### 4. Wrong chapter references for Moses' excuses (line ~180) — FIXED
Excuses 3 and 4 cited "chapter 3" but should be "chapter 4." Changed to correct references.

### 5. Missing "Second" interpretation in Verse 26 (line ~330) — NOT AN ERROR
Source investigation confirmed Lapide's original Latin goes First → Third → Fourth. The "Secundo" in the OCR is a marginal heading from an adjacent section, not a missing interpretation.

### 6. Misplaced Sidonius Apollinaris quote (line ~336) — FIXED
Moved from verse 26 back to end of verse 25 section (feet/knees discussion) where it belongs.

### 7. Disconnected paragraph at end of Verse 25 (line ~300) — FIXED
"In order to obtain life for her husband..." was a continuation of the Goropius paragraph. Merged it back into that paragraph and restructured the Septuagint/Augustine sentence to flow correctly.

---

## Exodus 5

No significant issues found. Clean.

---

## Exodus 6

### 8. Disordered content in Tetragrammaton section (lines ~176-194) — FIXED
Content was out of order: the Question 5 heading appeared, then the "and Macrobius..." fragment (tail of a later paragraph), then nations/quiescent/allegorical paragraphs, then the actual question text and answer. Reordered to: heading → question → Trinity answer → grammatical cause → symbolic cause (merged with Macrobius fragment) → nations → quiescent letters → allegorical → Prado.

### 9. Tetragrammaton letter error (line ~106) — FIXED
"I swear by yod, he, vav, and yod" → corrected to "yod, he, vav, and he" (YHWH = yod-he-vav-he).

---

## Exodus 7

### 10. Wrong chapter references for plagues (line ~109) — FIXED
OCR error: "cap. VIII" misread from "cap. IX". Fixed in both EN and LT HTML:
- "chapter 8:9" → "chapter 9:9" (boils)
- "chapter 8:15" → "chapter 9:15" (pestilence)
- "chapter 8:23" → "chapter 9:23" (hail)

### 11. Pronoun overcapitalization — NOT IN THIS FILE
Originally reported at line 174 but that text is not in Exodus 7. The "helps Him" text is only in Exodus 8.

---

## Exodus 8

### 12. Pronoun overcapitalization (line ~174) — FIXED
"helps Him" where "Him" refers to Moses, not God. Changed to lowercase "him".

---

## Exodus 9

No significant issues found. Clean.

---

## Exodus 10

No significant issues found. Clean.

---

## Exodus 11

### 15. Duplicate Goshen paragraph (lines ~63 and ~72) — FIXED
"From this it is clear that not only the Hebrews but also the Egyptians dwelt in Goshen..." appeared identically in both verse 1 and verse 2 sections (PDF overlap). Removed from verse 1 where it was less relevant; kept in verse 2 where it provides context for asking from neighbors.

---

## Exodus 12

### 16. Wrong verse number prefixes (lines ~115, ~268, ~293) — FIXED
Three inline verse labels had wrong numbers from OCR/translation errors:
- "Verse 2. 3." → "3." (was under verse 3 heading)
- "Verse 13. 43." → "13." (the "43" was spurious)
- "Verse 17. 47." → "17." (the "47" was spurious)

---

## Exodus 13

No significant issues found. Clean.

---

## Exodus 14

### 17. Missing word from OCR column interleaving (line ~140) — FIXED
Sentence ended "...hence He surpasses the merits of those who supplicate, and" — the word "vota" (desires) was lost because OCR merged it into the left column's text "de-vota". Fixed to: "hence He surpasses the merits and the desires of those who supplicate." (From the liturgical collect: "merita supplicum excedis et vota").

---

## Exodus 15

No significant issues found. Clean.

---

## Exodus 16

### 18. Displaced duplicate + split quote (line ~352) — FIXED
Gregory fragment ("Without fault, life without death, health without weakness.") was displaced from line 357's complete quote and spliced onto the front of Anuph's continued speech. Removed the duplicate fragment and merged the Anuph quote continuation back into the preceding paragraph.

---

## Exodus 17-19

No significant issues found. Clean.

---

## Exodus 20

### 19. Orphaned fragment + displaced paragraph (line ~162) — FIXED
Paragraph starting "the priest's private parts..." was a mid-sentence orphan split from the Solomon altar discussion (line 158). The "Christ gave temporary precepts" paragraph (line 160) had been inserted between them. Merged orphan back into Solomon paragraph and repositioned the Christ-precepts paragraph after the complete Solomon discussion.

---

## Exodus 21-22

No significant issues found. Clean.

---

## Exodus 23

Minor cross-reference anomaly at line 195 ("chapter 22, verse 1" for calendar discussion). Likely reflects Lapide's original citation. Not corrected.

---

## Exodus 24

### 20. Garbled translation (line ~102) — FIXED
"when therefore that same it is truly said" → "when therefore it is truly said". Latin "isque intelligitur, cum ergo is revera dicitur" — the pronoun "is" was mistranslated as "that same it".

---

## Exodus 25

No significant issues found. Clean.

---

## Exodus 26

### 24. Orphaned fragment + truncated bars allegory (lines ~219, ~231) — FIXED
Fragment "and are inflamed toward the hope of future recompense. So Bede..." was the tail of the verse 28 bars allegory, split across two columns. Removed orphan from line 219, completed the truncated paragraph at line 231 with the missing clause.

---

## Exodus 27

### 25. Misplaced `</em>` in Cyprian quote (line ~301) — FIXED
The `</em>` closed after "to fear what is the Lord," but the quote continues: "to prefer nothing at all to Christ, because He preferred nothing to us." Moved closing `</em>` and added missing closing quotation mark.

---

## Exodus 28

No significant issues found. Clean.

---

## Exodus 29

No significant issues found. Clean.

---

## Exodus 30

Trailing semicolon at line 81 ("Whence we Christians also offer incense to God;") matches the Latin source. Lapide's punctuation style, not a missing text issue.

---

## Exodus 31

### 21. Mid-sentence paragraph break (lines ~113-115) — FIXED
A sentence listing Church Fathers was split across two paragraphs: "St. Jerome on Chapter XXIV of Isaiah;" / "Ambrose, On Flight from the World..." Merged back into one paragraph.

---

## Exodus 32

No significant issues found. Clean.

---

## Exodus 33

No significant issues found. Clean.

---

## Exodus 34

### 22. Sentence split across section heading (lines ~224-229) — FIXED
"St. Basil, Sermon 1" was split from "On Fasting" by an `<hr />` and heading. Merged the title back into the sentence ("Sermon 1 On Fasting") and repositioned the section heading after the sentence.

---

## Exodus 35-39

No significant issues found. Clean.

---

## Exodus 40

### 23. Wrong Scripture references (line ~118) — FIXED
OCR errors in Roman numerals: "Luke 18" → "Luke 1" (Zechariah's incense), "1 Chronicles 14" → "1 Chronicles 24" (priestly courses). Fixed in both EN and LT HTML files.

---
