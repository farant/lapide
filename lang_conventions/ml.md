# Malayalam (മലയാളം)

Use formal literary Malayalam (സാഹിത്യഭാഷ). File suffix `_ml`. Malayalam script (മലയാള ലിപി), LTR (no `dir` attribute needed).

## Biblical proper names

Follow Malayalam Catholic Bible (POC Bible / സത്യവേദപുസ്തകം) tradition: മോശ (Moses), അബ്രാഹം (Abraham), ഇസഹാക്ക് (Isaac), യാക്കോബ് (Jacob), അഹറോൻ (Aaron), ദാവീദ് (David), ജോഷ്വ (Joshua), ഏശയ്യാ (Isaiah), ജെറമിയാ (Jeremiah), നോഹ (Noah), ആദം (Adam), ഹവ്വാ (Eve), യേശു (Jesus), പൗലോസ് (Paul), പത്രോസ് (Peter), യോഹന്നാൻ (John).

## Saint names

Use വിശുദ്ധ (Vishudha) prefix — the standard Catholic Malayalam convention. **Church Father names use Latinized forms** (not anglicized), preserving the Latin scholarly texture of Lapide's original.

Key mappings: വിശുദ്ധ അഗസ്റ്റിനൂസ് (Augustine), വിശുദ്ധ ഹിയെറോനിമൂസ് (Jerome), വിശുദ്ധ ബസിലിയൂസ് (Basil), വിശുദ്ധ അംബ്രോസിയൂസ് (Ambrose), വിശുദ്ധ ക്രിസോസ്തോമൂസ് (Chrysostom), വിശുദ്ധ ഗ്രെഗോരിയൂസ് (Gregory), വിശുദ്ധ ബെർണാർദൂസ് (Bernard), വിശുദ്ധ ഹിലാരിയൂസ് (Hilary), വിശുദ്ധ സിപ്രിയാനൂസ് (Cyprian), വിശുദ്ധ യൂസ്റ്റിനൂസ് (Justin), വിശുദ്ധ ക്ലെമെൻസ് (Clement), വിശുദ്ധ അത്തനാസിയൂസ് (Athanasius), വിശുദ്ധ എപ്പിഫാനിയൂസ് (Epiphanius), വിശുദ്ധ ഇഗ്നേഷ്യൂസ് (Ignatius), ദമാസ്കസിലെ യോഹന്നാൻ (John of Damascus), വിശുദ്ധ ബൊനവെന്തൂറ (Bonaventure), വിശുദ്ധ ഫ്രാൻസിസ്കൂസ് (Francis), വിശുദ്ധ ദൊമിനിക്കൂസ് (Dominic).

Names already close to Latin are kept as-is: തോമാസ്, ലിയോ, എഫ്രേം.

## Quotation marks

Use standard double quotation marks "..." for quotations.

## Bible references and psalm numbering

The Malayalam Catholic Bible (POC Bible) follows Vulgate psalm numbering. Keep Vulgate numbers as in the source text.

Gospel references use standard Malayalam Bible name യോഹന്നാൻ (e.g., "യോഹന്നാൻ 8:12").

## Theological terminology

- Scripture / Holy Scripture = വിശുദ്ധ ഗ്രന്ഥം / തിരുവെഴുത്ത്
- Church Fathers = സഭാപിതാക്കന്മാർ
- Grace = കൃപ
- Sacrament = കൂദാശ
- Holy Spirit = പരിശുദ്ധാത്മാവ്
- Church = തിരുസ്സഭ
- Gospel = സുവിശേഷം
- Theology = ദൈവശാസ്ത്രം
- Faith = വിശ്വാസം
- Sin = പാപം
- Salvation = രക്ഷ
- Prophet = പ്രവാചകൻ
- Apostle = ശ്ലീഹാ
- Bishop = മെത്രാൻ
- Priest = വൈദികൻ
- Pope = മാർപാപ്പ
- Pontiff = മാർപാപ്പ / പരമാധ്യക്ഷൻ

## Register

Malayalam script uses a complex abugida system with unique features that must be correctly rendered. Proper use of chandrakkala (്), all vowel signs (matras), and conjunct consonants (കൂട്ടക്ഷരങ്ങൾ) is critical.

**Chillu consonants** are a distinctive feature of Malayalam — standalone consonant forms without a chandrakkala: ൻ (n), ൺ (ṇ), ർ (r), ൽ (l), ൾ (ḷ), ൿ (k). These must be used in the correct positions (typically word-final or before certain consonants). Agents may produce chandrakkala forms (ന്, ണ്, etc.) where chillus are required.

Use Malayalam numerals (൧, ൨, ൩) or Arabic/Western numerals (1, 2, 3) — follow the convention in the POC Bible, which uses Arabic/Western numerals. Use Arabic/Western numerals for consistency.

## Agent pitfalls

- **Script confusion with Tamil**: Malayalam and Tamil are both Dravidian and their scripts share historical origins, but they are entirely distinct. Every character must be from the Malayalam Unicode block (U+0D00–U+0D7F). Watch for Tamil characters (U+0B80–U+0BFF) creeping in, especially for similar-sounding names.
- **Chillu consonant errors**: Agents may produce chandrakkala + virama sequences (ന്) where a chillu letter (ൻ) is correct, or vice versa. Common words affected: അവൻ (he), അവൾ (she), word-final ൻ/ൽ/ർ.
- **Conjunct consonant errors**: Malayalam has many conjunct consonants (e.g., ക്ക, ന്ന, മ്മ, ത്ത, ണ്ട, ന്ദ). Agents may break these into separate characters or form incorrect conjuncts.
- **Anglicized Church Father names**: Agents default to anglicized forms like ജെറോം, അഗസ്റ്റിൻ instead of the required Latinized forms (ഹിയെറോനിമൂസ്, അഗസ്റ്റിനൂസ്). Must be explicitly instructed.
- **Colloquial register**: Agents may drift to spoken/colloquial Malayalam instead of literary register. Watch for colloquial verb forms and informal pronouns. Use formal literary forms throughout.
- **Visarga and anusvara**: Proper use of visarga (ഃ) and anusvara (ം) is critical. Agents may omit or misplace these, changing word meaning.
- **Samvruthokaram (half-u)**: The inherent vowel in Malayalam consonants is a short /u/ (samvruthokaram), distinct from Tamil's /a/. This affects transliteration of foreign names. Agents trained on Tamil patterns may produce incorrect vowel sounds in Malayalam transliterations.
