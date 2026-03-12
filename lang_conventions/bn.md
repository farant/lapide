# Bengali (বাংলা)

Use formal চলিত ভাষা (modern standard Bengali with literary vocabulary). File suffix `_bn`. Bengali script (বাংলা লিপি), LTR (no `dir` attribute needed).

## Biblical proper names

Follow Bengali Bible tradition: মোশি (Moses), অব্রাহাম (Abraham), ইসহাক (Isaac), যাকোব (Jacob), হারোণ (Aaron), দায়ূদ (David), যিহোশূয় (Joshua), যিশাইয় (Isaiah), যিরমিয় (Jeremiah), নোহ (Noah), আদম (Adam), হবা (Eve), যীশু (Jesus), পৌল (Paul), পিতর (Peter), যোহন (John).

## Saint names

Use সন্ত (Sant) prefix. **Church Father names use Latinized forms** (not anglicized), preserving the Latin scholarly texture of Lapide's original.

Key mappings: সন্ত আউগুস্তিনুস (Augustine), সন্ত হিয়েরোনিমুস (Jerome), সন্ত বাসিলিউস (Basil), সন্ত আম্ব্রোসিউস (Ambrose), সন্ত ক্রিসোস্তোমুস (Chrysostom), সন্ত গ্রেগোরিউস (Gregory), সন্ত বের্নার্দুস (Bernard), সন্ত হিলারিউস (Hilary), সন্ত সিপ্রিয়ানুস (Cyprian), সন্ত ইউস্তিনুস (Justin), সন্ত ক্লেমেন্স (Clement), সন্ত আথানাসিউস (Athanasius), সন্ত এপিফানিউস (Epiphanius), সন্ত ইগনাতিউস (Ignatius), দামাস্কীয় যোহন (John of Damascus), সন্ত বোনাভেন্তুরা (Bonaventure), সন্ত ফ্রান্সিস্কুস (Francis), সন্ত দোমিনিকুস (Dominic).

Names already close to Latin are kept as-is: থমাস, লিও, পৌলুস, এফ্রেম.

## Quotation marks

Use standard double quotation marks "..." for quotations.

## Bible references and psalm numbering

Modern Bengali Bibles use Hebrew/modern psalm numbering (not Vulgate). Convert Vulgate numbers accordingly (e.g., Vulgate Psalm 89 → Psalm 90).

Gospel references use standard Bengali Bible name যোহন (e.g., "যোহন ৮:১২").

## Theological terminology

- Scripture / Holy Scripture = পবিত্র শাস্ত্র
- Church Fathers = ধর্মপিতাগণ
- Grace = অনুগ্রহ
- Sacrament = ধর্মসংস্কার
- Holy Spirit = পবিত্র আত্মা
- Church = মণ্ডলী (assembly/congregation) or গির্জা (building/institution)
- Gospel = সুসমাচার
- Theology = ধর্মতত্ত্ব
- Faith = বিশ্বাস
- Sin = পাপ
- Salvation = পরিত্রাণ
- Prophet = ভাববাদী
- Apostle = প্রেরিত
- Bishop = বিশপ
- Priest = যাজক
- Pope = পোপ
- Pontiff = পন্টিফেক্স / মহাযাজক

## Register

Bengali script has its own conjuncts (যুক্তাক্ষর) that must be correctly formed. Proper use of chandrabindu (ঁ), hasanta (্), and all vowel signs (matras) is critical. Agents must produce proper Bengali — watch for missing or incorrect conjuncts, and confusion with Devanagari (Hindi) characters.

## Agent pitfalls

- **Script confusion**: Bengali and Devanagari scripts look superficially similar but are distinct. Agents may mix characters from the two scripts. Every character must be from the Bengali Unicode block (U+0980–U+09FF).
- **Anglicized Church Father names**: Agents default to anglicized forms like জেরোম, অগাস্টিন instead of the required Latinized forms (হিয়েরোনিমুস, আউগুস্তিনুস). Must be explicitly instructed.
- **Colloquial register**: Agents may drift to colloquial চলিত instead of formal literary চলিত. Watch for overly casual phrasing.
- **Missing conjuncts**: Agents may break conjunct consonants into separate characters with visible hasanta instead of proper ligatures. Most fonts handle this automatically, but the underlying Unicode must be correct.
- **Number script**: Use Bengali numerals (০, ১, ২, ৩, ৪, ৫, ৬, ৭, ৮, ৯) in translated text, not Arabic/Western numerals, except in HTML attributes and URLs.
