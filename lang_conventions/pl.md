# Polish

Use formal scholarly Polish (język literacki / styl naukowy). File suffix `_pl`. Latin alphabet, LTR (no `dir` attribute needed). `lang="pl"` on the `<html>` tag.

## Biblical proper names

Follow Polish Catholic tradition (Biblia Tysiąclecia): Mojżesz (Moses), Abraham, Jakub (Jacob), Izaak (Isaac), Aaron, Dawid (David), Jozue (Joshua), Izajasz (Isaiah), Jeremiasz (Jeremiah), Adam, Ewa (Eve), Noe (Noah), Agar (Hagar), Izmael (Ishmael), Terach (Terah), Lot, Sem, Cham, Jafet.

Place names: Charan (Haran the city — NOT Haran), Sychem (Shechem), Kadesz (Kadesh), Szur (Shur), Bered, Kanaan (Canaan), Egipt, Ur chaldejskie (Ur of the Chaldees). Note: the **place** is Charan (with Ch), but the **person** Haran (Lot's father, Abram's brother) is Haran (with H) in Biblia Tysiąclecia (Rdz 11,26–28). Don't conflate them.

### Pre-name-change forms (Genesis 11–16)

Abraham and Sarah receive new names in Genesis 17:5 and 17:15. Before that point (chapters 11–16) Biblia Tysiąclecia uses the original forms **consistently**:

- **Abram** (not Abraham) in narrative, verse text, and section headings.
- **Saraj** (not Sara or Sarai) throughout — indeclinable in BT, so it stays "Saraj" in every case (nominative, accusative, genitive, etc.).

**However**, when Lapide himself writes reflectively about "the patriarch Abraham" or "the faith of Abraham" (general/theological references, not narrative action), the English source oscillates between "Abram" and "Abraham". In those cases, **match the English source 1:1** — if English says "Abraham", Polish says "Abraham"; if English says "Abram", Polish says "Abram". Do NOT default to one form. Check every occurrence against the English source.

This does NOT apply to Saraj: BT uses Saraj uniformly for all of chapters 11–16 regardless of whether the English uses "Sarai" or "Sarah", because Polish BT is stricter about the name-change boundary than English translations. After Genesis 17:15, switch to "Sara".

## Saint names

Use św. (święty/święta) prefix following Polish Catholic convention:

św. Hieronim (St. Jerome), św. Bazyli (St. Basil), św. Augustyn (St. Augustine), św. Ambroży (St. Ambrose), św. Jan Chryzostom (Chrysostom), św. Grzegorz (Gregory), św. Bernard (Bernard), św. Hilary (Hilary), św. Cyprian (Cyprian), św. Justyn (Justin), św. Klemens (Clement), św. Atanazy (Athanasius), św. Epifaniusz (Epiphanius), św. Ignacy (Ignatius), św. Jan Damasceński (John of Damascus), św. Bonawentura (Bonaventure), św. Franciszek (Francis), św. Dominik (Dominic), św. Tomasz (Thomas), św. Leon (Leo), św. Paweł (Paul), św. Efrem (Ephrem).

## Quotation marks

Use Polish quotation marks „..." for standard quotations and ‚...' for nested quotes.

## Theological terminology

Pismo Święte (Holy Scripture), sakrament (sacrament), łaska (grace), grzech (sin), zbawienie (salvation), Ojciec Kościoła (Church Father), Ewangelia (Gospel), Księga Rodzaju (Genesis), Księga Wyjścia (Exodus).

## Bible references and psalm numbering

Gospel references use Polish Bible convention (e.g., „J 8,12" — note comma for verse separator per Polish convention).

**Psalm numbering: use Hebrew/modern numbering, not Vulgate.** Polish Biblia Tysiąclecia follows the Hebrew numbering system, which differs from the Vulgate by one for Psalms 10–146. The English and Latin source files use Vulgate numbering, so Polish translations must convert:

- Vulgate Ps. 9 → split into Ps. 9 + Ps. 10 (Hebrew)
- Vulgate Ps. 10–112 → Hebrew Ps. 11–113 (add 1)
- Vulgate Ps. 113 → split into Ps. 114 + Ps. 115 (Hebrew)
- Vulgate Ps. 114 + 115 → merged as Ps. 116 (Hebrew)
- Vulgate Ps. 116–145 → Hebrew Ps. 117–146 (subtract/add varies, most add 1)
- Vulgate Ps. 146 + 147 → merged as Ps. 147 (Hebrew)
- Psalms 1–8 and 148–150 are identical in both systems

**Agents default to copying psalm numbers verbatim from the English source — you must explicitly instruct them to convert to Hebrew numbering.** In practice, for most references in Lapide's Genesis commentary the rule "add 1 to any Vulgate psalm between 10 and 146" will be correct.

## Register

Formal scholarly Polish suitable for theological commentary — język literacki, avoiding colloquial constructions. Proper use of Polish diacritics (ą, ę, ć, ł, ń, ó, ś, ź, ż) is critical.

## Agent pitfalls

- **English-style quotes**: Agents must be explicitly instructed to use Polish quotation marks „..." (not English "...") as they default to English-style quotes. The tokenizer emits ASCII U+0022 for closing quotes — post-process with a Python script to convert to U+201D.
- **Diacritics omission**: Agents may drop Polish diacritics (ą, ę, ć, ł, ń, ó, ś, ź, ż), especially in less common words.
- **Saraj vs Sara (Genesis 11–16)**: Agents default to "Sara" in reflective prose to mirror the English source's oscillation between "Sarai" (in verse quotes) and "Sarah" (in narrative). This is wrong for Polish — BT uses **Saraj uniformly** until Genesis 17:15. Explicitly instruct agents to use Saraj for ALL pre-ch17 occurrences, regardless of what the English form is.
- **Abram vs Abraham (Genesis 11–16)**: The English source oscillates within a single chapter — narrative and verse text use "Abram", but reflective/general references to "the patriarch Abraham" or "the faith of Abraham" use the familiar form. Polish must mirror this 1:1. Agents often default to one form throughout; explicitly instruct them to match the English form at every occurrence.
- **Charan (place) vs Haran (person)**: BT distinguishes the two (Rdz 11,26–28 uses Haran for Lot's father; the place where Abraham's family settled is Charan). Agents conflate them. Be explicit when the chapter references either.
- **Numerals 5+ grammar**: Polish formal register uses genitive plural noun + neuter singular verb for numerals 5 and above (e.g., "Tych sześć błogosławieństw jest…" not "Te sześć błogosławieństw są…"). Agents default to colloquial forms.
- **Polish numeral gender agreement**: With "dwa/trzy/cztery" (2/3/4), masculine personal nouns take different forms than other genders. Watch for this in short phrases.
