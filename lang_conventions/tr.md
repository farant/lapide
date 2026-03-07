# Turkish

Use formal written Turkish (yazı dili / edebî Türkçe). File suffix `_tr`. Latin alphabet, LTR (no `dir` attribute needed). `lang="tr"` on the `<html>` tag.

## Biblical proper names

Follow Turkish Bible tradition (Kutsal Kitap): Musa (Moses), İbrahim (Abraham), Yakup (Jacob), İshak (Isaac), Harun (Aaron), Davut (David), Yeşu (Joshua), Yeşaya (Isaiah), Yeremya (Jeremiah), Adem (Adam), Havva (Eve), Nuh (Noah).

Biblical book names: Yaratılış (Genesis), Mısır'dan Çıkış (Exodus), Levililer (Leviticus), Çölde Sayım (Numbers), Yasa'nın Tekrarı (Deuteronomy), Yeşu (Joshua), Hakimler (Judges), Rut (Ruth), 1–2 Samuel, 1–2 Krallar (Kings), 1–2 Tarihler (Chronicles), Mezmurlar (Psalms), Süleyman'ın Özdeyişleri (Proverbs), Vaiz (Ecclesiastes), Ezgiler Ezgisi (Song of Songs), Eyüp (Job), Yeşaya (Isaiah), Yeremya (Jeremiah), Hezekiel (Ezekiel), Daniel, Vahiy (Revelation).

## Saint names

Use Aziz (male) / Azize (female) prefix following Turkish Catholic convention: Aziz Hieronymus (St. Jerome), Aziz Basilius (St. Basil), Aziz Augustinus (St. Augustine), Aziz Ambrosius (St. Ambrose), Aziz Yuhanna Krisostomos (Chrysostom), Aziz Gregorius (Gregory), Aziz Bernardus (Bernard), Aziz Hilarius (Hilary), Aziz Cyprianus (Cyprian), Aziz Justinus (Justin), Aziz Clemens (Clement), Aziz Athanasius (Athanasius), Aziz Epiphanius (Epiphanius), Aziz Ignatius (Ignatius), Şamlı Aziz Yuhanna (John of Damascus), Aziz Bonaventura (Bonaventure), Aziz Franciscus (Francis), Aziz Dominicus (Dominic), Aziz Thomas (Thomas), Aziz Leo (Leo), Aziz Pavlus (Paul), Aziz Efrem (Ephrem).

Note: The Turkish Catholic community is small, so saint name conventions are less standardized than in languages like Polish or Korean. The Latinized forms above are preferred, consistent with the scholarly register of the source material. Some Turkish Christian sources may use different transliterations — maintain consistency within our translations.

## Quotation marks

Use Turkish quotation marks "..." for standard quotations and '...' for nested quotes. (Some Turkish publishers use «...» but "..." is the TDK standard.)

## Theological terminology

Kutsal Kitap (Holy Scripture), sakrament (sacrament), lütuf (grace), günah (sin), kurtuluş (salvation), Kilise Babası (Church Father), İncil (Gospel — specifically the Gospels/New Testament), Yaratılış (Genesis), Mısır'dan Çıkış (Exodus).

Gospel references use Turkish Bible convention (e.g., "Yuhanna 8:12").

## Register

The register should be formal scholarly Turkish suitable for theological commentary — yazı dili, avoiding colloquial constructions. Turkish has a significant formal/informal divide; use the formal register throughout. Avoid casual speech patterns (e.g., use "değildir" not "değil ya", use full verb forms not shortened colloquial ones).

## Turkish-specific diacritics

Proper use of Turkish-specific characters is critical: ç, ğ, ı, İ, ö, ş, ü. Agents must be explicitly instructed to use these correctly.

**The dotless ı / dotted İ distinction is the single most critical diacritics issue in Turkish.** Turkish has four distinct i-like letters:
- **ı** (dotless lowercase) — uppercase: **I** (dotless uppercase)
- **i** (dotted lowercase) — uppercase: **İ** (dotted uppercase)

These are completely different letters with different sounds. "sınıf" (class) vs "sinir" (nerve) are different words. Agents frequently substitute one for the other, especially in uppercase contexts where they default to English "I" instead of Turkish "İ". Every instance of i/ı must be verified in review.

## Agent pitfalls and reviewer checklist

Turkish is agglutinative (words are built by stacking suffixes) with strict phonological rules. This creates several systematic failure modes for AI agents that reviewers must check:

### 1. Vowel harmony violations (CRITICAL)

Turkish has two-dimensional vowel harmony (front/back × rounded/unrounded). Suffixes change their vowels to match the preceding vowel:
- **Back vowels** (a, ı, o, u): suffixes use back variants — e.g., kitap-**lar** (books), kol-**lar** (arms)
- **Front vowels** (e, i, ö, ü): suffixes use front variants — e.g., ev-**ler** (houses), göz-**ler** (eyes)
- Four-way harmony (ı/i/u/ü): e.g., possessive -ın/-in/-un/-ün — kitab-**ın** (your book), ev-**in** (your house), kol-**un** (your arm), göz-**ün** (your eye)

Agents regularly produce vowel harmony violations, especially in longer suffix chains. Review every agglutinated word with multiple suffixes.

### 2. Consonant mutations (CRITICAL)

Certain consonants change when a vowel suffix is added:
- **p → b**: kitap → kitab-ı (his book), NOT kitap-ı
- **t → d**: kanat → kanad-ı (his wing), NOT kanat-ı
- **k → ğ**: bebek → bebeğ-i (his baby), NOT bebek-i
- **ç → c**: ağaç → ağac-ı (his tree), NOT ağaç-ı

Agents often fail to apply these mutations or apply them inconsistently. Check all possessed nouns and accusative forms.

### 3. Buffer consonants

When suffixes beginning with a vowel attach to words ending in a vowel, Turkish inserts buffer consonants (y, n, s, ş):
- araba-**y**-ı (his car), NOT araba-ı
- araba-**n**-ın (of his car)

Agents sometimes omit buffer consonants, producing invalid Turkish.

### 4. Word order (IMPORTANT)

Turkish is SOV (Subject-Object-Verb). The verb comes last. Agents translating from English (SVO) frequently produce unnatural word order, especially in complex sentences. The natural Turkish order for a sentence like "St. Jerome says that..." is "Aziz Hieronymus ... olduğunu söyler" (with the verb at the end).

Long, multi-clause sentences in the English source should be restructured to feel natural in Turkish, often using participles and gerunds (-en, -an, -dığı, -acağı) where English uses relative clauses ("who...", "which...", "that...").

### 5. Case suffix errors

Turkish has six cases (nominative, accusative, dative, locative, ablative, genitive). Agents sometimes use the wrong case, especially:
- Mixing up accusative (-ı/-i/-u/-ü) and nominative (bare form)
- Wrong case after postpositions (e.g., "için" takes nominative, "göre" takes dative)
- Incorrect genitive-possessive constructions (X'in Y'si pattern)

### 6. Apostrophe usage with proper nouns

Turkish uses an apostrophe before case suffixes on proper nouns: İbrahim'in (of Abraham), Musa'ya (to Moses), İsa'nın (of Jesus). Agents sometimes omit the apostrophe or place it incorrectly. All proper noun + suffix combinations must use the apostrophe.

### 7. Register drift

Agents may oscillate between:
- Overly formal Ottoman/Arabic-heavy Turkish (using words like "müteallik", "bahusus", "binaenaleyh" that would be archaic/pretentious)
- Too colloquial modern Turkish (using spoken forms like "-mış gibi", "falan", "işte")

The target is modern formal written Turkish — clear, dignified, accessible scholarly prose. Use modern Turkish equivalents rather than Ottoman loanwords, but maintain the gravitas appropriate to theological commentary.

### 8. Plural suffix on counted nouns

Turkish does NOT use the plural suffix after numbers: "üç kitap" (three books), NOT "üç kitaplar". Agents trained on English often add the plural suffix after numbers. Check all numeral + noun combinations.

### 9. Suspended suffixes

In lists, Turkish can suspend shared suffixes to the last item: "ev ve araba-lar-ı" (their houses and cars). Agents sometimes repeat suffixes on every item in a list, producing awkward but technically grammatical text. For formal register, some repetition is acceptable, but excessive repetition sounds unnatural.

### 10. Relative clause structure

Turkish has no relative pronouns (who, which, that). Instead, it uses participle constructions:
- English: "The saint who wrote this book..."
- Turkish: "Bu kitabı yazan aziz..." (literally: "This book-writing saint...")

Agents frequently produce non-Turkish relative clause structures by trying to mirror English syntax. This is one of the most common and most obvious errors to a native reader.
