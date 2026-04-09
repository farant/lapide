# Polish

Use formal scholarly Polish (język literacki / styl naukowy). File suffix `_pl`. Latin alphabet, LTR (no `dir` attribute needed). `lang="pl"` on the `<html>` tag.

## Biblical proper names

Follow Polish Catholic tradition (Biblia Tysiąclecia): Mojżesz (Moses), Abraham, Jakub (Jacob), Izaak (Isaac), Aaron, Dawid (David), Jozue (Joshua), Izajasz (Isaiah), Jeremiasz (Jeremiah), Adam, Ewa (Eve), Noe (Noah).

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

- **English-style quotes**: Agents must be explicitly instructed to use Polish quotation marks „..." (not English "...") as they default to English-style quotes.
- **Diacritics omission**: Agents may drop Polish diacritics (ą, ę, ć, ł, ń, ó, ś, ź, ż), especially in less common words.
