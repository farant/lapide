# Igbo (Asụsụ Igbo)

Use formal standard Igbo (Igbo izugbe / scholarly register). File suffix `_ig`. Latin alphabet with subdots, LTR (no `dir` attribute needed).

## Diacritics — CRITICAL

Igbo uses subdots on three vowels and one consonant. These are **mandatory** and meaning-distinguishing:

- **ụ** [ʊ] vs **u** [u] — e.g., ụzọ (road) vs uzo (different meaning)
- **ọ** [ɔ] vs **o** [o] — e.g., ọnụ (mouth) vs onu (different meaning)
- **ị** [ɪ] vs **i** [i] — e.g., ịgba (to run) vs igba (calabash)
- **ṅ** [ŋ] (syllabic nasal) — e.g., ṅụọ (drink, imperative)

Unlike Yoruba, Igbo does **not** mark tones in standard orthography. This eliminates a major category of diacritical errors. However, subdot omission is still the primary agent failure mode.

**Agent warning**: Agents will frequently drop subdots, writing "u" for "ụ", "o" for "ọ", "i" for "ị". Every translated file must be reviewed for subdot accuracy. Explicitly instruct all agents to use proper Igbo subdots on every word.

## Vowel harmony

Igbo has a vowel harmony system. Vowels fall into two groups:
- **+ATR (light)**: i, u, e, o
- **-ATR (heavy)**: ị, ụ, ẹ, ọ, a

Within a word root, all vowels must belong to the same harmony set. Suffixes and prefixes harmonize with the root. Agents may mix harmony sets, producing words with both +ATR and -ATR vowels — review for this.

## Biblical proper names

Follow Igbo Bible tradition (Baịbụlụ Nsọ):

**Old Testament patriarchs and key figures:**
- Adam (Adam), Iiv (Eve), Noa (Noah), Ebreham (Abraham — Ebram before the name change), Sera (Sarah — Serai before the name change), Aịzik (Isaac), Jekọb (Jacob), Ịsọ (Esau), Josef (Joseph), Mosis (Moses), Jọshụa (Joshua), Devid (David), Solomọn (Solomon), Aịzaya (Isaiah), Jeremaya (Jeremiah), Izikịel (Ezekiel), Danịel (Daniel)

**Genesis genealogical names:**
- Ken (Cain), Ebel (Abel), Set (Seth), Ịnọs (Enosh), Kenan (Kenan), Mahalelel (Mahalalel), Jared (Jared), Ịnọk (Enoch), Metusela (Methuselah), Lamek (Lamech), Shem (Shem), Ham (Ham), Jafet (Japheth)

**New Testament:**
- Jizọs Kraịst (Jesus Christ), Marịa / Nne Marịa (Mary, mother of Jesus), Josef (Joseph), Pita (Peter), Pọl (Paul), Jọn (John), Jemis (James), Matiu (Matthew), Mak (Mark), Luk (Luke), Tọmọs (Thomas), Andru (Andrew), Filip (Philip)

**Place names:**
- Jerusalem (Jerusalem), Betlehem (Bethlehem), Ijipt (Egypt), Babilọn (Babylon), Izrel (Israel), Kenan (Canaan), Jọdan (Jordan), Eden (Eden)

## Saint names

Igbo Catholic tradition uses **Nsọ** (meaning "Holy/Sacred") as a saint marker. The standard pattern is **Nsọ + Name** (prefix position):

- Nsọ Pita (Saint Peter)
- Nsọ Pọl (Saint Paul)
- Nsọ Marịa (Saint Mary)
- Plural: ndị nsọ (the saints)

**Church Father names** — Use Latinized forms adapted to Igbo phonotactics:

- Nsọ Augustin (St. Augustine) — Augustin nke Hippo (Augustine of Hippo)
- Nsọ Hieronimọs (St. Jerome)
- Nsọ Basil (St. Basil) — Basil nke Sizeria (Basil of Caesarea)
- Nsọ Ambroz (St. Ambrose) — Ambroz nke Milan (Ambrose of Milan)
- Nsọ Jọn Krisọstọm (St. John Chrysostom)
- Nsọ Gregori (St. Gregory) — specify: Gregori Ukwu (Gregory the Great), Gregori nke Nazịanzọs (Gregory of Nazianzus), Gregori nke Nissa (Gregory of Nyssa)
- Nsọ Bẹnad (St. Bernard) — Bẹnad nke Kleavo (Bernard of Clairvaux)
- Nsọ Hilarị (St. Hilary)
- Nsọ Siprịan (St. Cyprian)
- Nsọ Jọstin (St. Justin) — Jọstin Onye Akaebe (Justin Martyr)
- Nsọ Klement (St. Clement) — specify: Klement nke Alẹgzandrịa, Klement nke Rom
- Nsọ Ataneshọs (St. Athanasius)
- Nsọ Tọmọs Akwinas (St. Thomas Aquinas)
- Nsọ Bonaventura (St. Bonaventure)
- Nsọ Efrem (St. Ephrem)

**Lapide's own words**: Use "Cornelius a Lapide" (no Nsọ prefix — he is not canonized).

## Quotation marks

Use standard double quotation marks **"..."** for primary quotations and single quotation marks **'...'** for nested quotations. This follows Igbo publishing convention. Do NOT use guillemets.

## Theological terminology

### Core terms
- Chineke / Chukwu (God — Chineke emphasizes Creator aspect, Chukwu emphasizes greatness/almightiness; use Chineke as default, Chukwu when emphasizing omnipotence)
- Onyenweanyị / Dinwenụ (Lord)
- Mmụọ Nsọ (Holy Spirit)
- Atọ n'Ime Otu / Triniti Nsọ (Holy Trinity)
- Akwụkwọ Nsọ / Baịbụlụ Nsọ (Holy Scripture / Bible)
- Oziọma (Gospel — literally "good news")
- Amara / Gresia (Grace)
- Mmehie (Sin)
- Mmehie mbụ (Original sin)
- Nzọpụta (Salvation)
- Mgbapụta (Redemption)
- Okwukwe (Faith)
- Nchegharị (Repentance)
- Mgbaghara (Forgiveness)
- Ebere (Mercy)
- Ụka / Chọọchị (Church — as institution, capitalize)
- Ịhụnanya (Love/Charity)
- Udo (Peace)
- Ndụ ebighị ebi (Eternal life)

### Sacraments (Saakrament ndị)
- Saakrament (Sacrament)
- Baptizim / Mmiri Nsọ (Baptism)
- Nkwenye (Confirmation)
- Oriri Nsọ / Yukaris (Eucharist)
- Nkwupụta mmehie / Nchegharị (Confession/Penance)
- Ite mmanụ ndị ọrịa (Anointing of the Sick)
- Nlata Nsọ / Ịchị Ụkọchukwu (Holy Orders)
- Alụmdi na nwunye (Matrimony)

### Church hierarchy
- Popụ (Pope)
- Achịbịshọp (Archbishop)
- Bishọp (Bishop)
- Fadaa / Ụkọchukwu (Priest)
- Diikọn (Deacon)
- Onye Nkuzi (Religious / monk / nun)

### Scholarly and patristic terms
- Ndị Nna Ụka (Church Fathers)
- Onye Nkuzi Ụka (Doctor of the Church)
- Amụmamụ Chineke / Teọlọjị (Theology)
- Nkọwa / Nkọwapụta (Commentary)
- Nne Marịa Dị Nsọ (Virgin Mary — Catholic devotional)
- Mbilite n'ọnwụ (Resurrection)
- Obe (Cross)
- Ebe Ịchụaja (Altar)
- Aja (Sacrifice)
- Ekpere (Prayer)
- Mmụọ Ozi / Enịjel (Angel)
- Amụma (Prophecy)
- Onye Amụma (Prophet)
- Ndị Ozi / Apọsụl (Apostle)
- Onye Akaebe (Martyr)
- Ọgbụgba Ndụ (Covenant)
- Alaeze Chineke (Kingdom of God)
- Onye Nzọpụta (Savior)
- Okwu Onyenweanyị (Word of the Lord)
- Otu Ọkpara Ọ Mụrụ (Only Begotten Son)

### Liturgical phrases
- N'aha Nna, na Nwa, na Mmụọ Nsọ (In the name of the Father, Son, and Holy Spirit)
- Onyenweanyị nọnyeere gị (The Lord be with you)
- Ma nọnyekwara mmụọ gị (And with your spirit)
- Nwa Atụrụ Chineke (Lamb of God)
- Ahụ Kraịst (Body of Christ)
- Ọbara Kraịst (Blood of Christ)
- Amen (Amen)

## Bible book names (Baịbụlụ Nsọ)

### Old Testament (Agba Ochie)

**Pentateuch:**
- Jenesis (Genesis)
- Eksọdọs (Exodus)
- Levitikọs (Leviticus)
- Nọmba (Numbers)
- Diuterọnọmi (Deuteronomy)

**Historical books:**
- Jọshụa (Joshua)
- Ndị Ikpe (Judges)
- Rut (Ruth)
- 1 Samuel (1 Samuel)
- 2 Samuel (2 Samuel)
- 1 Ndị Eze (1 Kings)
- 2 Ndị Eze (2 Kings)
- 1 Ihe E Mere (1 Chronicles)
- 2 Ihe E Mere (2 Chronicles)
- Ẹzra (Ezra)
- Nehemaya (Nehemiah)
- Ẹsta (Esther)

**Wisdom/Poetry:**
- Job (Job)
- Abụ Ọma (Psalms)
- Ilu (Proverbs)
- Ekliziastis (Ecclesiastes)
- Abụ Solomọn (Song of Solomon)

**Prophets:**
- Aịzaya (Isaiah)
- Jeremaya (Jeremiah)
- Abu Akwa (Lamentations)
- Izikịel (Ezekiel)
- Danịel (Daniel)
- Hozịa (Hosea)
- Joel (Joel)
- Emọs (Amos)
- Ọbadaya (Obadiah)
- Jona (Jonah)
- Maịka (Micah)
- Nehọm (Nahum)
- Habakọk (Habakkuk)
- Zefanaya (Zephaniah)
- Hagaị (Haggai)
- Zekaraya (Zechariah)
- Malakị (Malachi)

### New Testament (Agba Ọhụrụ)
- Matiu (Matthew)
- Mak (Mark)
- Luk (Luke)
- Jọn (John)
- Ọrụ Ndị Ozi (Acts)
- Ndị Rom (Romans)
- 1 Ndị Kọrint (1 Corinthians)
- 2 Ndị Kọrint (2 Corinthians)
- Ndị Galeshịa (Galatians)
- Ndị Efesọs (Ephesians)
- Ndị Filipaị (Philippians)
- Ndị Kọlọsi (Colossians)
- 1 Ndị Tesalonaịka (1 Thessalonians)
- 2 Ndị Tesalonaịka (2 Thessalonians)
- 1 Timọti (1 Timothy)
- 2 Timọti (2 Timothy)
- Taịtọs (Titus)
- Failimọn (Philemon)
- Ndị Hibru (Hebrews)
- Jemis (James)
- 1 Pita (1 Peter)
- 2 Pita (2 Peter)
- 1 Jọn (1 John)
- 2 Jọn (2 John)
- 3 Jọn (3 John)
- Jud (Jude)
- Mkpughe (Revelation)

## Psalm numbering

The Igbo Bible follows **Hebrew/modern numbering**, not Vulgate numbering. Since Lapide's commentary uses Vulgate numbering, translations must convert: e.g., Vulgate Psalm 89 becomes Abụ Ọma 90. Where helpful, note the Vulgate number parenthetically: "Abụ Ọma 90 (Vulg. 89)".

## Register

Use formal scholarly/theological register throughout (**Igbo izugbe** — standard/literary Igbo). This is the variety used in academic publications, church documents, and formal religious texts.

Key register markers:
- **Full subdot marking** throughout — every ụ, ọ, ị, ṅ must be correctly written.
- **Formal connectives**: Otú ọ dị (however), N'ihi nke a (therefore), N'ihi na (because), Ọ bụ ezie na (although), Ọzọkwa (moreover).
- **Respectful forms for God**: Chineke, Chukwu, Onyenweanyị. When God speaks, use formal constructions.
- **Avoid pidgin/colloquial forms**: Use standard Igbo, not Nigerian Pidgin or colloquial contractions.
- **Igbo conjunctive system**: Igbo verbs have a complex system of harmonizing suffixes and auxiliaries. Use formal literary forms, not spoken shortcuts.

## Grammar pitfalls for AI agents

### 1. Subdot omission

This is the **primary failure mode**. Agents will:
- Write "u" instead of "ụ" — e.g., "uzo" instead of "ụzọ" (road)
- Write "o" instead of "ọ" — e.g., "Olorun" instead of Chineke/Chukwu, or "omo" instead of "ọmọ"
- Write "i" instead of "ị" — e.g., "ihe" may sometimes need to be "ịhụ"
- Omit the syllabic nasal "ṅ"

Every word must be checked for correct subdot placement.

### 2. Vowel harmony violations

Agents may produce words that mix +ATR and -ATR vowels. Within a root, all vowels must agree. Common errors:
- Mixing ụ with i or e (should be ụ with ị or a)
- Mixing o with ị or a (should be o with i, u, e)
- Suffixes that don't harmonize with the root

### 3. Leaving quotations untranslated

As with other languages, agents may leave Latin/Greek/Hebrew quotations untranslated. All quotations that the English source translates must be translated into Igbo. Only preserve original-language text where the English source itself preserves it.

### 4. Protestant vs. Catholic terminology

Igbo religious texts are predominantly Protestant (CMS/Anglican missionary influence). Agents may default to Protestant terms. Use Catholic forms:
- **Fadaa / Ụkọchukwu** (Catholic priest), not "Pasto" (Protestant pastor)
- **Yukaris / Oriri Nsọ** (Eucharist), not "Oriri Onyenweanyị" (Lord's Supper — Protestant)
- **Nne Marịa Dị Nsọ** (Virgin Mary — Catholic devotional), not just "Marịa" alone in theological contexts
- **Nkwupụta mmehie** (Confession — Catholic sacramental sense)

### 5. English calques and code-switching

Agents may produce Igbo that follows English syntax or insert English words unnecessarily. Igbo has its own word order patterns:
- **SVO** basic order, but with different focus/topic constructions
- **Connective verbs** work differently from English copulas
- Use established Igbo terms rather than English loanwords where possible (though some theological loanwords are standard: Saakrament, Baptizim, etc.)

### 6. Igbo dialectal variation

Standard Igbo (Igbo izugbe) is based primarily on the Owerri and Umuahia dialects. Agents may produce forms from other dialects (Onitsha, Nsukka, etc.). Stick to standard Igbo forms throughout.

### 7. Verb serialization

Igbo uses serial verb constructions. Agents may break these into English-style separate clauses. Maintain natural Igbo serial verb patterns where appropriate.
