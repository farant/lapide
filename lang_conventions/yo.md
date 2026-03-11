# Yoruba (Èdè Yorùbá)

Use formal standard Yoruba (Yorùbá ìwé / scholarly register). File suffix `_yo`. Latin alphabet with subdots and tone marks, LTR (no `dir` attribute needed).

## Diacritics — CRITICAL

Yoruba diacritics are **mandatory** and meaning-distinguishing. Omitting them is not a stylistic choice — it changes the meaning of words.

### Subdots (ẹ, ọ, ṣ)

These distinguish different phonemes and must **always** be written:
- **ẹ** [ɛ] vs **e** [e] — e.g., ẹṣẹ (sin) vs ese (foot)
- **ọ** [ɔ] vs **o** [o] — e.g., ọmọ (child) vs omo (different meaning)
- **ṣ** [ʃ] vs **s** [s] — e.g., ṣe (do) vs se (different meaning)

### Tone marks (acute ´ = high, grave ` = low, unmarked = mid)

Yoruba is a tonal language with three tones. Tone marks are required for scholarly/theological text, following the Yoruba Contemporary Bible (YCB/Bíbélì Mímọ́ Yorùbá Òde-Òní) standard.

Examples where tone changes meaning:
- **owó** (money) vs **owò** (trade) vs **owo** (respect)
- **igbà** (time) vs **igba** (calabash) vs **ìgbà** (when)
- **ọkọ** (husband) vs **ọkọ̀** (hoe) vs **ọ̀kọ̀** (vehicle)

**Agent warning**: LLM agents will almost certainly produce inconsistent or missing tone marks. This is the single biggest quality challenge for Yoruba. Every translated file must be carefully reviewed for tone accuracy. Subdots are more reliably produced but still need verification.

## Biblical proper names

Follow Yoruba Bible tradition (Bíbélì Mímọ́):

**Old Testament patriarchs and key figures:**
- Adamu (Adam), Efa (Eve), Noa (Noah), Abrahamu (Abraham — Abramu before the name change), Sara (Sarah — Sarai before the name change), Isaaki (Isaac), Jakọbu (Jacob), Esau (Esau), Josẹfu (Joseph), Mose (Moses), Josua (Joshua), Dafidi (David), Solomoni (Solomon), Aisaya (Isaiah), Jeremaya (Jeremiah), Esekieli (Ezekiel), Danieli (Daniel)

**Genesis genealogical names:**
- Kaini (Cain), Abeli (Abel), Seti (Seth), Enọṣi (Enosh), Kenani (Kenan), Mahalaleli (Mahalalel), Jaredi (Jared), Enọku (Enoch), Metusela (Methuselah), Lamẹki (Lamech), Ṣemu (Shem), Hamu (Ham), Jafẹti (Japheth)

**New Testament:**
- Jesu Kristi (Jesus Christ), Maria (Mary), Josẹfu (Joseph), Peteru (Peter), Paulu (Paul), Johanu (John), Jakọbu (James), Matteu (Matthew), Marku (Mark), Luku (Luke), Tomasi (Thomas), Anderu (Andrew), Filipi (Philip)

**Place names:**
- Jerusalẹmu (Jerusalem), Betilẹhẹmu (Bethlehem), Ijipti (Egypt), Babeli (Babylon), Israẹli (Israel), Kenaani (Canaan), Jordani (Jordan), Edeni (Eden)

## Saint names

Yoruba uses a **postpositioned** saint marker: **Name + Mímọ́** (meaning "Holy/Sacred"). This is different from most other project languages where the saint prefix comes before the name.

- Peteru Mímọ́ (Saint Peter)
- Paulu Mímọ́ (Saint Paul)
- Maria Mímọ́ (Saint Mary / Holy Mary)
- Plural: àwọn ẹni mímọ́ (the saints)

**Church Father names** — Use Latinized forms (following the project convention), adapted to Yoruba phonotactics by adding terminal vowels where needed:

- Augustini Mímọ́ (St. Augustine)
- Hieronimu Mímọ́ (St. Jerome)
- Basili Mímọ́ (St. Basil) — Basili ti Kaesarea (Basil of Caesarea)
- Ambrosu Mímọ́ (St. Ambrose) — Ambrosu ti Milano (Ambrose of Milan)
- Krisostomu Mímọ́ (St. John Chrysostom) — Johanu Krisostomu Mímọ́
- Gregori Mímọ́ (St. Gregory) — specify: Gregori Ńlá (Gregory the Great), Gregori ti Nasiansọsi (Gregory of Nazianzus), Gregori ti Nissa (Gregory of Nyssa)
- Bernadi Mímọ́ (St. Bernard) — Bernadi ti Klearvoisi (Bernard of Clairvaux)
- Hilari Mímọ́ (St. Hilary)
- Sipriani Mímọ́ (St. Cyprian)
- Justini Mímọ́ (St. Justin) — Justini Ajẹ́rìíkú (Justin Martyr)
- Klementi Mímọ́ (St. Clement) — specify: Klementi ti Alẹksandria, Klementi ti Romu
- Atanasiu Mímọ́ (St. Athanasius)
- Tomasi Akuinasi Mímọ́ (St. Thomas Aquinas)
- Bonaventura Mímọ́ (St. Bonaventure)
- Efremu Mímọ́ (St. Ephrem)

**Lapide's own words**: Use "Corneliu a Lapide" (no Mímọ́ suffix — he is not canonized).

## Quotation marks

Use standard double quotation marks **"..."** for primary quotations and single quotation marks **'...'** for nested quotations. This follows Yoruba Bible and publishing convention. Do NOT use guillemets.

## Theological terminology

### Core terms
- Ọlọ́run (God)
- Olúwa (Lord)
- Ẹ̀mí Mímọ́ (Holy Spirit)
- Mẹ́talókan (Trinity — "Three-in-One")
- Bíbélì Mímọ́ / Ìwé Mímọ́ (Holy Scripture / Bible)
- Ìhìnrere (Gospel)
- Oore-ọfẹ́ (Grace)
- Ẹṣẹ̀ (Sin)
- Ẹṣẹ̀ àkọ́kọ́ (Original sin)
- Ìgbàlà (Salvation)
- Ìràpadà (Redemption)
- Ìgbàgbọ́ (Faith)
- Ìrònúpìwàdà (Repentance)
- Ìdáríjì (Forgiveness)
- Àánú (Mercy)
- Ìjọ (Church — as institution, capitalize)
- Ìfẹ́ (Love/Charity)
- Àlàáfíà (Peace)
- Ìyè àìnípẹ̀kun (Eternal life)

### Sacraments
- Sakramenti (Sacrament)
- Ìrìbọmi / Baptismu (Baptism)
- Ìfìdímúlẹ̀ (Confirmation)
- Eukárístì (Eucharist)
- Ìjẹ́wọ́ (Confession/Penance)
- Ìfiorúkọ Àwọn Aláìsàn (Anointing of the Sick)
- Ìyàsímímọ́ Àlùfáà (Holy Orders)
- Ìgbéyàwó (Matrimony)

### Church hierarchy
- Póòpù (Pope)
- Bíṣọ́ọ̀pù Àgbà (Archbishop)
- Bíṣọ́ọ̀pù (Bishop)
- Àlùfáà (Priest)
- Díákónì (Deacon)

### Scholarly and patristic terms
- Àwọn Bàbá Ìjọ (Church Fathers)
- Olùkọ́ Ìjọ (Doctor of the Church)
- Ẹ̀kọ́ nípa Ọlọ́run / Teoloji (Theology)
- Àlàyé / Ìtumọ̀ (Commentary)
- Wúndíá Maria (Virgin Mary)
- Àjíǹde (Resurrection)
- Àgbélébù (Cross)
- Pẹpẹ (Altar)
- Ẹbọ (Sacrifice)
- Àdúrà (Prayer)
- Angẹli (Angel)
- Àsọtẹ́lẹ̀ (Prophecy)
- Wòlíì (Prophet)
- Àpóstélì (Apostle)
- Ajẹ́rìíkú (Martyr)
- Majẹ̀mú (Covenant)
- Ìjọba Ọlọ́run (Kingdom of God)
- Olùgbàlà (Savior)
- Ọ̀rọ̀ Olúwa (Word of the Lord)
- Ọmọ bíbí kanṣoṣo (Only Begotten Son)

### Liturgical phrases
- Baba, Ọmọ, àti Ẹ̀mí Mímọ́ (Father, Son, and Holy Spirit)
- Olúwa wà pẹ̀lú yín (The Lord be with you)
- Àti pẹ̀lú ẹ̀mí rẹ (And with your spirit)
- Ọ̀dọ́-àgùntàn Ọlọ́run (Lamb of God)
- Ara Kristi (Body of Christ)
- Ẹ̀jẹ̀ Kristi (Blood of Christ)
- Àmín (Amen)

## Bible book names (Bíbélì Mímọ́)

### Old Testament (Majẹmu Láéláé)

**Pentateuch:**
- Gẹnẹsisi (Genesis)
- Ẹksodu (Exodus)
- Lefitiku (Leviticus)
- Numeri (Numbers)
- Deuteronomi (Deuteronomy)

**Historical books:**
- Josua (Joshua)
- Àwọn Onídàjọ́ (Judges)
- Rutu (Ruth)
- Samuẹli Kìíní (1 Samuel)
- Samuẹli Kejì (2 Samuel)
- Àwọn Ọba Kìíní (1 Kings)
- Àwọn Ọba Kejì (2 Kings)
- Kronika Kìíní (1 Chronicles)
- Kronika Kejì (2 Chronicles)
- Esra (Ezra)
- Nehemaya (Nehemiah)
- Esteri (Esther)

**Wisdom/Poetry:**
- Jobu (Job)
- Saamu (Psalms)
- Ìwé Òwe (Proverbs)
- Oníwàásù (Ecclesiastes)
- Orin Solomọni (Song of Solomon)

**Prophets:**
- Aisaya (Isaiah)
- Jeremaya (Jeremiah)
- Ẹkún Jeremaya (Lamentations)
- Esekieli (Ezekiel)
- Danieli (Daniel)
- Hosea (Hosea)
- Joẹli (Joel)
- Amosi (Amos)
- Obadaya (Obadiah)
- Jona (Jonah)
- Mika (Micah)
- Nahumu (Nahum)
- Habakuku (Habakkuk)
- Sefanaya (Zephaniah)
- Hagai (Haggai)
- Sekaraya (Zechariah)
- Malaki (Malachi)

### New Testament (Majẹmu Tuntun)
- Matteu (Matthew)
- Marku (Mark)
- Luku (Luke)
- Johanu (John)
- Ìṣe Àwọn Àpóstélì (Acts)
- Àwọn ará Romu (Romans)
- Kọrinti Kìíní (1 Corinthians)
- Kọrinti Kejì (2 Corinthians)
- Galatia (Galatians)
- Efẹsu (Ephesians)
- Filipi (Philippians)
- Kolose (Colossians)
- Tẹsalonika Kìíní (1 Thessalonians)
- Tẹsalonika Kejì (2 Thessalonians)
- Timoteu Kìíní (1 Timothy)
- Timoteu Kejì (2 Timothy)
- Titu (Titus)
- Filemoni (Philemon)
- Heberu (Hebrews)
- Jakọbu (James)
- Peteru Kìíní (1 Peter)
- Peteru Kejì (2 Peter)
- Johanu Kìíní (1 John)
- Johanu Kejì (2 John)
- Johanu Kẹta (3 John)
- Juda (Jude)
- Ìfihàn (Revelation)

## Psalm numbering

The Yoruba Bible follows **Hebrew/modern numbering**, not Vulgate numbering. Since Lapide's commentary uses Vulgate numbering, translations must convert: e.g., Vulgate Psalm 89 becomes Saamu 90. Where helpful, note the Vulgate number parenthetically: "Saamu 90 (Vulg. 89)".

## Register

Use formal scholarly/theological register throughout. Yoruba has a rich rhetorical tradition (oríkì, àrọ̀, ewì) — the formal prose register appropriate for theological commentary is **Yorùbá ìwé** (literary/written Yoruba), distinct from colloquial spoken Yoruba.

Key register markers:
- **Full tone marking** throughout — this is the hallmark of careful, scholarly Yoruba writing.
- **Formal connectives**: Síbẹ̀síbẹ̀ (however), Nítorí náà (therefore), Nítorí pé (because), Bí ó tilẹ̀ jẹ́ pé (although), Ju bẹ́ẹ̀ lọ (moreover).
- **Respectful forms for God**: Ọlọ́run, Olúwa, Ọba ọ̀run. When God speaks, use the third-person honorific constructions standard in Yoruba Bible.
- **Avoid English loanwords** where Yoruba equivalents exist. Use ìgbàgbọ́ (faith), not "feeti"; use àlàáfíà (peace), not "piisi".

## Grammar pitfalls for AI agents

### 1. Tone mark omission and inconsistency

This is the **primary failure mode**. Agents will:
- Omit tone marks entirely on some words while marking others
- Use wrong tones (acute where grave is needed, or vice versa)
- Inconsistently mark the same word differently across the text

Every word in Yoruba has a fixed tonal pattern. The same spelling with different tones means different things. Agents must be explicitly told to include full tone marks on every Yoruba word, and the output must be verified.

### 2. Subdot omission

Less common than tone mark errors but still occurs. Agents may write:
- "ese" instead of "ẹṣẹ̀" (sin)
- "Olorun" instead of "Ọlọ́run" (God)
- "omo" instead of "ọmọ" (child)

### 3. Vowel and consonant inventory

Yoruba has 7 oral vowels (a, e, ẹ, i, o, ọ, u) and 5 nasal vowels (an, ẹn, in, ọn, un). Agents may confuse:
- e/ẹ and o/ọ (the most common error)
- gb (a single labial-velar plosive, not a cluster) — agents may try to split it
- p (voiceless labial-velar plosive in standard Yoruba, written "p" but pronounced [kp])

### 4. Postpositioned saint marker

Unlike most languages in the project that use a prefix (St., San, Sant, etc.), Yoruba puts **Mímọ́ after the name**. Agents trained on patterns from other languages may produce "*Mímọ́ Augustini" instead of the correct "Augustini Mímọ́". Watch for this inversion.

### 5. Serial verb constructions

Yoruba uses serial verb constructions extensively — multiple verbs in sequence without conjunctions. Agents may incorrectly insert English-style conjunctions:
- Correct: "Ó mú omi wá" (He took water came = He brought water)
- Incorrect: "*Ó mú omi àti wá"

### 6. Leaving quotations untranslated

As with other languages, agents may leave Latin/Greek/Hebrew quotations untranslated. All quotations that the English source translates must be translated into Yoruba.

### 7. English calques

Agents may produce Yoruba that follows English syntax rather than natural Yoruba word order. Yoruba is SVO like English but has different patterns for:
- **Focus constructions**: "Ìgbàlà ni Ọlọ́run fún wa" (Salvation is what God gave us) — the focused element fronts
- **Relative clauses**: Use "tí" as the relativizer
- **Possessives**: Possessed + possessor order: "ọmọ Ọlọ́run" (child of-God = Son of God)

### 8. Protestant vs. Catholic terminology

Yoruba religious texts are predominantly Protestant (Yoruba Bible translation history starts with CMS missionaries). Agents may default to Protestant terms. Use Catholic forms:
- **Àlùfáà** (Catholic priest), not "Pásítọ̀" (Protestant pastor)
- **Eukárístì** (Eucharist), not "Àṣàrò Olúwa" (Lord's Supper — Protestant)
- **Wúndíá Maria** (Virgin Mary — Catholic devotional), not just "Maria" alone in theological contexts referring to the Blessed Virgin
- **Ìjẹ́wọ́** (Confession — Catholic sacramental sense)

## Number handling

In formal/scholarly Yoruba (Yorùbá ìwé), follow these conventions for numbers:

1.  **Avoid Roman Numerals:** Roman numerals are rarely used in standard Yoruba publishing. Always translate them into either spelled-out Yoruba ordinals or Arabic digits depending on the context.
2.  **Titles for Monarchs and Popes:** Translate Roman numerals into spelled-out ordinals (e.g., Henry VIII -> *Henry Kẹjọ*, Charles V -> *Charles Karùn-ún*, Pope Clement VIII -> *Póòpù Klementi Kẹjọ*).
3.  **Book and Chapter Citations:** Use Arabic digits or spelled-out ordinals rather than Roman numerals (e.g., Ìwé IV, orí ix -> *Ìwé 4, orí 9* or *Ìwé kẹrin, orí kẹsàn-án*).
4.  **Quantities, Durations, and Ages:** Spell these out with correct tone marks in formal prose (e.g., *ọdún mẹ́tàlá* for 13 years, *ogójì ọdún* for 40 years, *ẹgbẹ̀rin pàríṣì* for 800 parishes).
5.  **Calendar Years and Versions:** Standard Arabic digits are correct for years (e.g., *1572*, *1616*) and versions/licenses.

### Vigesimal system — CRITICAL warning for AI agents

Yoruba uses a **vigesimal (base-20) number system** with subtractive constructions that is extremely error-prone for LLMs. The system multiplies by 20 and subtracts from the next multiple, creating unintuitive patterns:

- 20 = ogún
- 30 = ọgbọ̀n
- 40 = ogójì (20 × 2)
- 50 = àádọ́ta (60 − 10)
- 60 = ọgọ́ta (20 × 3)
- 100 = ọgọ́rùn-ún (20 × 5) — **NOT ọgọ́fà** (which is 120 = 20 × 6)
- 110 = àádọ́fà (120 − 10)
- 120 = ọgọ́fà (20 × 6)
- 140 = ogóje (20 × 7)
- 145 = àrùn-dín-láàdọ́jọ (160 − 10 − 5)

**Known agent failure**: Agents confuse ọgọ́rùn-ún (100) with ọgọ́fà (120), then build compound numbers on the wrong base. This produces numbers that are off by 20–30, sometimes exceeding the range of possibility (e.g., generating "Psalm 174" when only 150 exist).

**Rule: Use Arabic numerals for all numbers above 20** in reference contexts (psalm numbers, verse numbers, page counts, census figures, etc.). Spell out only small, familiar numbers (1–20) and round vigesimal multiples (ogójì = 40, ọgọ́ta = 60) where natural in prose. For example:
- "àwọn Saamu — 37, 111, 112, 119, àti 145" (not spelled-out vigesimal forms)
- "ẹni 120 tí wọ́n gbàgbọ́" (use Arabic 120, not ọgọ́fà in running text)
- But: "ogójì ọjọ́" (40 days) is fine — small vigesimal multiples are safe
